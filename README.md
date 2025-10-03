# 📧 Send-Email Monorepo

![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)
![Firebase](https://img.shields.io/badge/Firebase-Admin-orange.svg)

A full-stack email management application with client tracking capabilities.

## 🛠️ Tech Stack

**Backend**
- 🚀 Express.js
- 🔥 Firebase Admin (Authentication & Database)

**Frontend**
- ⚡ Next.js (App Router)
- 📘 TypeScript
- 🎨 Ant Design

## 🚀 Getting Started

### Prerequisites
- 📦 Node.js 18+
- 🔑 Firebase Service Account

### Installation

1. **Install dependencies**
   ```bash
   # Backend
   cd backend && npm install
   
   # Frontend
   cd ../frontend && npm install
   ```

2. **Environment Setup**
   - Create `.env` files for both backend and frontend
   - Backend: Use `FIREBASE_*` variables
   - Frontend: Use `NEXT_PUBLIC_*` variables

3. **Development**
   ```bash
   # Start backend (Port 5000)
   cd backend
   npm run dev
   
   # Start frontend (Port 3000)
   cd ../frontend
   npm run dev
   ```

> 🌐 **URLs:** Backend: `http://localhost:5000` | Frontend: `http://localhost:3000`

## ⚙️ Environment Variables

### Backend `.env`
```env
PORT=5000
FIREBASE_PROJECT_ID=your-project
FIREBASE_CLIENT_EMAIL=service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
BYPASS_AUTH=false
```

### Frontend `.env.local`
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
NEXT_PUBLIC_SYSTEM_FROM_EMAIL=no-reply@example.com
```

## ⚠️ Important Notes

> 🔒 **Never commit real secrets** - `.env` files are gitignored
> 
> 📧 **Gmail App Passwords** are stored per-company, never hardcode
> 
> 🌐 **Override URLs** using `NEXT_PUBLIC_BACKEND_URL`

## 🔐 Production Security

| ⚡ Action | 📝 Description |
|----------|----------------|
| **Secret Management** | Use platform Secret Managers (Vercel/Render/Railway) |
| **Firebase Keys** | Include escaped newlines (`\\n`) in private keys |
| **Frontend Secrets** | Only `NEXT_PUBLIC_*` variables are safe to expose |
| **Authentication** | Disable `BYPASS_AUTH` in production |
| **Permissions** | Restrict Firebase service account, rotate keys |
| **File Security** | `uploads/` and data files are gitignored |
| **Node.js Version** | Use Node.js 18.x for Vercel compatibility |

## 📜 Scripts

### Backend
```bash
npm run dev    # 🔥 Start development server
npm start      # 🚀 Start production server
```

### Frontend
```bash
npm run dev    # 🔥 Start Next.js development
npm run build  # 📦 Build for production
npm start      # 🚀 Start production server
```

## 🚀 Deployment

### Vercel Deployment

**Backend (API):**
1. Deploy from `backend/` folder as root directory
2. Set environment variables in Vercel dashboard
3. Ensure `BYPASS_AUTH=false` in production

**Frontend:**
1. Deploy from `frontend/` folder as root directory
2. Set `NEXT_PUBLIC_BACKEND_URL` to your backend API URL
3. Configure all `NEXT_PUBLIC_*` variables

**Other Platforms:**
- Render, Railway, or EC2
- Follow similar environment variable setup

---

## 📄 License

**MIT** © Send-Email Monorepo

---

<div align="center">
  <strong>Built with ❤️ using Node.js & Next.js</strong>
</div>
