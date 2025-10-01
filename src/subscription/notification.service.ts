import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Response } from 'express';

export interface SubscriptionEvent {
  type:
    | 'subscription_created'
    | 'subscription_activated'
    | 'subscription_cancelled'
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
  private readonly activeConnections = new Map<string, Response[]>();

  constructor(private eventEmitter: EventEmitter2) {}

  // Store SSE connection for a user
  addConnection(userId: string, response: Response) {
    if (!this.activeConnections.has(userId)) {
      this.activeConnections.set(userId, []);
    }
    this.activeConnections.get(userId)!.push(response);
    this.logger.log(`Added SSE connection for user ${userId}`);
  }

  // Remove SSE connection for a user
  removeConnection(userId: string, response: Response) {
    const connections = this.activeConnections.get(userId);
    if (connections) {
      const index = connections.indexOf(response);
      if (index > -1) {
        connections.splice(index, 1);
        this.logger.log(`Removed SSE connection for user ${userId}`);
      }
      if (connections.length === 0) {
        this.activeConnections.delete(userId);
      }
    }
  }

  // Send event to specific user
  sendToUser(userId: string, event: SubscriptionEvent) {
    const connections = this.activeConnections.get(userId);
    if (!connections || connections.length === 0) {
      this.logger.warn(`No active connections for user ${userId}`);
      return;
    }

    const eventData = `data: ${JSON.stringify(event)}\n\n`;

    // Send to all connections for this user
    const deadConnections: Response[] = [];
    for (const response of connections) {
      try {
        // Check if connection is still alive
        if ((response as any).writableEnded) {
          deadConnections.push(response);
          continue;
        }

        // Write the event data
        (response as any).write(eventData);
        this.logger.log(`Sent event ${event.type} to user ${userId}`);
      } catch (error) {
        this.logger.error(`Error sending event to user ${userId}:`, error);
        deadConnections.push(response);
      }
    }

    // Remove dead connections
    deadConnections.forEach(deadConn => {
      this.removeConnection(userId, deadConn);
    });
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
