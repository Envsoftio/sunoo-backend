import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Plan } from '../entities/plan.entity';
import { Subscription } from '../entities/subscription.entity';
import { Payment } from '../entities/payment.entity';
import { RazorpayService } from './razorpay.service';
import { LoggerService } from '../common/logger/logger.service';
import { NotificationService } from './notification.service';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(Plan)
    private planRepository: Repository<Plan>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private razorpayService: RazorpayService,
    private loggerService: LoggerService,
    private notificationService: NotificationService,
    private cacheService: CacheService
  ) {}

  async getAllPlans() {
    try {
      this.loggerService.logSubscriptionEvent(
        'info',
        'Fetching all subscription plans'
      );

      const plans = await this.planRepository.find({
        where: {},
        order: { amount: 'ASC' },
      });

      this.loggerService.logSubscriptionEvent(
        'info',
        'Successfully fetched all plans',
        { count: plans.length }
      );
      return { status: 201, plans };
    } catch (error) {
      this.loggerService.logSubscriptionEvent(
        'error',
        'Failed to fetch plans',
        { error: error.message }
      );
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

      this.loggerService.logSubscriptionEvent(
        'info',
        'Creating new subscription',
        {
          userId,
          planId,
          razorpaySubscriptionId,
          razorpayPaymentId,
        }
      );

      // Check if plan exists
      const plan = await this.planRepository.findOne({
        where: { id: planId },
      });

      if (!plan) {
        this.loggerService.logSubscriptionEvent('warn', 'Plan not found', {
          planId,
          userId,
        });
        return { success: false, message: 'Plan not found' };
      }

      this.loggerService.logSubscriptionEvent('debug', 'Plan found', {
        planId,
        planName: plan.planName,
        userId,
      });

      // Cancel any existing active subscriptions
      this.loggerService.logSubscriptionEvent(
        'info',
        'Cancelling existing active subscriptions',
        { userId }
      );

      const cancelledResult = await this.subscriptionRepository.update(
        { user_id: userId, status: 'active' },
        { status: 'cancelled', cancelledAt: new Date() }
      );

      this.loggerService.logSubscriptionEvent(
        'info',
        'Cancelled existing subscriptions',
        {
          userId,
          cancelledCount: cancelledResult.affected,
        }
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

      const savedSubscription =
        await this.subscriptionRepository.save(subscription);

      this.loggerService.logSubscriptionEvent(
        'info',
        'Subscription created successfully',
        {
          userId,
          subscriptionId: savedSubscription.id,
          planId,
          razorpaySubscriptionId,
        }
      );

      // Invalidate user's story caches since subscription status changed
      await this.invalidateUserStoryCaches(userId);

      return { success: true, data: savedSubscription };
    } catch (error) {
      this.loggerService.logSubscriptionEvent(
        'error',
        'Failed to create subscription',
        {
          userId,
          planId: subscriptionData?.planId,
          error: error.message,
        }
      );
      return { success: false, message: error.message };
    }
  }

  async cancelSubscription(userId: string, cancellationData: any) {
    try {
      const { subscriptionId } = cancellationData;

      // Validate subscription ID
      if (
        !subscriptionId ||
        subscriptionId === 'undefined' ||
        subscriptionId === 'null' ||
        subscriptionId === 'NaN'
      ) {
        return { success: false, message: 'Invalid subscription ID provided' };
      }

      // Find subscription by Razorpay subscription ID (not database ID)
      const subscription = await this.subscriptionRepository.findOne({
        where: { subscription_id: subscriptionId, user_id: userId },
      });

      if (!subscription) {
        return { success: false, message: 'Subscription not found' };
      }

      // Calculate end date based on next billing date or current date + 30 days
      let endDate: Date;
      if (subscription.next_billing_date) {
        endDate = new Date(subscription.next_billing_date);
      } else {
        // Fallback: add 30 days from current date
        endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);
      }

      // Update using the database ID - set status to cancelled but keep access until end date
      await this.subscriptionRepository.update(subscription.id, {
        status: 'cancelled',
        cancelledAt: new Date(),
        end_date: endDate,
        user_cancelled: true,
      });

      return {
        success: true,
        message: 'Subscription cancelled successfully',
        data: {
          end_date: endDate,
          access_until: endDate.toISOString(),
          days_remaining: Math.ceil(
            (endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          ),
        },
      };
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
        where: {
          user_id: userId,
          status: In([
            'active',
            'pending',
            'authenticated',
            'halted',
            'cancelled',
          ]),
        },
        order: { created_at: 'DESC' },
      });

      if (!subscription) {
        return {
          success: false,
          message: 'No subscription found',
        };
      }

      const now = new Date();

      // Check if cancelled subscription is still in grace period
      if (subscription.status === 'cancelled') {
        // Use next_billing_date for grace period calculation (matches access-details logic)
        const gracePeriodEndDate = subscription.next_billing_date
          ? new Date(subscription.next_billing_date)
          : subscription.end_date
            ? new Date(subscription.end_date)
            : null;

        if (gracePeriodEndDate && now <= gracePeriodEndDate) {
          // Still in grace period - return the subscription
          return {
            success: true,
            data: {
              ...subscription,
              isInGracePeriod: true,
              daysRemaining: Math.ceil(
                (gracePeriodEndDate.getTime() - now.getTime()) /
                  (1000 * 60 * 60 * 24)
              ),
            },
          };
        } else {
          // Grace period expired
          return {
            success: false,
            message: 'Subscription grace period has expired',
          };
        }
      }

      // For active subscriptions, calculate daysRemaining using next_billing_date
      const daysRemaining = subscription.next_billing_date
        ? Math.ceil(
            (new Date(subscription.next_billing_date).getTime() -
              now.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : null;

      return {
        success: true,
        data: {
          ...subscription,
          daysRemaining,
        },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Helper method to check if user has active subscription access (including grace period)
  async hasActiveSubscriptionAccess(userId: string): Promise<boolean> {
    try {
      const subscription = await this.subscriptionRepository.findOne({
        where: {
          user_id: userId,
          status: In([
            'active',
            'pending',
            'authenticated',
            'halted',
            'cancelled',
          ]),
        },
        order: { created_at: 'DESC' },
      });

      if (!subscription) {
        return false;
      }

      // If subscription is active, pending, authenticated, or halted, user has access
      if (
        subscription.status &&
        ['active', 'pending', 'authenticated', 'halted'].includes(
          subscription.status
        )
      ) {
        return true;
      }

      // If subscription is cancelled, check if we're still within the grace period
      if (subscription.status === 'cancelled' && subscription.end_date) {
        const now = new Date();
        const endDate = new Date(subscription.end_date);
        return now <= endDate;
      }

      return false;
    } catch (error) {
      console.error('Error checking subscription access:', error);
      return false;
    }
  }

  // Helper method to get subscription access details
  async getSubscriptionAccessDetails(userId: string) {
    try {
      const subscription = await this.subscriptionRepository.findOne({
        where: {
          user_id: userId,
          status: In([
            'active',
            'pending',
            'authenticated',
            'halted',
            'cancelled',
          ]),
        },
        order: { created_at: 'DESC' },
      });

      if (!subscription) {
        return {
          hasAccess: false,
          status: 'none',
          message: 'No subscription found',
        };
      }

      const now = new Date();
      const isActive = subscription.status
        ? ['active', 'pending', 'authenticated', 'halted'].includes(
            subscription.status
          )
        : false;
      const isCancelled = subscription.status === 'cancelled';
      const hasGracePeriod =
        isCancelled &&
        subscription.next_billing_date &&
        now <= new Date(subscription.next_billing_date);
      return {
        hasAccess: isActive || hasGracePeriod,
        status: subscription.status,
        isActive,
        isCancelled,
        hasGracePeriod,
        endDate: subscription.end_date,
        next_billing_date: subscription.next_billing_date,
        daysRemaining: subscription.next_billing_date
          ? Math.ceil(
              (new Date(subscription.next_billing_date).getTime() -
                now.getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : null,
        message: isActive
          ? 'Active subscription'
          : hasGracePeriod && subscription.next_billing_date
            ? `Access until ${new Date(subscription.next_billing_date).toLocaleDateString()}`
            : 'Subscription expired',
      };
    } catch (error) {
      console.error('Error getting subscription access details:', error);
      return {
        hasAccess: false,
        status: 'error',
        message: 'Error checking subscription status',
      };
    }
  }

  async updateSubscription(userId: string, updateData: any) {
    try {
      const subscription = await this.subscriptionRepository.findOne({
        where: {
          user_id: userId,
          status: In(['active', 'pending', 'authenticated']),
        },
      });

      if (!subscription) {
        return {
          success: false,
          message: 'No active or pending subscription found',
        };
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
  async createRazorpaySubscription(
    subscriptionData: {
      plan_id: string;
      total_count: number;
      start_at?: number;
      customer_notify: number;
      notify_info: any;
      notes: any;
      offer_id?: string;
    },
    userId?: string
  ) {
    try {
      const response =
        await this.razorpayService.createSubscription(subscriptionData);

      // Store subscription in our database with user_id for future webhook lookups
      if (userId && response.id) {
        try {
          const subscription = this.subscriptionRepository.create({
            user_id: userId,
            subscription_id: response.id,
            plan_id: subscriptionData.plan_id,
            status: 'created',
            razorpaySubscriptionId: response.id,
            metadata: subscriptionData.notes,
          });
          await this.subscriptionRepository.save(subscription);

          this.loggerService.logSubscriptionEvent(
            'info',
            'Subscription stored in database for webhook lookups',
            {
              userId,
              subscriptionId: response.id,
              planId: subscriptionData.plan_id,
            }
          );
        } catch (dbError) {
          this.loggerService.logSubscriptionEvent(
            'warn',
            'Failed to store subscription in database',
            {
              userId,
              subscriptionId: response.id,
              error: dbError.message,
            }
          );
          // Continue even if database storage fails
        }
      }

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
      // First, cancel the subscription in Razorpay
      const response = await this.razorpayService.cancelSubscription(
        subscriptionId,
        cancelAtCycleEnd
      );

      // Then update the database status
      const subscription = await this.subscriptionRepository.findOne({
        where: { subscription_id: subscriptionId },
      });

      if (subscription) {
        // Calculate end date based on next billing date or current date + 30 days
        let endDate: Date;
        if (subscription.next_billing_date) {
          endDate = new Date(subscription.next_billing_date);
        } else {
          // Fallback: add 30 days from current date
          endDate = new Date();
          endDate.setDate(endDate.getDate() + 30);
        }

        await this.subscriptionRepository.update(subscription.id, {
          status: 'cancelled',
          cancelledAt: new Date(),
          end_date: endDate,
          user_cancelled: true,
        });
      }

      return {
        success: true,
        data: {
          ...response,
          end_date: subscription?.next_billing_date
            ? new Date(subscription.next_billing_date)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          access_until: subscription?.next_billing_date
            ? new Date(subscription.next_billing_date).toISOString()
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      };
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
    provider?: string;
  }) {
    try {
      this.loggerService.logSubscriptionEvent(
        'info',
        'Upserting subscription',
        {
          subscriptionId: subscriptionData.subscription_id,
          userId: subscriptionData.user_id,
          status: subscriptionData.status,
          provider: subscriptionData.provider,
        }
      );

      // First, try to find by subscription_id
      let existingSubscription = await this.subscriptionRepository.findOne({
        where: { subscription_id: subscriptionData.subscription_id },
      });

      // For RevenueCat, if not found by subscription_id, also check by user_id + provider + plan_id
      // This handles cases where original_transaction_id might not match exactly
      if (
        !existingSubscription &&
        subscriptionData.provider === 'revenuecat' &&
        subscriptionData.user_id
      ) {
        existingSubscription = await this.subscriptionRepository.findOne({
          where: {
            user_id: subscriptionData.user_id,
            provider: 'revenuecat',
            plan_id: subscriptionData.plan_id,
            status: 'active', // Only match active subscriptions
          },
          order: { created_at: 'DESC' }, // Get the most recent one
        });

        if (existingSubscription) {
          this.loggerService.logSubscriptionEvent(
            'info',
            'Found existing RevenueCat subscription by user_id + provider + plan_id',
            {
              existingSubscriptionId: existingSubscription.subscription_id,
              newSubscriptionId: subscriptionData.subscription_id,
              userId: subscriptionData.user_id,
            }
          );
        }
      }

      if (existingSubscription) {
        this.loggerService.logSubscriptionEvent(
          'debug',
          'Updating existing subscription',
          {
            subscriptionId: subscriptionData.subscription_id,
            existingSubscriptionId: existingSubscription.subscription_id,
            existingStatus: existingSubscription.status,
            newStatus: subscriptionData.status,
            nextBillingDate: subscriptionData.next_billing_date,
          }
        );

        // Update the subscription with new data
        // Preserve the original subscription_id if it's different (for RevenueCat renewals)
        const updateData = {
          ...subscriptionData,
          // Keep the original subscription_id if we found by user_id+provider+plan_id
          subscription_id: existingSubscription.subscription_id,
        };

        Object.assign(existingSubscription, updateData);
        const updatedSubscription =
          await this.subscriptionRepository.save(existingSubscription);

        this.loggerService.logSubscriptionEvent(
          'info',
          'Subscription updated successfully',
          {
            subscriptionId: updatedSubscription.subscription_id,
            userId: subscriptionData.user_id,
            status: updatedSubscription.status,
            nextBillingDate: updatedSubscription.next_billing_date,
          }
        );

        return { success: true, data: updatedSubscription };
      } else {
        this.loggerService.logSubscriptionEvent(
          'debug',
          'Creating new subscription',
          {
            subscriptionId: subscriptionData.subscription_id,
            userId: subscriptionData.user_id,
            status: subscriptionData.status,
            provider: subscriptionData.provider,
          }
        );

        const subscription =
          this.subscriptionRepository.create(subscriptionData);
        const savedSubscription =
          await this.subscriptionRepository.save(subscription);

        this.loggerService.logSubscriptionEvent(
          'info',
          'New subscription created successfully',
          {
            subscriptionId: subscriptionData.subscription_id,
            userId: subscriptionData.user_id,
            status: savedSubscription.status,
            id: savedSubscription.id,
            nextBillingDate: savedSubscription.next_billing_date,
          }
        );

        return { success: true, data: savedSubscription };
      }
    } catch (error) {
      this.loggerService.logSubscriptionEvent(
        'error',
        'Failed to upsert subscription',
        {
          subscriptionId: subscriptionData.subscription_id,
          userId: subscriptionData.user_id,
          error: error.message,
        }
      );
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
      // Get subscription to find userId before updating
      const subscription = await this.subscriptionRepository.findOne({
        where: { subscription_id: subscriptionId },
      });

      const updateData: any = { status };
      if (additionalData) {
        Object.assign(updateData, additionalData);
      }

      await this.subscriptionRepository.update(
        { subscription_id: subscriptionId },
        updateData
      );

      // Invalidate user's story caches if subscription status changed
      // This ensures users see correct audio URLs based on their subscription status
      // Invalidate for any status change that affects access (active, authenticated, pending, halted)
      // or when subscription is cancelled/expired (to remove access)
      if (subscription?.user_id) {
        const accessGrantingStatuses = [
          'active',
          'authenticated',
          'pending',
          'halted',
        ];
        const accessRemovingStatuses = ['cancelled', 'expired', 'paused'];

        if (
          accessGrantingStatuses.includes(status) ||
          accessRemovingStatuses.includes(status)
        ) {
          await this.invalidateUserStoryCaches(subscription.user_id);
        }
      }

      return { success: true, message: 'Subscription status updated' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Invalidate all story-related caches for a specific user
   * This is called when subscription status changes to ensure
   * users see correct audio URLs based on their subscription status
   */
  private async invalidateUserStoryCaches(userId: string): Promise<void> {
    try {
      const patterns = [
        `cache:*/show/*:user:${userId}*`, // Story show pages by slug/id
        `cache:*/story/getStoryBySlugForShow*:user:${userId}*`, // Story by slug
        `cache:*/story/getStoryByIdForShow*:user:${userId}*`, // Story by ID
        `cache:*/story/getStoryBySlug*:user:${userId}*`, // Story by slug (alternative)
        `cache:*/story/slug/*:user:${userId}*`, // Story by slug route
      ];

      let totalDeleted = 0;
      for (const pattern of patterns) {
        const deletedCount = await this.cacheService.delPattern(pattern);
        totalDeleted += deletedCount;
      }

      this.loggerService.logSubscriptionEvent(
        'info',
        'Invalidated user story caches after subscription change',
        {
          userId,
          deletedKeys: totalDeleted,
        }
      );
    } catch (error) {
      this.loggerService.logSubscriptionEvent(
        'error',
        'Failed to invalidate user story caches',
        {
          userId,
          error: error.message,
        }
      );
    }
  }

  // Recompute next_billing_date based on latest payment and plan frequency
  async updateNextBillingDateFromPayments(
    razorpaySubscriptionId: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      if (!razorpaySubscriptionId) {
        return { success: false, message: 'Missing subscription id' };
      }

      const subscription = await this.subscriptionRepository.findOne({
        where: { subscription_id: razorpaySubscriptionId },
      });

      if (!subscription) {
        return { success: false, message: 'Subscription not found' };
      }

      const latestPayment = await this.paymentRepository.findOne({
        where: { subscription_id: razorpaySubscriptionId },
        order: { payment_created_at: 'DESC' },
      });

      if (!latestPayment || !latestPayment.payment_created_at) {
        return { success: false, message: 'No payment with created_at found' };
      }

      // Resolve plan frequency: prefer matching by razorpayPlanId, fallback to id
      let frequency: string | undefined;
      if (subscription.plan_id) {
        const planByRazorpay = await this.planRepository.findOne({
          where: { razorpayPlanId: subscription.plan_id },
        });
        const plan =
          planByRazorpay ||
          (await this.planRepository.findOne({
            where: { id: subscription.plan_id },
          }));
        frequency = plan?.frequency || undefined;
      }

      const paymentDate = new Date(latestPayment.payment_created_at);
      const daysToAdd =
        (frequency || '').toLowerCase() === 'yearly'
          ? 365
          : (frequency || '').toLowerCase() === 'monthly'
            ? 30
            : 0;
      const nextDate = new Date(
        paymentDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000
      );

      await this.subscriptionRepository.update(
        { subscription_id: razorpaySubscriptionId },
        { next_billing_date: nextDate }
      );

      this.loggerService.logSubscriptionEvent(
        'info',
        'Updated next_billing_date from latest payment',
        {
          subscriptionId: razorpaySubscriptionId,
          paymentId: latestPayment.payment_id,
          paymentCreatedAt: latestPayment.payment_created_at,
          nextBillingDate: nextDate,
          frequency,
        }
      );

      return { success: true };
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
      // Get user's subscription (including cancelled with grace period)
      const subscription = await this.subscriptionRepository.findOne({
        where: {
          user_id: userId,
          status: In([
            'active',
            'pending',
            'authenticated',
            'halted',
            'cancelled',
          ]),
        },
        order: { created_at: 'DESC' },
      });

      if (!subscription) {
        return {
          success: false,
          message: 'No subscription found',
        };
      }

      // Check if cancelled subscription is still in grace period
      if (subscription.status === 'cancelled' && subscription.end_date) {
        const now = new Date();
        const endDate = new Date(subscription.end_date);

        if (now > endDate) {
          // Grace period expired
          return {
            success: false,
            message: 'Subscription grace period has expired',
          };
        }
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

  async getSupportedCountries() {
    try {
      // Get all unique currencies from plans table
      const plans = await this.planRepository.find({
        select: ['currency'],
        where: { liveMode: true }, // Only active plans
      });

      // Extract unique currencies
      const currencies = [
        ...new Set(plans.map(plan => plan.currency).filter(Boolean)),
      ];

      // Map currencies to countries
      const currencyToCountryMap = {
        USD: { country: 'United States', countryCode: 'US' },
        CAD: { country: 'Canada', countryCode: 'CA' },
        AUD: { country: 'Australia', countryCode: 'AU' },
        INR: { country: 'India', countryCode: 'IN' },
        PKR: { country: 'Pakistan', countryCode: 'PK' },
        NZD: { country: 'New Zealand', countryCode: 'NZ' },
        GBP: { country: 'United Kingdom', countryCode: 'GB' },
        EUR: { country: 'Germany', countryCode: 'DE' },
        SGD: { country: 'Singapore', countryCode: 'SG' },
      };

      const supportedCountries = currencies.map(currency => ({
        currency,
        ...(currencyToCountryMap[
          currency as keyof typeof currencyToCountryMap
        ] || {
          country: 'Unknown',
          countryCode: 'XX',
        }),
      }));

      return {
        success: true,
        data: {
          countries: supportedCountries,
          currencies: currencies,
        },
      };
    } catch (error) {
      this.loggerService.logSubscriptionEvent(
        'error',
        'Failed to get supported countries',
        { error: error.message }
      );
      return { success: false, message: error.message };
    }
  }

  getIpProvidersHealth() {
    try {
      // This would need to be injected, but for now we'll create a simple response
      return {
        success: true,
        data: {
          message:
            'IP provider health check not implemented in subscription service',
          note: 'Use the country detection service directly for health checks',
        },
      };
    } catch (error) {
      this.loggerService.logSubscriptionEvent(
        'error',
        'Failed to get IP provider health status',
        { error: error.message }
      );
      return { success: false, message: error.message };
    }
  }

  // Halted subscription recovery methods
  async resumeHaltedSubscription(userId: string, subscriptionId: string) {
    try {
      // Get the subscription from our database
      const subscription = await this.subscriptionRepository.findOne({
        where: {
          user_id: userId,
          subscription_id: subscriptionId,
          status: 'halted',
        },
      });

      if (!subscription) {
        return {
          success: false,
          message: 'Halted subscription not found for this user',
        };
      }

      // Attempt to resume the subscription via Razorpay
      const razorpayResponse =
        await this.razorpayService.resumeSubscription(subscriptionId);

      // Update our database with the new status
      await this.subscriptionRepository.update(
        { id: subscription.id },
        {
          status: 'active',
          updated_at: new Date(),
          metadata: {
            ...subscription.metadata,
            resumed_at: new Date(),
            razorpay_response: razorpayResponse,
          },
        }
      );

      // Invalidate user's story caches since subscription status changed to active
      await this.invalidateUserStoryCaches(userId);

      this.loggerService.logSubscriptionEvent(
        'info',
        'Subscription resumed successfully',
        {
          userId,
          subscriptionId,
          razorpayResponse,
        }
      );

      return {
        success: true,
        message: 'Subscription resumed successfully',
        data: razorpayResponse,
      };
    } catch (error) {
      this.loggerService.logSubscriptionEvent(
        'error',
        'Failed to resume subscription',
        {
          userId,
          subscriptionId,
          error: error.message,
        }
      );

      return {
        success: false,
        message: `Failed to resume subscription: ${error.message}`,
      };
    }
  }

  async retryHaltedPayment(userId: string, subscriptionId: string) {
    try {
      // Get the subscription from our database
      const subscription = await this.subscriptionRepository.findOne({
        where: {
          user_id: userId,
          subscription_id: subscriptionId,
          status: 'halted',
        },
      });

      if (!subscription) {
        return {
          success: false,
          message: 'Halted subscription not found for this user',
        };
      }

      // Attempt to retry the payment via Razorpay
      const razorpayResponse =
        await this.razorpayService.retryPayment(subscriptionId);

      this.loggerService.logSubscriptionEvent(
        'info',
        'Payment retry attempted',
        {
          userId,
          subscriptionId,
          razorpayResponse,
        }
      );

      return {
        success: true,
        message: 'Payment retry initiated',
        data: razorpayResponse,
      };
    } catch (error) {
      this.loggerService.logSubscriptionEvent(
        'error',
        'Failed to retry payment',
        {
          userId,
          subscriptionId,
          error: error.message,
        }
      );

      return {
        success: false,
        message: `Failed to retry payment: ${error.message}`,
      };
    }
  }

  async getHaltedSubscriptionDetails(userId: string) {
    try {
      const subscription = await this.subscriptionRepository.findOne({
        where: {
          user_id: userId,
          status: 'halted',
        },
        order: { created_at: 'DESC' },
      });

      if (!subscription) {
        return {
          success: false,
          message: 'No halted subscription found for this user',
        };
      }

      // Get additional details from Razorpay
      let razorpayDetails = null;
      try {
        razorpayDetails = await this.razorpayService.getSubscription(
          subscription.subscription_id!
        );
      } catch (error) {
        this.loggerService.logSubscriptionEvent(
          'warn',
          'Failed to fetch Razorpay details for halted subscription',
          {
            userId,
            subscriptionId: subscription.subscription_id,
            error: error.message,
          }
        );
      }

      return {
        success: true,
        data: {
          ...subscription,
          razorpay_details: razorpayDetails,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get halted subscription details: ${error.message}`,
      };
    }
  }
}
