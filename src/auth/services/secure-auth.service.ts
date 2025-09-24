import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../entities/user.entity';
import { PasswordValidationService } from './password-validation.service';
import { AccountLockoutService } from './account-lockout.service';
import { SecureJwtService, TokenPair } from './secure-jwt.service';
import { RateLimitService } from './rate-limit.service';
import { EmailService } from '../../email/email.service';

export interface SecureLoginDto {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SecureRegisterDto {
  email: string;
  password: string;
  name: string;
  acceptTerms: boolean;
}

export interface SecureAuthResponse {
  success: boolean;
  data?: {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      isEmailVerified: boolean;
      lastLoginAt: Date;
    };
    tokens: TokenPair;
  };
  error?: {
    message: string;
    code: string;
    details?: any;
  };
}

@Injectable()
export class SecureAuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
    private passwordValidationService: PasswordValidationService,
    private accountLockoutService: AccountLockoutService,
    private secureJwtService: SecureJwtService,
    private rateLimitService: RateLimitService,
    private emailService: EmailService,
  ) {}

  async secureLogin(
    loginDto: SecureLoginDto,
    clientIp: string,
  ): Promise<SecureAuthResponse> {
    // Rate limiting temporarily disabled for development
    // const rateLimit = this.rateLimitService.checkRateLimit(clientIp, true);
    // if (!rateLimit.allowed) {
    //   throw new HttpException({
    //     message: 'Too many login attempts. Please try again later.',
    //     code: 'RATE_LIMIT_EXCEEDED',
    //     resetTime: rateLimit.resetTime,
    //   }, HttpStatus.TOO_MANY_REQUESTS);
    // }

    // Check account lockout
    const lockoutCheck = this.accountLockoutService.isAccountLocked(
      loginDto.email,
    );
    if (lockoutCheck.isLocked) {
      throw new UnauthorizedException({
        message:
          'Account is temporarily locked due to too many failed attempts.',
        code: 'ACCOUNT_LOCKED',
        lockoutTime: lockoutCheck.lockoutTime,
      });
    }

    // Find user
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email.toLowerCase() },
    });

    if (!user) {
      // Record failed attempt even for non-existent users to prevent enumeration
      this.accountLockoutService.recordFailedAttempt(loginDto.email);
      throw new UnauthorizedException({
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException({
        message: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED',
      });
    }

    // Verify password
    const isPasswordValid =
      user.password && (await bcrypt.compare(loginDto.password, user.password));

    if (!isPasswordValid) {
      const lockoutResult = this.accountLockoutService.recordFailedAttempt(
        loginDto.email,
      );

      throw new UnauthorizedException({
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
        remainingAttempts: lockoutResult.remainingAttempts,
        isLocked: lockoutResult.isLocked,
      });
    }

    // Check email verification
    if (!user.isEmailVerified) {
      throw new UnauthorizedException({
        message: 'Please verify your email address before logging in',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    // Record successful login
    this.accountLockoutService.recordSuccessfulAttempt(loginDto.email);
    this.rateLimitService.resetRateLimit(clientIp);

    // Update last login
    await this.userRepository.update(user.id, {
      lastLoginAt: new Date(),
    });

    // Generate tokens
    const tokens = this.secureJwtService.generateTokenPair({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name || '',
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          lastLoginAt: user.lastLoginAt || new Date(),
        },
        tokens,
      },
    };
  }

  async secureRegister(
    registerDto: SecureRegisterDto,
    clientIp: string,
  ): Promise<SecureAuthResponse> {
    // Rate limiting temporarily disabled for development
    // const rateLimit = this.rateLimitService.checkRateLimit(clientIp, true);
    // if (!rateLimit.allowed) {
    //   throw new HttpException({
    //     message: 'Too many registration attempts. Please try again later.',
    //     code: 'RATE_LIMIT_EXCEEDED',
    //     resetTime: rateLimit.resetTime,
    //   }, HttpStatus.TOO_MANY_REQUESTS);
    // }

    // Validate terms acceptance
    if (!registerDto.acceptTerms) {
      throw new BadRequestException({
        message: 'You must accept the terms and conditions',
        code: 'TERMS_NOT_ACCEPTED',
      });
    }

    // Validate password
    const passwordValidation = this.passwordValidationService.validatePassword(
      registerDto.password,
    );
    if (!passwordValidation.isValid) {
      throw new BadRequestException({
        message: 'Password does not meet security requirements',
        code: 'WEAK_PASSWORD',
        details: {
          errors: passwordValidation.errors,
          score: passwordValidation.score,
          strength: this.passwordValidationService.getPasswordStrengthText(
            passwordValidation.score,
          ),
        },
      });
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException({
        message: 'User with this email already exists',
        code: 'USER_EXISTS',
      });
    }

    // Hash password with higher salt rounds for better security
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(registerDto.password, saltRounds);

    // Create user
    const user = this.userRepository.create({
      email: registerDto.email.toLowerCase(),
      password: hashedPassword,
      name: registerDto.name.trim(),
      role: 'user',
      isEmailVerified: false, // Will be verified via email
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user);

    // Generate verification token
    const verificationToken = uuidv4();

    // Update user with verification token
    await this.userRepository.update(savedUser.id, {
      emailVerificationToken: verificationToken,
    });

    // Send welcome email with verification link
    try {
      await this.emailService.sendWelcomeEmail(
        savedUser.email,
        savedUser.name || 'User',
        verificationToken,
      );
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      // Don't fail registration if email fails
    }

    // Generate tokens (user will need to verify email for full access)
    const tokens = this.secureJwtService.generateTokenPair({
      id: savedUser.id,
      email: savedUser.email,
      role: savedUser.role,
    });

    return {
      success: true,
      data: {
        user: {
          id: savedUser.id,
          email: savedUser.email,
          name: savedUser.name || '',
          role: savedUser.role,
          isEmailVerified: savedUser.isEmailVerified,
          lastLoginAt: savedUser.lastLoginAt || new Date(),
        },
        tokens,
      },
    };
  }

  async refreshToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; expiresAt: Date }> {
    const payload = this.secureJwtService.verifyRefreshToken(refreshToken);

    if (!payload) {
      throw new UnauthorizedException({
        message: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN',
      });
    }

    // Find user to ensure they still exist and are active
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException({
        message: 'User not found or inactive',
        code: 'USER_NOT_FOUND',
      });
    }

    // Generate new access token
    const accessToken = this.secureJwtService.generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const expiresAt =
      this.secureJwtService.getTokenExpiry(accessToken) || new Date();

    return { accessToken, expiresAt };
  }

  async logout(userId: string): Promise<{ success: boolean }> {
    // In a production environment, you might want to:
    // 1. Add the token to a blacklist
    // 2. Store logout events in the database
    // 3. Invalidate refresh tokens

    return { success: true };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user || !user.password) {
      throw new UnauthorizedException({
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException({
        message: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD',
      });
    }

    // Validate new password
    const passwordValidation =
      this.passwordValidationService.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      throw new BadRequestException({
        message: 'New password does not meet security requirements',
        code: 'WEAK_PASSWORD',
        details: {
          errors: passwordValidation.errors,
          score: passwordValidation.score,
          strength: this.passwordValidationService.getPasswordStrengthText(
            passwordValidation.score,
          ),
        },
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await this.userRepository.update(userId, {
      password: hashedNewPassword,
    });

    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  async verifyEmail(
    token: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.userRepository.findOne({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException({
        message: 'Invalid or expired verification token',
        code: 'INVALID_VERIFICATION_TOKEN',
      });
    }

    // Mark email as verified and clear token
    await this.userRepository.update(user.id, {
      isEmailVerified: true,
      emailVerificationToken: undefined,
    });

    return {
      success: true,
      message: 'Email verified successfully. You can now log in.',
    };
  }

  // Cleanup method to be called periodically
  cleanup(): void {
    this.accountLockoutService.cleanupExpiredRecords();
    this.rateLimitService.cleanupExpiredRecords();
  }
}
