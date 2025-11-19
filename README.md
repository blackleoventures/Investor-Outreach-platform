# 📧 Email Management Application

![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)
![Firebase](https://img.shields.io/badge/Firebase-Admin-orange.svg)

A full-stack email management application with client tracking capabilities built entirely on Next.js with Firebase integration.

## 🛠️ Tech Stack

- ⚡ **Next.js 14** (App Router + API Routes)
- 📘 **TypeScript**
- 🔥 **Firebase** (Authentication & Firestore Database)
- 🎨 **Ant Design**
- 🔐 **Firebase Admin SDK** (Server-side operations)
- 🤖 **Google Gemini AI** (AI-powered features)

## 🚀 Getting Started

### Prerequisites
- 📦 Node.js 18+
- 🔑 Firebase Project with Admin Service Account
- 🤖 Google Gemini API Key

### Installation

1. **Clone and install dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   
   Create a `.env.local` file in the root directory with the following variables:

   ```env
   # Firebase Client SDK (Public - for frontend authentication)
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id
   
   # Firebase Admin SDK (Private - for server-side operations)
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=service-account@your-project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   
   # Google Sheets Integration
   INVESTOR_SHEET_ID=your-investor-sheet-id
   INCUBATOR_SHEET_ID=your-incubator-sheet-id
   
   # Security
   ENCRYPTION_KEY=your-256-bit-encryption-key-in-hex
   CRON_SECRET=your-cron-job-secret-key
   
   # API Configuration
   NEXT_PUBLIC_API_BASE_URL=/api
   GEMINI_API_KEY=your-gemini-api-key
   
   # Environment
   NODE_ENV=development
   ```

3. **Development**
   ```bash
   npm run dev
   ```

> 🌐 **Application URL:** `http://localhost:3000`


## 🔥 Firebase Configuration

### Client-Side Configuration
The Firebase client SDK is initialized with `NEXT_PUBLIC_*` variables for frontend authentication:

```typescript
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};
```

### Server-Side Configuration
Firebase Admin SDK handles server-side operations in API routes using service account credentials:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

## ⚙️ Key Features

- 📧 **Email Management** - Send and track emails
- 👥 **Client Tracking** - Monitor client interactions
- 📊 **Google Sheets Integration** - Sync with investor/incubator data
- 🤖 **AI-Powered** - Gemini AI integration for smart features
- 🔐 **Secure Authentication** - Firebase Auth
- 🔒 **Data Encryption** - Sensitive data encryption
- ⏰ **Scheduled Tasks** - Cron job support

## 🔐 Security Best Practices

| ⚡ Action | 📝 Description |
|----------|----------------|
| **Environment Variables** | Never commit `.env` - it's gitignored |
| **Public vs Private** | Only `NEXT_PUBLIC_*` variables are exposed to browser |
| **Firebase Keys** | Include escaped newlines (`\\n`) in `FIREBASE_PRIVATE_KEY` |
| **API Routes** | Use Firebase Admin SDK for secure server-side operations |
| **Encryption Key** | Generate secure 256-bit key for `ENCRYPTION_KEY` |
| **Cron Secret** | Protect scheduled endpoints with `CRON_SECRET` |
| **Production Mode** | Set `NODE_ENV=production` in deployment |

## 📜 Available Scripts

```bash
npm run dev      # 🔥 Start development server (http://localhost:3000)
npm run build    # 📦 Build for production
npm start        # 🚀 Start production server
```

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect Repository**
   - Import your repository to Vercel
   - Vercel automatically detects Next.js

2. **Configure Environment Variables**
   - Add all variables from `.env` to Vercel dashboard
   - Ensure `NODE_ENV=production`
   - **Important:** Firebase private key newlines should be `\\n` (double backslash)

3. **Deploy**
   - Vercel handles build and deployment automatically
   - Use Node.js 18.x runtime

### Other Platforms

**Netlify, Railway, or VPS:**
- Set all environment variables in platform dashboard
- Ensure Node.js 18+ is available
- Run `npm run build` and `npm start` for production

## 🔧 API Routes Architecture

Next.js API routes (`app/api/`) replace the traditional backend server:

**Benefits:**
- ✅ No separate backend server needed
- ✅ Serverless deployment ready
- ✅ Automatic API optimization
- ✅ Built-in TypeScript support

## ⚠️ Important Notes

> 🔒 **Never commit secrets** - `.env` is gitignored by default
> 
> 📧 **Email credentials** are stored securely in Firebase/Firestore
> 
> 🔑 **Service account keys** must be kept private and never exposed to frontend
>
> 🌐 **API routes** are server-side only - they cannot access browser APIs
>
> 🤖 **Gemini API key** is required for AI-powered features

## 🧪 Environment Variable Validation

The app validates critical environment variables on startup:

```typescript
// Required Firebase Admin credentials
- FIREBASE_PROJECT_ID
- FIREBASE_PRIVATE_KEY
- FIREBASE_CLIENT_EMAIL

// Required for features
- GEMINI_API_KEY (AI features)
- ENCRYPTION_KEY (data encryption)
- CRON_SECRET (scheduled tasks)
```

## 📄 License

**MIT** © Email Management Application


<div align="center">
  <strong>Built with ❤️ using Next.js & Firebase</strong>
</div>