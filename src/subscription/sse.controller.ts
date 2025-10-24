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
import { Observable, interval, map, catchError, of, merge, tap } from 'rxjs';
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
      const heartbeat$ = interval(30000).pipe(
        map(() => ({
          data: JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString(),
          }),
        })),
        catchError(error => {
          this.logger.error('Heartbeat error:', error);
          return of({
            data: JSON.stringify({
              type: 'error',
              message: 'Heartbeat error',
              timestamp: new Date().toISOString(),
            }),
          });
        })
      );

      const notificationStream$ = this.notificationService
        .getNotificationStream(userId)
        .pipe(
          map(event => ({
            id: event.id,
            type: event.type,
            data: event.data, // event.data is already JSON stringified
            event: event.type, // This makes it a custom SSE event
          })),
          catchError(error => {
            this.logger.error('Notification stream error:', error);
            return of({
              data: JSON.stringify({
                type: 'error',
                message: 'Notification stream error',
                timestamp: new Date().toISOString(),
              }),
            });
          })
        );

      const connection$ = new Observable<MessageEvent>(observer => {
        this.notificationService.addConnection(userId, observer);

        // On client disconnect
        return () => {
          this.logger.log(`SSE connection closed for user ${userId}`);
          this.notificationService.removeConnection(userId, observer);
        };
      });

      const initialEvent$ = of({
        data: JSON.stringify({
          type: 'connection_established',
          userId,
          timestamp: new Date().toISOString(),
          message: 'Connected to subscription events',
        }),
      });

      const mergedStream$ = merge(
        initialEvent$,
        heartbeat$,
        notificationStream$,
        connection$
      );

      this.logger.log(`SSE stream created for user ${userId}`);

      return mergedStream$.pipe(
        tap(event => {
          this.logger.log(
            `SSE emitting event to user ${userId}: ${(event as any).type || 'message'}`
          );
        }),
        catchError(error => {
          this.logger.error('SSE stream error:', error);
          return of({
            data: JSON.stringify({
              type: 'error',
              message: 'Stream error',
              timestamp: new Date().toISOString(),
            }),
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
  getStatus() {
    return {
      activeConnections: this.notificationService.getActiveConnectionsCount(),
      activeUsers: this.notificationService.getActiveUsersCount(),
      timestamp: new Date(),
    };
  }

  @Get('test-event')
  testEvent(
    @Query('userId') userId: string,
    @Query('eventType') eventType = 'test'
  ) {
    if (!userId) {
      throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
    }

    const testEvent = {
      type: eventType as any,
      userId,
      data: {
        message: 'This is a test event',
        timestamp: new Date(),
      },
      timestamp: new Date(),
    };

    this.notificationService.sendToUser(userId, testEvent);

    return {
      message: `Test event '${eventType}' sent to user ${userId}`,
      event: testEvent,
      timestamp: new Date(),
    };
  }

  onModuleDestroy() {
    this.logger.log('SSE Controller module destroyed');
  }
}
