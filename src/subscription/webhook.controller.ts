import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RazorpayService } from './razorpay.service';
import { SubscriptionService } from './subscription.service';
import { PaymentService } from './payment.service';
import { NotificationService } from './notification.service';
import { LoggerService } from '../common/logger/logger.service';

@ApiTags('Webhooks')
@Controller('api/webhooks')
export class WebhookController {
  constructor(
    private readonly razorpayService: RazorpayService,
    private readonly subscriptionService: SubscriptionService,
    private readonly paymentService: PaymentService,
    private readonly notificationService: NotificationService,
    private readonly loggerService: LoggerService
  ) {}

  @Post('razorpay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Razorpay webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleRazorpayWebhook(
    @Body() body: any,
    @Headers('x-razorpay-signature') signature: string
  ) {
    const startTime = Date.now();
    const event = body?.event;
    const subscriptionId = this.extractSubscriptionId(body);

    try {
      // Log incoming webhook request
      this.loggerService.logWebhookRequest(event, subscriptionId, body, {
        'x-razorpay-signature': signature,
      });

      // Verify webhook signature (skip in development mode)
      const bodyString = JSON.stringify(body);
      if (
        process.env.NODE_ENV === 'production' &&
        !this.razorpayService.verifyWebhookSignature(bodyString, signature)
      ) {
        this.loggerService.logWebhookError(
          event,
          subscriptionId,
          new Error('Invalid webhook signature'),
          body,
          { 'x-razorpay-signature': signature }
        );
        throw new BadRequestException('Invalid signature');
      } else if (process.env.NODE_ENV !== 'production') {
        this.loggerService.logWebhookEvent(
          'info',
          'Skipping signature verification in development mode',
          { event, subscriptionId },
          'WebhookController'
        );
      }

      this.loggerService.logWebhookEvent(
        'info',
        `Processing webhook event: ${event}`,
        { event, subscriptionId, payload: body },
        'WebhookController'
      );

      let result;
      switch (body.event) {
        case 'subscription.authenticated':
          result = await this.handleSubscriptionAuthenticated(body);
          break;
        case 'subscription.activated':
          result = await this.handleSubscriptionActivated(body);
          break;
        case 'subscription.charged':
          result = await this.handleSubscriptionCharged(body);
          break;
        case 'subscription.cancelled':
          result = await this.handleSubscriptionCancelled(body);
          break;
        case 'subscription.resumed':
          result = await this.handleSubscriptionResumed(body);
          break;
        case 'subscription.pending':
          result = await this.handleSubscriptionPending(body);
          break;
        case 'subscription.halted':
          result = await this.handleSubscriptionHalted(body);
          break;
        case 'payment.authorized':
          result = await this.handlePaymentAuthorized(body);
          break;
        case 'payment.failed':
          result = await this.handlePaymentFailed(body);
          break;
        default:
          this.loggerService.logWebhookEvent(
            'warn',
            `Unhandled event type: ${body.event}`,
            { event: body.event, subscriptionId, payload: body },
            'WebhookController'
          );
          result = { message: `Unhandled event type: ${body.event}` };
      }

      const processingTime = Date.now() - startTime;
      this.loggerService.logWebhookResponse(
        event,
        subscriptionId,
        true,
        'Webhook processed successfully',
        processingTime
      );

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.loggerService.logWebhookError(event, subscriptionId, error, body, {
        'x-razorpay-signature': signature,
      });

      this.loggerService.logWebhookResponse(
        event,
        subscriptionId,
        false,
        `Webhook processing failed: ${error.message}`,
        processingTime
      );

      throw new InternalServerErrorException('Webhook processing failed');
    }
  }

  private extractSubscriptionId(body: any): string {
    if (body?.payload?.subscription?.entity?.id) {
      return body.payload.subscription.entity.id;
    }
    if (body?.payload?.payment?.entity?.subscription_id) {
      return body.payload.payment.entity.subscription_id;
    }
    return 'unknown';
  }

  private async handleSubscriptionAuthenticated(body: any) {
    const subscriptionDetails = body.payload.subscription.entity;
    const subscriptionId = subscriptionDetails.id;
    const userId = subscriptionDetails.notes?.user_id;

    this.loggerService.logWebhookEvent(
      'info',
      'Processing subscription.authenticated event',
      { subscriptionId, userId, planId: subscriptionDetails.plan_id },
      'WebhookController'
    );

    try {
      const subscriptionData = {
        subscription_id: subscriptionDetails.id,
        user_id: subscriptionDetails.notes?.user_id,
        plan_id: subscriptionDetails.plan_id,
        status: subscriptionDetails.status,
        start_date: subscriptionDetails.start_at
          ? new Date(subscriptionDetails.start_at * 1000)
          : undefined,
        end_date: subscriptionDetails.end_at
          ? new Date(subscriptionDetails.end_at * 1000)
          : undefined,
        next_billing_date: subscriptionDetails.next_billing_at
          ? new Date(subscriptionDetails.next_billing_at * 1000)
          : undefined,
        metadata: subscriptionDetails,
        isTrial: subscriptionDetails.notes?.onTrial === 'true',
        trialEndDate:
          subscriptionDetails.notes?.onTrial === 'true'
            ? new Date(subscriptionDetails.start_at * 1000)
            : undefined,
      };

      this.loggerService.logWebhookEvent(
        'debug',
        'Upserting subscription data',
        { subscriptionId, subscriptionData },
        'WebhookController'
      );

      const result =
        await this.subscriptionService.upsertSubscription(subscriptionData);

      if (result.success) {
        this.loggerService.logWebhookEvent(
          'info',
          'Subscription upserted successfully',
          { subscriptionId, userId, result },
          'WebhookController'
        );

        // Emit notification to user
        if (subscriptionDetails.notes?.user_id) {
          this.loggerService.logWebhookEvent(
            'debug',
            'Emitting subscription created notification',
            { userId, subscriptionId },
            'WebhookController'
          );

          this.notificationService.emitSubscriptionCreated(
            subscriptionDetails.notes.user_id,
            subscriptionData
          );
        }
      } else {
        this.loggerService.logWebhookEvent(
          'error',
          'Failed to upsert subscription',
          { subscriptionId, userId, error: result.message },
          'WebhookController'
        );
      }

      return { message: 'subscription.authenticated processed successfully' };
    } catch (error) {
      this.loggerService.logWebhookError(
        'subscription.authenticated',
        subscriptionId,
        error,
        body
      );
      throw error;
    }
  }

  private async handleSubscriptionActivated(body: any) {
    const subscriptionDetails = body.payload.subscription.entity;
    const subscriptionId = subscriptionDetails.id;
    const userId = subscriptionDetails.notes?.user_id;

    this.loggerService.logWebhookEvent(
      'info',
      'Processing subscription.activated event',
      { subscriptionId, userId, status: subscriptionDetails.status },
      'WebhookController'
    );

    try {
      const updateData = {
        next_billing_date: subscriptionDetails.next_billing_at
          ? new Date(subscriptionDetails.next_billing_at * 1000)
          : undefined,
        metadata: subscriptionDetails,
      };

      this.loggerService.logWebhookEvent(
        'debug',
        'Updating subscription status to active',
        { subscriptionId, updateData },
        'WebhookController'
      );

      const result = await this.subscriptionService.updateSubscriptionStatus(
        subscriptionDetails.id,
        'active',
        updateData
      );

      if (result.success) {
        this.loggerService.logWebhookEvent(
          'info',
          'Subscription status updated to active successfully',
          { subscriptionId, userId },
          'WebhookController'
        );

        // Emit notification to user
        if (subscriptionDetails.notes?.user_id) {
          this.loggerService.logWebhookEvent(
            'debug',
            'Emitting subscription activated notification',
            { userId, subscriptionId },
            'WebhookController'
          );

          this.notificationService.emitSubscriptionActivated(
            subscriptionDetails.notes.user_id,
            subscriptionDetails
          );
        }
      } else {
        this.loggerService.logWebhookEvent(
          'error',
          'Failed to update subscription status',
          { subscriptionId, userId, error: result.message },
          'WebhookController'
        );
      }

      return { message: 'subscription.activated processed successfully' };
    } catch (error) {
      this.loggerService.logWebhookError(
        'subscription.activated',
        subscriptionId,
        error,
        body
      );
      throw error;
    }
  }

  private async handleSubscriptionCharged(body: any) {
    const chargeDetails = body.payload.subscription.entity;

    await this.subscriptionService.updateSubscriptionStatus(
      chargeDetails.id,
      chargeDetails.status,
      {
        next_billing_date: chargeDetails.charge_at
          ? new Date(chargeDetails.charge_at * 1000)
          : undefined,
        metadata: chargeDetails,
      }
    );

    return { message: 'subscription.charged processed successfully' };
  }

  private async handleSubscriptionCancelled(body: any) {
    const subDetails = body.payload.subscription.entity;
    const startAt = subDetails.start_at;
    const onTrial = subDetails.notes?.onTrial === 'true';

    let isTrialTimeLeft = false;
    if (onTrial && startAt < Date.now() / 1000) {
      isTrialTimeLeft = true;
    }

    // Get plan details to calculate end date
    const plan = await this.razorpayService.getPlan(subDetails.plan_id);
    const planPeriod = plan.period;

    let updatedEndedAt;
    if (planPeriod === 'monthly') {
      updatedEndedAt =
        Math.floor(
          new Date(startAt * 1000).getTime() + 30 * 24 * 60 * 60 * 1000
        ) / 1000;
    } else if (planPeriod === 'yearly') {
      updatedEndedAt =
        Math.floor(
          new Date(startAt * 1000).getTime() + 365 * 24 * 60 * 60 * 1000
        ) / 1000;
    }

    await this.subscriptionService.updateSubscriptionStatus(
      subDetails.id,
      isTrialTimeLeft ? 'inactive' : 'cancelled',
      {
        ended_at: updatedEndedAt,
        end_date: subDetails.end_at
          ? new Date(subDetails.end_at * 1000)
          : undefined,
        user_cancelled: true,
        metadata: subDetails,
      }
    );

    // Emit notification to user
    if (subDetails.notes?.user_id) {
      this.notificationService.emitSubscriptionCancelled(
        subDetails.notes.user_id,
        subDetails
      );
    }

    return { message: 'subscription.cancelled processed successfully' };
  }

  private async handleSubscriptionResumed(body: any) {
    const subscriptionDetails = body.payload.subscription.entity;

    await this.subscriptionService.updateSubscriptionStatus(
      subscriptionDetails.id,
      'active',
      {
        next_billing_date: subscriptionDetails.next_billing_at
          ? new Date(subscriptionDetails.next_billing_at * 1000)
          : undefined,
      }
    );

    return { message: 'subscription.resumed processed successfully' };
  }

  private async handleSubscriptionPending(body: any) {
    const pendingDetails = body.payload.subscription.entity;

    await this.subscriptionService.updateSubscriptionStatus(
      pendingDetails.id,
      'pending',
      {
        metadata: pendingDetails,
      }
    );

    return { message: 'subscription.pending processed successfully' };
  }

  private async handleSubscriptionHalted(body: any) {
    const haltedDetails = body.payload.subscription.entity;

    await this.subscriptionService.updateSubscriptionStatus(
      haltedDetails.id,
      'halted',
      {
        metadata: haltedDetails,
      }
    );

    return { message: 'subscription.halted processed successfully' };
  }

  private async handlePaymentAuthorized(body: any) {
    const paymentDetails = body.payload.payment.entity;
    const paymentId = paymentDetails.id;
    const userId = paymentDetails.notes?.user_id;
    const subscriptionId = paymentDetails.subscription_id;

    this.loggerService.logWebhookEvent(
      'info',
      'Processing payment.authorized event',
      { paymentId, userId, subscriptionId, amount: paymentDetails.amount },
      'WebhookController'
    );

    try {
      let invoice = null;

      if (paymentDetails?.invoice_id) {
        try {
          this.loggerService.logWebhookEvent(
            'debug',
            'Fetching invoice details',
            { paymentId, invoiceId: paymentDetails.invoice_id },
            'WebhookController'
          );

          invoice = await this.razorpayService.getInvoice(
            paymentDetails.invoice_id
          );

          this.loggerService.logWebhookEvent(
            'debug',
            'Invoice details fetched successfully',
            {
              paymentId,
              invoiceId: paymentDetails.invoice_id,
              subscriptionId: (invoice as any)?.subscription_id,
            },
            'WebhookController'
          );
        } catch (error) {
          this.loggerService.logWebhookEvent(
            'warn',
            'Failed to fetch invoice details',
            {
              paymentId,
              invoiceId: paymentDetails.invoice_id,
              error: error.message,
            },
            'WebhookController'
          );
          // Continue without invoice data
        }
      }

      const paymentData = {
        payment_id: paymentDetails.id,
        status: paymentDetails.status,
        amount: paymentDetails.amount.toString(),
        currency: paymentDetails.currency,
        invoice_id: paymentDetails.invoice_id,
        plan_id: paymentDetails.plan_id,
        user_id: paymentDetails.notes?.user_id,
        subscription_id: (invoice as any)?.subscription_id || '',
        metadata: paymentDetails,
      };

      this.loggerService.logWebhookEvent(
        'debug',
        'Creating payment record',
        { paymentId, paymentData },
        'WebhookController'
      );

      const result = await this.paymentService.createPayment(paymentData);

      if (result.success) {
        this.loggerService.logWebhookEvent(
          'info',
          'Payment record created successfully',
          { paymentId, userId, subscriptionId },
          'WebhookController'
        );

        // Emit notification to user
        if (paymentDetails.notes?.user_id) {
          this.loggerService.logWebhookEvent(
            'debug',
            'Emitting payment success notification',
            { userId, paymentId },
            'WebhookController'
          );

          this.notificationService.emitPaymentSuccess(
            paymentDetails.notes.user_id,
            paymentData
          );
        }
      } else {
        this.loggerService.logWebhookEvent(
          'error',
          'Failed to create payment record',
          { paymentId, userId, error: result.message },
          'WebhookController'
        );
      }

      return { message: 'payment.authorized processed successfully' };
    } catch (error) {
      this.loggerService.logWebhookError(
        'payment.authorized',
        paymentId,
        error,
        body
      );
      throw error;
    }
  }

  private async handlePaymentFailed(body: any) {
    const failureDetails = body.payload.payment.entity;

    const paymentData = {
      payment_id: failureDetails.id,
      status: 'failed',
      metadata: failureDetails,
    };

    const result = await this.paymentService.createPayment(paymentData);

    // Emit notification to user
    if (result.success && failureDetails.notes?.user_id) {
      this.notificationService.emitPaymentFailed(
        failureDetails.notes.user_id,
        paymentData
      );
    }

    return { message: 'payment.failed processed successfully' };
  }
}
