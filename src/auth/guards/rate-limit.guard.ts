import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitService } from '../services/rate-limit.service';

export const RATE_LIMIT_KEY = 'rateLimit';
export const RateLimit =
  (isAuthEndpoint: boolean = false) =>
  (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(RATE_LIMIT_KEY, isAuthEndpoint, descriptor.value);
  };

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private rateLimitService: RateLimitService,
    private reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Temporarily disable rate limiting in development
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (isDevelopment) {
      return true;
    }

    const isAuthEndpoint = this.reflector.get<boolean>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );
    const request = context.switchToHttp().getRequest();
    const clientIp = this.getClientIp(request);

    const rateLimit = this.rateLimitService.checkRateLimit(
      clientIp,
      isAuthEndpoint,
    );

    if (!rateLimit.allowed) {
      throw new HttpException(
        {
          message: 'Too many requests. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          resetTime: rateLimit.resetTime,
          remaining: rateLimit.remaining,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Add rate limit info to response headers
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-RateLimit-Limit', isAuthEndpoint ? 5 : 100);
    response.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
    response.setHeader('X-RateLimit-Reset', rateLimit.resetTime.getTime());

    return true;
  }

  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      'unknown'
    );
  }
}
