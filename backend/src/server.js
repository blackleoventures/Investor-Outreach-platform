const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");
const compression = require("compression");

dotenv.config();

// Initialize Firebase (database connection is handled in firebase-db.config.js)
const { db } = require("./config/firebase-db.config");
const excelService = require('./services/excel.service');

console.log("Firebase initialized successfully");

// Initialize Excel service (optional)
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

const app = express();

// Enable gzip/deflate compression for faster responses
app.use(compression());

// CORS with preflight caching to reduce OPTIONS overhead
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://email-sender-platform.web.app",
      "https://investor-outreach-platform.vercel.app",
    ],
    maxAge: 86400, // cache preflight for 24h
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Optional small cache for safe GETs (tweak per endpoint if needed)
app.use((req, res, next) => {
  if (req.method === "GET") {
    res.setHeader("Cache-Control", "private, max-age=30");
  }
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
