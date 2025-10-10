# Winston Logger Usage Guide

## 🚀 **Global Winston Implementation**

Winston is now implemented globally across the entire Sunoo Backend project. Here's how to use it:

## 📝 **Basic Usage in Services**

### **1. Inject LoggerService in any service**

```typescript
import { Injectable } from '@nestjs/common';
import { LoggerService } from '../common/logger/logger.service';

@Injectable()
export class MyService {
  constructor(private readonly loggerService: LoggerService) {}

  async doSomething() {
    // Basic logging
    this.loggerService.log('Operation started', 'MyService');
    this.loggerService.warn('Warning message', 'MyService');
    this.loggerService.error('Error occurred', 'MyService');
    this.loggerService.debug('Debug information', 'MyService');
  }
}
```

### **2. Use Logger Context Decorator**

```typescript
import { Injectable } from '@nestjs/common';
import { LoggerService } from '../common/logger/logger.service';
import { LoggerContext } from '../common/logger/logger.decorator';

@LoggerContext('MyService')
@Injectable()
export class MyService {
  constructor(private readonly loggerService: LoggerService) {}

  async doSomething() {
    // Context will be automatically set to 'MyService'
    this.loggerService.log('Operation started');
  }
}
```

## 🌐 **HTTP Request/Response Logging**

### **Automatic Logging**

All HTTP requests and responses are automatically logged by the `LoggerInterceptor`:

- ✅ **Incoming requests** with method, URL, IP, user agent
- ✅ **Outgoing responses** with status code and processing time
- ✅ **Error responses** with full error context

### **Log Format**

```json
{
  "timestamp": "2025-01-15 10:30:45.123",
  "level": "info",
  "message": "Incoming GET /api/users from 192.168.1.1",
  "context": "MyController",
  "method": "GET",
  "url": "/api/users",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2025-01-15T10:30:45.123Z"
}
```

## 🗄️ **Database Logging**

### **Automatic Database Logging**

All database operations are automatically logged:

- ✅ **SQL queries** with parameters and execution time
- ✅ **Query errors** with full error context
- ✅ **Slow queries** (warnings for queries > 1000ms)
- ✅ **Schema operations** and migrations

### **Database Log Format**

```json
{
  "timestamp": "2025-01-15 10:30:45.123",
  "level": "info",
  "message": "Database Query: SELECT * FROM users WHERE id = $1",
  "context": "DatabaseLogger",
  "query": "SELECT * FROM users WHERE id = $1",
  "parameters": ["123"],
  "duration": 45,
  "timestamp": "2025-01-15T10:30:45.123Z"
}
```

## 📊 **Log Files Structure**

```
logs/
├── application.log          # All application logs
├── error.log               # Error logs only
├── subscription/
│   ├── subscription.log    # Subscription service logs
│   ├── subscription-error.log # Subscription errors
│   ├── webhooks.log        # Webhook events
│   └── webhook-errors.log  # Webhook errors
└── database/
    ├── database.log        # Database operations
    └── database-error.log  # Database errors
```

## 🎯 **Specialized Logging Methods**

### **Subscription Logging**

```typescript
// In subscription service
this.loggerService.logSubscriptionEvent('info', 'User subscription created', {
  userId: 'user_123',
  subscriptionId: 'sub_456',
  planId: 'plan_789',
});
```

### **Webhook Logging**

```typescript
// In webhook controller
this.loggerService.logWebhookRequest(
  'subscription.activated',
  'sub_123',
  payload,
  headers
);

this.loggerService.logWebhookResponse(
  'subscription.activated',
  'sub_123',
  true,
  'Success',
  150
);
```

### **Database Logging**

```typescript
// In database service
this.databaseLogger.logQuery('SELECT * FROM users WHERE id = $1', ['123'], 45);

this.databaseLogger.logQueryError('Connection timeout', 'SELECT * FROM users', [
  '123',
]);
```

## 🔍 **Monitoring Commands**

### **View All Logs**

```bash
# All application logs
tail -f logs/application.log | jq '.'

# All error logs
tail -f logs/error.log | jq '.'

# All webhook logs
tail -f logs/subscription/webhooks.log | jq '.'

# All database logs
tail -f logs/database/database.log | jq '.'
```

### **Filter Logs**

```bash
# Filter by context
grep '"context":"MyService"' logs/application.log | jq '.'

# Filter by level
grep '"level":"error"' logs/application.log | jq '.'

# Filter by time range
grep "2025-01-15 10:" logs/application.log | jq '.'
```

## ⚙️ **Configuration**

### **Environment Variables**

```bash
# Set log level
LOG_LEVEL=info          # production
LOG_LEVEL=debug         # staging
LOG_LEVEL=verbose       # development
```

### **PM2 Configuration**

```javascript
// ecosystem.config.js
env: {
  NODE_ENV: 'production',
  LOG_LEVEL: 'info',
}
```

## 🚀 **Benefits**

1. **Centralized Logging** - All logs in one place
2. **Structured Data** - JSON format for easy parsing
3. **Performance Monitoring** - Request/response times
4. **Error Tracking** - Full stack traces and context
5. **Database Visibility** - All SQL operations logged
6. **Webhook Monitoring** - Complete webhook lifecycle
7. **Production Ready** - Log rotation and retention

## 📈 **Performance Impact**

- **Minimal overhead** - Winston is optimized for performance
- **Async logging** - Non-blocking operations
- **Buffered writes** - Efficient file I/O
- **Automatic rotation** - Prevents disk space issues

## 🔧 **Customization**

### **Add Custom Log Methods**

```typescript
// In LoggerService
logCustomEvent(level: string, message: string, data: any) {
  this.logger.info(message, {
    context: 'CustomLogger',
    ...data,
    timestamp: new Date().toISOString()
  });
}
```

### **Add Custom Log Files**

```typescript
// In LoggerService constructor
this.customLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'custom.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});
```

## ✅ **Ready to Use**

Winston is now fully integrated across your entire Sunoo Backend project! Every service, controller, and database operation will be automatically logged with structured, searchable data. 🎯
