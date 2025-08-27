# Project Setup Guide

## 🚀 Quick Start

This guide will help you set up and run the Send-Email project with all the modern technologies properly configured.

## 📋 Prerequisites

- **Node.js** 18.17 or later
- **npm** 9.0 or later
- **Git** for version control

## 🛠️ Installation Steps

### 1. Clone and Navigate to Project
```bash
git clone <your-repo-url>
cd Send-Email
```

### 2. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

### 3. Backend Setup
```bash
cd ../backend

# Install dependencies
npm install

# Start development server
npm run dev
```

The backend will be available at `http://localhost:5000`

## 🎯 Technology Demo

Visit `http://localhost:3000/tech-demo` to see a live demonstration of all the technologies in action:

- **Framer Motion** - Smooth animations and transitions
- **React Hook Form** - Form handling with validation
- **React Hot Toast** - Beautiful notifications
- **Tailwind CSS** - Utility-first styling
- **TypeScript** - Type safety throughout

## 🔧 Configuration Files

### Frontend Configuration

#### `tailwind.config.js`
```javascript
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
    },
  },
  plugins: [],
}
```

#### `postcss.config.mjs`
```javascript
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
```

#### `next.config.ts`
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: process.env.BACKEND_URL
          ? `${process.env.BACKEND_URL}/:path*`
          : "http://localhost:5000/:path*",
      },
    ];
  },
};

export default nextConfig;
```

### Backend Configuration

#### Environment Variables (`.env`)
```bash
# Backend URL for frontend
BACKEND_URL=http://localhost:5000

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# AWS Configuration
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=your-region
```

## 📱 Available Scripts

### Frontend
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Backend
```bash
npm run dev      # Start with watch mode
npm start        # Start production server
```

## 🏗️ Project Structure

```
Send-Email/
├── frontend/                 # Next.js frontend
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   ├── components/      # Reusable components
│   │   ├── contexts/        # React contexts
│   │   └── lib/            # Utility libraries
│   ├── public/              # Static assets
│   └── package.json         # Dependencies
└── backend/                  # Express.js backend
    ├── src/
    │   ├── controllers/     # Route controllers
    │   ├── models/          # Data models
    │   ├── routes/          # API routes
    │   ├── middlewares/     # Custom middleware
    │   └── config/          # Configuration files
    └── package.json         # Dependencies
```

## 🎨 Key Features Implemented

### Frontend Technologies
- ✅ **Next.js 14** - App Router and file-based routing
- ✅ **React 18** - Latest React features and hooks
- ✅ **TypeScript 5** - Full type safety
- ✅ **Tailwind CSS 3.3** - Utility-first CSS framework
- ✅ **Framer Motion 10.16** - Smooth animations
- ✅ **React Hook Form 7.47** - Form handling with validation
- ✅ **React Hot Toast 2.4** - Beautiful notifications
- ✅ **Ant Design 5.24** - Enterprise UI components
- ✅ **Redux Toolkit** - State management
- ✅ **Lucide React** - Beautiful icons

### Backend Technologies
- ✅ **Node.js** - JavaScript runtime
- ✅ **Express.js 4.21** - Web framework
- ✅ **Firebase Admin SDK** - Backend services
- ✅ **MVC Pattern** - Clean architecture
- ✅ **RESTful APIs** - Standard API design
- ✅ **Multer** - File upload handling
- ✅ **Nodemailer** - Email functionality
- ✅ **AWS SDK** - Cloud services integration

## 🚀 Deployment

### Frontend Deployment
The project is configured for:
- **Vercel** (recommended for Next.js)
- **Firebase Hosting**
- **Netlify**

### Backend Deployment
The backend includes `vercel.json` for:
- **Vercel** serverless functions
- **Railway**
- **Heroku**

## 🔍 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Kill process on port 3000
npx kill-port 3000

# Kill process on port 5000
npx kill-port 5000
```

#### 2. Dependency Issues
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 3. TypeScript Errors
```bash
# Check TypeScript version
npx tsc --version

# Run type checking
npx tsc --noEmit
```

### Environment Setup
Make sure you have:
- Proper Firebase configuration
- AWS credentials (if using SES/SNS)
- Correct backend URL in frontend config

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Framer Motion Documentation](https://www.framer.com/motion/)
- [React Hook Form Documentation](https://react-hook-form.com/)
- [Firebase Documentation](https://firebase.google.com/docs)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

---

**Happy Coding! 🎉** 