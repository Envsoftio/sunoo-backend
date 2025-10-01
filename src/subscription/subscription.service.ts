import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from '../entities/plan.entity';
import { Subscription } from '../entities/subscription.entity';
import { RazorpayService } from './razorpay.service';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(Plan)
    private planRepository: Repository<Plan>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    private razorpayService: RazorpayService
  ) {}

  async getAllPlans() {
    try {
      const plans = await this.planRepository.find({
        where: {},
        order: { amount: 'ASC' },
      });

      return { status: 201, plans };
    } catch (error) {
      return { status: 400, message: error.message };
    }
  }

  async getPlanById(id: string) {
    try {
      // Check if the id is a UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      let plan;
      if (uuidRegex.test(id)) {
        // If it's a UUID, search by id
        plan = await this.planRepository.findOne({
          where: { id },
        });
      } else {
        // If it's not a UUID, search by Razorpay plan ID
        plan = await this.planRepository.findOne({
          where: { razorpayPlanId: id },
        });
      }

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
        where: { id: planId },
      });

      if (!plan) {
        return { success: false, message: 'Plan not found' };
      }

      // Cancel any existing active subscriptions
      await this.subscriptionRepository.update(
        { user_id: userId, status: 'active' },
        { status: 'cancelled', cancelledAt: new Date() }
      );

      // Create new subscription
      const subscription = this.subscriptionRepository.create({
        user_id: userId,
        plan_id: planId,
        subscription_id: razorpaySubscriptionId,
        status: 'active',
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        // Legacy fields for backward compatibility
        razorpaySubscriptionId,
        razorpayPaymentId,
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
        where: { id: parseInt(subscriptionId), user_id: userId },
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
        where: { id: parseInt(subscriptionId), user_id: userId },
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
        where: { user_id: userId },
        order: { created_at: 'DESC' },
      });

      return { success: true, data: subscriptions };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async updateSubscriptionTrial(userId: string, subscriptionId: string) {
    try {
      const subscription = await this.subscriptionRepository.findOne({
        where: { id: parseInt(subscriptionId), user_id: userId },
      });

      if (!subscription) {
        return { success: false, message: 'Subscription not found' };
      }

      // Update trial status logic here
      subscription.isTrial = false;
      await this.subscriptionRepository.save(subscription);

      return { success: true, message: 'Trial updated successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Additional methods for frontend compatibility
  async getUserSubscription(userId: string) {
    try {
      const subscription = await this.subscriptionRepository.findOne({
        where: { user_id: userId, status: 'active' },
        order: { created_at: 'DESC' },
      });

      if (!subscription) {
        return { success: false, message: 'No active subscription found' };
      }

      return { success: true, data: subscription };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async updateSubscription(userId: string, updateData: any) {
    try {
      const subscription = await this.subscriptionRepository.findOne({
        where: { user_id: userId, status: 'active' },
      });

      if (!subscription) {
        return { success: false, message: 'No active subscription found' };
      }

      Object.assign(subscription, updateData);
      await this.subscriptionRepository.save(subscription);

      return { success: true, message: 'Subscription updated successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getSubscriptionEvents(userId: string) {
    try {
      const subscriptions = await this.subscriptionRepository.find({
        where: { user_id: userId },
        order: { created_at: 'DESC' },
      });

      return { success: true, data: subscriptions };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // New methods for Razorpay integration
  async createRazorpaySubscription(subscriptionData: {
    plan_id: string;
    total_count: number;
    start_at?: number;
    customer_notify: number;
    notify_info: any;
    notes: any;
  }) {
    try {
      const response =
        await this.razorpayService.createSubscription(subscriptionData);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async cancelRazorpaySubscription(
    subscriptionId: string,
    cancelAtCycleEnd = false
  ) {
    try {
      const response = await this.razorpayService.cancelSubscription(
        subscriptionId,
        cancelAtCycleEnd
      );
      return { success: true, data: response };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getRazorpaySubscription(subscriptionId: string) {
    try {
      const response =
        await this.razorpayService.getSubscription(subscriptionId);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getRazorpaySubscriptionInvoices(subscriptionId: string) {
    try {
      const response =
        await this.razorpayService.getSubscriptionInvoices(subscriptionId);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async upsertSubscription(subscriptionData: {
    subscription_id: string;
    user_id?: string;
    plan_id?: string;
    status?: string;
    start_date?: Date;
    end_date?: Date;
    next_billing_date?: Date;
    metadata?: any;
    isTrial?: boolean;
    trialEndDate?: Date;
  }) {
    try {
      const existingSubscription = await this.subscriptionRepository.findOne({
        where: { subscription_id: subscriptionData.subscription_id },
      });

      if (existingSubscription) {
        Object.assign(existingSubscription, subscriptionData);
        await this.subscriptionRepository.save(existingSubscription);
        return { success: true, data: existingSubscription };
      } else {
        const subscription =
          this.subscriptionRepository.create(subscriptionData);
        await this.subscriptionRepository.save(subscription);
        return { success: true, data: subscription };
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async updateSubscriptionStatus(
    subscriptionId: string,
    status: string,
    additionalData?: {
      next_billing_date?: Date;
      ended_at?: number;
      end_date?: Date;
      user_cancelled?: boolean;
      metadata?: any;
    }
  ) {
    try {
      const updateData: any = { status };
      if (additionalData) {
        Object.assign(updateData, additionalData);
      }

      await this.subscriptionRepository.update(
        { subscription_id: subscriptionId },
        updateData
      );

      return { success: true, message: 'Subscription status updated' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getSubscriptionByRazorpayId(razorpaySubscriptionId: string) {
    try {
      const subscription = await this.subscriptionRepository.findOne({
        where: { subscription_id: razorpaySubscriptionId },
        relations: ['user'],
      });

      if (!subscription) {
        return { success: false, message: 'Subscription not found' };
      }

      return { success: true, data: subscription };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getActiveSubscriptionsByUserId(userId: string) {
    try {
      const subscriptions = await this.subscriptionRepository.find({
        where: {
          user_id: userId,
          status: 'active',
        },
        order: { created_at: 'DESC' },
      });

      return { success: true, data: subscriptions };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Get subscription invoices for a user
  async getUserSubscriptionInvoices(userId: string) {
    try {
      // Get user's active subscription
      const subscription = await this.subscriptionRepository.findOne({
        where: { user_id: userId, status: 'active' },
        order: { created_at: 'DESC' },
      });

      if (!subscription) {
        return { success: false, message: 'No active subscription found' };
      }

      // Get invoices for the subscription
      const subscriptionId =
        subscription.razorpaySubscriptionId || subscription.subscription_id;
      if (!subscriptionId) {
        return { success: false, message: 'No Razorpay subscription ID found' };
      }

      const invoices =
        await this.razorpayService.getSubscriptionInvoices(subscriptionId);

      return { success: true, data: invoices };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}
