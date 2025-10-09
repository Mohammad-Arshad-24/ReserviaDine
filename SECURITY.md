# Security Guide

## ⚠️ CRITICAL: API Key Security

### What Happened
Your Google API key was exposed in the public repository, which is a **security risk**. This has been fixed by moving all sensitive configuration to environment variables.

### What Was Fixed
1. **Moved Firebase config to environment variables** - No more hardcoded API keys
2. **Updated .gitignore** - Environment files are now ignored
3. **Created .env.example** - Template for other developers
4. **Added security documentation** - This guide

### Immediate Actions Required

#### 1. Regenerate Your Firebase API Key (Recommended)
Even though the key is now protected, it's best practice to regenerate it:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: `foodprebook-a25d8`
3. Go to "APIs & Services" > "Credentials"
4. Find your API key and click "Regenerate"
5. Update your `.env` file with the new key

#### 2. Set Up Environment Variables
Create a `.env` file in your project root:

```bash
# Copy the example file
cp .env.example .env

# Edit with your actual values
nano .env
```

#### 3. For Production Deployment
Set these environment variables in your hosting platform:

**Vercel:**
```bash
vercel env add VITE_FIREBASE_API_KEY
vercel env add VITE_FIREBASE_AUTH_DOMAIN
# ... add all other VITE_FIREBASE_* variables
```

**Netlify:**
- Go to Site Settings > Environment Variables
- Add all `VITE_FIREBASE_*` variables

**Railway/Render:**
- Add environment variables in the dashboard

### Environment Variables Reference

#### Frontend (Vite) - Must start with `VITE_`
```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

#### Backend (Node.js)
```bash
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
# OR
GOOGLE_APPLICATION_CREDENTIALS=./path/to/service-account.json
```

### Security Best Practices

1. **Never commit `.env` files** - They're in `.gitignore`
2. **Use different keys for different environments** - Dev, staging, production
3. **Rotate keys regularly** - Especially if they've been exposed
4. **Use least privilege** - Only give keys the permissions they need
5. **Monitor usage** - Check Google Cloud Console for unusual activity

### Verification
To verify the fix worked:

1. Check that `.env` is in `.gitignore`
2. Check that `firebase.ts` uses `import.meta.env.VITE_*`
3. Test that the app still works with environment variables
4. Verify no hardcoded keys remain in the codebase

### If You Need Help
- Check the [Firebase Security Rules documentation](https://firebase.google.com/docs/rules)
- Review [Google Cloud API security best practices](https://cloud.google.com/apis/docs/security-best-practices)
- Contact Firebase support if you need to restrict API key usage
