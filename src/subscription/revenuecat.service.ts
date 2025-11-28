import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RevenueCatService {
  private readonly logger = new Logger(RevenueCatService.name);
  private readonly webhookSecret: string;

  constructor(private configService: ConfigService) {
    this.webhookSecret =
      this.configService.get<string>('REVENUECAT_WEBHOOK_SECRET') || '';
  }

  /**
   * Verify RevenueCat webhook authorization
   * RevenueCat sends the Authorization header value as: Bearer <your-secret>
   * This is the value you set in the webhook configuration's "Authorization header value" field
   */
  verifyWebhookSignature(
    payload: string,
    authorizationHeader: string
  ): boolean {
    try {
      if (!this.webhookSecret) {
        this.logger.warn(
          'REVENUECAT_WEBHOOK_SECRET not configured, skipping verification'
        );
        return false;
      }

      if (!authorizationHeader) {
        this.logger.warn('No authorization header received');
        return false;
      }

      // RevenueCat sends: Bearer <your-secret-value>
      // Remove "Bearer " prefix if present
      const receivedSecret = authorizationHeader
        .replace(/^Bearer\s+/i, '')
        .trim();

      // Compare with configured secret
      return receivedSecret === this.webhookSecret;
    } catch (error) {
      this.logger.error(
        'Error verifying RevenueCat webhook authorization:',
        error
      );
      return false;
    }
  }

  /**
   * Map RevenueCat subscription status to internal status
   */
  mapRevenueCatStatusToInternalStatus(rcStatus: string): string {
    const statusMap: Record<string, string> = {
      ACTIVE: 'active',
      CANCELLED: 'cancelled',
      EXPIRED: 'expired',
      BILLING_ISSUE: 'halted',
      IN_TRIAL_PERIOD: 'active',
      IN_GRACE_PERIOD: 'active',
      PAUSED: 'paused',
    };

    return statusMap[rcStatus] || 'active';
  }

  /**
   * Extract user ID from RevenueCat webhook
   * RevenueCat sends app_user_id in the event data
   */
  extractUserIdFromWebhook(body: any): string | null {
    try {
      // RevenueCat webhook structure:
      // body.event.app_user_id or body.event.customer_info.app_user_id
      if (body?.event?.app_user_id) {
        return body.event.app_user_id;
      }
      if (body?.event?.customer_info?.app_user_id) {
        return body.event.customer_info.app_user_id;
      }
      if (body?.app_user_id) {
        return body.app_user_id;
      }
      return null;
    } catch (error) {
      this.logger.error('Error extracting user ID from webhook:', error);
      return null;
    }
  }

  /**
   * Convert RevenueCat webhook data to subscription entity format
   */
  convertRevenueCatToSubscriptionData(webhookData: any): any {
    try {
      const event = webhookData.event || webhookData;
      const eventType = event.type || webhookData.type;

      // Extract product ID from various possible locations
      const productId =
        event.product_id ||
        event.product_ids?.[0] ||
        (event.entitlements && Object.keys(event.entitlements)[0]) ||
        event.entitlement_ids?.[0] ||
        null;

      // Extract subscription/transaction ID
      // For RevenueCat, use original_transaction_id as primary identifier
      // (stays constant across renewals), transaction_id changes with each renewal
      const subscriptionId =
        event.original_transaction_id ||
        event.transaction_id ||
        event.id ||
        event.subscription_id ||
        null;

      const userId = this.extractUserIdFromWebhook(webhookData);

      // Get subscription status from entitlement or event type
      let rcStatus = 'ACTIVE';

      // Check entitlements for status
      if (event.entitlements) {
        const entitlement = Object.values(event.entitlements)[0] as any;
        if (entitlement) {
          if (entitlement.expires_date) {
            const expiresDate = new Date(entitlement.expires_date);
            rcStatus = expiresDate > new Date() ? 'ACTIVE' : 'EXPIRED';
          } else {
            rcStatus = 'ACTIVE'; // Lifetime or non-expiring
          }
        }
      }

      // Override based on event type
      if (eventType === 'CANCELLATION') {
        rcStatus = 'CANCELLED';
      } else if (eventType === 'EXPIRATION') {
        rcStatus = 'EXPIRED';
      } else if (eventType === 'BILLING_ISSUE') {
        rcStatus = 'BILLING_ISSUE';
      }

      const status = this.mapRevenueCatStatusToInternalStatus(rcStatus);

      // Calculate dates from various possible fields
      const purchaseDate = event.purchased_at_ms
        ? new Date(event.purchased_at_ms)
        : event.purchased_at
          ? new Date(event.purchased_at)
          : event.created_at
            ? new Date(event.created_at)
            : new Date();

      // Extract expiration date - this is the next billing date for renewals
      const expiresDate = event.expires_at_ms
        ? new Date(event.expires_at_ms)
        : event.expires_at
          ? new Date(event.expires_at)
          : event.entitlements
            ? (() => {
                const entitlement = Object.values(event.entitlements)[0] as any;
                return entitlement?.expires_date
                  ? new Date(entitlement.expires_date)
                  : entitlement?.expires_at_ms
                    ? new Date(entitlement.expires_at_ms)
                    : null;
              })()
            : null;

      // Determine if it's a trial
      const isTrial =
        event.period_type === 'TRIAL' ||
        rcStatus === 'IN_TRIAL_PERIOD' ||
        event.is_trial_period === true;

      // Store RevenueCat-specific data in metadata
      const metadata = {
        revenuecatCustomerId:
          event.customer_info?.customer_id || event.customer_id || null,
        revenuecatStore: event.store || 'GOOGLE_PLAY',
        revenuecatOriginalTransactionId: event.original_transaction_id || null,
        revenuecatTransactionId: event.transaction_id || null,
        revenuecatProductId: productId,
        revenuecatEventType: eventType,
        revenuecatPeriodType: event.period_type || null,
        fullWebhookPayload: webhookData,
      };

      return {
        subscription_id: subscriptionId,
        user_id: userId,
        plan_id: productId, // Store RevenueCat product ID (monthly/yearly/lifetime)
        status: status,
        provider: 'revenuecat',
        start_date: purchaseDate,
        end_date: expiresDate || null,
        next_billing_date: expiresDate || null,
        metadata: metadata,
        isTrial: isTrial,
        trialEndDate: isTrial && expiresDate ? expiresDate : null,
        user_cancelled: rcStatus === 'CANCELLED',
        cancelledAt: rcStatus === 'CANCELLED' ? new Date() : null,
      };
    } catch (error) {
      this.logger.error('Error converting RevenueCat webhook data:', error);
      throw error;
    }
  }
}
