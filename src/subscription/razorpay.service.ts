import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private readonly razorpayKeyId: string;
  private readonly razorpayKeySecret: string;
  private readonly baseUrl = 'https://api.razorpay.com/v1';

  constructor(private configService: ConfigService) {
    this.razorpayKeyId =
      this.configService.get<string>('app.razorpay.keyId') || '';
    this.razorpayKeySecret =
      this.configService.get<string>('app.razorpay.secret') || '';
  }

  private getAuthHeader(): string {
    const auth = Buffer.from(
      `${this.razorpayKeyId}:${this.razorpayKeySecret}`
    ).toString('base64');
    return `Basic ${auth}`;
  }

  async createSubscription(subscriptionData: {
    plan_id: string;
    total_count: number;
    start_at?: number;
    customer_notify: number;
    notify_info: any;
    notes: any;
  }) {
    try {
      const response = await fetch(`${this.baseUrl}/subscriptions`, {
        method: 'POST',
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscriptionData),
      });

      if (!response.ok) {
        throw new Error(`Razorpay API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error('Error creating subscription:', error);
      throw error;
    }
  }

  async cancelSubscription(subscriptionId: string, cancelAtCycleEnd = false) {
    try {
      const response = await fetch(
        `${this.baseUrl}/subscriptions/${subscriptionId}/cancel`,
        {
          method: 'POST',
          headers: {
            Authorization: this.getAuthHeader(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cancel_at_cycle_end: cancelAtCycleEnd ? 1 : 0,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Razorpay API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  async getSubscription(subscriptionId: string) {
    try {
      const response = await fetch(
        `${this.baseUrl}/subscriptions/${subscriptionId}`,
        {
          method: 'GET',
          headers: {
            Authorization: this.getAuthHeader(),
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Razorpay API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error('Error fetching subscription:', error);
      throw error;
    }
  }

  async getSubscriptionInvoices(subscriptionId: string) {
    try {
      const response = await fetch(
        `${this.baseUrl}/invoices?subscription_id=${subscriptionId}`,
        {
          method: 'GET',
          headers: {
            Authorization: this.getAuthHeader(),
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Razorpay API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error('Error fetching subscription invoices:', error);
      throw error;
    }
  }

  async getInvoice(invoiceId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/invoices/${invoiceId}`, {
        method: 'GET',
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Razorpay API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error('Error fetching invoice:', error);
      throw error;
    }
  }

  async getPlan(planId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/plans/${planId}`, {
        method: 'GET',
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Razorpay API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error('Error fetching plan:', error);
      throw error;
    }
  }

  verifyWebhookSignature(body: string, signature: string): boolean {
    try {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', this.razorpayKeySecret)
        .update(body)
        .digest('hex');

      return signature === expectedSignature;
    } catch (error) {
      this.logger.error('Error verifying webhook signature:', error);
      return false;
    }
  }
}
