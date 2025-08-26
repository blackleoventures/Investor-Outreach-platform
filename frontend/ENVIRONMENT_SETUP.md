# Environment Setup

## Required Environment Variables

Create a `.env.local` file in the frontend directory with the following variables:

### Firebase Configuration
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Backend Configuration
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5001
```

### AI Services
```env
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

## How to Get Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Go to Project Settings (gear icon)
4. Scroll down to "Your apps" section
5. Click on the web app or create a new one
6. Copy the configuration values

## Development Mode

If you don't have Firebase configured, the app will run in development mode with mock authentication. You can still test the UI and navigation, but authentication features won't work.

## Production Deployment

Make sure to set all environment variables in your production environment (Vercel, Netlify, etc.) before deploying. 