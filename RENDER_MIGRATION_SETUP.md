# ✅ Migration Setup Complete - Next Steps for Render

## ✅ What's Been Verified

1. **Migration File Exists**: `backend/billing/migrations/0011_invoice_pdf_file.py` ✅
2. **Migration is Correct**: Adds `pdf_file` field to Invoice model ✅
3. **Migration is Committed**: In `main` branch ✅
4. **Migration is Pushed**: Available in `origin/main` on GitHub ✅
5. **Local Database**: All migrations applied locally ✅

## 🎯 Action Required: Configure Render

The migration exists in your code but Render needs to be configured to run it automatically on each deploy.

### Option 1: Set Release Command in Render Dashboard (Recommended)

1. Go to **Render Dashboard** → Your Web Service → **Settings**
2. Scroll down to **"Release Command"** field
3. Enter:
   ```bash
   python manage.py migrate --noinput
   ```
4. Click **Save** (this will trigger a new deploy)
5. Watch the **Logs** tab during deploy - you should see:
   ```
   Operations to perform:
     Apply all migrations: billing, ...
   Running migrations:
     Applying billing.0011_invoice_pdf_file... OK
   ```

### Option 2: Use render.yaml (Infrastructure as Code)

A `render.yaml` file has been created in the root directory. If your Render service is configured to use it:

1. The `releaseCommand` is already set to: `python manage.py migrate --noinput`
2. Commit and push the `render.yaml` file:
   ```bash
   git add render.yaml
   git commit -m "Add render.yaml with release command for migrations"
   git push origin main
   ```
3. Render will automatically use this configuration on the next deploy

### Option 3: Quick Manual Fix (Immediate)

If you need to fix the 500 error right now:

1. Go to **Render Dashboard** → Your Service → **Shell** tab
2. Run:
   ```bash
   cd backend
   python manage.py migrate --noinput
   ```
3. This applies the migration immediately
4. Refresh your admin page - the 500 error should be gone

## 🔍 Verify Migration Applied

After deployment or manual migration, verify in Render Shell:

```bash
cd backend
python manage.py showmigrations billing
```

You should see `[X] 0011_invoice_pdf_file` checked.

## 📋 Summary

- ✅ Migration code is ready and pushed
- ⚠️ **Next step**: Configure Render to run migrations (choose one option above)
- ✅ After configuration, future deploys will automatically apply migrations

---

**Recommended**: Use **Option 1** (Release Command) for the cleanest setup. It runs migrations once per deploy, before the service starts.

