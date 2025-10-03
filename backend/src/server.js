const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");
const compression = require("compression");

dotenv.config();

// Set development environment variables
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}
if (!process.env.BYPASS_AUTH) {
  process.env.BYPASS_AUTH = 'true';
}

console.log('🚀 Server starting in', process.env.NODE_ENV, 'mode');

// Initialize Firebase (database connection is handled in firebase-db.config.js)
const { db } = require("./config/firebase-db.config");
const excelService = require('./services/excel.service');

console.log("Firebase initialized successfully");

// Detect serverless/Vercel to avoid long-running watchers and cron
const IS_SERVERLESS = process.env.VERCEL === '1' || process.env.SERVERLESS === '1';

// Initialize Excel service (skip in serverless)
if (!IS_SERVERLESS) {
  try {
    excelService.initializeExcelFile().then(() => {
      excelService.startWatching();
      console.log('Excel service initialized and watching for changes');
    }).catch(err => {
      console.log('Excel service initialization skipped:', err.message);
    });
  } catch (error) {
    console.log('Excel service not available in this environment');
  }
} else {
  console.log('Skipping Excel watcher in serverless environment');
}

// Initialize Google Sheets with fallback (skip in serverless)
if (!IS_SERVERLESS) {
  try {
    const sheetsController = require('./controllers/sheets.controller');
    // Test Google Sheets connection on startup
    sheetsController.readSheetData({ query: {} }, {
      json: (data) => {
        if (data.success) {
          console.log('Google Sheets connection successful');
        } else if (data.source === 'excel_fallback') {
          console.log('Using Excel files as fallback for Google Sheets');
        }
      },
      status: () => ({ json: () => {} })
    }).catch(err => {
      if (err.message.includes('403') || err.message.includes('API has not been used')) {
        console.log('Google Sheets API not enabled - using Excel files as fallback');
      }
    });
  } catch (error) {
    console.log('Google Sheets service initialization failed:', error.message);
  }
} else {
  console.log('Skipping Google Sheets startup check in serverless environment');
}

// Initialize Cron service for scheduled emails (skip in serverless)
if (!IS_SERVERLESS) {
  const cronService = require('./services/cron.service');
  cronService.startCronJobs();
} else {
  console.log('Skipping cron jobs in serverless environment');
}

const app = express();

// Enable gzip/deflate compression for faster responses
app.use(compression());

// CORS with preflight caching to reduce OPTIONS overhead
// Allow localhost, configured FRONTEND_URL, and any vercel.app subdomain
const allowedOrigins = new Set([
  "http://localhost:3000",
  "http://localhost:5173",
  process.env.FRONTEND_URL || "",
  "https://email-sender-platform.web.app",
  "https://investor-outreach-platform.vercel.app",
].filter(Boolean));

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      if (/\.vercel\.app$/.test(origin)) return callback(null, true);
      return callback(null, false);
    },
    maxAge: 86400,
    credentials: true,
  })
);

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Disable caching for all API responses to ensure fresh data
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

// Routes import
const companyRoutes = require("./routes/company.route");
const campaignRoutes = require("./routes/campaign.route");
const contactListRoutes = require("./routes/contactList.route");
const aiRoutes = require("./routes/ai.route");
const emailRoutes = require("./routes/email.route");
const investorRoutes = require("./routes/investor.route");
const incubatorRoutes = require("./routes/incubator.route");
const matchRoutes = require("./routes/match.route");
const excelRoutes = require("./routes/excel.route");
const documentRoutes = require("./routes/document.route");
const scheduledEmailRoutes = require("./routes/scheduledEmail.route");
const sheetsRoutes = require("./routes/sheets.route");
const clientEmailRoutes = require("./routes/clientEmail.route");
const firebaseRoutes = require("./routes/firebase.route");
const campaignReportRoutes = require("./routes/campaignReport.route");
const publicReportRoutes = require("./routes/publicReport.route");
const emailTrackingRoutes = require("./routes/emailTracking.route");
const dashboardStatsRoutes = require("./routes/dashboardStats.route");

const deckActivityRoutes = require("./routes/deckActivity.route");
const dealRoomRoutes = require("./routes/dealRoom.route");

// Healthcheck controller
const { healthcheck } = require("./controllers/healthcheck.controller");


// Healthcheck route (public)
app.get("/api/healthcheck", healthcheck);
app.get("/", (req, res) => res.json({ message: "Send Email API Server", status: "running" }));

// Router Declaration
app.use("/api/clients", companyRoutes);
app.use("/api/campaign", campaignRoutes);
app.use("/api/contact-list", contactListRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/investors", investorRoutes);
app.use("/api/incubators", incubatorRoutes);
app.use("/api/match", matchRoutes);
app.use("/api/excel", excelRoutes);
app.use("/api/document", documentRoutes);
app.use("/api/scheduled-emails", scheduledEmailRoutes);
app.use("/api/sheets", sheetsRoutes);
app.use("/api/client-email", clientEmailRoutes);
app.use("/api/firebase", firebaseRoutes);
app.use("/api/campaign-reports", campaignReportRoutes);
app.use("/api/public-reports", publicReportRoutes);
app.use("/api/email-tracking", emailTrackingRoutes);
app.use("/api/dashboard", dashboardStatsRoutes);

app.use("/api/deck-activity", deckActivityRoutes);
app.use("/api/deal-rooms", dealRoomRoutes);


const PORT = process.env.PORT || 5000;

// For Vercel deployment
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for Vercel
module.exports = app;
