import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { LoggerService } from './logger.service';
import { Reflector } from '@nestjs/core';
import { LOGGER_CONTEXT_KEY } from './logger.decorator';

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  constructor(
    private readonly loggerService: LoggerService,
    private readonly reflector: Reflector
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const className = context.getClass().name;

    // Get logger context from decorator or use class name
    const loggerContext =
      this.reflector.get<string>(LOGGER_CONTEXT_KEY, context.getClass()) ||
      className;

    const { method, url, ip } = request;
    const _userAgent = request.get('User-Agent') || '';
    const startTime = Date.now();

    // Log incoming request
    this.loggerService.log(
      `Incoming ${method} ${url} from ${ip}`,
      loggerContext
    );

    return next.handle().pipe(
      tap(_data => {
        const processingTime = Date.now() - startTime;
        const statusCode = response.statusCode;

        // Log successful response
        this.loggerService.log(
          `Outgoing ${method} ${url} ${statusCode} - ${processingTime}ms`,
          loggerContext
        );
      }),
      catchError(error => {
        const processingTime = Date.now() - startTime;
        const statusCode = error.status || 500;

        // Log error response
        this.loggerService.error(
          `Error ${method} ${url} ${statusCode} - ${processingTime}ms: ${error.message}`,
          error.stack,
          loggerContext
        );

        throw error;
      })
    );
  }
}
