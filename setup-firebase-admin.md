# Firebase Admin SDK Setup Guide

## Current Issue
Your backend is showing: `firebase-admin not available; backend firebase operations will be disabled.`

This happens because Firebase Admin SDK needs proper credentials to initialize.

## Solution Options

### Option 1: Service Account Key File (Recommended for Development)

1. **Get Service Account Key:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project: `foodprebook-a25d8`
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Download the JSON file (e.g., `firebase-service-account.json`)

2. **Set Environment Variable:**
   ```bash
   # Windows (Command Prompt)
   set GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json
   
   # Windows (PowerShell)
   $env:GOOGLE_APPLICATION_CREDENTIALS="./firebase-service-account.json"
   
   # Or set FIREBASE_SERVICE_ACCOUNT_JSON with the full JSON content
   set FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
   ```

### Option 2: Application Default Credentials (For Production)

If you're using Google Cloud Platform:
```bash
gcloud auth application-default login
```

### Option 3: Environment Variables in .env File

Create a `.env` file in your project root:
```
FIREBASE_DATABASE_URL=https://foodprebook-a25d8-default-rtdb.firebaseio.com
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json
```

## Testing the Setup

After setting up credentials, restart your server:
```bash
npm run dev
```

You should no longer see the "firebase-admin not available" warning.

## Security Notes

- **Never commit service account keys to version control**
- Add `firebase-service-account.json` to your `.gitignore`
- For production, use environment variables or Google Cloud's built-in authentication

## Current Firebase Project Details

- Project ID: `foodprebook-a25d8`
- Database URL: `https://foodprebook-a25d8-default-rtdb.firebaseio.com`
- The client-side Firebase is already configured and working
