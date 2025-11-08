# 🔧 Fix: Migration Not Applied on Render

## Problem
```
django.db.utils.ProgrammingError: column billing_invoice.pdf_file does not exist
```

The migration `0011_invoice_pdf_file.py` exists in your code but hasn't been applied to the Render database.

## ✅ Migration Status

- ✅ Migration `0011_invoice_pdf_file.py` exists and is correct
- ✅ Migration is committed to `main` branch
- ✅ Migration is pushed to GitHub (`origin/main`)
- ⚠️ **Migration not applied on Render database**

## Solution: Configure Render to Run Migrations

### 🎯 Preferred: Use Release Command (Recommended)

**Release Command** runs once per deploy (after build, before service starts). This is cleaner than running migrations in the Start Command.

1. Go to **Render Dashboard** → Your Service → **Settings**
2. Scroll to **"Release Command"** field
3. Enter exactly:
   ```bash
   python manage.py migrate --noinput
   ```
4. **Save** (this will trigger a new deploy)
5. Watch the deploy logs - you should see:
   ```
   Applying billing.0011_invoice_pdf_file... OK
   ```

### Alternative: Use Build Command

If Release Command is not available, use Build Command:

1. Go to **Render Dashboard** → Your Service → **Settings**
2. Find **"Build Command"** field
3. Set it to:
   ```bash
   python manage.py migrate --noinput && python manage.py collectstatic --noinput
   ```
   OR use the build.sh script:
   ```bash
   chmod +x build.sh && ./build.sh
   ```
4. Save and redeploy

### Quick Fix: Manual Migration via Shell

If you need to fix it immediately:

1. Go to **Render Dashboard** → Your Service → **Shell** tab
2. Run:
   ```bash
   cd backend
   python manage.py migrate --noinput
   ```
3. This applies all pending migrations immediately

## Verify Migration Applied

After running migrations, check:

```bash
python manage.py showmigrations billing
```

You should see:
```
billing
 [X] 0001_initial
 [X] 0002_invoice_discount_percent
 ...
 [X] 0011_invoice_pdf_file  ← Should be checked
```

## Quick Fix Steps

1. **Right Now (via Shell):**
   - Render Dashboard → Your Service → Shell
   - Run: `python manage.py migrate`
   - Refresh admin page

2. **For Future Deploys:**
   - Update Build Command to include migrations
   - Or ensure `build.sh` is executed during build

## After Migration

Once the migration is applied:
- ✅ Admin will work without errors
- ✅ PDF generation will work
- ✅ `pdf_file` field will be available in database

---

**The service is deployed, you just need to run the migration!**

