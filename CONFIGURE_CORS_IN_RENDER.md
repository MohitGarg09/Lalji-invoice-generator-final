# 🔧 Configure CORS in Render - Step by Step

## Your Vercel URL
Based on the error logs, your Vercel frontend URL is:
```
https://lalji-invoice-generator-final-c5x9.vercel.app
```

## Steps to Configure CORS in Render

### 1. Go to Render Dashboard
1. Open [render.com](https://render.com)
2. Sign in to your account
3. Click on your backend service: **lalji-invoice-generator-backend** (or your service name)

### 2. Navigate to Environment Variables
1. In your service dashboard, click on the **"Environment"** tab (left sidebar)
2. You'll see a list of environment variables

### 3. Add/Update CORS_ALLOWED_ORIGINS
1. **If `CORS_ALLOWED_ORIGINS` doesn't exist:**
   - Click **"Add Environment Variable"** or **"Add"** button
   - **Key:** `CORS_ALLOWED_ORIGINS`
   - **Value:** `https://lalji-invoice-generator-final-c5x9.vercel.app`
   - Click **"Save Changes"**

2. **If `CORS_ALLOWED_ORIGINS` already exists:**
   - Click on the variable to edit it
   - **Update the Value** to: `https://lalji-invoice-generator-final-c5x9.vercel.app`
   - **Important:** Remove any trailing slashes (`/`) - the code will handle it, but it's cleaner without
   - Click **"Save Changes"**

### 4. Verify Other Important Variables
While you're in the Environment tab, make sure these are also set:

- ✅ `ACCESS_PASSWORD` - Your access password (default: `Lalji@2025` if not set)
- ✅ `ALLOWED_HOSTS` - Should include: `lalji-invoice-generator-backend.onrender.com`
- ✅ `SECRET_KEY` - A secure random key
- ✅ `DEBUG` - Should be `0` for production

### 5. Redeploy
After saving the environment variable:
1. Render will automatically detect the change
2. It will trigger a new deployment
3. Wait for the deployment to complete (usually 1-2 minutes)
4. Check the logs to ensure it deployed successfully

### 6. Test
After deployment:
1. Open your Vercel frontend: `https://lalji-invoice-generator-final-c5x9.vercel.app`
2. Try to login with your password
3. It should work now! ✅

---

## Alternative: Allow All Origins (Less Secure)

If you want to allow all origins (for testing or if you have multiple frontends):

1. **Delete** the `CORS_ALLOWED_ORIGINS` variable (or set it to empty)
2. The code will automatically allow all origins when the variable is not set
3. **Note:** This is less secure and not recommended for production

---

## Multiple Origins

If you have multiple frontend URLs (e.g., production and preview), separate them with commas:

```
https://lalji-invoice-generator-final-c5x9.vercel.app,https://your-custom-domain.com
```

**Important:** No spaces, no trailing slashes, just comma-separated URLs.

---

## Verify Configuration

After setting the variable, you can verify it's working:

1. **Check Render Logs:**
   - Go to your service → **"Logs"** tab
   - Look for: `verify_access request from origin: https://lalji-invoice-generator-final-c5x9.vercel.app`
   - This confirms the request is reaching the backend

2. **Check Browser Console:**
   - Open your frontend in browser
   - Press F12 to open DevTools
   - Go to **Console** tab
   - Try to login
   - You should NOT see CORS errors

---

## Troubleshooting

### Still Getting CORS Errors?

1. **Double-check the URL:**
   - Make sure there's no trailing slash
   - Make sure it's exactly: `https://lalji-invoice-generator-final-c5x9.vercel.app`
   - No `http://` (must be `https://`)

2. **Check if deployment completed:**
   - Go to Render → Your Service → **"Events"** tab
   - Make sure the latest deployment shows "Live"

3. **Clear browser cache:**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Or clear browser cache completely

4. **Check browser console:**
   - Look for the exact CORS error message
   - It will tell you which origin is being blocked

---

## Summary

✅ **What to set in Render:**
- Variable: `CORS_ALLOWED_ORIGINS`
- Value: `https://lalji-invoice-generator-final-c5x9.vercel.app`
- No trailing slash, no spaces

✅ **After setting:**
- Render will auto-redeploy
- Wait for deployment to complete
- Test login from your Vercel frontend

✅ **The code is already configured:**
- CORS settings are ready in `backend/backend/settings.py`
- It will automatically strip trailing slashes
- It will allow credentials and common headers


