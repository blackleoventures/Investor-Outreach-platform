const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");
const compression = require("compression");

dotenv.config();

// Initialize Firebase (database connection is handled in firebase-db.config.js)
const { db } = require("./config/firebase-db.config");

console.log("Firebase initialized successfully");

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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
const matchRoutes = require("./routes/match.route");

const emailTemplateRoutes = require("./routes/emailTemplate.route");

const deckActivityRoutes = require("./routes/deckActivity.route");
const dealRoomRoutes = require("./routes/dealRoom.route");


// Router Declaration
app.use("/clients", companyRoutes);
app.use("/campaign", campaignRoutes);
app.use("/contact-list", contactListRoutes);
app.use("/ai", aiRoutes);
app.use("/email", emailRoutes);
app.use("/investors", investorRoutes);
app.use("/match", matchRoutes);

app.use("/email-templates", emailTemplateRoutes);

app.use("/deck-activity", deckActivityRoutes);
app.use("/deal-rooms", dealRoomRoutes);


const PORT = process.env.PORT || 5000;

// For Vercel deployment
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for Vercel
module.exports = app;
