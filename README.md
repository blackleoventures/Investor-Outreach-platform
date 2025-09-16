# Send Email - Next.js Full Stack Application

A comprehensive email campaign management system built with Next.js, featuring client management, contact lists, email campaigns, and AI-powered email generation.

## ✅ Completed Features

### Frontend
- **Authentication & Layout**: Login page, main layout, navigation, loading states
- **Client Management**: Add client form, view all clients, basic CRUD operations
- **Incubator Management**: View all incubators, file upload, basic listing
- **Investor Matching**: Smart matching interface with scoring system
- **Campaign Management**: Basic campaign listing and selection
- **File Upload**: Drag & drop file upload for incubators and contacts
- **Responsive Design**: Modern UI built with Ant Design and Tailwind CSS
- **Error Handling**: Basic error pages and loading states

### Backend
- **API Infrastructure**: Express.js server with basic routing
- **File-based Storage**: Excel/CSV file handling for incubators and investors
- **Client APIs**: CRUD operations for client management
- **Incubator APIs**: Upload, fetch, and basic CRUD operations
- **Upload Handling**: Multer-based file processing
- **Health Check**: Basic server monitoring endpoint

## 🚧 Pending Features

### Frontend
- **Advanced Filtering**: Search, sort, and filter functionality
- **Real-time Validation**: Form validations and guided tooltips
- **Email Composer**: Rich text editor with AI enhancement
- **Campaign Reports**: Detailed analytics and performance tracking
- **Template Library**: Email template management
- **Advanced Matching**: Profile panels and detailed investor tools
- **Contact List Management**: Import/export and list management UI
- **Deep Linking**: Saved selections and URL state management

### Backend
- **Database Integration**: MongoDB connection and data persistence
- **Email Service**: AWS SES integration for sending emails
- **AI Integration**: Google Gemini API for content generation
- **Authentication**: Firebase Admin SDK integration
- **Data Validation**: Schema enforcement and normalization
- **Analytics**: Aggregated stats and reporting endpoints
- **Campaign Management**: Full campaign lifecycle APIs
- **Production Config**: Environment setup and CORS configuration

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **Ant Design** - UI component library
- **Tailwind CSS** - Utility-first CSS framework
- **Redux Toolkit** - State management
- **Firebase** - Authentication and backend services

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - Database with Mongoose ODM
- **Firebase Admin** - Server-side Firebase integration
- **AWS SES** - Email sending service
- **Multer** - File upload handling

## 📁 Project Structure

```
send-email-nextjs-full/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # Next.js App Router pages
│   │   │   ├── dashboard/   # Dashboard routes
│   │   │   ├── reports/     # Report pages
│   │   │   └── layout.tsx   # Root layout
│   │   └── legacy_src/      # Legacy React components (migrated)
│   └── public/              # Static assets
├── backend/                  # Node.js backend server
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes
│   │   └── server.js        # Main server file
│   └── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB (for future database integration)
- Firebase project (for future authentication)
- AWS account (for future SES integration)
- Google Gemini API key (for future AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd send-email-nextjs-full
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd backend
   npm install
   
   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Environment Setup**
   
   Create `.env` files in both frontend and backend directories:
   
   **Backend (.env)**
   ```env
   PORT=5000
   # Future integrations (not yet implemented)
   # MONGODB_URI=your_mongodb_connection_string
   # FIREBASE_PROJECT_ID=your_firebase_project_id
   # AWS_ACCESS_KEY_ID=your_aws_access_key
   # AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   ```
   
   **Frontend (.env.local)**
   ```env
   NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
   # Future integrations (not yet implemented)
   # NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   # NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Start the servers**
   ```bash
   # Start backend (in one terminal)
   cd backend
   npm start
   
   # Start frontend (in another terminal)
   cd frontend
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 📱 Available Routes

### Frontend Routes (Implemented)
- `/` - Login page
- `/dashboard` - Main dashboard
- `/dashboard/add-client` - Add new client
- `/dashboard/all-client` - View all clients
- `/dashboard/investor-management` - Investor matching interface
- `/dashboard/all-incubators` - View all incubators
- `/dashboard/add-incubator` - Add new incubator
- `/dashboard/select-campaign` - Campaign selection (redirects to AI campaign)
- `/dashboard/campaign/ai-email-campaign` - AI email campaign interface

### Backend API Routes (Implemented)
- `GET /api/health` - Health check endpoint
- `GET /api/clients` - Get all clients
- `POST /api/clients` - Create new client
- `GET /api/incubators` - Get all incubators
- `POST /api/incubators` - Create new incubator
- `POST /api/incubators/upload-file` - Upload incubator file
- `GET /api/investors` - Get all investors
- `POST /api/investors/upload-file` - Upload investor file

## 🔧 Development

### Scripts

**Backend**
- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload

**Frontend**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Code Style
- ESLint configuration for code quality
- Prettier for code formatting
- TypeScript for type safety

## 🚀 Deployment

### Frontend (Vercel)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Backend (Railway/Heroku)
1. Connect your GitHub repository
2. Set environment variables
3. Deploy and get your backend URL
4. Update frontend environment variables

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions, please open an issue in the GitHub repository or contact the development team.

## 🔄 Migration Notes

This project was migrated from a legacy React application to Next.js. The `legacy_src/` directory contains the original React components that have been adapted to work with Next.js routing and environment variables. "# Investor-outreach-platform-" 
