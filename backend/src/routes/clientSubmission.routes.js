const express = require("express");
const router = express.Router();
const verifyFirebaseToken = require("../middlewares/firebaseAuth.middleware");
const {
  getMySubmission,
  submitApplication,
  updateClientInfo,
  addPitchAnalysis,
} = require("../controllers/clientSubmission.controller");

// All routes require authentication
router.use(verifyFirebaseToken);

// GET /api/client-submissions/my-submission - Get user's submission
router.get("/my-submission", getMySubmission);

// POST /api/client-submissions/submit - Initial submission (first-time users)
router.post("/submit", submitApplication);

// PUT /api/client-submissions/update-info - Update client information
router.put("/update-info", updateClientInfo);

// POST /api/client-submissions/add-pitch-analysis - Add new pitch analysis
router.post("/add-pitch-analysis", addPitchAnalysis);

module.exports = router;
