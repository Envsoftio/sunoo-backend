# Firebase Quick Setup (Method 1 - Firebase Console Only)

This is a simplified guide using only Firebase Console - the easiest method!

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** (or select existing)
3. Enter project name: "Sunoo App"
4. Click **"Create project"**

## Step 2: Get Service Account Key

1. In Firebase Console, click the **gear icon ⚙️** next to "Project Overview"
2. Select **"Project settings"**
3. Go to **"Service accounts"** tab
4. Scroll to **"Firebase Admin SDK"** section
5. Click **"Generate new private key"** button
6. Click **"Generate key"** in the confirmation dialog
7. **JSON file downloads automatically** - Save it securely!

## Step 3: Extract Values from JSON

Open the downloaded JSON file. You need these 3 values:

```json
{
  "project_id": "your-project-id-12345",        ← Copy this
  "private_key": "-----BEGIN PRIVATE KEY-----\n...", ← Copy this (entire key)
  "client_email": "firebase-adminsdk-xxx@...",  ← Copy this
  ...
}
```

## Step 4: Add to .env File

Add these to your `.env` or `.env.local`:

```env
FIREBASE_PROJECT_ID=your-project-id-12345
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...your full key...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
```

**Important Notes:**
- Keep the entire private key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
- Keep the `\n` characters (they represent newlines)
- Wrap the private key in double quotes

## Step 5: Restart Server

Restart your NestJS server. You should see:
```
Firebase Admin SDK initialized successfully.
```

That's it! You're ready to send push notifications! 🎉


