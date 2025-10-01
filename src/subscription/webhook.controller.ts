import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RazorpayService } from './razorpay.service';
import { SubscriptionService } from './subscription.service';
import { PaymentService } from './payment.service';
import { NotificationService } from './notification.service';

@ApiTags('Webhooks')
@Controller('api/webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly razorpayService: RazorpayService,
    private readonly subscriptionService: SubscriptionService,
    private readonly paymentService: PaymentService,
    private readonly notificationService: NotificationService
  ) {}

  @Post('razorpay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Razorpay webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleRazorpayWebhook(
    @Body() body: any,
    @Headers('x-razorpay-signature') signature: string
  ) {
    try {
      // Verify webhook signature (skip in development mode)
      const bodyString = JSON.stringify(body);
      if (
        process.env.NODE_ENV === 'production' &&
        !this.razorpayService.verifyWebhookSignature(bodyString, signature)
      ) {
        this.logger.warn('Invalid webhook signature');
        throw new BadRequestException('Invalid signature');
      } else if (process.env.NODE_ENV !== 'production') {
        this.logger.log('Skipping signature verification in development mode');
      }

      this.logger.log(`Received webhook event: ${body.event}`);

      switch (body.event) {
        case 'subscription.authenticated':
          return await this.handleSubscriptionAuthenticated(body);
        case 'subscription.activated':
          return await this.handleSubscriptionActivated(body);
        case 'subscription.charged':
          return await this.handleSubscriptionCharged(body);
        case 'subscription.cancelled':
          return await this.handleSubscriptionCancelled(body);
        case 'subscription.resumed':
          return await this.handleSubscriptionResumed(body);
        case 'subscription.pending':
          return await this.handleSubscriptionPending(body);
        case 'subscription.halted':
          return await this.handleSubscriptionHalted(body);
        case 'payment.authorized':
          return await this.handlePaymentAuthorized(body);
        case 'payment.failed':
          return await this.handlePaymentFailed(body);
        default:
          this.logger.log(`Unhandled event type: ${body.event}`);
          return { message: `Unhandled event type: ${body.event}` };
      }
    } catch (error) {
      this.logger.error('Error processing webhook:', error);
      throw new InternalServerErrorException('Webhook processing failed');
    }
  }

  private async handleSubscriptionAuthenticated(body: any) {
    const subscriptionDetails = body.payload.subscription.entity;

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

    const result =
      await this.subscriptionService.upsertSubscription(subscriptionData);

    // Emit notification to user
    if (result.success && subscriptionDetails.notes?.user_id) {
      this.notificationService.emitSubscriptionCreated(
        subscriptionDetails.notes.user_id,
        subscriptionData
      );
    }

    return { message: 'subscription.authenticated processed successfully' };
  }

  private async handleSubscriptionActivated(body: any) {
    const subscriptionDetails = body.payload.subscription.entity;

    await this.subscriptionService.updateSubscriptionStatus(
      subscriptionDetails.id,
      'active',
      {
        next_billing_date: subscriptionDetails.next_billing_at
          ? new Date(subscriptionDetails.next_billing_at * 1000)
          : undefined,
        metadata: subscriptionDetails,
      }
    );

    // Emit notification to user
    if (subscriptionDetails.notes?.user_id) {
      this.notificationService.emitSubscriptionActivated(
        subscriptionDetails.notes.user_id,
        subscriptionDetails
      );
    }

    return { message: 'subscription.activated processed successfully' };
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
    let invoice = null;

    if (paymentDetails?.invoice_id) {
      try {
        invoice = await this.razorpayService.getInvoice(
          paymentDetails.invoice_id
        );
      } catch (error) {
        this.logger.warn(
          `Failed to fetch invoice ${paymentDetails.invoice_id}:`,
          error.message
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

    const result = await this.paymentService.createPayment(paymentData);

    // Emit notification to user
    if (result.success && paymentDetails.notes?.user_id) {
      this.notificationService.emitPaymentSuccess(
        paymentDetails.notes.user_id,
        paymentData
      );
    }

    return { message: 'payment.authorized processed successfully' };
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
