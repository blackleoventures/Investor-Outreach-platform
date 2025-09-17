# Troubleshooting Guide

## Email Composer Error: "Unexpected token &#39;&lt;&#39;, &#quot;&lt;!DOCTYPE &#quot;... is not valid JSON"

This error occurs when the frontend receives an HTML response instead of JSON from the backend API.

### Common Causes & Solutions:

#### 1. Backend Server Not Running
**Symptoms:** 
- Email composer shows "Backend offline" status
- API calls return HTML error pages

**Solution:**
```bash
cd backend
npm start
```

#### 2. Wrong Backend URL
**Check your environment variables:**
- Frontend: `frontend/.env.local` should have `NEXT_PUBLIC_BACKEND_URL=http://localhost:5000`
- Backend should be running on port 5000

#### 3. CORS Issues
**Solution:** The backend is already configured with CORS for localhost:3000

#### 4. Email Service Configuration
**Check backend/.env file:**
```env
EMAIL_PROVIDER=gmail
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
```

### Quick Start Guide:

1. **Start both servers:**
   ```bash
   # Option 1: Use the startup script
   start-dev.cmd
   
   # Option 2: Manual start
   # Terminal 1:
   cd backend
   npm start
   
   # Terminal 2:
   cd frontend
   npm run dev
   ```

2. **Verify backend is running:**
   - Visit: http://localhost:5000/api/healthcheck
   - Should return: `{"status":"OK","timestamp":"..."}`

3. **Test email functionality:**
   - Run: `node test-backend.js` from the root directory

### Email Service Setup:

#### Gmail SMTP Setup:
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. Update backend/.env:
   ```env
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=your-16-digit-app-password
   ```

#### SendGrid Setup (Alternative):
```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-sendgrid-api-key
```

### Development Tips:

1. **Check browser console** for detailed error messages
2. **Check backend logs** in the terminal where you ran `npm start`
3. **Use the status indicator** in the email composer to verify backend connectivity
4. **Test with mock emails** - the system will log emails to console if no real email service is configured

### Still Having Issues?

1. Restart both servers
2. Clear browser cache
3. Check firewall settings (ports 3000 and 5000 should be accessible)
4. Verify Node.js version (requires Node.js 18+)