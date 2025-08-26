const express = require("express");
const cors = require("cors");

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

module.exports = app;
