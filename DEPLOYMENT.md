# Deployment Guide

## Overview
This is a **full-stack application** with both frontend (React) and backend (Node.js/Express) components. The deployment strategy depends on your hosting requirements.

## Deployment Options

### Option 1: Static Frontend Only (Netlify/GitHub Pages)
**Use this if:** You only want to deploy the frontend and don't need the backend API.

**What gets deployed:** Only the React frontend (static files)
**What doesn't work:** Backend API endpoints, database operations, authentication

**Steps:**
1. **For Netlify:**
   - Connect your repository to Netlify
   - Build command: `npm run build:frontend`
   - Publish directory: `dist/public`
   - The `netlify.toml` file is already configured

2. **For GitHub Pages:**
   - Push your code to GitHub
   - The GitHub Actions workflow (`.github/workflows/deploy.yml`) will automatically deploy
   - Or manually run: `npm run build:frontend` and upload `dist/public` contents

### Option 2: Full-Stack Deployment (Recommended)
**Use this if:** You want the complete application with backend API.

**Platforms that support full-stack:**
- **Vercel** (recommended for Next.js/React apps)
- **Railway** (good for Node.js apps)
- **Render** (free tier available)
- **Heroku** (paid)
- **DigitalOcean App Platform**
- **AWS/Google Cloud/Azure**

**Steps:**
1. **For Vercel:**
   ```bash
   npm install -g vercel
   vercel
   ```
   - Vercel will automatically detect it's a full-stack app
   - Set environment variables in Vercel dashboard

2. **For Railway:**
   ```bash
   npm install -g @railway/cli
   railway login
   railway init
   railway up
   ```

3. **For Render:**
   - Connect your GitHub repository
   - Build command: `npm run build`
   - Start command: `npm start`
   - Set environment variables in Render dashboard

## Environment Variables
Your app needs these environment variables for full functionality:

```bash
# Firebase Configuration (already set in client code)
FIREBASE_DATABASE_URL=https://foodprebook-a25d8-default-rtdb.firebaseio.com

# For Firebase Admin SDK (backend)
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
# OR
GOOGLE_APPLICATION_CREDENTIALS=./path/to/service-account.json

# Database (if using external database)
DATABASE_URL=your_database_url

# Other environment variables as needed
NODE_ENV=production
PORT=3000
```

## Current Build Output
- **Frontend:** `dist/public/` (static files for Netlify/GitHub Pages)
- **Backend:** `dist/index.js` (Node.js server for full-stack platforms)

## Troubleshooting

### 404 Errors on Netlify/GitHub Pages
- **Cause:** These platforms only serve static files, not Node.js backends
- **Solution:** Use a full-stack hosting platform or deploy only the frontend

### Firebase Admin SDK Errors
- **Cause:** Missing service account credentials
- **Solution:** Set `FIREBASE_SERVICE_ACCOUNT_JSON` or `GOOGLE_APPLICATION_CREDENTIALS` environment variable

### Build Failures
- **Cause:** Missing dependencies or build configuration
- **Solution:** Run `npm install` and `npm run build` locally first

## Recommended Next Steps
1. **For development:** Use `npm run dev` (runs both frontend and backend)
2. **For production:** Deploy to Vercel or Railway for full-stack functionality
3. **For static hosting:** Use the frontend-only build with Netlify/GitHub Pages
