import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface RateLimitRecord {
  count: number;
  resetTime: Date;
}

@Injectable()
export class RateLimitService {
  private rateLimitRecords = new Map<string, RateLimitRecord>();

  constructor(private configService: ConfigService) {}

  checkRateLimit(
    identifier: string,
    isAuthEndpoint: boolean = false,
  ): { allowed: boolean; remaining: number; resetTime: Date } {
    const securityConfig = this.configService.get('security');
    const rateLimitConfig = securityConfig.rateLimit;
    const isDevelopment = this.configService.get('NODE_ENV') === 'development';

    let windowMs = isAuthEndpoint
      ? rateLimitConfig.authWindowMs
      : rateLimitConfig.windowMs;
    let maxRequests = isAuthEndpoint
      ? rateLimitConfig.authMax
      : rateLimitConfig.max;

    // More lenient rate limiting in development
    if (isDevelopment && isAuthEndpoint) {
      windowMs = 30 * 1000; // 30 seconds
      maxRequests = 50; // 50 requests per 30 seconds
    }

    const now = new Date();
    const record = this.rateLimitRecords.get(identifier);

    if (!record || now >= record.resetTime) {
      // Create new record or reset expired one
      const newRecord: RateLimitRecord = {
        count: 1,
        resetTime: new Date(now.getTime() + windowMs),
      };
      this.rateLimitRecords.set(identifier, newRecord);

      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: newRecord.resetTime,
      };
    }

    if (record.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime,
      };
    }

    // Increment count
    record.count++;
    this.rateLimitRecords.set(identifier, record);

    return {
      allowed: true,
      remaining: maxRequests - record.count,
      resetTime: record.resetTime,
    };
  }

  getRateLimitInfo(
    identifier: string,
    isAuthEndpoint: boolean = false,
  ): {
    remaining: number;
    resetTime: Date;
    total: number;
  } {
    const securityConfig = this.configService.get('security');
    const rateLimitConfig = securityConfig.rateLimit;

    const windowMs = isAuthEndpoint
      ? rateLimitConfig.authWindowMs
      : rateLimitConfig.windowMs;
    const maxRequests = isAuthEndpoint
      ? rateLimitConfig.authMax
      : rateLimitConfig.max;

    const now = new Date();
    const record = this.rateLimitRecords.get(identifier);

    if (!record || now >= record.resetTime) {
      return {
        remaining: maxRequests,
        resetTime: new Date(now.getTime() + windowMs),
        total: maxRequests,
      };
    }

    return {
      remaining: Math.max(0, maxRequests - record.count),
      resetTime: record.resetTime,
      total: maxRequests,
    };
  }

  // Clean up expired records (call this periodically)
  cleanupExpiredRecords(): void {
    const now = new Date();

    for (const [identifier, record] of this.rateLimitRecords.entries()) {
      if (now >= record.resetTime) {
        this.rateLimitRecords.delete(identifier);
      }
    }
  }

  // Reset rate limit for specific identifier (useful for testing or admin actions)
  resetRateLimit(identifier: string): void {
    this.rateLimitRecords.delete(identifier);
  }
}
