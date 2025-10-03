const express = require('express');
const router = express.Router();
const requireAuth = require('../middlewares/firebaseAuth.middleware');
const {
  getCampaignSummary,
  getDetailedReport,
  getFollowUpCandidates,
  getAllCampaignsSummary,
  exportDetailedReport,
  createDemoCampaign
} = require('../controllers/campaignReport.controller');

// Get all campaigns summary for dashboard (public access)
router.get('/summary', getAllCampaignsSummary);

// Create demo campaign for testing (public access)
router.post('/demo', createDemoCampaign);

// Get campaign summary report (public access)
router.get('/:campaignId/summary', getCampaignSummary);

// Get detailed engagement report (public access)
router.get('/:campaignId/detailed', getDetailedReport);

// Get follow-up candidates (public access)
router.get('/:campaignId/follow-up', getFollowUpCandidates);

// Export detailed report (public access)
router.get('/:campaignId/export', exportDetailedReport);

module.exports = router;
