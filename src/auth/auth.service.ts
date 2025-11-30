import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  HttpException,
  HttpStatus,
  BadRequestException,
  Logger,
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
import { UpdateEmailPreferencesDto } from '../dto/user.dto';
import { EmailService } from '../email/email.service';
import { SessionService } from './services/session.service';
import { RateLimitService } from './services/rate-limit.service';
import { AccountLockoutService } from './services/account-lockout.service';
import { PasswordValidationService } from './services/password-validation.service';
import { SecureJwtService } from './services/secure-jwt.service';
import { CountryDetectionService } from '../common/services/country-detection.service';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

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
    private secureJwtService: SecureJwtService,
    private countryDetectionService: CountryDetectionService,
    private configService: ConfigService
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });
    // Only validate password for email/password accounts
    // - provider is null (legacy users - backward compatible)
    // - provider is 'email' (new email/password users)
    // OAuth accounts (provider === 'google' or other OAuth providers) should not use password validation
    if (
      user &&
      user.password &&
      (!user.provider || user.provider === 'email') &&
      (await bcrypt.compare(password, user.password))
    ) {
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

    // Check if email is verified - this should be checked BEFORE password validation
    if (!user.isEmailVerified) {
      throw new UnauthorizedException({
        message:
          'Please verify your email address before logging in. Check your inbox for the verification email.',
        code: 'EMAIL_NOT_VERIFIED',
        requiresEmailVerification: true,
      });
    }

    // Check if user has default password (migrated user) - this should be checked BEFORE password validation
    if (user.hasDefaultPassword) {
      throw new UnauthorizedException({
        message: 'Please reset your password to continue',
        code: 'DEFAULT_PASSWORD_MIGRATION_REQUIRED',
        requiresPasswordReset: true,
        isMigrationRequired: true,
      });
    }

    // Check if user is OAuth-only - reject password-based login
    // OAuth accounts have provider set to 'google' (or other OAuth providers)
    // Password-based accounts have provider as null (legacy) or 'email' (new)
    // NOTE: Existing users with provider=null will pass this check (null && anything = false)
    if (user.provider && user.provider !== 'email') {
      throw new UnauthorizedException({
        message: `This account was created with ${user.provider} Sign-In. Please use ${user.provider} Sign-In to log in.`,
        code: 'OAUTH_ONLY_ACCOUNT',
        requiresOAuth: true,
        provider: user.provider,
      });
    }

    // Fallback: Also check if password is null (for safety - handles edge cases)
    // NOTE: Existing password users will have a password hash, so this check passes
    if (!user.password) {
      throw new UnauthorizedException({
        message:
          'This account was created with OAuth. Please use OAuth Sign-In to log in.',
        code: 'OAUTH_ONLY_ACCOUNT',
        requiresOAuth: true,
        provider: user.provider || 'google',
      });
    }

    // Validate password is provided in request
    if (!loginDto.password || loginDto.password.trim().length === 0) {
      throw new BadRequestException('Password is required');
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

    // Detect and update user's country if not already set or if it's been a while
    const userAgent = request?.headers?.['user-agent'];
    await this.updateUserCountryIfNeeded(user, clientIp, userAgent);

    // Update last login
    await this.userRepository.update(user.id, { lastLoginAt: new Date() });

    // Create session
    const session = await this.sessionService.createSession({
      userId: user.id,
      userAgent: userAgent,
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

  async register(
    registerDto: RegisterDto,
    request?: any
  ): Promise<AuthResponseDto> {
    // Validate password is provided and not empty (required for email/password signup)
    if (!registerDto.password || registerDto.password.trim().length === 0) {
      throw new BadRequestException('Password is required for registration');
    }

    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Detect country during registration
    const clientIP = this.getClientIp(request);
    const userAgent = request?.headers?.['user-agent'];
    let detectedCountry = 'United States'; // Default fallback
    try {
      const countryInfo = await this.countryDetectionService.detectCountry(
        clientIP,
        userAgent
      );
      detectedCountry = countryInfo.country;
      console.log(
        `Country detected during registration: ${detectedCountry} (${countryInfo.currency}) via ${countryInfo.source}`
      );
    } catch (error) {
      console.warn('Country detection failed during registration:', error);
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Generate secure email verification token
    const crypto = require('crypto');
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = this.userRepository.create({
      ...registerDto,
      password: hashedPassword,
      country: detectedCountry,
      role: 'user', // Set default role to 'user'
      isEmailVerified: false, // Email not verified by default
      emailVerificationToken: verificationToken,
      provider: 'email', // Mark as email/password account
    });

    const savedUser = await this.userRepository.save(user);

    // Send verification email - this is critical, so we log errors but don't fail registration
    try {
      const emailSent = await this.emailService.sendVerificationEmail(
        savedUser.email,
        savedUser.name || 'User',
        verificationToken
      );

      if (!emailSent) {
        console.error(
          `Failed to send verification email to ${savedUser.email}. User ID: ${savedUser.id}`
        );
      } else {
        console.log(
          `Verification email sent successfully to ${savedUser.email}. User ID: ${savedUser.id}`
        );
      }
    } catch (emailError) {
      console.error(
        `Error sending verification email to ${savedUser.email}:`,
        emailError
      );
      // Don't fail registration if email fails, but log it for admin review
    }

    // Don't return access token on registration - user needs to verify email first
    return {
      user: {
        id: savedUser.id,
        email: savedUser.email,
        name: savedUser.name,
        avatar: savedUser.avatar,
      },
      message:
        'Registration successful. Please check your email to verify your account before logging in.',
      requiresEmailVerification: true,
    } as AuthResponseDto;
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
        password: null, // No password for OAuth users (nullable field)
        role: 'user', // Default role
        isEmailVerified: true, // Google emails are pre-verified
        authId: providerId,
        provider: 'google',
      });
      user = await this.userRepository.save(user);
    } else if (!user.authId) {
      // Link existing email/password user with Google account
      // Only link if user is email-based (provider is null or 'email')
      if (!user.provider || user.provider === 'email') {
        user.authId = providerId;
        user.provider = 'google'; // User can now use Google Sign-In
        user.avatar = avatar || user.avatar;
        user = await this.userRepository.save(user);
      }
      // If user already has a different OAuth provider, don't overwrite
    }

    return user;
  }

  async loginWithGoogleRedirect(
    user: User,
    request?: any
  ): Promise<AuthResponseDto> {
    const clientIp = this.getClientIp(request);
    const userAgent = request?.headers?.['user-agent'];

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Detect and update user's country if needed
    await this.updateUserCountryIfNeeded(user, clientIp, userAgent);

    // Update last login
    await this.userRepository.update(user.id, { lastLoginAt: new Date() });

    // Create session
    const session = await this.sessionService.createSession({
      userId: user.id,
      userAgent: userAgent,
      ipAddress: clientIp,
      deviceInfo: request?.headers?.['x-device-info'],
      metadata: {
        loginMethod: 'google_oauth_redirect',
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

  async loginWithGoogleToken(
    idToken: string,
    request?: any
  ): Promise<AuthResponseDto> {
    const clientIp = this.getClientIp(request);
    const userAgent = request?.headers?.['user-agent'];

    try {
      // Get Google Client ID from config
      const googleClientId =
        this.configService.get<string>('GOOGLE_WEB_CLIENT_ID') ||
        this.configService.get<string>('GOOGLE_CLIENT_ID');

      if (!googleClientId) {
        throw new BadRequestException('Google OAuth is not configured');
      }

      // Verify the Google ID token
      const client = new OAuth2Client(googleClientId);
      const ticket = await client.verifyIdToken({
        idToken,
        audience: googleClientId,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('Invalid Google token');
      }

      // Extract user information from token
      const email = payload.email;
      const name =
        payload.name ||
        `${payload.given_name || ''} ${payload.family_name || ''}`.trim() ||
        email;
      const avatar = payload.picture || null;
      const providerId = payload.sub;

      if (!email) {
        throw new BadRequestException('Email not found in Google token');
      }

      // Validate and get/create user
      const googleUser = {
        email,
        name,
        avatar,
        provider: 'google',
        providerId,
      };

      const user = await this.validateGoogleUser(googleUser);

      if (!user.isActive) {
        throw new UnauthorizedException('Account is deactivated');
      }

      // Detect and update user's country if needed
      await this.updateUserCountryIfNeeded(user, clientIp, userAgent);

      // Update last login
      await this.userRepository.update(user.id, { lastLoginAt: new Date() });

      // Create session
      const session = await this.sessionService.createSession({
        userId: user.id,
        userAgent: userAgent,
        ipAddress: clientIp,
        deviceInfo: request?.headers?.['x-device-info'],
        metadata: {
          loginMethod: 'google_oauth',
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
    } catch (error) {
      this.logger.error('Google token verification failed:', error);
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new UnauthorizedException('Google authentication failed');
    }
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

  handleLogout() {
    return { success: true };
  }

  async invalidateAllUserSessions(userId: string) {
    try {
      await this.sessionService.invalidateAllUserSessions(userId);
      return { success: true };
    } catch (error) {
      console.error('Error invalidating user sessions:', error);
      return { success: false, error: error.message };
    }
  }

  async getActiveSessionCount(userId: string) {
    try {
      return await this.sessionService.getActiveSessionCount(userId);
    } catch (error) {
      console.error('Error getting active session count:', error);
      return 0;
    }
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
            code: 'USER_NOT_FOUND',
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
          code: 'PROFILE_FETCH_FAILED',
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
            code: 'USER_NOT_FOUND',
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
          code: 'RESET_REQUEST_FAILED',
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
            code: 'INVALID_RESET_TOKEN',
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
          code: 'RESET_FAILED',
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
            code: 'USER_NOT_FOUND',
          },
        };
      }

      // Check if user is OAuth-only - cannot change password
      // OAuth accounts have provider set to 'google' (or other OAuth providers)
      // Password-based accounts have provider as null (legacy) or 'email' (new)
      // NOTE: Existing users with provider=null will pass this check (null && anything = false)
      if (user.provider && user.provider !== 'email') {
        return {
          success: false,
          error: {
            message: `This account uses ${user.provider} authentication. Password cannot be changed.`,
            code: 'OAUTH_ONLY_ACCOUNT',
          },
        };
      }

      // Fallback: Also check if password is null (for safety - handles edge cases)
      // NOTE: Existing password users will have a password hash, so this check passes
      if (!user.password) {
        return {
          success: false,
          error: {
            message:
              'This account uses OAuth authentication. Password cannot be changed.',
            code: 'OAUTH_ONLY_ACCOUNT',
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
            code: 'INVALID_CURRENT_PASSWORD',
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
          code: 'CHANGE_PASSWORD_FAILED',
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
          code: 'UPDATE_FAILED',
        },
      };
    }
  }

  async updateEmailPreferences(
    userId: string,
    emailPreferences: UpdateEmailPreferencesDto
  ) {
    try {
      console.log('🔧 Email preferences update request:', {
        userId,
        emailPreferences,
        timestamp: new Date().toISOString(),
      });

      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      console.log('📧 Current user state before update:', {
        email_notifications_enabled: user.email_notifications_enabled,
        marketing_emails_enabled: user.marketing_emails_enabled,
        new_content_emails_enabled: user.new_content_emails_enabled,
        subscription_emails_enabled: user.subscription_emails_enabled,
      });

      // Update email preferences with timestamp
      const updateData = {
        ...emailPreferences,
        email_preferences_updated_at: new Date(),
      };

      console.log('📝 Update data being sent to database:', updateData);

      const updateResult = await this.userRepository.update(userId, updateData);
      console.log('✅ Database update result:', updateResult);

      return {
        success: true,
        message: 'Email preferences updated successfully',
        data: {
          email_notifications_enabled:
            emailPreferences.email_notifications_enabled ??
            user.email_notifications_enabled,
          marketing_emails_enabled:
            emailPreferences.marketing_emails_enabled ??
            user.marketing_emails_enabled,
          new_content_emails_enabled:
            emailPreferences.new_content_emails_enabled ??
            user.new_content_emails_enabled,
          subscription_emails_enabled:
            emailPreferences.subscription_emails_enabled ??
            user.subscription_emails_enabled,
          email_preferences_updated_at: updateData.email_preferences_updated_at,
        },
      };
    } catch {
      return {
        success: false,
        error: {
          message: 'Failed to update email preferences',
          code: 'EMAIL_PREFERENCES_UPDATE_FAILED',
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
          code: 'SUBSCRIPTION_FETCH_FAILED',
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
          code: 'SUBSCRIPTION_CANCEL_FAILED',
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
            code: 'USER_NOT_FOUND',
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
          code: 'USER_CHECK_FAILED',
        },
      };
    }
  }

  async verifyEmail(
    token: string
  ): Promise<{ success: boolean; message: string; email?: string }> {
    // Validate token input
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      this.logger.warn('Email verification attempted with invalid token');
      throw new BadRequestException({
        message: 'Verification token is required',
        code: 'MISSING_VERIFICATION_TOKEN',
      });
    }

    // Trim and normalize token
    const normalizedToken = token.trim();

    try {
      // Find user by verification token (case-sensitive match for security)
      const user = await this.userRepository.findOne({
        where: { emailVerificationToken: normalizedToken },
      });

      if (!user) {
        this.logger.warn(`Email verification failed: Invalid token provided`);
        throw new BadRequestException({
          message: 'Invalid or expired verification token',
          code: 'INVALID_VERIFICATION_TOKEN',
        });
      }

      // If already verified, return success (idempotent operation)
      if (user.isEmailVerified) {
        this.logger.log(
          `Email already verified for user ${user.id} (${user.email})`
        );
        return {
          success: true,
          message: 'Email is already verified. You can log in.',
          email: user.email,
        };
      }

      // Mark email as verified and clear token using save method for better reliability
      // Use transaction-like approach with explicit save
      user.isEmailVerified = true;
      user.emailVerificationToken = undefined;

      // Save with explicit error handling
      const savedUser = await this.userRepository.save(user);

      // Double-check the save succeeded
      if (!savedUser || !savedUser.isEmailVerified) {
        this.logger.error(
          `Failed to verify email for user ${user.id}. Save operation did not persist correctly.`
        );
        throw new HttpException(
          {
            message: 'Failed to verify email. Please try again.',
            code: 'VERIFICATION_FAILED',
          },
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      // Verify the update persisted in database
      const verificationCheck = await this.userRepository.findOne({
        where: { id: user.id },
        select: ['id', 'email', 'isEmailVerified', 'emailVerificationToken'],
      });

      if (!verificationCheck || !verificationCheck.isEmailVerified) {
        this.logger.error(
          `Email verification did not persist for user ${user.id}. Database verification failed.`
        );
        throw new HttpException(
          {
            message: 'Failed to verify email. Please try again.',
            code: 'VERIFICATION_FAILED',
          },
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      this.logger.log(
        `Email successfully verified for user ${user.id} (${user.email})`
      );

      return {
        success: true,
        message: 'Email verified successfully. You can now log in.',
        email: user.email,
      };
    } catch (error) {
      // Re-throw known exceptions
      if (
        error instanceof BadRequestException ||
        error instanceof HttpException
      ) {
        throw error;
      }

      // Log unexpected errors
      this.logger.error(
        `Unexpected error during email verification: ${error.message}`,
        error.stack
      );
      throw new HttpException(
        {
          message:
            'An error occurred while verifying your email. Please try again.',
          code: 'VERIFICATION_ERROR',
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async resendVerificationEmail(email: string): Promise<{
    success: boolean;
    message: string;
  }> {
    // Validate email input
    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      throw new BadRequestException({
        message: 'Email address is required',
        code: 'MISSING_EMAIL',
      });
    }

    // Normalize email (lowercase and trim)
    const normalizedEmail = email.toLowerCase().trim();

    try {
      const user = await this.userRepository.findOne({
        where: { email: normalizedEmail },
      });

      if (!user) {
        // Don't reveal if user exists or not for security
        this.logger.warn(
          `Resend verification requested for non-existent email: ${normalizedEmail}`
        );
        return {
          success: true,
          message:
            'If an account exists with this email, a verification email has been sent.',
        };
      }

      // If email is already verified, don't send another email
      if (user.isEmailVerified) {
        this.logger.log(
          `Resend verification requested for already verified email: ${normalizedEmail}`
        );
        return {
          success: true,
          message: 'This email address is already verified.',
        };
      }

      // Generate new secure verification token
      const crypto = require('crypto');
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Update user with new token using save for better reliability
      user.emailVerificationToken = verificationToken;
      const updatedUser = await this.userRepository.save(user);

      if (
        !updatedUser ||
        updatedUser.emailVerificationToken !== verificationToken
      ) {
        this.logger.error(
          `Failed to update verification token for user ${user.id}`
        );
        throw new HttpException(
          {
            message: 'Failed to generate verification token. Please try again.',
            code: 'TOKEN_GENERATION_FAILED',
          },
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      // Send verification email
      try {
        const emailSent = await this.emailService.sendVerificationEmail(
          user.email,
          user.name || 'User',
          verificationToken
        );

        if (!emailSent) {
          this.logger.error(
            `Failed to send verification email to ${user.email} (User ID: ${user.id})`
          );
          throw new HttpException(
            {
              message:
                'Failed to send verification email. Please try again later.',
              code: 'EMAIL_SEND_FAILED',
            },
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }

        this.logger.log(
          `Verification email resent successfully to ${user.email} (User ID: ${user.id})`
        );

        return {
          success: true,
          message: 'Verification email sent. Please check your inbox.',
        };
      } catch (emailError) {
        this.logger.error(
          `Error sending verification email to ${user.email}:`,
          emailError
        );
        throw new HttpException(
          {
            message:
              'Failed to send verification email. Please try again later.',
            code: 'EMAIL_SEND_FAILED',
          },
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    } catch (error) {
      // Re-throw known exceptions
      if (
        error instanceof BadRequestException ||
        error instanceof HttpException
      ) {
        throw error;
      }

      // Log unexpected errors
      this.logger.error(
        `Unexpected error during resend verification: ${error.message}`,
        error.stack
      );
      throw new HttpException(
        {
          message: 'An error occurred. Please try again later.',
          code: 'RESEND_VERIFICATION_ERROR',
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
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

  /**
   * Update user's country if needed
   */
  async updateUserCountryIfNeeded(
    user: User,
    clientIP?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      // Only update country if:
      // 1. User doesn't have a country set, OR
      // 2. User's last login was more than 30 days ago (re-detect for accuracy)
      const shouldUpdateCountry =
        !user.country ||
        !user.lastLoginAt ||
        Date.now() - user.lastLoginAt.getTime() > 30 * 24 * 60 * 60 * 1000; // 30 days

      if (shouldUpdateCountry) {
        const countryInfo = await this.countryDetectionService.detectCountry(
          clientIP,
          userAgent
        );

        await this.userRepository.update(user.id, {
          country: countryInfo.country,
        });

        console.log(
          `Updated country for user ${user.email}: ${countryInfo.country} (${countryInfo.currency}) via ${countryInfo.source}`
        );
      }
    } catch (error) {
      // Don't fail login if country detection fails
      console.error('Failed to update user country:', error);
    }
  }

  /**
   * Get IP provider health status
   */
  async getIpProvidersHealth() {
    return this.countryDetectionService.getProviderHealthStatus();
  }

  /**
   * Request account deletion - sends confirmation email (authenticated only)
   */
  async requestAccountDeletion(userId: string) {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        return {
          success: false,
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND',
          },
        };
      }

      // Generate deletion token
      const deletionToken = require('crypto').randomBytes(32).toString('hex');
      const deletionExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await this.userRepository.update(user.id, {
        passwordResetToken: deletionToken, // Reuse passwordResetToken field for deletion
        passwordResetExpires: deletionExpires,
      });

      // Send deletion confirmation email
      try {
        await this.emailService.sendAccountDeletionEmail(
          user.email,
          user.name || 'User',
          deletionToken
        );

        return {
          success: true,
          message:
            'Account deletion confirmation email sent. Please check your inbox.',
        };
      } catch (emailError) {
        console.error('Failed to send deletion email:', emailError);
        return {
          success: false,
          error: {
            message: 'Failed to send deletion email. Please try again later.',
            code: 'EMAIL_SEND_FAILED',
          },
        };
      }
    } catch {
      return {
        success: false,
        error: {
          message: 'Failed to process deletion request',
          code: 'DELETION_REQUEST_FAILED',
        },
      };
    }
  }

  /**
   * Confirm and process account deletion (authenticated user only)
   */
  async confirmAccountDeletion(userId: string, token: string) {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId, passwordResetToken: token },
      });

      if (
        !user ||
        !user.passwordResetExpires ||
        user.passwordResetExpires < new Date()
      ) {
        return {
          success: false,
          error: {
            message: 'Invalid or expired deletion token',
            code: 'INVALID_DELETION_TOKEN',
          },
        };
      }

      // Delete user account (soft delete)
      await this.userRepository.softDelete(user.id);

      // Cancel all active subscriptions
      await this.subscriptionRepository.update(
        { user_id: user.id },
        { status: 'cancelled', cancelledAt: new Date() }
      );

      // Invalidate all user sessions
      await this.sessionService.invalidateAllUserSessions(user.id);

      return {
        success: true,
        message:
          'Your account and all associated data have been deleted successfully.',
      };
    } catch (error) {
      console.error('Account deletion error:', error);
      return {
        success: false,
        error: {
          message: 'Failed to delete account',
          code: 'DELETION_FAILED',
        },
      };
    }
  }

  /**
   * Delete account immediately (authenticated user)
   */
  async deleteAccount(userId: string) {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        return {
          success: false,
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND',
          },
        };
      }

      // Delete user account (soft delete)
      await this.userRepository.softDelete(userId);

      // Cancel all active subscriptions
      await this.subscriptionRepository.update(
        { user_id: userId },
        { status: 'cancelled', cancelledAt: new Date() }
      );

      // Invalidate all user sessions
      await this.sessionService.invalidateAllUserSessions(userId);

      return {
        success: true,
        message:
          'Your account and all associated data have been deleted successfully.',
      };
    } catch (error) {
      console.error('Account deletion error:', error);
      return {
        success: false,
        error: {
          message: 'Failed to delete account',
          code: 'DELETION_FAILED',
        },
      };
    }
  }
}
