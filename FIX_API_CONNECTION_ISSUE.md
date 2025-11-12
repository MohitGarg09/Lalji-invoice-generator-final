# 🔧 Fix "Cannot connect to server" Error

## Problem
You're getting the error: **"Cannot connect to server. Please check your internet connection and try again."** when trying to login.

## Root Cause
This error typically means the `VITE_API_BASE` environment variable is **not set** in your Vercel deployment, so the app is trying to connect to `http://127.0.0.1:8000/api` (localhost) instead of your production backend.

## Quick Fix

### Step 1: Check Browser Console
1. Open your deployed app in the browser
2. Press **F12** to open DevTools
3. Go to **Console** tab
4. Look for these messages:
   - `API Base URL: http://127.0.0.1:8000/api` ❌ (Wrong - means env var not set)
   - `API Base URL: https://lalji-invoice-generator-backend.onrender.com/api` ✅ (Correct)

### Step 2: Set Environment Variable in Vercel

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Find your project: **Lalji-invoice-generator-final** (or your project name)
   - Click on it

2. **Navigate to Settings**
   - Click **"Settings"** tab (top menu)
   - Click **"Environment Variables"** (left sidebar)

3. **Add/Update the Variable**
   - Look for `VITE_API_BASE` in the list
   - If it **doesn't exist**, click **"Add New"**
   - If it **exists**, click the **three dots** → **"Edit"**

4. **Set the Value**
   - **Name:** `VITE_API_BASE`
   - **Value:** `https://lalji-invoice-generator-backend.onrender.com/api`
   - **Environment:** Select **all** (Production, Preview, Development)
   - Click **"Save"**

5. **Redeploy**
   - After saving, go to **"Deployments"** tab
   - Find the latest deployment
   - Click the **three dots** → **"Redeploy"**
   - Or push a new commit to trigger auto-deploy

### Step 3: Verify Backend is Running

1. **Check Backend Status**
   - Go to Render Dashboard: https://dashboard.render.com
   - Find your backend service
   - Check if it's **"Live"** (green status)

2. **Test Backend Directly**
   - Open this URL in your browser:
     ```
     https://lalji-invoice-generator-backend.onrender.com/api/invoices/
     ```
   - You should see a JSON response (not an error page)

3. **Test Login Endpoint**
   - You can test with curl (if you have terminal access):
     ```bash
     curl -X POST https://lalji-invoice-generator-backend.onrender.com/api/invoices/verify_access/ \
       -H "Content-Type: application/json" \
       -d '{"password":"Lalji@2025"}'
     ```
   - Should return: `{"success":true,"message":"Access granted"}`

## Verification Checklist

After setting the environment variable and redeploying:

- [ ] `VITE_API_BASE` is set in Vercel environment variables
- [ ] Value is: `https://lalji-invoice-generator-backend.onrender.com/api`
- [ ] Applied to all environments (Production, Preview, Development)
- [ ] Frontend has been redeployed after setting the variable
- [ ] Backend is running and accessible
- [ ] Browser console shows correct API URL (not localhost)
- [ ] Login works successfully

## Common Issues

### Issue: Environment Variable Not Applied
**Symptom:** Console still shows localhost URL after setting variable

**Solution:**
- Make sure you **redeployed** after setting the variable
- Environment variables are only available at **build time** for Vite
- You must rebuild/redeploy for changes to take effect

### Issue: Backend is Down
**Symptom:** Correct API URL but still can't connect

**Solution:**
- Check Render dashboard - backend might be sleeping
- Free tier Render services sleep after 15 minutes of inactivity
- First request after sleep takes ~30 seconds to wake up
- Consider upgrading to paid tier for always-on service

### Issue: CORS Error
**Symptom:** Network request shows CORS error in console

**Solution:**
- Check Render backend environment variables
- Ensure `CORS_ALLOWED_ORIGINS` includes your Vercel URL
- Or set `CORS_ALLOWED_ORIGINS` to empty (allows all origins)

## Debug Steps

1. **Check Console Logs**
   - Open browser DevTools (F12)
   - Console tab should show: `API Base URL: [your-backend-url]`
   - Network tab should show the request URL

2. **Check Network Tab**
   - Go to **Network** tab in DevTools
   - Try to login
   - Find the `verify_access` request
   - Check:
     - **Status:** Should be 200 (success) or 403 (wrong password)
     - **Request URL:** Should be your Render backend URL
     - **Response:** Should be JSON

3. **Check Backend Logs**
   - Go to Render Dashboard → Your Backend → **Logs**
   - Try to login
   - You should see log messages about the request

## Still Not Working?

If you've followed all steps and it's still not working:

1. **Share these details:**
   - Browser console output (API Base URL)
   - Network tab screenshot (showing the failed request)
   - Backend logs from Render
   - Vercel environment variables screenshot (hide sensitive values)

2. **Try these:**
   - Clear browser cache
   - Try incognito/private browsing mode
   - Try a different browser
   - Check if backend URL is correct in Render

---

**Quick Reference:**
- Backend URL: `https://lalji-invoice-generator-backend.onrender.com`
- API Base: `https://lalji-invoice-generator-backend.onrender.com/api`
- Environment Variable: `VITE_API_BASE`


