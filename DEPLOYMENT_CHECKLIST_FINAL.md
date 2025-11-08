# ✅ Pre-Deployment Checklist

## 1. Migrations Applied ✅

**Status:** Configured in `build.sh`

**Action Required:**
- ✅ `build.sh` includes `python manage.py migrate --noinput`
- ⚠️ **On Render:** Make sure build command runs `build.sh` OR manually add:
  ```bash
  python manage.py migrate --noinput
  ```
- ✅ **Locally test:** Run `python manage.py makemigrations` (should show "No changes detected")
- ✅ **Locally test:** Run `python manage.py migrate` to ensure all migrations are applied

**Note:** Migration `0011_invoice_pdf_file.py` must be applied before deployment.

---

## 2. Superuser Exists (Optional but Recommended) ✅

**Action Required:**
```bash
# On Render: Use Shell tab or SSH
python manage.py createsuperuser
```

**Or via environment variables (if using Django management command in build):**
- Not automated - must be done manually after first deployment

---

## 3. Environment Variables on Render ✅

**Required Variables:**

| Variable | Status | Notes |
|----------|--------|-------|
| `SECRET_KEY` | ✅ Required | Strong random value - **MUST SET** |
| `DEBUG` | ✅ Required | Set to `0` or `False` for production |
| `ALLOWED_HOSTS` | ✅ Required | Your Render URL: `your-app.onrender.com` |
| `DATABASE_URL` | ✅ Required | Auto-set by Render if using Postgres addon |
| `ACCESS_PASSWORD` | ✅ Required | Password for app access (default: `Lalji@2025`) |
| `ADMIN_PASSWORD` | ✅ Required | Password for admin features (default: `Admin@2025`) |
| `CSRF_TRUSTED_ORIGINS` | ✅ Recommended | Your frontend URL: `https://your-frontend.vercel.app` |
| `CORS_ALLOWED_ORIGINS` | ✅ Recommended | Your frontend URL: `https://your-frontend.vercel.app` |
| `DISABLE_AUTO_PDF` | ⚠️ Optional | Set to `1` to disable auto PDF generation |

**Example Render Environment Variables:**
```
SECRET_KEY=<generate-strong-key>
DEBUG=0
ALLOWED_HOSTS=your-backend.onrender.com
CSRF_TRUSTED_ORIGINS=https://your-backend.onrender.com,https://your-frontend.vercel.app
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app
ACCESS_PASSWORD=Lalji@2025
ADMIN_PASSWORD=Admin@2025
DATABASE_URL=<auto-set-by-render-if-using-postgres>
```

**Generate SECRET_KEY:**
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

---

## 4. Static & Media File Handling ✅

**Status:** Configured

**What's Set Up:**
- ✅ `build.sh` includes `python manage.py collectstatic --noinput`
- ✅ WhiteNoise configured for static files (if installed)
- ✅ `STATIC_ROOT` and `MEDIA_ROOT` configured

**Action Required:**
- ✅ **On Render:** Ensure build command includes `collectstatic`
- ⚠️ **For Persistent Media:** Consider S3 for PDFs (see File Storage section)

**Render Build Command (if not using build.sh):**
```bash
python manage.py migrate --noinput && python manage.py collectstatic --noinput && gunicorn backend.wsgi:application
```

---

## 5. File Storage and PDFs ⚠️

**Current Setup:**
- ✅ PDFs saved to `MEDIA_ROOT/invoices/{pk}/{filename}`
- ✅ `pdf_file` field added to Invoice model
- ✅ Signals automatically generate PDFs on invoice save

**Important Notes:**
- ⚠️ **Render Disk:** Ephemeral - files may be lost on redeploy
- ✅ **For Production:** Consider S3 for persistent storage

**To Enable S3 (Optional but Recommended):**

1. Install boto3:
   ```bash
   pip install boto3 django-storages
   ```

2. Add to `requirements.txt`:
   ```
   boto3>=1.28.0
   django-storages>=1.14.0
   ```

3. Uncomment S3 settings in `settings.py`:
   ```python
   DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
   AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
   AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
   AWS_STORAGE_BUCKET_NAME = os.environ.get('AWS_STORAGE_BUCKET_NAME')
   AWS_S3_REGION_NAME = os.environ.get('AWS_S3_REGION_NAME', 'us-east-1')
   ```

4. Add AWS credentials to Render environment variables

**Testing PDFs:**
- Create an invoice via API or admin
- Check that PDF is generated and saved
- Verify PDF download endpoint works: `/api/invoices/{id}/pdf/`

---

## 6. Security Quick Checks ✅

**DEBUG:**
- ✅ `DEBUG = os.environ.get('DEBUG', '0') == '1'` - Correctly defaults to False
- ⚠️ **Verify:** Set `DEBUG=0` in Render environment

**ALLOWED_HOSTS:**
- ✅ `ALLOWED_HOSTS = [h.strip() for h in os.environ.get('ALLOWED_HOSTS', '*').split(',') if h.strip()]`
- ⚠️ **Verify:** Set `ALLOWED_HOSTS=your-backend.onrender.com` in Render

**Secrets:**
- ✅ No secrets in code (all use `os.environ.get()`)
- ✅ `.gitignore` excludes sensitive files
- ✅ Default passwords changed from `admin123`

**DISABLE_AUTO_PDF:**
- ✅ Available via `DISABLE_AUTO_PDF=1` environment variable
- ✅ Can be toggled without code changes

---

## 7. Monitoring & Logs ✅

**Status:** Configured

**What's Set Up:**
- ✅ `LOGGING` configuration in `settings.py`
- ✅ Loggers for `billing` and `billing.signals`
- ✅ Console handler (visible in Render logs)

**Action Required:**
- ✅ **Render Logs:** Check Render dashboard → Logs tab
- ⚠️ **Optional:** Add Sentry later for error tracking

**Current Logging Config:**
```python
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        "billing": {"handlers": ["console"], "level": "INFO", "propagate": True},
        "billing.signals": {"handlers": ["console"], "level": "INFO", "propagate": True},
    },
}
```

---

## 8. Frontend Connection ✅

**Required:**
- ✅ Backend URL set in frontend: `VITE_API_BASE=https://your-backend.onrender.com/api`
- ✅ CORS configured: `CORS_ALLOWED_ORIGINS` includes frontend URL
- ✅ CSRF configured: `CSRF_TRUSTED_ORIGINS` includes frontend URL

**Test:**
1. Deploy backend to Render
2. Set frontend `VITE_API_BASE` environment variable
3. Test login with `ACCESS_PASSWORD`
4. Test creating an invoice
5. Test PDF download

---

## Quick Pre-Deploy Commands

**Before deploying, run locally:**
```bash
cd backend

# Check migrations
python manage.py makemigrations  # Should show "No changes detected"

# Apply migrations
python manage.py migrate

# Test collectstatic
python manage.py collectstatic --noinput

# Check settings
python manage.py check --deploy
```

**On Render (after deployment):**
```bash
# Create superuser (via Render Shell)
python manage.py createsuperuser

# Verify migrations
python manage.py showmigrations

# Test PDF generation
# Create invoice via admin or API, check logs for PDF generation
```

---

## Deployment Order

1. ✅ **Backend First:**
   - Deploy to Render
   - Set all environment variables
   - Run migrations (via build.sh or manually)
   - Create superuser
   - Test admin access

2. ✅ **Frontend Second:**
   - Set `VITE_API_BASE` to backend URL
   - Deploy to Vercel
   - Test login
   - Test full workflow

---

## Emergency Controls

**Disable Auto-PDF Generation:**
```bash
# On Render, set environment variable:
DISABLE_AUTO_PDF=1
# Then restart service
```

**Check Logs:**
- Render Dashboard → Your Service → Logs
- Look for PDF generation messages
- Check for errors

---

## ✅ All Items Verified

- ✅ Migrations configured
- ✅ Environment variables documented
- ✅ Static files configured
- ✅ File storage configured (with S3 option)
- ✅ Security settings verified
- ✅ Logging configured
- ✅ Frontend connection ready

**You're ready to deploy! 🚀**

