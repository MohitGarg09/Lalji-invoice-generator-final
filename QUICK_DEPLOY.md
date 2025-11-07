# 🚀 Quick Deployment Guide

## ✅ Your App is Ready to Deploy!

All necessary files have been created:

### Backend Files Created:
- ✅ `backend/requirements.txt` - Python dependencies
- ✅ `backend/Procfile` - Render startup command
- ✅ `backend/build.sh` - Build script for migrations
- ✅ WhiteNoise configured for static files

### Frontend Files Created:
- ✅ `frontend/vercel.json` - Vercel configuration
- ✅ Password protection system implemented

## 📋 Quick Start (5 Steps)

### Step 1: Deploy Backend to Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name:** `invoice-backend`
   - **Environment:** `Python 3`
   - **Root Directory:** `backend`
   - **Build Command:** (leave empty)
   - **Start Command:** (leave empty - uses Procfile)
5. Add Environment Variables:
   ```
   SECRET_KEY=<generate-using-command-below>
   DEBUG=0
   ALLOWED_HOSTS=invoice-backend.onrender.com
   ACCESS_PASSWORD=<your-password>
   ADMIN_PASSWORD=<your-admin-password>
   ```
6. Create PostgreSQL database and add `DATABASE_URL`
7. Click **"Create Web Service"**

**Generate SECRET_KEY:**
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### Step 2: Get Backend URL

After deployment, copy your backend URL (e.g., `https://invoice-backend.onrender.com`)

### Step 3: Update Backend CORS Settings

In Render, add to environment variables:
```
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app
CSRF_TRUSTED_ORIGINS=https://invoice-backend.onrender.com,https://your-frontend.vercel.app
```

### Step 4: Deploy Frontend to Vercel

1. Go to [Vercel Dashboard](https://vercel.com)
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Add Environment Variable:
   ```
   VITE_API_BASE=https://invoice-backend.onrender.com/api
   ```
6. Click **"Deploy"**

### Step 5: Test Your Deployment

1. Visit your Vercel URL
2. You should see the login screen
3. Enter your `ACCESS_PASSWORD`
4. Test creating an invoice
5. Test CRM features

## 🔐 Security Reminders

- ✅ Set strong passwords (not `admin123`)
- ✅ Set `DEBUG=0` in production
- ✅ Use PostgreSQL (not SQLite)
- ✅ HTTPS is automatic on both platforms

## 📚 Detailed Guides

- See `DEPLOYMENT_CHECKLIST.md` for complete checklist
- See `DEPLOYMENT_SECURITY.md` for security details

## 🆘 Need Help?

Common issues:
- **CORS errors:** Check `CORS_ALLOWED_ORIGINS` matches your Vercel URL
- **API not working:** Check `VITE_API_BASE` in Vercel
- **Database errors:** Run migrations in Render shell: `python manage.py migrate`

---

**You're all set! 🎉**

