import {
  Controller,
  Get,
  UseGuards,
  Request,
  Res,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationService } from './notification.service';

@ApiTags('Real-time Notifications')
@Controller('api/notifications')
export class SseController implements OnModuleDestroy {
  private readonly logger = new Logger(SseController.name);

  constructor(private notificationService: NotificationService) {}

  @Get('subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subscribe to real-time subscription events' })
  @ApiResponse({ status: 200, description: 'SSE connection established' })
  subscribe(@Request() req, @Res() res: Response) {
    const userId = req.user.id;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    // Send initial connection event
    res.write(
      `data: ${JSON.stringify({
        type: 'connection_established',
        userId,
        timestamp: new Date(),
        message: 'Connected to subscription events',
      })}\n\n`
    );

    // Add connection to notification service
    this.notificationService.addConnection(userId, res as any);

    this.logger.log(`SSE connection established for user ${userId}`);

    // Handle client disconnect
    req.on('close', () => {
      this.logger.log(`SSE connection closed for user ${userId}`);
      this.notificationService.removeConnection(userId, res as any);
    });

    // Keep connection alive with heartbeat
    const heartbeat = setInterval(() => {
      try {
        if (res.writableEnded) {
          clearInterval(heartbeat);
          return;
        }
        res.write(
          `data: ${JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date(),
          })}\n\n`
        );
      } catch (error) {
        this.logger.error(`Heartbeat error for user ${userId}:`, error);
        clearInterval(heartbeat);
        this.notificationService.removeConnection(userId, res as any);
      }
    }, 30000); // Send heartbeat every 30 seconds

    // Clean up on module destroy
    req.on('close', () => {
      clearInterval(heartbeat);
    });
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get notification service status' })
  @ApiResponse({ status: 200, description: 'Status retrieved successfully' })
  getStatus() {
    return {
      activeConnections: this.notificationService.getActiveConnectionsCount(),
      activeUsers: this.notificationService.getActiveUsersCount(),
      timestamp: new Date(),
    };
  }

  onModuleDestroy() {
    this.logger.log('SSE Controller module destroyed');
  }
}
