import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { WebhookController } from './webhook.controller';
import { SseController } from './sse.controller';
import { RazorpayService } from './razorpay.service';
import { PaymentService } from './payment.service';
import { NotificationService } from './notification.service';
import { LoggerService } from '../common/logger/logger.service';
import { Plan } from '../entities/plan.entity';
import { Subscription } from '../entities/subscription.entity';
import { Payment } from '../entities/payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Plan, Subscription, Payment]),
    EventEmitterModule.forRoot(),
  ],
  providers: [
    SubscriptionService,
    RazorpayService,
    PaymentService,
    NotificationService,
    LoggerService,
  ],
  controllers: [SubscriptionController, WebhookController, SseController],
  exports: [
    SubscriptionService,
    RazorpayService,
    PaymentService,
    NotificationService,
  ],
})
export class SubscriptionModule {}
