import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Plan } from '../entities/plan.entity';
import { Subscription } from '../entities/subscription.entity';
import { RazorpayService } from './razorpay.service';
import { LoggerService } from '../common/logger/logger.service';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(Plan)
    private planRepository: Repository<Plan>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    private razorpayService: RazorpayService,
    private loggerService: LoggerService
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

      // Check if cancelled subscription is still in grace period
      if (subscription.status === 'cancelled' && subscription.end_date) {
        const now = new Date();
        const endDate = new Date(subscription.end_date);

        if (now <= endDate) {
          // Still in grace period - return the subscription
          return {
            success: true,
            data: {
              ...subscription,
              isInGracePeriod: true,
              daysRemaining: Math.ceil(
                (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
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

      return { success: true, data: subscription };
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
        subscription.end_date &&
        now <= new Date(subscription.end_date);

      return {
        hasAccess: isActive || hasGracePeriod,
        status: subscription.status,
        isActive,
        isCancelled,
        hasGracePeriod,
        endDate: subscription.end_date,
        daysRemaining: subscription.end_date
          ? Math.ceil(
              (new Date(subscription.end_date).getTime() - now.getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : null,
        message: isActive
          ? 'Active subscription'
          : hasGracePeriod && subscription.end_date
            ? `Access until ${new Date(subscription.end_date).toLocaleDateString()}`
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
  async createRazorpaySubscription(subscriptionData: {
    plan_id: string;
    total_count: number;
    start_at?: number;
    customer_notify: number;
    notify_info: any;
    notes: any;
    offer_id?: string;
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
  }) {
    try {
      this.loggerService.logSubscriptionEvent(
        'info',
        'Upserting subscription',
        {
          subscriptionId: subscriptionData.subscription_id,
          userId: subscriptionData.user_id,
          status: subscriptionData.status,
        }
      );

      const existingSubscription = await this.subscriptionRepository.findOne({
        where: { subscription_id: subscriptionData.subscription_id },
      });

      if (existingSubscription) {
        this.loggerService.logSubscriptionEvent(
          'debug',
          'Updating existing subscription',
          {
            subscriptionId: subscriptionData.subscription_id,
            existingStatus: existingSubscription.status,
            newStatus: subscriptionData.status,
          }
        );

        Object.assign(existingSubscription, subscriptionData);
        const updatedSubscription =
          await this.subscriptionRepository.save(existingSubscription);

        this.loggerService.logSubscriptionEvent(
          'info',
          'Subscription updated successfully',
          {
            subscriptionId: subscriptionData.subscription_id,
            userId: subscriptionData.user_id,
            status: updatedSubscription.status,
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
