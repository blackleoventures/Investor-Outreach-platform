# 🚀 Production Deployment Guide

## Issue: Emails not working on live site but working on localhost

### Root Cause:
The frontend is hardcoded to use `http://localhost:5000` but in production it needs to use your live backend URL.

## 🔧 Fix Steps:

### 1. Update Environment Variables

**Frontend (.env.production):**
```env
NEXT_PUBLIC_BACKEND_URL=https://your-actual-backend-domain.com
```

**Backend (.env.production):**
```env
BASE_URL="https://your-actual-backend-domain.com"
GMAIL_USER="priyanshusingh99p@gmail.com"
GMAIL_APP_PASSWORD="mvmk vgpt zfns zpng"
```

### 2. Deploy Backend First
1. Deploy your backend to a service like:
   - Railway: `railway.app`
   - Render: `render.com`
   - Heroku: `heroku.com`
   - Vercel Functions

2. Get your backend URL (e.g., `https://your-app.railway.app`)

### 3. Update Frontend Environment
Replace `https://your-backend-domain.com` with your actual backend URL in:
- `frontend/.env.production`
- `backend/.env.production`

### 4. Deploy Frontend
Deploy to Vercel/Netlify with the correct environment variables.

## 🔍 Quick Test:

### Check if backend is accessible:
```bash
curl https://your-backend-domain.com/api/healthcheck
```

### Check email endpoint:
```bash
curl -X POST https://your-backend-domain.com/api/email/send-direct \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","subject":"Test","html":"Test email"}'
```

## 📋 Deployment Checklist:

- [ ] Backend deployed and accessible
- [ ] Environment variables updated with live URLs
- [ ] Gmail credentials working in production
- [ ] Frontend pointing to live backend
- [ ] CORS configured for your frontend domain
- [ ] Test email sending from live site

## 🚨 Common Issues:

1. **CORS Error:** Add your frontend domain to CORS whitelist
2. **Gmail Auth:** Ensure app password is correct
3. **Environment Variables:** Check they're set in deployment platform
4. **URL Mismatch:** Frontend and backend URLs must match

## 💡 Quick Fix for Testing:
If you want to test immediately, temporarily update the hardcoded URLs in your code to point to your live backend, then redeploy.