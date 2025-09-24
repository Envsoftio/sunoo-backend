import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { Plan } from '../entities/plan.entity';
import { Subscription } from '../entities/subscription.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Plan, Subscription])],
  providers: [SubscriptionService],
  controllers: [SubscriptionController],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
