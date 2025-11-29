import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Put,
  Query,
  Delete,
  UnauthorizedException,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RateLimitService } from './services/rate-limit.service';
import {
  LoginDto,
  RegisterDto,
  AuthResponseDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  ResendVerificationDto,
} from '../dto/auth.dto';
import { UpdateEmailPreferencesDto } from '../dto/user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SuperAdminGuard } from './guards/superadmin.guard';
import { AuthGuard } from '@nestjs/passport';
import { RateLimitGuard, RateLimit } from './guards/rate-limit.guard';

@ApiTags('Authentication')
@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly rateLimitService: RateLimitService
  ) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req) {
    const result = await this.authService.getProfile(req.user.id);
    if (result.success) {
      const {
        password: _password,
        passwordResetExpires: _passwordResetExpires,
        passwordResetToken: _passwordResetToken,
        emailVerificationToken: _emailVerificationToken,
        lastLoginAt: _lastLoginAt,
        hasDefaultPassword: _hasDefaultPassword,
        ...sanitized
      } = result.data || {};

      return sanitized;
    } else {
      throw new UnauthorizedException(
        result.error?.message || 'Failed to get profile'
      );
    }
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(@Body() updateData: any, @Request() req) {
    return this.authService.handleUpdateUser(req.user.id, updateData);
  }

  @Put('profile/email-preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update email preferences' })
  @ApiResponse({
    status: 200,
    description: 'Email preferences updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Invalid email preferences data' })
  async updateEmailPreferences(
    @Body() emailPreferences: UpdateEmailPreferencesDto,
    @Request() req
  ) {
    return await this.authService.updateEmailPreferences(
      req.user.id,
      emailPreferences
    );
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit(true)
  @ApiOperation({ summary: 'Forgot password' })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.handleForget(forgotPasswordDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit(true)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password (authenticated user)' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid current password' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @Request() req
  ) {
    return this.authService.changePassword(req.user.id, changePasswordDto);
  }

  @Post('check-user')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if user exists and needs password reset' })
  @ApiResponse({ status: 200, description: 'User check completed' })
  async checkUser(@Body() body: { email: string }) {
    return this.authService.checkUserExists(body.email);
  }

  @Post('getUserSubscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user subscription (Sunoo compatible)' })
  @ApiResponse({
    status: 200,
    description: 'Subscription retrieved successfully',
  })
  async getUserSubscription(@Body() body: { id: string }, @Request() req) {
    return this.authService.getUserSubscription(body.id || req.user.id);
  }

  @Post('deleteSubscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete user subscription (Sunoo compatible)' })
  @ApiResponse({
    status: 200,
    description: 'Subscription deleted successfully',
  })
  async deleteSubscription(@Body() body: { id: string }, @Request() req) {
    return this.authService.deleteSubscription(body.id || req.user.id);
  }

  // Google OAuth endpoints
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth login' })
  @ApiResponse({ status: 302, description: 'Redirects to Google OAuth' })
  async googleAuth() {
    // This endpoint initiates Google OAuth flow
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({ status: 200, description: 'Google OAuth successful' })
  googleAuthRedirect(@Request() req) {
    const user = req.user;
    const payload = { email: user.email, sub: user.id };
    const accessToken = this.authService['jwtService'].sign(payload);

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
        },
        accessToken,
      },
    };
  }

  // Admin management endpoints
  @Get('admin/users')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users (Superadmin only)' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getAllUsers() {
    return this.authService.getAllUsers();
  }

  @Post('admin/create-superadmin')
  @ApiOperation({ summary: 'Create superadmin account' })
  @ApiResponse({ status: 201, description: 'Superadmin created successfully' })
  async createSuperAdmin(
    @Body() body: { email: string; password: string; name: string }
  ) {
    return this.authService.createSuperAdmin(
      body.email,
      body.password,
      body.name
    );
  }

  @Patch('admin/users/:id/role')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user role (Superadmin only)' })
  @ApiResponse({ status: 200, description: 'User role updated successfully' })
  async updateUserRole(
    @Param('id') userId: string,
    @Body() body: { role: string }
  ) {
    return this.authService.updateUserRole(userId, body.role);
  }

  @Patch('admin/users/:id/deactivate')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate user (Superadmin only)' })
  @ApiResponse({ status: 200, description: 'User deactivated successfully' })
  async deactivateUser(@Param('id') userId: string) {
    await this.authService.deactivateUser(userId);
    return { message: 'User deactivated successfully' };
  }

  @Patch('admin/users/:id/activate')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate user (Superadmin only)' })
  @ApiResponse({ status: 200, description: 'User activated successfully' })
  async activateUser(@Param('id') userId: string) {
    await this.authService.activateUser(userId);
    return { message: 'User activated successfully' };
  }

  // Legacy endpoints for compatibility
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit(true)
  @ApiOperation({
    summary: 'User login with rate limiting and account lockout',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or account locked',
  })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async login(
    @Body() loginDto: LoginDto,
    @Request() req
  ): Promise<AuthResponseDto> {
    try {
      return await this.authService.login(loginDto, req);
    } catch (error) {
      // Handle email not verified error
      if (error.code === 'EMAIL_NOT_VERIFIED') {
        const errorResponse = {
          message: error.message,
          code: error.code,
          requiresEmailVerification: error.requiresEmailVerification || true,
        };
        console.log('Throwing EMAIL_NOT_VERIFIED exception:', errorResponse);
        throw new UnauthorizedException(errorResponse);
      }

      // Handle default password migration required error
      if (error.code === 'DEFAULT_PASSWORD_MIGRATION_REQUIRED') {
        throw new UnauthorizedException({
          message: error.message,
          code: error.code,
          requiresPasswordReset: error.requiresPasswordReset,
          isMigrationRequired: error.isMigrationRequired,
        });
      }

      // Handle password reset required error (normal forgot password)
      if (error.code === 'PASSWORD_RESET_REQUIRED') {
        throw new UnauthorizedException({
          message: error.message,
          code: error.code,
          requiresPasswordReset: error.requiresPasswordReset,
        });
      }

      // Handle invalid credentials with attempt information
      if (error.code === 'INVALID_CREDENTIALS') {
        throw new UnauthorizedException({
          message: error.message,
          code: error.code,
          remainingAttempts: error.remainingAttempts,
          isLocked: error.isLocked,
          lockoutTime: error.lockoutTime,
        });
      }

      throw error;
    }
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'User registration with country detection' })
  async register(
    @Body() registerDto: RegisterDto,
    @Request() req
  ): Promise<AuthResponseDto> {
    return this.authService.register(registerDto, req);
  }

  @Post('clear-rate-limits')
  @ApiOperation({ summary: 'Clear rate limits (Development only)' })
  @ApiResponse({ status: 200, description: 'Rate limits cleared' })
  clearRateLimits(@Request() req) {
    const clientIp = this.getClientIp(req);
    this.rateLimitService.resetRateLimit(clientIp);
    return { message: 'Rate limits cleared for this IP', clientIp };
  }

  @Get('verify-email')
  @ApiOperation({
    summary: 'Verify user email with token',
    description:
      "Verifies a user's email address using the token sent in the verification email. This endpoint should be called from the frontend when the user clicks the verification link.",
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Email verified successfully. You can now log in.',
        },
        email: { type: 'string', example: 'user@example.com' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired token',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'string', example: 'INVALID_VERIFICATION_TOKEN' },
      },
    },
  })
  async verifyEmail(@Query('token') token: string) {
    try {
      return await this.authService.verifyEmail(token);
    } catch (error) {
      // Ensure proper error format is returned
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          message: 'An error occurred while verifying your email.',
          code: 'VERIFICATION_ERROR',
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit(true)
  @ApiOperation({ summary: 'Resend verification email' })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async resendVerificationEmail(
    @Body() resendVerificationDto: ResendVerificationDto
  ) {
    return this.authService.resendVerificationEmail(
      resendVerificationDto.email
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@Request() req) {
    try {
      // Get user ID from JWT token
      const userId = req.user.id;

      // Invalidate all user sessions
      const result = await this.authService.invalidateAllUserSessions(userId);
      return {
        success: true,
        message: 'Logged out successfully',
        userId,
        sessionsInvalidated: result.success,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Logout failed',
        error: error.message,
      };
    }
  }

  @Get('logout-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if user session is still valid' })
  @ApiResponse({ status: 200, description: 'Session status retrieved' })
  @ApiResponse({ status: 401, description: 'Session invalid' })
  async logoutStatus(@Request() req) {
    try {
      const userId = req.user.id;
      const activeSessions =
        await this.authService.getActiveSessionCount(userId);
      return {
        success: true,
        userId,
        activeSessions,
        isAuthenticated: true,
        message: 'Session is valid',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Session invalid',
        error: error.message,
      };
    }
  }

  // Get user country information
  @Get('country-info')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user country information' })
  @ApiResponse({ status: 200, description: 'Country information retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCountryInfo(@Request() req) {
    const user = await this.authService.getProfile(req.user.id);
    if (!user.success || !user.data) {
      throw new UnauthorizedException('User not found');
    }

    return {
      success: true,
      data: {
        country: user.data.country || 'United States',
        currency: this.getCurrencyForCountry(
          user.data.country || 'United States'
        ),
      },
    };
  }

  // Get IP provider health status
  @Get('ip-providers-health')
  @ApiOperation({ summary: 'Get IP provider health status' })
  @ApiResponse({
    status: 200,
    description: 'IP provider health status retrieved',
  })
  async getIpProvidersHealth() {
    return this.authService.getIpProvidersHealth();
  }

  // Account deletion endpoints (authenticated only)
  @Post('delete-account-request')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request account deletion (sends confirmation email)',
  })
  @ApiResponse({
    status: 200,
    description: 'Deletion confirmation email sent',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async requestAccountDeletion(@Request() req) {
    return this.authService.requestAccountDeletion(req.user.id);
  }

  @Post('confirm-delete-account')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirm account deletion with token (authenticated)',
  })
  @ApiResponse({
    status: 200,
    description: 'Account deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired token',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async confirmAccountDeletion(
    @Request() req,
    @Body() body: { token: string }
  ) {
    return this.authService.confirmAccountDeletion(req.user.id, body.token);
  }

  // Immediate account deletion (authenticated)
  @Delete('account')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete own account immediately (authenticated)' })
  @ApiResponse({
    status: 200,
    description: 'Account deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteAccount(@Request() req) {
    return this.authService.deleteAccount(req.user.id);
  }

  // Helper method to get client IP
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

  // Helper method to get currency for country
  private getCurrencyForCountry(country: string): string {
    const countryCurrencyMap = {
      'United States': 'USD',
      Canada: 'CAD',
      Australia: 'AUD',
      India: 'INR',
      Pakistan: 'PKR',
      'New Zealand': 'NZD',
      'United Kingdom': 'GBP',
      Germany: 'EUR',
      France: 'EUR',
      Singapore: 'SGD',
    };

    return countryCurrencyMap[country] || 'USD';
  }
}
