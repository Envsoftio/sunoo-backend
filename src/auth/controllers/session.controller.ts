import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { SessionService } from '../services/session.service';
import { RateLimitGuard } from '../guards/rate-limit.guard';

@Controller('auth/sessions')
@UseGuards(JwtAuthGuard, RateLimitGuard)
export class SessionController {
  constructor(private sessionService: SessionService) {}

  @Get()
  async getUserSessions(@Request() req) {
    const userId = req.user.id;
    const sessions = await this.sessionService.getUserSessions(userId);

    return {
      success: true,
      data: {
        sessions: sessions.map(session => ({
          id: session.id,
          userAgent: session.userAgent,
          ipAddress: session.ipAddress,
          deviceInfo: session.deviceInfo,
          lastUsedAt: session.lastUsedAt,
          createdAt: session.createdAt,
          isActive: session.isActive,
        })),
        total: sessions.length,
      },
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ isAuthEndpoint: true })
  async refreshSession(@Body() body: { refreshToken: string }) {
    try {
      const session = await this.sessionService.refreshSession(
        body.refreshToken
      );

      return {
        success: true,
        data: {
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          expiresAt: session.expiresAt,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          code: 'INVALID_REFRESH_TOKEN',
        },
      };
    }
  }

  @Delete('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() body: { refreshToken: string }) {
    try {
      await this.sessionService.invalidateSession(body.refreshToken);

      return {
        success: true,
        message: 'Logged out successfully',
      };
    } catch {
      return {
        success: false,
        error: {
          message: 'Logout failed',
          code: 'LOGOUT_FAILED',
        },
      };
    }
  }

  @Delete('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(@Request() req) {
    try {
      const userId = req.user.id;
      await this.sessionService.invalidateAllUserSessions(userId);

      return {
        success: true,
        message: 'All sessions logged out successfully',
      };
    } catch {
      return {
        success: false,
        error: {
          message: 'Logout all failed',
          code: 'LOGOUT_ALL_FAILED',
        },
      };
    }
  }

  @Get('active-count')
  async getActiveSessionCount(@Request() req) {
    const userId = req.user.id;
    const count = await this.sessionService.getActiveSessionCount(userId);

    return {
      success: true,
      data: {
        activeSessions: count,
      },
    };
  }
}

// Rate limit decorator
function RateLimit(options: { isAuthEndpoint: boolean }) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    Reflect.defineMetadata(
      'rateLimit',
      options.isAuthEndpoint,
      descriptor.value
    );
  };
}
