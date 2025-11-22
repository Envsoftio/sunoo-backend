# Firebase Setup Guide for Push Notifications

This guide will help you set up Firebase Cloud Messaging (FCM) for push notifications in your Sunoo backend.

## Prerequisites

- A Google account
- Access to Firebase Console (https://console.firebase.google.com/)

## Step 1: Create or Select a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** (or select an existing project)
3. Enter your project name (e.g., "Sunoo App")
4. Follow the setup wizard:
   - Disable Google Analytics (optional, not required for FCM)
   - Click **"Create project"**
5. Wait for the project to be created

## Step 2: Enable Cloud Messaging API

1. In your Firebase project, go to **Project Settings** (gear icon ⚙️)
2. Click on the **"Cloud Messaging"** tab
3. If not already enabled, the API will be enabled automatically when you use FCM

## Step 3: Create a Service Account

You can access service accounts from **Firebase Console** (easier) or **Google Cloud Console** (direct):

### Method 1: From Firebase Console (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your Firebase project
3. Click the **gear icon ⚙️** next to "Project Overview"
4. Select **"Project settings"**
5. Go to the **"Service accounts"** tab
6. You'll see a section for **"Firebase Admin SDK"**
7. Click **"Generate new private key"** button
8. A dialog will appear - click **"Generate key"**
9. A JSON file will be downloaded automatically - **SAVE THIS FILE SECURELY**

**Note**: This creates a default service account with the necessary permissions automatically.

### Method 2: From Google Cloud Console (Alternative)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project from the project dropdown at the top
3. Navigate to **IAM & Admin** → **Service Accounts**
4. Click **"Create Service Account"**
5. Fill in the details:
   - **Service account name**: `firebase-admin` (or any name you prefer)
   - **Service account ID**: Will be auto-generated
   - **Description**: "Service account for Firebase Admin SDK"
6. Click **"Create and Continue"**
7. **Grant this service account a role**:
   - Select role: **"Firebase Admin SDK Administrator Service Agent"** or **"Editor"**
   - Click **"Continue"**
8. Click **"Done"** (skip the optional step)
9. Then follow Step 4 below to generate the key

## Step 4: Generate Service Account Key

**If you used Method 1 (Firebase Console)**: You already have the JSON file! Skip to Step 5.

**If you used Method 2 (Google Cloud Console)**:

1. In the **Service Accounts** page, find the service account you just created
2. Click on the service account email
3. Go to the **"Keys"** tab
4. Click **"Add Key"** → **"Create new key"**
5. Select **JSON** format
6. Click **"Create"**
7. A JSON file will be downloaded automatically - **SAVE THIS FILE SECURELY** (you won't be able to download it again)

## Step 5: Extract Environment Variables from JSON

Open the downloaded JSON file. It will look like this:

```json
{
  "type": "service_account",
  "project_id": "your-project-id-12345",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project-id-12345.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

### Extract the following values:

1. **FIREBASE_PROJECT_ID**: Use the `project_id` value

   ```
   FIREBASE_PROJECT_ID=your-project-id-12345
   ```

2. **FIREBASE_CLIENT_EMAIL**: Use the `client_email` value

   ```
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id-12345.iam.gserviceaccount.com
   ```

3. **FIREBASE_PRIVATE_KEY**: Use the `private_key` value
   - **IMPORTANT**: Keep the entire key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
   - Replace `\n` with actual newlines or keep as `\n` (the code handles both)
   - Wrap it in double quotes in your `.env` file

   Example:

   ```
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
   ```

## Step 6: Add to Your .env File

Add these variables to your `.env` or `.env.local` file:

```env
# Firebase Configuration (for Push Notifications)
FIREBASE_PROJECT_ID=your-project-id-12345
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id-12345.iam.gserviceaccount.com
```

### Important Notes:

1. **Private Key Format**: The private key should include the full key with BEGIN/END markers
2. **Newlines**: The `\n` characters in the private key are important - they represent newlines
3. **Quotes**: Wrap the private key in double quotes in your `.env` file
4. **Security**: Never commit your `.env` file to version control. The service account key has admin access to your Firebase project.

## Step 7: Verify Configuration

1. Restart your NestJS server
2. Check the logs - you should see:
   ```
   Firebase Admin SDK initialized successfully.
   ```
3. If you see errors, double-check:
   - All three variables are set
   - The private key includes BEGIN/END markers
   - No extra spaces or characters

## Alternative: Using Firebase CLI (Optional)

If you prefer using Firebase CLI:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init

# Use Firebase Admin SDK
# The credentials will be automatically detected if using Firebase hosting
```

## Troubleshooting

### Error: "Firebase configuration is missing"

- Check that all three environment variables are set in your `.env` file
- Verify there are no typos in variable names

### Error: "Invalid credentials"

- Verify the private key includes the BEGIN/END markers
- Check that the `\n` characters are preserved in the private key
- Ensure the service account has the correct permissions

### Error: "Project not found"

- Verify the `FIREBASE_PROJECT_ID` matches your Firebase project ID
- Check that the service account belongs to the same project

## Security Best Practices

1. **Never commit service account keys to Git**
   - Add `.env` to `.gitignore`
   - Add `*-firebase-adminsdk-*.json` to `.gitignore`

2. **Use environment-specific keys**
   - Use different service accounts for development and production
   - Rotate keys periodically

3. **Limit service account permissions**
   - Only grant the minimum required permissions
   - Use "Firebase Admin SDK Administrator Service Agent" role

4. **Store keys securely in production**
   - Use secret management services (AWS Secrets Manager, Google Secret Manager, etc.)
   - Never hardcode credentials in your application

## Next Steps

After setting up Firebase:

1. **Configure Flutter App**: Add Firebase to your Flutter mobile app
   - Download `google-services.json` for Android
   - Download `GoogleService-Info.plist` for iOS
   - Add these files to your Flutter project

2. **Test Push Notifications**:
   - Use the admin API endpoint to send a test notification
   - Verify notifications are received on mobile devices

3. **Monitor Usage**:
   - Check Firebase Console → Cloud Messaging for delivery statistics
   - Monitor your quota and usage

## Additional Resources

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Service Account Best Practices](https://cloud.google.com/iam/docs/best-practices-service-accounts)
