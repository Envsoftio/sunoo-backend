import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  score: number; // 0-100 password strength score
}

@Injectable()
export class PasswordValidationService {
  constructor(private configService: ConfigService) {}

  validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];
    const securityConfig = this.configService.get('security');
    const passwordConfig = securityConfig.password;

    // Check minimum length
    if (password.length < passwordConfig.minLength) {
      errors.push(
        `Password must be at least ${passwordConfig.minLength} characters long`
      );
    }

    // Check maximum length
    if (password.length > passwordConfig.maxLength) {
      errors.push(
        `Password must be no more than ${passwordConfig.maxLength} characters long`
      );
    }

    // Check for uppercase letter
    if (passwordConfig.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // Check for lowercase letter
    if (passwordConfig.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // Check for numbers
    if (passwordConfig.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // Check for special characters
    if (
      passwordConfig.requireSpecialChars &&
      !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
    ) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common passwords
    const commonPasswords = [
      'password',
      '123456',
      '123456789',
      'qwerty',
      'abc123',
      'password123',
      'admin',
      'letmein',
      'welcome',
      'monkey',
      '1234567890',
      'dragon',
      'master',
      'hello',
      'freedom',
      'whatever',
      'qazwsx',
      'trustno1',
    ];

    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common and easily guessable');
    }

    // Calculate password strength score
    const score = this.calculatePasswordScore(password);

    return {
      isValid: errors.length === 0,
      errors,
      score,
    };
  }

  private calculatePasswordScore(password: string): number {
    let score = 0;
    const length = password.length;

    // Length score (0-25 points)
    if (length >= 8) score += 5;
    if (length >= 12) score += 10;
    if (length >= 16) score += 10;

    // Character variety score (0-50 points)
    if (/[a-z]/.test(password)) score += 10; // lowercase
    if (/[A-Z]/.test(password)) score += 10; // uppercase
    if (/\d/.test(password)) score += 10; // numbers
    if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score += 10; // special chars
    if (/[^a-zA-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password))
      score += 10; // unicode

    // Pattern penalty (0-25 points deduction)
    if (/(.)\1{2,}/.test(password)) score -= 10; // repeated characters
    if (/123|abc|qwe|asd|zxc/i.test(password)) score -= 10; // sequential patterns
    if (/password|admin|user|test/i.test(password)) score -= 15; // common words

    return Math.max(0, Math.min(100, score));
  }

  getPasswordStrengthText(score: number): string {
    if (score < 20) return 'Very Weak';
    if (score < 40) return 'Weak';
    if (score < 60) return 'Fair';
    if (score < 80) return 'Good';
    return 'Strong';
  }
}
