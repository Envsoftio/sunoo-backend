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
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SecureAuthService } from './services/secure-auth.service';
import { RateLimitService } from './services/rate-limit.service';
import {
  LoginDto,
  RegisterDto,
  AuthResponseDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from '../dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SuperAdminGuard } from './guards/superadmin.guard';
import { AuthGuard } from '@nestjs/passport';
import { RateLimitGuard, RateLimit } from './guards/rate-limit.guard';

@ApiTags('Authentication')
@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly secureAuthService: SecureAuthService,
    private readonly rateLimitService: RateLimitService
  ) {}

  @Post('handleLogin')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard) // Enabled for development
  @RateLimit(true)
  @ApiOperation({
    summary: 'User login (Sunoo compatible) - Now with enhanced security',
  })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or account locked',
  })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async handleLogin(@Body() loginDto: LoginDto, @Request() req) {
    const clientIp = this.getClientIp(req);
    return this.secureAuthService.secureLogin(loginDto, clientIp);
  }

  @Post('handleSignup')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RateLimitGuard) // Enabled for development
  @RateLimit(true)
  @ApiOperation({
    summary:
      'User registration (Sunoo compatible) - Now with enhanced security',
  })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 400, description: 'Invalid input or weak password' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async handleSignup(@Body() registerDto: RegisterDto, @Request() req) {
    const clientIp = this.getClientIp(req);
    // Convert to secure registration format
    const secureRegisterDto = {
      email: registerDto.email,
      password: registerDto.password,
      name: registerDto.name,
      acceptTerms: true, // Assume terms accepted for Sunoo compatibility
    };
    return this.secureAuthService.secureRegister(secureRegisterDto, clientIp);
  }

  @Post('handleLogout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User logout (Sunoo compatible)' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  handleLogout() {
    return this.authService.handleLogout();
  }

  @Post('getProfile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile (Sunoo compatible)' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Body() body: { id: string }, @Request() req) {
    return this.authService.getProfile(body.id || req.user.id);
  }

  @Post('handleForget')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit(true)
  @ApiOperation({ summary: 'Forgot password (Sunoo compatible)' })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  async handleForget(@Body() forgotPasswordDto: ForgotPasswordDto) {
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

  @Post('handleUpdateUser')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile (Sunoo compatible)' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async handleUpdateUser(@Body() updateData: any, @Request() req) {
    return this.authService.handleUpdateUser(req.user.id, updateData);
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
  @ApiOperation({ summary: 'User login (Legacy)' })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'User registration (Legacy)' })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('clear-rate-limits')
  @ApiOperation({ summary: 'Clear rate limits (Development only)' })
  @ApiResponse({ status: 200, description: 'Rate limits cleared' })
  async clearRateLimits(@Request() req) {
    const clientIp = this.getClientIp(req);
    this.rateLimitService.resetRateLimit(clientIp);
    return { message: 'Rate limits cleared for this IP', clientIp };
  }

  @Get('verify-email')
  @ApiOperation({ summary: 'Verify user email with token' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Query('token') token: string) {
    return this.secureAuthService.verifyEmail(token);
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
}
