import {
  Controller,
  Get,
  Sse,
  MessageEvent,
  Logger,
  OnModuleDestroy,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Observable, interval, map, catchError, of, merge } from 'rxjs';
import { NotificationService } from './notification.service';

@ApiTags('Real-time Notifications')
@Controller('api/notifications')
export class SseController implements OnModuleDestroy {
  private readonly logger = new Logger(SseController.name);

  constructor(private notificationService: NotificationService) {}

  @Sse('subscribe')
  @ApiOperation({ summary: 'Subscribe to real-time subscription events' })
  @ApiResponse({ status: 200, description: 'SSE connection established' })
  subscribe(@Query('userId') userId: string): Observable<MessageEvent> {
    if (!userId) {
      throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
    }

    this.logger.log(`SSE connection established for user ${userId}`);

    try {
      // Create heartbeat observable (every 30 seconds)
      const heartbeat$ = interval(5000).pipe(
        map(() => ({
          data: {
            type: 'heartbeat',
            timestamp: new Date(),
          },
        })),
        catchError(error => {
          this.logger.error('Heartbeat error:', error);
          return of({
            data: {
              type: 'error',
              message: 'Heartbeat error',
              timestamp: new Date(),
            },
          });
        })
      );

      // Get notification stream from service
      const notificationStream$ = this.notificationService
        .getNotificationStream(userId)
        .pipe(
          catchError(error => {
            this.logger.error('Notification stream error:', error);
            return of({
              data: {
                type: 'error',
                message: 'Notification stream error',
                timestamp: new Date(),
              },
            });
          })
        );

      // Create initial connection event
      const initialEvent$ = of({
        data: {
          type: 'connection_established',
          userId,
          timestamp: new Date(),
          message: 'Connected to subscription events',
        },
      });

      // Merge all streams
      return merge(initialEvent$, heartbeat$, notificationStream$).pipe(
        catchError(error => {
          this.logger.error('SSE stream error:', error);
          return of({
            data: {
              type: 'error',
              message: 'Stream error',
              timestamp: new Date(),
            },
          });
        })
      );
    } catch (error) {
      this.logger.error('Error creating SSE stream:', error);
      throw new HttpException(
        'Failed to create SSE stream',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('status')
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
