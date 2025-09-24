import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from '../entities/plan.entity';
import { Subscription } from '../entities/subscription.entity';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(Plan)
    private planRepository: Repository<Plan>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>
  ) {}

  async getAllPlans() {
    try {
      const plans = await this.planRepository.find({
        where: { isActive: true },
        order: { sortOrder: 'ASC' },
      });

      return { status: 201, plans };
    } catch (error) {
      return { status: 400, message: error.message };
    }
  }

  async getPlanById(id: string) {
    try {
      const plan = await this.planRepository.findOne({
        where: { id, isActive: true },
      });

      if (!plan) {
        return { success: false, message: 'Plan not found' };
      }

      return { success: true, data: plan };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async createSubscription(userId: string, subscriptionData: any) {
    try {
      const { planId, razorpaySubscriptionId, razorpayPaymentId } =
        subscriptionData;

      // Check if plan exists
      const plan = await this.planRepository.findOne({
        where: { id: planId, isActive: true },
      });

      if (!plan) {
        return { success: false, message: 'Plan not found' };
      }

      // Cancel any existing active subscriptions
      await this.subscriptionRepository.update(
        { userId, status: 'active' },
        { status: 'cancelled', cancelledAt: new Date() }
      );

      // Create new subscription
      const subscription = this.subscriptionRepository.create({
        userId,
        planId,
        razorpaySubscriptionId,
        razorpayPaymentId,
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        isTrial: false,
      });

      await this.subscriptionRepository.save(subscription);

      return { success: true, data: subscription };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async cancelSubscription(userId: string, cancellationData: any) {
    try {
      const { subscriptionId } = cancellationData;

      const subscription = await this.subscriptionRepository.findOne({
        where: { id: subscriptionId, userId },
      });

      if (!subscription) {
        return { success: false, message: 'Subscription not found' };
      }

      await this.subscriptionRepository.update(subscriptionId, {
        status: 'cancelled',
        cancelledAt: new Date(),
      });

      return { success: true, message: 'Subscription cancelled successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getSubscriptionById(userId: string, subscriptionId: string) {
    try {
      const subscription = await this.subscriptionRepository.findOne({
        where: { id: subscriptionId, userId },
        relations: ['plan'],
      });

      if (!subscription) {
        return { success: false, message: 'Subscription not found' };
      }

      return { success: true, data: subscription };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getSubscriptionInvoices(userId: string) {
    try {
      const subscriptions = await this.subscriptionRepository.find({
        where: { userId },
        relations: ['plan'],
        order: { createdAt: 'DESC' },
      });

      return { success: true, data: subscriptions };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}
