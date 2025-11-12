# ✅ Vercel Deployment Quick Checklist

## Before You Start
- [ ] Backend is deployed and running
- [ ] Backend URL: `https://lalji-invoice-generator-backend.onrender.com`
- [ ] You have a Vercel account (or create one at vercel.com)

---

## Deployment Steps

### 1. Import Project
- [ ] Go to vercel.com → Sign in
- [ ] Click "Add New" → "Project"
- [ ] Find your GitHub repo → Click "Import"

### 2. Configure Settings
- [ ] **Root Directory:** Set to `frontend`
- [ ] **Framework:** Vite (auto-detected)
- [ ] **Build Command:** `npm run build` (auto-detected)
- [ ] **Output Directory:** `dist` (auto-detected)

### 3. Add Environment Variable ⚠️ CRITICAL
- [ ] Click "Environment Variables"
- [ ] Add:
  - **Name:** `VITE_API_BASE`
  - **Value:** `https://lalji-invoice-generator-backend.onrender.com/api`
  - **Environments:** Select all (Production, Preview, Development)
- [ ] Click "Save"

### 4. Deploy
- [ ] Click "Deploy" button
- [ ] Wait for build to complete (~1-2 minutes)

### 5. Verify
- [ ] Open the provided Vercel URL
- [ ] App loads successfully
- [ ] Test creating an invoice
- [ ] Verify API connection works

### 6. Update Backend CORS (if needed)
- [ ] If you get CORS errors:
  - Go to Render Dashboard → Backend → Environment
  - Update `CORS_ALLOWED_ORIGINS` to include your Vercel URL
  - Save and redeploy backend

---

## Environment Variable Reference

```
VITE_API_BASE=https://lalji-invoice-generator-backend.onrender.com/api
```

---

## Common Issues

| Issue | Solution |
|-------|----------|
| Build fails | Check Root Directory is set to `frontend` |
| CORS errors | Add Vercel URL to backend `CORS_ALLOWED_ORIGINS` |
| API 404 | Verify `VITE_API_BASE` ends with `/api` |
| Blank page | Check browser console for errors |

---

## Success Indicators

✅ Build completes without errors
✅ App loads at Vercel URL
✅ Can create invoices
✅ PDF download works
✅ No CORS errors in console

---

**Full Guide:** See `VERCEL_DEPLOYMENT_GUIDE.md` for detailed instructions.


