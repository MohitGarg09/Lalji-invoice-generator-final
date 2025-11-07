# Deployment Checklist for Vercel + Render

## ✅ Pre-Deployment Checklist

### Backend (Render) Setup

- [ ] **Create requirements.txt** ✅ (Already created)
- [ ] **Create Procfile** ✅ (Already created)
- [ ] **Set up PostgreSQL database** (Recommended for production)
  - In Render dashboard, create a PostgreSQL database
  - Copy the `DATABASE_URL` from the database service
- [ ] **Environment Variables to Set in Render:**
  ```
  SECRET_KEY=<generate-a-random-secret-key>
  DEBUG=0
  ALLOWED_HOSTS=your-backend.onrender.com
  CSRF_TRUSTED_ORIGINS=https://your-backend.onrender.com,https://your-frontend.vercel.app
  DATABASE_URL=<from-postgres-service>
  ACCESS_PASSWORD=<your-secure-access-password>
  ADMIN_PASSWORD=<your-admin-password>
  CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app
  ```
- [ ] **Build Command:** Leave empty (Render auto-detects)
- [ ] **Start Command:** Leave empty (uses Procfile)
- [ ] **Python Version:** 3.11 or 3.12

### Frontend (Vercel) Setup

- [ ] **Create vercel.json** ✅ (Already created)
- [ ] **Environment Variables to Set in Vercel:**
  ```
  VITE_API_BASE=https://your-backend.onrender.com/api
  ```
- [ ] **Build Settings:**
  - Framework Preset: Vite
  - Root Directory: `frontend` (if deploying from root)
  - Build Command: `npm run build`
  - Output Directory: `dist`
  - Install Command: `npm install`

## 📋 Step-by-Step Deployment

### 1. Deploy Backend to Render

1. **Create a new Web Service** in Render
2. **Connect your repository** (GitHub/GitLab)
3. **Configure:**
   - **Name:** invoice-backend (or your choice)
   - **Environment:** Python 3
   - **Build Command:** (leave empty)
   - **Start Command:** (leave empty - uses Procfile)
   - **Root Directory:** `backend`
4. **Add Environment Variables** (see above)
5. **Create PostgreSQL Database:**
   - Create a new PostgreSQL service
   - Copy the `Internal Database URL` or `External Database URL`
   - Add it as `DATABASE_URL` in your web service
6. **Deploy!**

### 2. Run Migrations

After first deployment, run migrations:
```bash
# In Render shell or via SSH
cd backend
python manage.py migrate
```

Or add a build script that runs migrations automatically.

### 3. Deploy Frontend to Vercel

1. **Import your repository** in Vercel
2. **Configure Project:**
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. **Add Environment Variables:**
   - `VITE_API_BASE`: Your Render backend URL (e.g., `https://invoice-backend.onrender.com/api`)
4. **Deploy!**

## 🔒 Security Checklist

- [ ] Set strong `SECRET_KEY` (use: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`)
- [ ] Set `DEBUG=0` in production
- [ ] Set strong `ACCESS_PASSWORD`
- [ ] Set strong `ADMIN_PASSWORD` (different from access password)
- [ ] Configure `ALLOWED_HOSTS` with your actual domain
- [ ] Configure `CSRF_TRUSTED_ORIGINS` with your frontend URL
- [ ] Configure `CORS_ALLOWED_ORIGINS` with your frontend URL
- [ ] Use PostgreSQL instead of SQLite for production
- [ ] Enable HTTPS (automatic on Vercel/Render)

## 🧪 Post-Deployment Testing

1. **Test Login:**
   - Visit your Vercel frontend URL
   - Should see login screen
   - Enter `ACCESS_PASSWORD`
   - Should access the app

2. **Test API:**
   - Try creating an invoice
   - Try viewing CRM
   - Try downloading PDF

3. **Test Admin:**
   - In CRM, click "Admin Login"
   - Enter `ADMIN_PASSWORD`
   - Should be able to edit/delete invoices

## 🐛 Common Issues & Solutions

### Backend Issues

**Issue:** `ModuleNotFoundError: No module named 'dj_database_url'`
- **Solution:** Make sure `requirements.txt` includes `dj-database-url`

**Issue:** Database connection errors
- **Solution:** Check `DATABASE_URL` is set correctly in Render

**Issue:** Static files not loading
- **Solution:** Add `whitenoise` to middleware and run `python manage.py collectstatic`

**Issue:** CORS errors
- **Solution:** Set `CORS_ALLOWED_ORIGINS` with your frontend URL

### Frontend Issues

**Issue:** API calls failing
- **Solution:** Check `VITE_API_BASE` is set correctly in Vercel

**Issue:** 404 errors on page refresh
- **Solution:** `vercel.json` should have rewrite rules (already included)

**Issue:** Build fails
- **Solution:** Check Node.js version (Vercel auto-detects, but ensure it's 18+)

## 📝 Additional Notes

- **Static Files:** If you need to serve static files from Django, configure WhiteNoise
- **Media Files:** For invoice PDFs, consider using S3 or Render's persistent disk
- **Database Backups:** Set up automatic backups for PostgreSQL on Render
- **Monitoring:** Consider adding error tracking (Sentry, etc.)

## 🚀 You're Ready to Deploy!

Follow the checklist above, and your application should deploy successfully to Vercel and Render.

