# Halted Subscription Recovery Guide

## Overview

When a Razorpay subscription enters a `halted` state, it means that all automatic retry attempts for payment have failed. This typically happens due to:

- Expired payment methods
- Insufficient funds
- Bank declines
- Invalid card details
- Network issues during payment processing

## Recovery Methods

### 1. Automatic Recovery (Recommended)

The most common way to recover from a halted subscription is to have the customer update their payment details:

1. **Customer receives email notification** from Razorpay with a link to update payment details
2. **Customer updates payment information** using the provided link
3. **Razorpay automatically retries** the last failed payment
4. **Subscription resumes** if payment is successful

### 2. Manual Recovery via API

We've implemented several API endpoints to handle halted subscription recovery:

#### Get Halted Subscription Details

```http
GET /api/subscription/halted-subscription-details
Authorization: Bearer <jwt_token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 123,
    "subscription_id": "sub_abc123",
    "status": "halted",
    "user_id": "user_123",
    "plan_id": "plan_xyz",
    "created_at": "2024-01-01T00:00:00Z",
    "razorpay_details": {
      "id": "sub_abc123",
      "status": "halted",
      "current_start": 1640995200,
      "current_end": 1643673600,
      "ended_at": null,
      "quantity": 1,
      "notes": {},
      "charge_at": 1643673600,
      "start_at": 1640995200,
      "end_at": 1643673600,
      "auth_attempts": 3,
      "total_count": 12,
      "paid_count": 1,
      "customer_notify": 1,
      "created_at": 1640995200,
      "expire_by": 1640995200,
      "short_url": "https://rzp.io/i/abc123",
      "has_scheduled_changes": false,
      "change_scheduled_at": null,
      "reminder_enable": false,
      "reminder_count": 0,
      "plan": {
        "id": "plan_xyz",
        "item": {
          "id": "item_123",
          "active": true,
          "name": "Premium Plan",
          "description": "Monthly premium subscription",
          "amount": 29900,
          "currency": "INR",
          "type": "plan",
          "unit": "monthly",
          "tax_inclusive": true,
          "hsn_code": "998314",
          "sac_code": "998314",
          "tax_rate": 0,
          "tax_id": "txn_123",
          "tax_group_id": "tg_123",
          "created_at": 1640995200,
          "updated_at": 1640995200
        },
        "period": "monthly",
        "interval": 1,
        "item": {
          "id": "item_123",
          "active": true,
          "name": "Premium Plan",
          "description": "Monthly premium subscription",
          "amount": 29900,
          "currency": "INR",
          "type": "plan",
          "unit": "monthly",
          "tax_inclusive": true,
          "hsn_code": "998314",
          "sac_code": "998314",
          "tax_rate": 0,
          "tax_id": "txn_123",
          "tax_group_id": "tg_123",
          "created_at": 1640995200,
          "updated_at": 1640995200
        }
      },
      "customer_id": "cust_123",
      "short_url": "https://rzp.io/i/abc123",
      "has_scheduled_changes": false,
      "change_scheduled_at": null,
      "reminder_enable": false,
      "reminder_count": 0
    }
  }
}
```

#### Resume Halted Subscription

```http
POST /api/subscription/resume-halted-subscription
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "subscriptionId": "sub_abc123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Subscription resumed successfully",
  "data": {
    "id": "sub_abc123",
    "status": "active",
    "current_start": 1640995200,
    "current_end": 1643673600,
    "ended_at": null,
    "quantity": 1,
    "notes": {},
    "charge_at": 1643673600,
    "start_at": 1640995200,
    "end_at": 1643673600,
    "auth_attempts": 0,
    "total_count": 12,
    "paid_count": 1,
    "customer_notify": 1,
    "created_at": 1640995200,
    "expire_by": 1643673600,
    "short_url": "https://rzp.io/i/abc123",
    "has_scheduled_changes": false,
    "change_scheduled_at": null,
    "reminder_enable": false,
    "reminder_count": 0
  }
}
```

#### Retry Halted Payment

```http
POST /api/subscription/retry-halted-payment
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "subscriptionId": "sub_abc123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Payment retry initiated",
  "data": {
    "id": "inv_abc123",
    "entity": "invoice",
    "receipt": "rcpt_123",
    "invoice_number": "inv_123",
    "customer_id": "cust_123",
    "customer_details": {
      "id": "cust_123",
      "name": "John Doe",
      "email": "john@example.com",
      "contact": "9876543210",
      "gstin": null,
      "billing_address": null,
      "shipping_address": null,
      "customer_name": "John Doe",
      "customer_email": "john@example.com",
      "customer_contact": "9876543210"
    },
    "order_id": "order_abc123",
    "line_items": [
      {
        "id": "li_abc123",
        "item_id": "item_123",
        "ref_id": "ref_123",
        "ref_type": "plan",
        "name": "Premium Plan",
        "description": "Monthly premium subscription",
        "amount": 29900,
        "unit_amount": 29900,
        "gross_amount": 29900,
        "tax_amount": 0,
        "taxable_amount": 29900,
        "net_amount": 29900,
        "currency": "INR",
        "type": "plan",
        "tax_inclusive": true,
        "hsn_code": "998314",
        "sac_code": "998314",
        "tax_rate": 0,
        "unit": "monthly",
        "quantity": 1
      }
    ],
    "payment_id": null,
    "payment": null,
    "comment": null,
    "customer_notify": 1,
    "customer_email": "john@example.com",
    "customer_contact": "9876543210",
    "currency": "INR",
    "status": "issued",
    "expire_by": 1643673600,
    "issued_at": 1640995200,
    "paid_at": null,
    "receipt": "rcpt_123",
    "short_url": "https://rzp.io/i/abc123",
    "view_less": 1,
    "billing_start": null,
    "billing_end": null,
    "type": "invoice",
    "kind": "subscription",
    "notes": {},
    "internal_notes": null,
    "terms": null,
    "description": "Monthly premium subscription",
    "amount_paid": 0,
    "amount_due": 29900,
    "settlement_id": null,
    "payment_terms": null,
    "date": 1640995200,
    "partial_payment": false,
    "gross_amount": 29900,
    "tax_amount": 0,
    "taxable_amount": 29900,
    "net_amount": 29900,
    "amount": 29900,
    "amount_paid": 0,
    "amount_due": 29900,
    "currency": "INR",
    "currency_symbol": "₹",
    "currency_formatted": "₹299.00",
    "amount_paid_formatted": "₹0.00",
    "amount_due_formatted": "₹299.00",
    "settlement_id": null,
    "payment_terms": null,
    "date": 1640995200,
    "partial_payment": false,
    "gross_amount": 29900,
    "tax_amount": 0,
    "taxable_amount": 29900,
    "net_amount": 29900,
    "amount": 29900,
    "amount_paid": 0,
    "amount_due": 29900,
    "currency": "INR",
    "currency_symbol": "₹",
    "currency_formatted": "₹299.00",
    "amount_paid_formatted": "₹0.00",
    "amount_due_formatted": "₹299.00"
  }
}
```

## Implementation Details

### Backend Services

#### RazorpayService

- `pauseSubscription(subscriptionId)` - Pause a subscription
- `resumeSubscription(subscriptionId)` - Resume a paused subscription
- `updateSubscription(subscriptionId, updateData)` - Update subscription details
- `retryPayment(subscriptionId)` - Retry payment for a halted subscription

#### SubscriptionService

- `resumeHaltedSubscription(userId, subscriptionId)` - Resume a halted subscription
- `retryHaltedPayment(userId, subscriptionId)` - Retry payment for halted subscription
- `getHaltedSubscriptionDetails(userId)` - Get details of halted subscription

### Database Updates

When a subscription is resumed:

1. Status is updated from `halted` to `active`
2. `updated_at` timestamp is updated
3. Metadata is updated with resume information
4. Razorpay response is stored in metadata

### Webhook Handling

The system automatically handles subscription status changes via webhooks:

- `subscription.halted` - Updates subscription status to `halted`
- `subscription.activated` - Updates subscription status to `active`
- `payment.authorized` - Processes successful payments

## Best Practices

### 1. Customer Communication

- Send clear notifications when subscription is halted
- Provide easy-to-use payment update links
- Explain the reason for halting (payment failure)
- Offer support contact information

### 2. Retry Strategy

- Implement exponential backoff for retry attempts
- Set maximum retry limits
- Monitor retry success rates
- Log all retry attempts for debugging

### 3. Monitoring

- Set up alerts for high halted subscription rates
- Monitor payment failure patterns
- Track recovery success rates
- Analyze common failure reasons

### 4. User Experience

- Provide clear status indicators in the UI
- Show payment update options prominently
- Offer alternative payment methods
- Implement graceful degradation for failed payments

## Error Handling

### Common Error Scenarios

1. **Subscription Not Found**
   - Error: "Halted subscription not found for this user"
   - Solution: Verify subscription ID and user association

2. **Razorpay API Errors**
   - Error: "Razorpay API error: 400 Bad Request"
   - Solution: Check subscription status and payment method validity

3. **Payment Method Issues**
   - Error: "No pending invoices found for this subscription"
   - Solution: Verify subscription has failed payments to retry

4. **Network Issues**
   - Error: "Failed to fetch subscription details"
   - Solution: Implement retry logic and fallback mechanisms

### Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Additional error details"
  }
}
```

## Testing

### Test Scenarios

1. **Successful Resume**
   - Create halted subscription
   - Call resume API
   - Verify status change to active
   - Check database updates

2. **Failed Resume**
   - Test with invalid subscription ID
   - Test with non-halted subscription
   - Verify error handling

3. **Payment Retry**
   - Test retry with valid subscription
   - Test retry with no pending invoices
   - Verify payment processing

### Test Data

```json
{
  "testSubscriptionId": "sub_test123",
  "testUserId": "user_test123",
  "testPlanId": "plan_test123"
}
```

## Monitoring and Alerts

### Key Metrics

- Halted subscription count
- Recovery success rate
- Average recovery time
- Payment failure reasons

### Alert Thresholds

- Halted subscription rate > 5%
- Recovery success rate < 80%
- Average recovery time > 24 hours

### Dashboard Metrics

- Real-time subscription status
- Recovery attempt history
- Payment failure analysis
- Customer support tickets

## Support and Troubleshooting

### Common Issues

1. **Customer can't update payment method**
   - Check Razorpay email delivery
   - Verify customer email address
   - Provide manual payment update link

2. **Subscription won't resume**
   - Check Razorpay subscription status
   - Verify payment method validity
   - Review error logs for details

3. **Payment retry fails**
   - Check for pending invoices
   - Verify payment method details
   - Review Razorpay API responses

### Debug Steps

1. Check subscription status in database
2. Verify Razorpay subscription details
3. Review webhook logs
4. Check payment method validity
5. Test with Razorpay dashboard

### Support Contacts

- **Razorpay Support**: support@razorpay.com
- **Internal Support**: support@sunoo.com
- **Emergency Contact**: +91-9876543210

## Conclusion

Halted subscription recovery is a critical part of subscription management. By implementing proper recovery mechanisms, monitoring, and customer communication, you can minimize revenue loss and maintain customer satisfaction.

The implemented solution provides:

- Multiple recovery methods
- Comprehensive error handling
- Detailed logging and monitoring
- Easy-to-use API endpoints
- Clear documentation and support

Regular monitoring and optimization of the recovery process will help maintain high subscription success rates and customer satisfaction.
