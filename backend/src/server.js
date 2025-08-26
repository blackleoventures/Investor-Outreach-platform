const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");

dotenv.config();

// Initialize Firebase (database connection is handled in firebase-db.config.js)
const { db } = require("./config/firebase-db.config");

console.log("Firebase initialized successfully");

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://email-sender-platform.web.app",
    ],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes import
const companyRoutes = require("./routes/company.route");
const campaignRoutes = require("./routes/campaign.route");
const contactListRoutes = require("./routes/contactList.route");

// Router Declaration
app.use("/clients", companyRoutes);
app.use("/campaign", campaignRoutes);
app.use("/contact-list", contactListRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
