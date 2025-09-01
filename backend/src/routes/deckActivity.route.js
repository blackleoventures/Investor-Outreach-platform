const express = require("express");
const {
  trackDeckView,
  trackDeckDownload,
  trackDeckShare,
  updateTimeSpent,
  getDeckAnalytics,
  getInvestorDeckActivity,
  getRealTimeActivity,
} = require("../controllers/deckActivity.controller");

const router = express.Router();

// Track deck activities
router.post("/view", trackDeckView);
router.post("/download", trackDeckDownload);
router.post("/share", trackDeckShare);
router.put("/time-spent", updateTimeSpent);

// Get analytics and reports
router.get("/analytics/:companyId", getDeckAnalytics);
router.get("/investor/:companyId/:deckId/:investorEmail", getInvestorDeckActivity);
router.get("/realtime/:companyId", getRealTimeActivity);

module.exports = router; 