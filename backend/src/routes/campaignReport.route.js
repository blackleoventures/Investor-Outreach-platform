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

// Get all campaigns summary for dashboard
router.get('/summary', requireAuth, getAllCampaignsSummary);

// Create demo campaign for testing
router.post('/demo', requireAuth, createDemoCampaign);

// Get campaign summary report
router.get('/:campaignId/summary', requireAuth, getCampaignSummary);

// Get detailed engagement report
router.get('/:campaignId/detailed', requireAuth, getDetailedReport);

// Get follow-up candidates
router.get('/:campaignId/follow-up', requireAuth, getFollowUpCandidates);

// Export detailed report
router.get('/:campaignId/export', requireAuth, exportDetailedReport);

module.exports = router;
