# Sunoo Backend Logging System

This document describes the comprehensive logging system implemented for the Sunoo Backend, with special focus on subscription module and webhook logging.

## Overview

The logging system uses Winston as the primary logging library and provides:

- Separate log files for different modules
- Structured JSON logging
- Log rotation and retention
- Webhook-specific logging with sensitive data sanitization
- Performance monitoring and error tracking

## Log Structure

```
logs/
├── application.log          # Main application logs
├── error.log               # Application errors only
└── subscription/
    ├── subscription.log    # Subscription service logs
    ├── subscription-error.log # Subscription errors
    ├── webhooks.log        # Webhook events and processing
    └── webhook-errors.log  # Webhook errors only
```

## Log Levels

- **error**: System errors and exceptions
- **warn**: Warning messages and non-critical issues
- **info**: General information and successful operations
- **debug**: Detailed debugging information (development only)
- **verbose**: Very detailed information (development only)

## Configuration

### Environment Variables

- `LOG_LEVEL`: Controls the minimum log level (default: 'info')
  - Production: 'info'
  - Staging: 'debug'
  - Development: 'debug'

### PM2 Configuration

The ecosystem.config.js includes logging configuration for different environments:

```javascript
env: {
  NODE_ENV: 'production',
  LOG_LEVEL: 'info',  // or 'debug' for staging
}
```

## Log Rotation

### Automatic Rotation

Log files are automatically rotated when they reach 10MB:

- Main logs: Keep 5 rotated files
- Subscription logs: Keep 10 rotated files
- Webhook logs: Keep 15 rotated files (more retention due to high volume)

### Manual Rotation

Run the log rotation script:

```bash
./scripts/log-rotation.sh
```

### Cron Job Setup

Add to crontab for automatic daily rotation:

```bash
# Rotate logs daily at 2 AM
0 2 * * * /path/to/sunoo-backend/scripts/log-rotation.sh
```

## Webhook Logging

### Special Features

1. **Sensitive Data Sanitization**: Automatically redacts sensitive fields like signatures, tokens, and API keys
2. **Request/Response Tracking**: Logs incoming webhook requests and processing responses
3. **Performance Monitoring**: Tracks processing time for each webhook
4. **Error Context**: Captures full error context including payload and headers

### Webhook Log Format

```json
{
  "timestamp": "2024-01-15 10:30:45.123",
  "level": "info",
  "message": "Webhook request received",
  "context": "WebhookController",
  "event": "subscription.activated",
  "subscriptionId": "sub_1234567890",
  "payload": {
    /* sanitized payload */
  },
  "headers": {
    /* sanitized headers */
  },
  "processingTime": 150
}
```

## Subscription Service Logging

### Key Events Logged

1. **Plan Operations**: Fetching plans, plan validation
2. **Subscription Creation**: New subscriptions, plan validation, existing subscription cancellation
3. **Subscription Updates**: Status changes, trial updates, metadata updates
4. **Webhook Processing**: All webhook events with detailed context

### Example Log Entries

```json
{
  "timestamp": "2024-01-15 10:30:45.123",
  "level": "info",
  "message": "Subscription created successfully",
  "context": "SubscriptionService",
  "userId": "user_123",
  "subscriptionId": "sub_1234567890",
  "planId": "plan_123",
  "razorpaySubscriptionId": "sub_rzp_123"
}
```

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Webhook Processing Time**: Should be < 2 seconds
2. **Webhook Error Rate**: Should be < 1%
3. **Subscription Creation Success Rate**: Should be > 99%
4. **Log File Sizes**: Monitor for unexpected growth

### Log Analysis Commands

```bash
# Count webhook events by type
grep "Webhook request received" logs/subscription/webhooks.log | jq '.event' | sort | uniq -c

# Find webhook errors
grep '"level":"error"' logs/subscription/webhook-errors.log

# Monitor processing times
grep "processingTime" logs/subscription/webhooks.log | jq '.processingTime' | sort -n

# Track subscription status changes
grep "Subscription status updated" logs/subscription/subscription.log | jq '.subscriptionId, .status'
```

## Development

### Adding New Log Entries

```typescript
// In any service
constructor(private loggerService: LoggerService) {}

// General logging
this.loggerService.log('Operation completed', 'MyService');

// Subscription-specific logging
this.loggerService.logSubscriptionEvent('info', 'User subscription created', {
  userId: 'user_123',
  subscriptionId: 'sub_123'
});

// Webhook-specific logging
this.loggerService.logWebhookEvent('info', 'Processing webhook', {
  event: 'subscription.activated',
  subscriptionId: 'sub_123'
});
```

### Testing Logging

```bash
# Run with debug logging
LOG_LEVEL=debug npm run start:dev

# Test webhook logging
curl -X POST http://localhost:3005/api/webhooks/razorpay \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: test" \
  -d '{"event": "subscription.activated", "payload": {...}}'
```

## Troubleshooting

### Common Issues

1. **Log Files Not Created**: Check directory permissions
2. **High Log Volume**: Adjust log levels or implement filtering
3. **Missing Webhook Logs**: Verify webhook controller is using LoggerService
4. **Sensitive Data in Logs**: Check sanitization functions

### Debug Commands

```bash
# Check log file permissions
ls -la logs/

# Monitor logs in real-time
tail -f logs/subscription/webhooks.log

# Check log rotation
ls -la logs/subscription/*.log*

# Verify Winston configuration
grep "Winston" logs/application.log
```

## Security Considerations

1. **Sensitive Data**: All sensitive fields are automatically sanitized
2. **Log Access**: Restrict access to log files (chmod 640)
3. **Log Retention**: Old logs are automatically cleaned up
4. **Error Details**: Stack traces are logged but sanitized for production

## Performance Impact

- **Minimal Overhead**: Winston is optimized for performance
- **Async Logging**: All logging is asynchronous
- **File I/O**: Logs are buffered and written in batches
- **Memory Usage**: Log rotation prevents memory issues

## Integration with Monitoring Tools

The structured JSON logs can be easily integrated with:

- **ELK Stack**: Elasticsearch, Logstash, Kibana
- **Grafana**: For log visualization and alerting
- **Splunk**: For enterprise log management
- **CloudWatch**: For AWS deployments

Example Logstash configuration:

```ruby
input {
  file {
    path => "/path/to/logs/subscription/*.log"
    codec => "json"
  }
}

filter {
  if [context] == "WebhookController" {
    mutate {
      add_tag => ["webhook"]
    }
  }
}
```
