# 🚀 Vercel Deployment Fix Guide

## Current Issues:
1. ✅ Local build successful
2. ❌ Vercel deployment failed - Firebase API keys missing
3. ❌ Gemini API rate limit exceeded (50/day)

## Fix Steps:

### 1. Set Vercel Environment Variables
Go to Vercel Dashboard → Project Settings → Environment Variables

**Frontend Environment Variables:**
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAQEg9IaVaQmR8yaw0nrDeNkBMqc0Xfo8o
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=investor-outreach-c71ad.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=investor-outreach-c71ad
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=investor-outreach-c71ad.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.vercel.app
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSyAQEg9IaVaQmR8yaw0nrDeNkBMqc0Xfo8o
```

**Backend Environment Variables:**
```
FIREBASE_PROJECT_ID=investor-outreach-c71ad
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n[YOUR_PRIVATE_KEY]\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@investor-outreach-c71ad.iam.gserviceaccount.com
GEMINI_API_KEY=AIzaSyAQEg9IaVaQmR8yaw0nrDeNkBMqc0Xfo8o
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
```

### 2. Deploy Backend First
```bash
cd backend
npx vercel --prod
```

### 3. Update Frontend Backend URL
Update NEXT_PUBLIC_BACKEND_URL with backend Vercel URL

### 4. Deploy Frontend
```bash
cd frontend
npx vercel --prod
```

### 5. Gemini API Rate Limit Solutions:
- **Immediate:** Wait 24 hours for quota reset
- **Long-term:** Upgrade to paid plan at https://aistudio.google.com/

## Quick Commands:
```bash
# Kill ports if needed
taskkill /F /IM node.exe

# Deploy backend
cd backend && npx vercel --prod

# Deploy frontend  
cd frontend && npx vercel --prod
```

## Current URLs:
- Frontend: https://frontend-4i3139uc7-priyanshus-projects-80be9232.vercel.app
- Backend: [Deploy backend first to get URL]