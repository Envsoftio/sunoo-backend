import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface LockoutRecord {
  attempts: number;
  lastAttempt: Date;
  lockedUntil?: Date;
}

@Injectable()
export class AccountLockoutService {
  private lockoutRecords = new Map<string, LockoutRecord>();

  constructor(private configService: ConfigService) {}

  recordFailedAttempt(identifier: string): {
    isLocked: boolean;
    remainingAttempts: number;
    lockoutTime?: Date;
  } {
    const securityConfig = this.configService.get('security');
    const lockoutConfig = securityConfig.lockout;

    const now = new Date();
    const record = this.lockoutRecords.get(identifier) || {
      attempts: 0,
      lastAttempt: now,
    };

    // Reset attempts if enough time has passed
    if (
      now.getTime() - record.lastAttempt.getTime() >
      lockoutConfig.resetAttemptsAfter
    ) {
      record.attempts = 0;
    }

    record.attempts++;
    record.lastAttempt = now;

    // Check if account should be locked
    if (record.attempts >= lockoutConfig.maxAttempts) {
      record.lockedUntil = new Date(
        now.getTime() + lockoutConfig.lockoutDuration
      );
      this.lockoutRecords.set(identifier, record);

      return {
        isLocked: true,
        remainingAttempts: 0,
        lockoutTime: record.lockedUntil,
      };
    }

    this.lockoutRecords.set(identifier, record);

    return {
      isLocked: false,
      remainingAttempts: lockoutConfig.maxAttempts - record.attempts,
    };
  }

  recordSuccessfulAttempt(identifier: string): void {
    this.lockoutRecords.delete(identifier);
  }

  isAccountLocked(identifier: string): {
    isLocked: boolean;
    lockoutTime?: Date;
  } {
    const record = this.lockoutRecords.get(identifier);

    if (!record || !record.lockedUntil) {
      return { isLocked: false };
    }

    const now = new Date();
    if (now >= record.lockedUntil) {
      // Lockout period has expired
      this.lockoutRecords.delete(identifier);
      return { isLocked: false };
    }

    return {
      isLocked: true,
      lockoutTime: record.lockedUntil,
    };
  }

  getRemainingAttempts(identifier: string): number {
    const securityConfig = this.configService.get('security');
    const lockoutConfig = securityConfig.lockout;
    const record = this.lockoutRecords.get(identifier);

    if (!record) {
      return lockoutConfig.maxAttempts;
    }

    const now = new Date();
    if (
      now.getTime() - record.lastAttempt.getTime() >
      lockoutConfig.resetAttemptsAfter
    ) {
      return lockoutConfig.maxAttempts;
    }

    return Math.max(0, lockoutConfig.maxAttempts - record.attempts);
  }

  // Clean up expired records (call this periodically)
  cleanupExpiredRecords(): void {
    const now = new Date();
    const securityConfig = this.configService.get('security');
    const lockoutConfig = securityConfig.lockout;

    for (const [identifier, record] of this.lockoutRecords.entries()) {
      if (record.lockedUntil && now >= record.lockedUntil) {
        this.lockoutRecords.delete(identifier);
      } else if (
        now.getTime() - record.lastAttempt.getTime() >
        lockoutConfig.resetAttemptsAfter
      ) {
        this.lockoutRecords.delete(identifier);
      }
    }
  }
}
