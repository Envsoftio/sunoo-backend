# Password Migration Guide

## Overview

When migrating from Supabase to our custom backend, existing users need to reset their passwords due to different password hashing mechanisms. This guide explains how to handle this migration smoothly.

## Why Password Reset is Required

1. **Different Hashing Algorithms**: Supabase uses different password hashing than our backend
2. **Security Best Practice**: Force password reset during major system changes
3. **Data Integrity**: Ensure all passwords are properly hashed with our new system

## Migration Process

### 1. Backend Implementation

We have implemented several features to handle password migration:

#### Database Schema

- `hasDefaultPassword` boolean flag to identify migrated users
- `passwordResetToken` and `passwordResetExpires` for reset functionality
- Password validation and security requirements

#### Auth Service Logic

```typescript
// Check if user has default password (migrated user)
if (user.hasDefaultPassword) {
  return {
    success: false,
    error: {
      message: 'Please reset your password to continue',
      code: 'password_reset_required',
      requiresPasswordReset: true,
    },
  };
}
```

### 2. Migration Scripts

#### Run Password Migration

```bash
# Option 1: Using npm script
npm run migrate:passwords:run

# Option 2: Direct execution
npx ts-node scripts/migrate-user-passwords.ts
```

#### What the Script Does

1. Identifies users with default passwords or no passwords
2. Sets `hasDefaultPassword = true` for migrated users
3. Provides a summary of users who need password reset
4. Preserves existing user data and relationships

### 3. Frontend Implementation

#### Password Reset Required Page

- Dedicated page at `/password-reset-required`
- Explains why password reset is needed
- Provides "Send Password Reset Email" button
- User-friendly interface with clear instructions

#### Login Flow Integration

- Detects `password_reset_required` error code
- Redirects to password reset page with user's email
- Maintains user experience during migration

## User Experience Flow

### For Existing Users

1. **Login Attempt**: User tries to login with existing credentials
2. **Detection**: System detects `hasDefaultPassword = true`
3. **Redirect**: User is redirected to password reset required page
4. **Email Request**: User clicks "Send Password Reset Email"
5. **Email Sent**: System sends password reset email with secure token
6. **Password Reset**: User follows email link to reset password
7. **Login Success**: User can now login with new password

### For New Users

- Normal registration and login flow
- No password reset required

## Implementation Steps

### 1. Run Database Migrations

```bash
npm run migration:run
```

### 2. Run Password Migration Script

```bash
npm run migrate:passwords:run
```

### 3. Deploy Frontend Changes

- Ensure password reset required page is deployed
- Update login component to handle redirect

### 4. Monitor Migration

- Check logs for password reset requests
- Monitor user feedback
- Track completion rates

## Security Considerations

### Password Requirements

- Minimum 8 characters
- Mix of uppercase, lowercase, numbers, and symbols
- Password strength validation
- Secure password hashing (bcrypt with salt rounds 12)

### Token Security

- Password reset tokens expire in 1 hour
- Tokens are single-use
- Secure random token generation
- Email-based verification

## Monitoring and Support

### Logs to Monitor

- Password reset requests
- Failed login attempts
- Email delivery status
- User completion rates

### Support Scenarios

- Users who don't receive reset emails
- Users with invalid email addresses
- Users who need manual password reset
- Technical issues during migration

## Rollback Plan

If issues arise during migration:

1. **Disable Password Reset Requirement**

   ```sql
   UPDATE users SET "hasDefaultPassword" = false WHERE "hasDefaultPassword" = true;
   ```

2. **Revert Frontend Changes**
   - Remove password reset required redirect
   - Allow normal login flow

3. **Manual Password Reset**
   - Admin can reset passwords manually
   - Use secure password generation

## Testing Checklist

- [ ] Migration script runs without errors
- [ ] Users with default passwords are marked correctly
- [ ] Login redirects to password reset page
- [ ] Password reset email is sent successfully
- [ ] Password reset flow works end-to-end
- [ ] Users can login after password reset
- [ ] New users are not affected
- [ ] Error handling works correctly

## Troubleshooting

### Common Issues

1. **Users not receiving reset emails**
   - Check email service configuration
   - Verify SMTP settings
   - Check spam folders

2. **Migration script errors**
   - Verify database connection
   - Check user data integrity
   - Review error logs

3. **Frontend redirect issues**
   - Check error code handling
   - Verify route configuration
   - Test with different browsers

### Support Commands

```bash
# Check users needing password reset
npm run migrate:passwords

# View migration status
npm run migration:show

# Check application logs
npm run start:dev
```

## Conclusion

This migration approach ensures a smooth transition from Supabase to our custom backend while maintaining security and user experience. The process is designed to be user-friendly and secure, with proper error handling and monitoring.
