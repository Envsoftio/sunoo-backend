import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { WebhookController } from './webhook.controller';
import { RevenueCatWebhookController } from './revenuecat-webhook.controller';
import { SseController } from './sse.controller';
import { RazorpayService } from './razorpay.service';
import { RevenueCatService } from './revenuecat.service';
import { PaymentService } from './payment.service';
import { NotificationService } from './notification.service';
import { LoggerService } from '../common/logger/logger.service';
import { Plan } from '../entities/plan.entity';
import { Subscription } from '../entities/subscription.entity';
import { Payment } from '../entities/payment.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Plan, Subscription, Payment]),
    EventEmitterModule.forRoot(),
    EmailModule,
  ],
  providers: [
    SubscriptionService,
    RazorpayService,
    RevenueCatService,
    PaymentService,
    NotificationService,
    LoggerService,
  ],
  controllers: [
    SubscriptionController,
    WebhookController,
    RevenueCatWebhookController,
    SseController,
  ],
  exports: [
    SubscriptionService,
    RazorpayService,
    RevenueCatService,
    PaymentService,
    NotificationService,
  ],
})
export class SubscriptionModule {}
