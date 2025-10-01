import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { Subscription } from '../entities/subscription.entity';
import {
  LoginDto,
  RegisterDto,
  AuthResponseDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from '../dto/auth.dto';
import { EmailService } from '../email/email.service';
import { SessionService } from './services/session.service';
import { RateLimitService } from './services/rate-limit.service';
import { AccountLockoutService } from './services/account-lockout.service';
import { PasswordValidationService } from './services/password-validation.service';
import { SecureJwtService } from './services/secure-jwt.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    private jwtService: JwtService,
    private emailService: EmailService,
    private sessionService: SessionService,
    private rateLimitService: RateLimitService,
    private accountLockoutService: AccountLockoutService,
    private passwordValidationService: PasswordValidationService,
    private secureJwtService: SecureJwtService
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });
    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }
    return null;
  }

  async login(loginDto: LoginDto, request?: any): Promise<AuthResponseDto> {
    const clientIp = this.getClientIp(request);

    // Rate limiting check
    const rateLimit = this.rateLimitService.checkRateLimit(clientIp, true);
    if (!rateLimit.allowed) {
      throw new HttpException(
        {
          message: 'Too many login attempts. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          resetTime: rateLimit.resetTime,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Check account lockout
    const lockoutCheck = this.accountLockoutService.isAccountLocked(
      loginDto.email
    );
    if (lockoutCheck.isLocked) {
      throw new HttpException(
        {
          message:
            'Account is temporarily locked due to too many failed attempts.',
          code: 'ACCOUNT_LOCKED',
          lockoutTime: lockoutCheck.lockoutTime,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // First check if user exists and has default password (migrated user)
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email.toLowerCase() },
    });

    if (!user) {
      // Record failed attempt for rate limiting
      const attemptResult = this.accountLockoutService.recordFailedAttempt(
        loginDto.email
      );
      throw new UnauthorizedException({
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
        remainingAttempts: attemptResult.remainingAttempts,
        isLocked: attemptResult.isLocked,
        lockoutTime: attemptResult.lockoutTime,
      });
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Check if user has default password (migrated user) - this should be checked BEFORE password validation
    if (user.hasDefaultPassword) {
      throw new UnauthorizedException({
        message: 'Please reset your password to continue',
        code: 'PASSWORD_RESET_REQUIRED',
        requiresPasswordReset: true,
      });
    }

    // Now validate the password
    const isValidPassword =
      user.password && (await bcrypt.compare(loginDto.password, user.password));
    if (!isValidPassword) {
      // Record failed attempt for rate limiting
      const attemptResult = this.accountLockoutService.recordFailedAttempt(
        loginDto.email
      );
      throw new UnauthorizedException({
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
        remainingAttempts: attemptResult.remainingAttempts,
        isLocked: attemptResult.isLocked,
        lockoutTime: attemptResult.lockoutTime,
      });
    }

    // Clear failed attempts on successful login
    this.accountLockoutService.recordSuccessfulAttempt(loginDto.email);

    // Update last login
    await this.userRepository.update(user.id, { lastLoginAt: new Date() });

    // Create session
    const session = await this.sessionService.createSession({
      userId: user.id,
      userAgent: request?.headers?.['user-agent'],
      ipAddress: clientIp,
      deviceInfo: request?.headers?.['x-device-info'],
      metadata: {
        loginMethod: 'email_password',
        timestamp: new Date().toISOString(),
      },
    });

    return {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = this.userRepository.create({
      ...registerDto,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);

    const payload = { email: savedUser.email, sub: savedUser.id };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: savedUser.id,
        email: savedUser.email,
        name: savedUser.name,
        avatar: savedUser.avatar,
      },
    };
  }

  async findUserById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  // Google OAuth methods
  async validateGoogleUser(googleUser: any): Promise<User> {
    const { email, name, avatar, providerId } = googleUser;

    let user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Create new user with Google OAuth
      user = this.userRepository.create({
        email: email.toLowerCase(),
        name,
        avatar,
        password: '', // No password for OAuth users
        role: 'user', // Default role
        isEmailVerified: true, // Google emails are pre-verified
        authId: providerId,
        provider: 'google',
      });
      user = await this.userRepository.save(user);
    } else if (!user.authId) {
      // Link existing user with Google account
      user.authId = providerId;
      user.provider = 'google';
      user.avatar = avatar || user.avatar;
      user = await this.userRepository.save(user);
    }

    return user;
  }

  async createSuperAdmin(
    email: string,
    password: string,
    name: string
  ): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);

    const superAdmin = this.userRepository.create({
      email,
      password: hashedPassword,
      name,
      role: 'superadmin',
      isEmailVerified: true,
      isActive: true,
    });

    return this.userRepository.save(superAdmin);
  }

  async updateUserRole(userId: string, role: string): Promise<User | null> {
    await this.userRepository.update(userId, { role });
    return this.userRepository.findOne({ where: { id: userId } });
  }

  async getAllUsers(): Promise<User[]> {
    return this.userRepository.find({
      select: [
        'id',
        'email',
        'name',
        'role',
        'isActive',
        'created_at',
        'lastLoginAt',
      ],
      order: { created_at: 'DESC' },
    });
  }

  async deactivateUser(userId: string): Promise<void> {
    await this.userRepository.update(userId, { isActive: false });
  }

  async activateUser(userId: string): Promise<void> {
    await this.userRepository.update(userId, { isActive: true });
  }

  // Sunoo-compatible methods
  async handleLogin(loginDto: LoginDto) {
    try {
      const user = await this.validateUser(loginDto.email, loginDto.password);
      if (!user) {
        return {
          success: false,
          error: {
            message: 'Invalid credentials',
            code: 'invalid_credentials',
          },
        };
      }

      if (!user.isActive) {
        return {
          success: false,
          error: {
            message: 'Account is deactivated',
            code: 'account_deactivated',
          },
        };
      }

      if (!user.isEmailVerified) {
        return {
          success: false,
          error: {
            message: 'Email not verified',
            code: 'email_not_confirmed',
          },
        };
      }

      // Check if user has default password (migrated user)
      if (user.hasDefaultPassword) {
        return {
          success: false,
          error: {
            message: 'Please reset your password to continue',
            code: 'password_reset_required',
            requiresPasswordReset: true,
          },
        };
      }

      // Update last login
      await this.userRepository.update(user.id, { lastLoginAt: new Date() });

      // Get user with subscriptions
      const userWithSubscriptions = await this.userRepository.findOne({
        where: { id: user.id },
        relations: ['subscriptions', 'subscriptions.plan'],
      });

      const payload = { email: user.email, sub: user.id };
      const accessToken = this.jwtService.sign(payload);

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            profile: userWithSubscriptions,
          },
          session: {
            access_token: accessToken,
            refresh_token: accessToken, // For compatibility
            expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
          },
        },
      };
    } catch {
      return {
        success: false,
        error: {
          message: 'Login failed',
          code: 'login_failed',
        },
      };
    }
  }

  async handleSignup(registerDto: RegisterDto) {
    try {
      const existingUser = await this.userRepository.findOne({
        where: { email: registerDto.email },
      });

      if (existingUser) {
        return {
          status: 409,
          message: 'Email already exists',
        };
      }

      const hashedPassword = await bcrypt.hash(registerDto.password, 10);

      const user = this.userRepository.create({
        email: registerDto.email,
        password: hashedPassword,
        name: registerDto.name,
        role: 'user',
        isEmailVerified: false, // Will be verified via email
      });

      await this.userRepository.save(user);

      return {
        status: 201,
        message: 'Signup successful',
      };
    } catch {
      return {
        status: 400,
        message: 'Signup failed',
      };
    }
  }

  handleLogout() {
    return { success: true };
  }

  async getProfile(userId: string) {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['subscriptions'],
      });

      if (!user) {
        return {
          success: false,
          error: {
            message: 'User not found',
            code: 'user_not_found',
          },
        };
      }

      return {
        success: true,
        data: user,
      };
    } catch {
      return {
        success: false,
        error: {
          message: 'Failed to get profile',
          code: 'profile_fetch_failed',
        },
      };
    }
  }

  async handleForget(forgotPasswordDto: ForgotPasswordDto) {
    try {
      const user = await this.userRepository.findOne({
        where: { email: forgotPasswordDto.email.toLowerCase() },
      });

      if (!user) {
        return {
          success: false,
          error: {
            message: 'User not found',
            code: 'user_not_found',
          },
        };
      }

      // Generate reset token
      const resetToken = require('crypto').randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour

      await this.userRepository.update(user.id, {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      });

      // Send password reset email
      try {
        await this.emailService.sendPasswordResetEmail(
          user.email,
          user.name || 'User',
          resetToken
        );

        return {
          success: true,
          message: 'Password reset email sent',
        };
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        // Still return success since token was generated
        return {
          success: true,
          message: 'Password reset email sent',
        };
      }
    } catch {
      return {
        success: false,
        error: {
          message: 'Failed to process password reset request',
          code: 'reset_request_failed',
        },
      };
    }
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    try {
      const user = await this.userRepository.findOne({
        where: {
          passwordResetToken: resetPasswordDto.token,
        },
      });

      if (
        !user ||
        !user.passwordResetExpires ||
        user.passwordResetExpires < new Date()
      ) {
        return {
          success: false,
          error: {
            message: 'Invalid or expired reset token',
            code: 'invalid_reset_token',
          },
        };
      }

      const hashedPassword = await bcrypt.hash(
        resetPasswordDto.newPassword,
        10
      );

      await this.userRepository.update(user.id, {
        password: hashedPassword,
        passwordResetToken: undefined,
        passwordResetExpires: undefined,
        hasDefaultPassword: false,
      });

      return {
        success: true,
        message: 'Password reset successfully',
      };
    } catch {
      return {
        success: false,
        error: {
          message: 'Failed to reset password',
          code: 'reset_failed',
        },
      };
    }
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        return {
          success: false,
          error: {
            message: 'User not found',
            code: 'user_not_found',
          },
        };
      }

      const isCurrentPasswordValid = await bcrypt.compare(
        changePasswordDto.currentPassword,
        user.password
      );

      if (!isCurrentPasswordValid) {
        return {
          success: false,
          error: {
            message: 'Current password is incorrect',
            code: 'invalid_current_password',
          },
        };
      }

      const hashedNewPassword = await bcrypt.hash(
        changePasswordDto.newPassword,
        10
      );

      await this.userRepository.update(userId, {
        password: hashedNewPassword,
        hasDefaultPassword: false,
      });

      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch {
      return {
        success: false,
        error: {
          message: 'Failed to change password',
          code: 'change_password_failed',
        },
      };
    }
  }

  async handleUpdateUser(userId: string, updateData: any) {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      await this.userRepository.update(userId, updateData);
      return {
        success: true,
        message: 'User updated successfully',
      };
    } catch {
      return {
        success: false,
        error: {
          message: 'Failed to update user',
          code: 'update_failed',
        },
      };
    }
  }

  async getUserSubscription(userId: string) {
    try {
      const subscriptions = await this.subscriptionRepository.find({
        where: { user_id: userId },
      });

      return {
        success: true,
        data: subscriptions,
      };
    } catch {
      return {
        success: false,
        error: {
          message: 'Failed to get subscriptions',
          code: 'subscription_fetch_failed',
        },
      };
    }
  }

  async deleteSubscription(userId: string) {
    try {
      await this.subscriptionRepository.update(
        { user_id: userId },
        { status: 'cancelled', cancelledAt: new Date() }
      );

      return {
        success: true,
        message: 'Subscription cancelled successfully',
      };
    } catch {
      return {
        success: false,
        error: {
          message: 'Failed to cancel subscription',
          code: 'subscription_cancel_failed',
        },
      };
    }
  }

  async checkUserExists(email: string) {
    try {
      const user = await this.userRepository.findOne({
        where: { email },
        select: [
          'id',
          'email',
          'name',
          'hasDefaultPassword',
          'isActive',
          'isEmailVerified',
        ],
      });

      if (!user) {
        return {
          success: false,
          error: {
            message: 'User not found',
            code: 'user_not_found',
          },
        };
      }

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            hasDefaultPassword: user.hasDefaultPassword,
            isActive: user.isActive,
            isEmailVerified: user.isEmailVerified,
            requiresPasswordReset: user.hasDefaultPassword,
          },
        },
      };
    } catch {
      return {
        success: false,
        error: {
          message: 'Failed to check user',
          code: 'user_check_failed',
        },
      };
    }
  }

  async verifyEmail(
    token: string
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

  private getClientIp(request: any): string {
    return (
      request?.ip ||
      request?.connection?.remoteAddress ||
      request?.socket?.remoteAddress ||
      request?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      request?.headers?.['x-real-ip'] ||
      '127.0.0.1'
    );
  }
}
