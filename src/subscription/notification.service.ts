import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observer, Observable, Subject } from 'rxjs';

export interface SubscriptionEvent {
  type:
    | 'subscription_created'
    | 'subscription_activated'
    | 'subscription_cancelled'
    | 'subscription_charged'
    | 'subscription_resumed'
    | 'subscription_pending'
    | 'subscription_halted'
    | 'payment_success'
    | 'payment_failed';
  userId: string;
  subscriptionId?: string;
  paymentId?: string;
  data: any;
  timestamp: Date;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly activeConnections = new Map<string, Observer<any>[]>();
  private readonly userStreams = new Map<string, Subject<any>>();

  constructor(private eventEmitter: EventEmitter2) {}

  // Store SSE connection for a user
  addConnection(userId: string, observer: Observer<any>) {
    if (!this.activeConnections.has(userId)) {
      this.activeConnections.set(userId, []);
    }
    this.activeConnections.get(userId)!.push(observer);
    this.logger.log(`Added SSE connection for user ${userId}`);
  }

  // Remove SSE connection for a user
  removeConnection(userId: string, observer?: Observer<any>) {
    if (observer) {
      const connections = this.activeConnections.get(userId);
      if (connections) {
        const index = connections.indexOf(observer);
        if (index > -1) {
          connections.splice(index, 1);
          this.logger.log(`Removed SSE connection for user ${userId}`);
        }
        if (connections.length === 0) {
          this.activeConnections.delete(userId);
        }
      }
    } else {
      // Remove all connections for user
      this.activeConnections.delete(userId);
      const stream = this.userStreams.get(userId);
      if (stream) {
        stream.complete();
        this.userStreams.delete(userId);
      }
      this.logger.log(`Removed all connections for user ${userId}`);
    }
  }

  // Get notification stream for a user
  getNotificationStream(userId: string): Observable<any> {
    if (!this.userStreams.has(userId)) {
      this.userStreams.set(userId, new Subject());
    }

    return this.userStreams.get(userId)!.asObservable();
  }

  // Send event to specific user
  sendToUser(userId: string, event: SubscriptionEvent) {
    const eventData = {
      data: JSON.stringify(event),
      type: event.type,
      id: `${event.type}_${Date.now()}`,
    };

    // Send to Observable stream
    const stream = this.userStreams.get(userId);
    if (stream) {
      try {
        if (stream.closed) {
          this.userStreams.set(userId, new Subject());
          this.userStreams.get(userId)!.next(eventData);
        } else {
          stream.next(eventData);
        }
        this.logger.log(`Sent event ${event.type} to user ${userId}`);
      } catch (error) {
        this.logger.error(`Error sending event to user ${userId}:`, error);
      }
    }

    // Send to legacy connections (if any)
    const connections = this.activeConnections.get(userId);
    if (connections && connections.length > 0) {
      const deadConnections: Observer<any>[] = [];
      for (const observer of connections) {
        try {
          observer.next(eventData);
          this.logger.log(
            `Sent event ${event.type} to user ${userId} connection`
          );
        } catch (error) {
          this.logger.error(`Error sending event to user ${userId}:`, error);
          deadConnections.push(observer);
        }
      }

      // Remove dead connections
      deadConnections.forEach(deadConn => {
        this.removeConnection(userId, deadConn);
      });
    }
  }

  // Broadcast event to all users (for admin notifications)
  broadcast(event: SubscriptionEvent) {
    this.logger.log(`Broadcasting event ${event.type}`);
    for (const [userId, _connections] of this.activeConnections) {
      this.sendToUser(userId, event);
    }
  }

  // Emit subscription events
  emitSubscriptionCreated(userId: string, subscriptionData: any) {
    const event: SubscriptionEvent = {
      type: 'subscription_created',
      userId,
      subscriptionId: subscriptionData.subscription_id,
      data: subscriptionData,
      timestamp: new Date(),
    };
    this.eventEmitter.emit('subscription.created', event);
    void this.sendToUser(userId, event);
  }

  emitSubscriptionActivated(userId: string, subscriptionData: any) {
    const event: SubscriptionEvent = {
      type: 'subscription_activated',
      userId,
      subscriptionId: subscriptionData.subscription_id,
      data: subscriptionData,
      timestamp: new Date(),
    };
    this.eventEmitter.emit('subscription.activated', event);
    void this.sendToUser(userId, event);
  }

  emitSubscriptionCancelled(userId: string, subscriptionData: any) {
    const event: SubscriptionEvent = {
      type: 'subscription_cancelled',
      userId,
      subscriptionId: subscriptionData.subscription_id,
      data: subscriptionData,
      timestamp: new Date(),
    };
    this.eventEmitter.emit('subscription.cancelled', event);
    void this.sendToUser(userId, event);
  }

  emitPaymentSuccess(userId: string, paymentData: any) {
    const event: SubscriptionEvent = {
      type: 'payment_success',
      userId,
      paymentId: paymentData.payment_id,
      subscriptionId: paymentData.subscription_id,
      data: paymentData,
      timestamp: new Date(),
    };
    this.eventEmitter.emit('payment.success', event);
    void this.sendToUser(userId, event);
  }

  emitPaymentFailed(userId: string, paymentData: any) {
    const event: SubscriptionEvent = {
      type: 'payment_failed',
      userId,
      paymentId: paymentData.payment_id,
      subscriptionId: paymentData.subscription_id,
      data: paymentData,
      timestamp: new Date(),
    };
    this.eventEmitter.emit('payment.failed', event);
    void this.sendToUser(userId, event);
  }

  emitSubscriptionCharged(userId: string, subscriptionData: any) {
    const event: SubscriptionEvent = {
      type: 'subscription_charged',
      userId,
      subscriptionId: subscriptionData.subscription_id || subscriptionData.id,
      data: subscriptionData,
      timestamp: new Date(),
    };
    this.eventEmitter.emit('subscription.charged', event);
    void this.sendToUser(userId, event);
  }

  emitSubscriptionResumed(userId: string, subscriptionData: any) {
    const event: SubscriptionEvent = {
      type: 'subscription_resumed',
      userId,
      subscriptionId: subscriptionData.subscription_id || subscriptionData.id,
      data: subscriptionData,
      timestamp: new Date(),
    };
    this.eventEmitter.emit('subscription.resumed', event);
    void this.sendToUser(userId, event);
  }

  emitSubscriptionPending(userId: string, subscriptionData: any) {
    const event: SubscriptionEvent = {
      type: 'subscription_pending',
      userId,
      subscriptionId: subscriptionData.subscription_id || subscriptionData.id,
      data: subscriptionData,
      timestamp: new Date(),
    };
    this.eventEmitter.emit('subscription.pending', event);
    void this.sendToUser(userId, event);
  }

  emitSubscriptionHalted(userId: string, subscriptionData: any) {
    const event: SubscriptionEvent = {
      type: 'subscription_halted',
      userId,
      subscriptionId: subscriptionData.subscription_id || subscriptionData.id,
      data: subscriptionData,
      timestamp: new Date(),
    };
    this.eventEmitter.emit('subscription.halted', event);
    void this.sendToUser(userId, event);
  }

  // Get active connections count
  getActiveConnectionsCount(): number {
    return Array.from(this.activeConnections.values()).reduce(
      (total, connections) => total + connections.length,
      0
    );
  }

  // Get active users count
  getActiveUsersCount(): number {
    return this.activeConnections.size;
  }
}
