const express = require('express');
const router = express.Router();
const { getCampaignSummary, getDetailedReport } = require('../controllers/campaignReport.controller');

// Completely public report access - no authentication needed
router.get('/:campaignId', async (req, res) => {
  try {
    await getCampaignSummary(req, res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Public detailed report
router.get('/:campaignId/detailed', async (req, res) => {
  try {
    await getDetailedReport(req, res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;