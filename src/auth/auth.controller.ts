import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, AuthResponseDto } from '../dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('handleLogin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login (Sunoo compatible)' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async handleLogin(@Body() loginDto: LoginDto) {
    return this.authService.handleLogin(loginDto);
  }

  @Post('handleSignup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'User registration (Sunoo compatible)' })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async handleSignup(@Body() registerDto: RegisterDto) {
    return this.authService.handleSignup(registerDto);
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
  @ApiOperation({ summary: 'Forgot password (Sunoo compatible)' })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  handleForget(@Body() body: { email: string }) {
    return this.authService.handleForget(body.email);
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
}
