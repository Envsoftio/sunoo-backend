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
import { RevenueCatService } from './revenuecat.service';
import { SubscriptionService } from './subscription.service';
import { LoggerService } from '../common/logger/logger.service';
import { CacheService } from '../cache/cache.service';

@ApiTags('Webhooks')
@Controller('api/webhooks')
export class RevenueCatWebhookController {
  constructor(
    private readonly revenueCatService: RevenueCatService,
    private readonly subscriptionService: SubscriptionService,
    private readonly loggerService: LoggerService,
    private readonly cacheService: CacheService
  ) {}

  @Post('revenuecat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle RevenueCat webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid signature or request' })
  async handleRevenueCatWebhook(
    @Body() body: any,
    @Headers('authorization') authorization?: string
  ) {
    const startTime = Date.now();
    const event = body?.event?.type || body?.type;
    const subscriptionId = this.extractSubscriptionId(body);

    try {
      // Log incoming webhook request
      this.loggerService.logWebhookRequest(
        event || 'unknown',
        subscriptionId || 'unknown',
        body,
        {
          authorization,
        }
      );

      // Verify webhook authorization
      // RevenueCat sends: Authorization: Bearer <your-secret-value>
      // The secret value is what you set in "Authorization header value" field in RevenueCat dashboard
      const bodyString = JSON.stringify(body);
      const authHeader = authorization || '';

      if (
        process.env.NODE_ENV === 'production' &&
        authHeader &&
        !this.revenueCatService.verifyWebhookSignature(bodyString, authHeader)
      ) {
        this.loggerService.logWebhookError(
          event || 'unknown',
          subscriptionId || 'unknown',
          new Error('Invalid RevenueCat webhook signature'),
          body,
          { authorization }
        );
        throw new BadRequestException('Invalid signature');
      } else if (process.env.NODE_ENV !== 'production') {
        this.loggerService.logWebhookEvent(
          'info',
          'Skipping signature verification in development mode',
          { event, subscriptionId },
          'RevenueCatWebhookController'
        );
      }

      this.loggerService.logWebhookEvent(
        'info',
        `Processing RevenueCat webhook event: ${event}`,
        { event, subscriptionId, payload: body },
        'RevenueCatWebhookController'
      );

      // Process the webhook event
      let result;
      switch (event) {
        case 'INITIAL_PURCHASE':
          result = await this.handleInitialPurchase(body);
          break;
        case 'RENEWAL':
          result = await this.handleRenewal(body);
          break;
        case 'CANCELLATION':
          result = await this.handleCancellation(body);
          break;
        case 'UNCANCELLATION':
          result = await this.handleUncancellation(body);
          break;
        case 'NON_RENEWING_PURCHASE':
          result = await this.handleNonRenewingPurchase(body);
          break;
        case 'EXPIRATION':
          result = await this.handleExpiration(body);
          break;
        case 'BILLING_ISSUE':
          result = await this.handleBillingIssue(body);
          break;
        case 'PRODUCT_CHANGE':
          result = await this.handleProductChange(body);
          break;
        default:
          this.loggerService.logWebhookEvent(
            'warn',
            `Unhandled RevenueCat event type: ${event}`,
            { event, subscriptionId, payload: body },
            'RevenueCatWebhookController'
          );
          result = { message: `Unhandled event type: ${event}` };
      }

      const processingTime = Date.now() - startTime;
      this.loggerService.logWebhookResponse(
        event || 'unknown',
        subscriptionId || 'unknown',
        result?.success !== false,
        result?.message || 'Webhook processed successfully',
        processingTime
      );

      return result;
    } catch (error) {
      const errorObj =
        error instanceof Error ? error : new Error(String(error));
      this.loggerService.logWebhookError(
        event || 'unknown',
        subscriptionId || 'unknown',
        errorObj,
        body,
        { authorization }
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Error processing RevenueCat webhook: ${error.message}`
      );
    }
  }

  private extractSubscriptionId(body: any): string | null {
    try {
      return (
        body?.event?.transaction_id ||
        body?.event?.original_transaction_id ||
        body?.event?.id ||
        body?.transaction_id ||
        null
      );
    } catch {
      return null;
    }
  }

  private async handleInitialPurchase(body: any) {
    try {
      const subscriptionData =
        this.revenueCatService.convertRevenueCatToSubscriptionData(body);

      this.loggerService.logSubscriptionEvent(
        'info',
        'Processing RevenueCat INITIAL_PURCHASE',
        {
          userId: subscriptionData.user_id,
          subscriptionId: subscriptionData.subscription_id,
          productId: subscriptionData.plan_id,
        }
      );

      const result =
        await this.subscriptionService.upsertSubscription(subscriptionData);

      if (result.success && subscriptionData.user_id) {
        await this.invalidateUserCaches(subscriptionData.user_id);
      }

      return {
        success: true,
        message: 'Initial purchase processed successfully',
        data: result.data,
      };
    } catch (error) {
      this.loggerService.logSubscriptionEvent(
        'error',
        'Failed to process RevenueCat INITIAL_PURCHASE',
        { error: error.message, payload: body }
      );
      throw error;
    }
  }

  private async handleRenewal(body: any) {
    try {
      const subscriptionData =
        this.revenueCatService.convertRevenueCatToSubscriptionData(body);

      this.loggerService.logSubscriptionEvent(
        'info',
        'Processing RevenueCat RENEWAL',
        {
          userId: subscriptionData.user_id,
          subscriptionId: subscriptionData.subscription_id,
          productId: subscriptionData.plan_id,
          nextBillingDate: subscriptionData.next_billing_date,
          status: subscriptionData.status,
          originalTransactionId:
            subscriptionData.metadata?.revenuecatOriginalTransactionId,
          transactionId: subscriptionData.metadata?.revenuecatTransactionId,
        }
      );

      // Log the full webhook payload for debugging
      this.loggerService.logWebhookEvent(
        'debug',
        'RevenueCat RENEWAL webhook payload',
        {
          event: body?.event,
          subscriptionData: subscriptionData,
          fullPayload: body,
        },
        'RevenueCatWebhookController'
      );

      const result =
        await this.subscriptionService.upsertSubscription(subscriptionData);

      if (!result.success) {
        this.loggerService.logSubscriptionEvent(
          'error',
          'Failed to upsert subscription during RENEWAL',
          {
            userId: subscriptionData.user_id,
            subscriptionId: subscriptionData.subscription_id,
            error: result.message,
          }
        );
      }

      if (result.success && subscriptionData.user_id) {
        await this.invalidateUserCaches(subscriptionData.user_id);
      }

      return {
        success: result.success,
        message: result.success
          ? 'Renewal processed successfully'
          : `Renewal failed: ${result.message}`,
        data: result.data,
      };
    } catch (error) {
      this.loggerService.logSubscriptionEvent(
        'error',
        'Failed to process RevenueCat RENEWAL',
        { error: error.message, stack: error.stack, payload: body }
      );
      throw error;
    }
  }

  private async handleCancellation(body: any) {
    try {
      const subscriptionData =
        this.revenueCatService.convertRevenueCatToSubscriptionData(body);

      this.loggerService.logSubscriptionEvent(
        'info',
        'Processing RevenueCat CANCELLATION',
        {
          userId: subscriptionData.user_id,
          subscriptionId: subscriptionData.subscription_id,
          nextBillingDate: subscriptionData.next_billing_date,
        }
      );

      const result = await this.subscriptionService.upsertSubscription({
        ...subscriptionData,
        status: 'cancelled',
        user_cancelled: true,
        cancelledAt: new Date(),
        next_billing_date: subscriptionData.next_billing_date,
      });

      if (result.success && subscriptionData.user_id) {
        await this.invalidateUserCaches(subscriptionData.user_id);
      }

      return {
        success: true,
        message: 'Cancellation processed successfully',
        data: result.data,
      };
    } catch (error) {
      this.loggerService.logSubscriptionEvent(
        'error',
        'Failed to process RevenueCat CANCELLATION',
        { error: error.message, payload: body }
      );
      throw error;
    }
  }

  private async handleUncancellation(body: any) {
    try {
      const subscriptionData =
        this.revenueCatService.convertRevenueCatToSubscriptionData(body);

      this.loggerService.logSubscriptionEvent(
        'info',
        'Processing RevenueCat UNCANCELLATION',
        {
          userId: subscriptionData.user_id,
          subscriptionId: subscriptionData.subscription_id,
        }
      );

      const result = await this.subscriptionService.upsertSubscription({
        ...subscriptionData,
        status: 'active',
        user_cancelled: false,
        cancelledAt: null,
      });

      if (result.success && subscriptionData.user_id) {
        await this.invalidateUserCaches(subscriptionData.user_id);
      }

      return {
        success: true,
        message: 'Uncancellation processed successfully',
        data: result.data,
      };
    } catch (error) {
      this.loggerService.logSubscriptionEvent(
        'error',
        'Failed to process RevenueCat UNCANCELLATION',
        { error: error.message, payload: body }
      );
      throw error;
    }
  }

  private async handleNonRenewingPurchase(body: any) {
    try {
      const subscriptionData =
        this.revenueCatService.convertRevenueCatToSubscriptionData(body);

      this.loggerService.logSubscriptionEvent(
        'info',
        'Processing RevenueCat NON_RENEWING_PURCHASE',
        {
          userId: subscriptionData.user_id,
          subscriptionId: subscriptionData.subscription_id,
          productId: subscriptionData.plan_id,
        }
      );

      const result =
        await this.subscriptionService.upsertSubscription(subscriptionData);

      if (result.success && subscriptionData.user_id) {
        await this.invalidateUserCaches(subscriptionData.user_id);
      }

      return {
        success: true,
        message: 'Non-renewing purchase processed successfully',
        data: result.data,
      };
    } catch (error) {
      this.loggerService.logSubscriptionEvent(
        'error',
        'Failed to process RevenueCat NON_RENEWING_PURCHASE',
        { error: error.message, payload: body }
      );
      throw error;
    }
  }

  private async handleExpiration(body: any) {
    try {
      const subscriptionData =
        this.revenueCatService.convertRevenueCatToSubscriptionData(body);

      this.loggerService.logSubscriptionEvent(
        'info',
        'Processing RevenueCat EXPIRATION',
        {
          userId: subscriptionData.user_id,
          subscriptionId: subscriptionData.subscription_id,
        }
      );

      const result = await this.subscriptionService.upsertSubscription({
        ...subscriptionData,
        status: 'expired',
      });

      if (result.success && subscriptionData.user_id) {
        await this.invalidateUserCaches(subscriptionData.user_id);
      }

      return {
        success: true,
        message: 'Expiration processed successfully',
        data: result.data,
      };
    } catch (error) {
      this.loggerService.logSubscriptionEvent(
        'error',
        'Failed to process RevenueCat EXPIRATION',
        { error: error.message, payload: body }
      );
      throw error;
    }
  }

  private async handleBillingIssue(body: any) {
    try {
      const subscriptionData =
        this.revenueCatService.convertRevenueCatToSubscriptionData(body);

      this.loggerService.logSubscriptionEvent(
        'info',
        'Processing RevenueCat BILLING_ISSUE',
        {
          userId: subscriptionData.user_id,
          subscriptionId: subscriptionData.subscription_id,
        }
      );

      const result = await this.subscriptionService.upsertSubscription({
        ...subscriptionData,
        status: 'halted',
      });

      if (result.success && subscriptionData.user_id) {
        await this.invalidateUserCaches(subscriptionData.user_id);
      }

      return {
        success: true,
        message: 'Billing issue processed successfully',
        data: result.data,
      };
    } catch (error) {
      this.loggerService.logSubscriptionEvent(
        'error',
        'Failed to process RevenueCat BILLING_ISSUE',
        { error: error.message, payload: body }
      );
      throw error;
    }
  }

  private async handleProductChange(body: any) {
    try {
      const subscriptionData =
        this.revenueCatService.convertRevenueCatToSubscriptionData(body);

      this.loggerService.logSubscriptionEvent(
        'info',
        'Processing RevenueCat PRODUCT_CHANGE',
        {
          userId: subscriptionData.user_id,
          subscriptionId: subscriptionData.subscription_id,
          newProductId: subscriptionData.plan_id,
        }
      );

      const result =
        await this.subscriptionService.upsertSubscription(subscriptionData);

      if (result.success && subscriptionData.user_id) {
        await this.invalidateUserCaches(subscriptionData.user_id);
      }

      return {
        success: true,
        message: 'Product change processed successfully',
        data: result.data,
      };
    } catch (error) {
      this.loggerService.logSubscriptionEvent(
        'error',
        'Failed to process RevenueCat PRODUCT_CHANGE',
        { error: error.message, payload: body }
      );
      throw error;
    }
  }

  /**
   * Invalidate user caches when subscription status changes
   */
  private async invalidateUserCaches(userId: string): Promise<void> {
    try {
      // Use the same cache invalidation pattern as Razorpay webhooks
      const patterns = [
        `cache:*/show/*:user:${userId}*`,
        `cache:*/story/getStoryBySlugForShow*:user:${userId}*`,
        `cache:*/story/getStoryByIdForShow*:user:${userId}*`,
        `cache:*/story/getStoryBySlug*:user:${userId}*`,
        `cache:*/story/slug/*:user:${userId}*`,
      ];

      let totalDeleted = 0;
      for (const pattern of patterns) {
        const deletedCount = await this.cacheService.delPattern(pattern);
        totalDeleted += deletedCount;
      }

      this.loggerService.logSubscriptionEvent(
        'info',
        'Invalidated user story caches after RevenueCat subscription change',
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
}
