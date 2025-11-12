# 🚀 Step-by-Step Guide: Deploy Frontend to Vercel

## Prerequisites

- ✅ Backend deployed and running at: `https://lalji-invoice-generator-backend.onrender.com`
- ✅ GitHub account (your code is already on GitHub)
- ✅ Vercel account (free tier is fine)

---

## Step 1: Create Vercel Account (if you don't have one)

1. Go to [vercel.com](https://vercel.com)
2. Click **"Sign Up"** (top right)
3. Choose **"Continue with GitHub"** (recommended - easiest way)
4. Authorize Vercel to access your GitHub account

---

## Step 2: Import Your Project

1. After logging in, you'll see the Vercel dashboard
2. Click **"Add New..."** → **"Project"**
3. You'll see a list of your GitHub repositories
4. Find **"Lalji-invoice-generator-final"** (or your repo name)
5. Click **"Import"** next to it

---

## Step 3: Configure Project Settings

Vercel will auto-detect your project, but verify these settings:

### Framework Preset
- **Framework Preset:** `Vite` (should auto-detect)
- If not detected, select **"Vite"** from dropdown

### Root Directory
- **Root Directory:** `frontend`
  - Click **"Edit"** next to Root Directory
  - Select `frontend` folder
  - Click **"Continue"**

### Build Settings
- **Build Command:** `npm run build` (should auto-fill)
- **Output Directory:** `dist` (should auto-fill)
- **Install Command:** `npm install` (should auto-fill)

---

## Step 4: Set Environment Variables

**⚠️ IMPORTANT:** Before deploying, add the environment variable:

1. In the project configuration page, scroll down to **"Environment Variables"**
2. Click **"Add"** or **"Add Environment Variable"**
3. Add the following:

   **Variable Name:**
   ```
   VITE_API_BASE
   ```

   **Value:**
   ```
   https://lalji-invoice-generator-backend.onrender.com/api
   ```

   **Environment:** Select all (Production, Preview, Development)

4. Click **"Save"**

---

## Step 5: Deploy

1. Review all settings one more time
2. Click **"Deploy"** button (bottom right)
3. Wait for the build to complete (usually 1-2 minutes)

---

## Step 6: Verify Deployment

After deployment completes:

1. **You'll get a URL** like: `https://your-project-name.vercel.app`
2. **Test the deployment:**
   - Open the URL in your browser
   - The app should load
   - Try creating an invoice to verify API connection

---

## Step 7: Update Backend CORS (if needed)

If you get CORS errors, make sure your backend has the frontend URL in CORS settings:

1. Go to **Render Dashboard** → Your Backend Service → **Environment**
2. Find `CORS_ALLOWED_ORIGINS` variable
3. Update it to include your Vercel URL:
   ```
   https://your-project-name.vercel.app
   ```
   Or if you have multiple origins:
   ```
   https://your-project-name.vercel.app,https://your-custom-domain.com
   ```
4. **Save** and **Redeploy** the backend

---

## Step 8: (Optional) Custom Domain

If you want a custom domain:

1. In Vercel dashboard, go to your project
2. Click **"Settings"** tab
3. Click **"Domains"** in the sidebar
4. Enter your domain name
5. Follow Vercel's instructions to configure DNS

---

## Troubleshooting

### Build Fails

**Error: "Module not found"**
- Make sure **Root Directory** is set to `frontend`
- Check that `package.json` exists in the `frontend` folder

**Error: "Build command failed"**
- Check build logs in Vercel dashboard
- Try running `npm run build` locally first to see errors

### API Connection Issues

**CORS Errors:**
- Verify `VITE_API_BASE` environment variable is set correctly
- Check backend CORS settings include your Vercel URL
- Backend URL should end with `/api` (not just the domain)

**404 Errors on API calls:**
- Verify backend is running: `https://lalji-invoice-generator-backend.onrender.com/healthz`
- Check `VITE_API_BASE` value in Vercel environment variables

### App Loads but Shows Blank Page

- Open browser console (F12) to check for errors
- Verify all environment variables are set
- Check network tab to see if API calls are failing

---

## Quick Reference

### Vercel Dashboard URLs
- **Dashboard:** https://vercel.com/dashboard
- **Your Project:** https://vercel.com/dashboard → Your Project Name

### Important Environment Variable
```
VITE_API_BASE=https://lalji-invoice-generator-backend.onrender.com/api
```

### Build Commands (already configured)
- **Build:** `npm run build`
- **Output:** `dist`
- **Framework:** Vite

---

## After Deployment

✅ Your frontend is now live!
✅ Every push to `main` branch will auto-deploy
✅ You can preview deployments before promoting to production

---

## Next Steps

1. ✅ Test the deployed frontend
2. ✅ Create a test invoice
3. ✅ Verify PDF download works
4. ✅ Test CRM functionality
5. ✅ Share the URL with your team!

---

**Need Help?**
- Vercel Docs: https://vercel.com/docs
- Vercel Support: Available in dashboard


