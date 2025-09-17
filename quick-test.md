# 🚀 Quick Live Email Test

## Step 1: Find Your Live Backend URL
First, you need to know where your backend is deployed. Common platforms:
- Railway: `https://your-app.railway.app`
- Render: `https://your-app.onrender.com`
- Heroku: `https://your-app.herokuapp.com`
- Vercel: `https://your-app.vercel.app`

## Step 2: Test Backend Health
Open browser and go to:
```
https://your-backend-url.com/api/healthcheck
```
Should return: "Server is running"

## Step 3: Test Email (Browser Console)
1. Go to your live frontend site
2. Press F12 to open console
3. Paste this code (replace YOUR_BACKEND_URL):

```javascript
fetch('YOUR_BACKEND_URL/api/email/send-direct', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'priyanshusingh99p@gmail.com',
    subject: 'Live Test - ' + new Date().toLocaleString(),
    html: '<h1>✅ Live email working!</h1><p>Sent from: ' + window.location.href + '</p>'
  })
})
.then(r => r.json())
.then(result => {
  console.log('✅ SUCCESS:', result);
  alert('Email sent! Check inbox.');
})
.catch(error => {
  console.log('❌ ERROR:', error);
  alert('Failed: ' + error.message);
});
```

## Step 4: Check Results
- ✅ Success: Check email inbox
- ❌ Error: Check console for error message

## Common Issues:
1. **CORS Error**: Backend not allowing frontend domain
2. **404 Error**: Wrong backend URL
3. **500 Error**: Gmail credentials not working in production
4. **Network Error**: Backend not deployed/accessible

## Quick Fix:
If you get CORS error, your backend needs to allow your frontend domain in CORS settings.