# Gmail SMTP Setup Guide

## Step 1: Enable 2-Factor Authentication
1. Go to https://myaccount.google.com/security
2. Click "2-Step Verification"
3. Follow steps to enable 2FA (required for app passwords)

## Step 2: Generate App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" from dropdown
3. Select "Other (custom name)" 
4. Enter name: "Investor Outreach Platform"
5. Click "Generate"
6. Copy the 16-character password (like: abcd efgh ijkl mnop)

## Step 3: Update Backend Configuration
Add to `backend/.env`:
```
EMAIL_PROVIDER=gmail
GMAIL_USER=priyanshusingh99p@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password
EMAIL_FROM_DEFAULT=priyanshusingh99p@gmail.com
```

## Step 4: Update Email Service
The email service needs to be modified to support Gmail SMTP.