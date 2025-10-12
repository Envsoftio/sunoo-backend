import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger: winston.Logger;
  private readonly subscriptionLogger: winston.Logger;
  private readonly webhookLogger: winston.Logger;

  constructor() {
    // Ensure logs directory exists
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Create logs directory for subscription module
    const subscriptionLogsDir = path.join(logsDir, 'subscription');
    if (!fs.existsSync(subscriptionLogsDir)) {
      fs.mkdirSync(subscriptionLogsDir, { recursive: true });
    }

    // Common log format
    const logFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS',
      }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(
        ({ timestamp, level, message, context, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level,
            message,
            context: context || 'Application',
            ...meta,
          });
        }
      )
    );

    // Main application logger
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      transports: [
        new winston.transports.File({
          filename: path.join(logsDir, 'application.log'),
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
        }),
        new winston.transports.File({
          filename: path.join(logsDir, 'error.log'),
          level: 'error',
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
        }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf(({ timestamp, level, message, context }) => {
              const ctx = typeof context === 'string' ? context : 'Application';
              return `${String(timestamp)} [${ctx}] ${String(level)}: ${String(message)}`;
            })
          ),
        }),
      ],
    });

    // Subscription-specific logger
    this.subscriptionLogger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      transports: [
        new winston.transports.File({
          filename: path.join(subscriptionLogsDir, 'subscription.log'),
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 10,
        }),
        new winston.transports.File({
          filename: path.join(subscriptionLogsDir, 'subscription-error.log'),
          level: 'error',
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 10,
        }),
      ],
    });

    // Webhook-specific logger
    this.webhookLogger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      transports: [
        new winston.transports.File({
          filename: path.join(subscriptionLogsDir, 'webhooks.log'),
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 15, // Keep more webhook logs
        }),
        new winston.transports.File({
          filename: path.join(subscriptionLogsDir, 'webhook-errors.log'),
          level: 'error',
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 10,
        }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf(
              ({
                timestamp,
                level,
                message,
                context,
                event,
                subscriptionId,
              }) => {
                const eventInfo =
                  event && typeof event === 'string' ? `[${event}]` : '';
                const subInfo =
                  subscriptionId && typeof subscriptionId === 'string'
                    ? `[${subscriptionId}]`
                    : '';
                const ctx = typeof context === 'string' ? context : 'Webhook';
                return `${String(timestamp)} [${ctx}]${eventInfo}${subInfo} ${String(level)}: ${String(message)}`;
              }
            )
          ),
        }),
      ],
    });
  }

  // Standard NestJS Logger interface
  log(message: any, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: any, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: any, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: any, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: any, context?: string) {
    this.logger.verbose(message, { context });
  }

  // Subscription-specific logging methods
  logSubscriptionEvent(
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    data: any = {},
    context: string = 'SubscriptionService'
  ) {
    const logData = {
      context,
      ...data,
    };

    switch (level) {
      case 'info':
        this.subscriptionLogger.info(message, logData);
        break;
      case 'warn':
        this.subscriptionLogger.warn(message, logData);
        break;
      case 'error':
        this.subscriptionLogger.error(message, logData);
        break;
      case 'debug':
        this.subscriptionLogger.debug(message, logData);
        break;
    }
  }

  // Webhook-specific logging methods
  logWebhookEvent(
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    data: any = {},
    context: string = 'WebhookController'
  ) {
    const logData = {
      context,
      ...data,
    };

    switch (level) {
      case 'info':
        this.webhookLogger.info(message, logData);
        break;
      case 'warn':
        this.webhookLogger.warn(message, logData);
        break;
      case 'error':
        this.webhookLogger.error(message, logData);
        break;
      case 'debug':
        this.webhookLogger.debug(message, logData);
        break;
    }
  }

  // Webhook request logging
  logWebhookRequest(
    event: string,
    subscriptionId: string,
    payload: any,
    headers: any,
    processingTime?: number
  ) {
    this.webhookLogger.info('Webhook request received', {
      event,
      subscriptionId,
      payload: this.sanitizePayload(payload),
      headers: this.sanitizeHeaders(headers),
      processingTime,
      timestamp: new Date().toISOString(),
    });
  }

  // Webhook response logging
  logWebhookResponse(
    event: string,
    subscriptionId: string,
    success: boolean,
    message: string,
    processingTime?: number
  ) {
    this.webhookLogger.info('Webhook response', {
      event,
      subscriptionId,
      success,
      message,
      processingTime,
      timestamp: new Date().toISOString(),
    });
  }

  // Webhook error logging
  logWebhookError(
    event: string,
    subscriptionId: string,
    error: Error,
    payload?: any,
    headers?: any
  ) {
    this.webhookLogger.error('Webhook processing error', {
      event,
      subscriptionId,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      payload: this.sanitizePayload(payload),
      headers: this.sanitizeHeaders(headers),
      timestamp: new Date().toISOString(),
    });
  }

  // Comprehensive payload logging for Razorpay webhooks
  logRazorpayPayload(
    event: string,
    subscriptionId: string,
    payload: any,
    context: string = 'RazorpayWebhook'
  ) {
    this.webhookLogger.info('Razorpay payload details', {
      event,
      subscriptionId,
      context,
      payloadStructure: {
        hasEvent: !!payload.event,
        hasPayload: !!payload.payload,
        hasSubscription: !!payload.payload?.subscription,
        hasPayment: !!payload.payload?.payment,
        hasOrder: !!payload.payload?.order,
        hasCustomer: !!payload.payload?.customer,
        hasPlan: !!payload.payload?.plan,
        payloadKeys: Object.keys(payload.payload || {}),
        subscriptionKeys: Object.keys(
          payload.payload?.subscription?.entity || {}
        ),
        paymentKeys: Object.keys(payload.payload?.payment?.entity || {}),
      },
      razorpayEventId: payload.id,
      createdAt: payload.created_at,
      accountId: payload.account_id,
      fullPayload: this.sanitizePayload(payload),
      timestamp: new Date().toISOString(),
    });
  }

  // Sanitize sensitive data from payload
  private sanitizePayload(payload: any): any {
    if (!payload) return payload;

    const sanitized = { ...payload };
    const sensitiveFields = ['signature', 'token', 'secret', 'password', 'key'];

    // Recursively sanitize nested objects
    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;

      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }

      const sanitized = { ...obj };
      for (const key in sanitized) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof sanitized[key] === 'object') {
          sanitized[key] = sanitizeObject(sanitized[key]);
        }
      }
      return sanitized;
    };

    return sanitizeObject(sanitized);
  }

  // Sanitize sensitive data from headers
  private sanitizeHeaders(headers: any): any {
    if (!headers) return headers;

    const sanitized = { ...headers };
    const sensitiveHeaders = [
      'authorization',
      'x-razorpay-signature',
      'x-api-key',
    ];

    for (const key in sanitized) {
      if (sensitiveHeaders.some(header => key.toLowerCase().includes(header))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  // Get logger instances for direct use
  getSubscriptionLogger() {
    return this.subscriptionLogger;
  }

  getWebhookLogger() {
    return this.webhookLogger;
  }

  getMainLogger() {
    return this.logger;
  }
}
