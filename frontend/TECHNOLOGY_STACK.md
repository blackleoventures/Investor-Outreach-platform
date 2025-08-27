# Technology Stack Documentation

## Frontend Technologies

### Core Framework & Language
- **Next.js 15.5.0** - React-based full-stack framework with App Router
- **React 19.1.0** - Latest JavaScript library for building user interfaces
- **TypeScript 5** - Type-safe JavaScript with enhanced developer experience
- **TSX/JSX** - React components with TypeScript integration

### Styling & UI
- **Tailwind CSS 4** - Utility-first CSS framework with modern features
- **PostCSS** - CSS processing tool with Tailwind plugin
- **Ant Design 5.24.0** - Enterprise-grade UI design system
- **Ant Design Icons 6.0.0** - Comprehensive icon library
- **Lucide React 0.475.0** - Beautiful & consistent icon toolkit

### Animation & Motion
- **Framer Motion 10.16.0** - Production-ready motion library for React

### Form & State Management
- **React Hook Form 7.47.0** - Performant forms with easy validation
- **React Hot Toast 2.4.1** - Elegant notification system
- **Redux Toolkit 2.6.1** - Modern Redux with simplified setup
- **React Redux 9.2.0** - Official React bindings for Redux
- **Redux Persist 6.0.0** - Persist and rehydrate Redux store

### Data Visualization & Charts
- **Recharts 2.15.1** - Composable charting library built on React components

### Utilities & Libraries
- **Axios 1.7.9** - Promise-based HTTP client
- **Moment.js 2.30.1** - Date manipulation library
- **SweetAlert2 11.6.13** - Beautiful, responsive, customizable replacement for JavaScript's popup boxes
- **XLSX 0.18.5** - Excel file parsing and generation

### AI Integration
- **Google Generative AI 0.24.0** - Integration with Google's AI services

### Development Tools
- **ESLint 9** - Code linting and quality enforcement
- **Next.js ESLint Config** - Next.js specific linting rules
- **TypeScript 5** - Static type checking

## Backend Technologies

### Core Framework
- **Node.js** - JavaScript runtime environment
- **Express.js 4.21.2** - Fast, unopinionated web framework

### Database & Authentication
- **Firebase 11.10.0** - Backend-as-a-Service platform
- **Firebase Admin SDK 13.1.0** - Server-side Firebase operations
- **Firebase Authentication** - User authentication system

### Email Services
- **Nodemailer 6.10.0** - Easy email sending from Node.js
- **AWS SES Client 3.777.0** - Amazon Simple Email Service integration
- **Mailparser 3.7.2** - Email parsing utilities

### File Handling
- **Multer 1.4.5-lts.1** - Middleware for handling multipart/form-data
- **CSV Parser 3.2.0** - CSV file parsing
- **PapaParse 5.5.2** - Fast CSV parser

### AWS Services
- **AWS SNS Client 3.787.0** - Amazon Simple Notification Service

### Utilities
- **CORS 2.8.5** - Cross-Origin Resource Sharing middleware
- **UUID 11.1.0** - Unique identifier generation
- **Dotenv 16.4.7** - Environment variable management

## Architecture Pattern

### Frontend
- **App Router** - Next.js 13+ file-based routing system
- **Component-Based Architecture** - Reusable React components
- **Context API** - React state management
- **Redux Store** - Centralized state management

### Backend
- **MVC Pattern** - Models, Views, Controllers structure
- **RESTful APIs** - Route-based API architecture
- **Middleware Pattern** - Express.js middleware for cross-cutting concerns

## Project Structure

```
Send-Email/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # App Router pages and layouts
│   │   ├── contexts/        # React contexts
│   │   └── lib/            # Utility libraries
│   ├── public/              # Static assets
│   └── package.json         # Frontend dependencies
└── backend/                  # Express.js backend application
    ├── src/
    │   ├── controllers/     # Route controllers
    │   ├── models/          # Data models
    │   ├── routes/          # API routes
    │   ├── middlewares/     # Custom middleware
    │   └── config/          # Configuration files
    └── package.json         # Backend dependencies
```

## Key Features

- **Email Campaign Management** - Create and manage email campaigns
- **AI-Powered Email Generation** - Google AI integration for content creation
- **Contact List Management** - Import and manage contact lists
- **Investor Matching** - AI-powered investor-company matching
- **Real-time Analytics** - Campaign performance tracking
- **File Upload & Processing** - CSV import and file handling
- **Authentication & Authorization** - Firebase-based user management
- **Responsive Design** - Mobile-first approach with Tailwind CSS

## Development Commands

### Frontend
```bash
cd frontend
npm install          # Install dependencies
npm run dev         # Start development server
npm run build       # Build for production
npm run start       # Start production server
npm run lint        # Run ESLint
```

### Backend
```bash
cd backend
npm install         # Install dependencies
npm run dev         # Start development server with watch mode
npm start           # Start production server
```

## Environment Configuration

The project uses environment variables for configuration:
- `BACKEND_URL` - Backend API endpoint
- Firebase configuration variables
- AWS credentials for SES/SNS services

## Deployment

- **Frontend**: Ready for Firebase Hosting or Vercel deployment
- **Backend**: Configured for Vercel deployment with `vercel.json`
- **Database**: Firebase Firestore integration
- **Authentication**: Firebase Auth integration 