const express = require('express');
const router = express.Router();
const requireAuth = require('../middlewares/firebaseAuth.middleware');
const {
  createEmailCampaign,
  updateEmailDelivery,
  trackEmailOpen,
  trackEmailClick,
  recordEmailReply,
  getCampaignReports,
  getCampaignDetail,
  deleteEmailCampaign
} = require('../controllers/emailTracking.controller');

// Create email campaign tracking (when emails are sent)
router.post('/campaign', requireAuth, createEmailCampaign);

// Update email delivery status
router.post('/delivery', updateEmailDelivery);

// Track email opens (public endpoint for tracking pixel)
router.get('/open', trackEmailOpen);

// Track email clicks (public endpoint for link tracking)
router.get('/click', trackEmailClick);

// Record email replies
router.post('/reply', recordEmailReply);

// Get all campaign reports
router.get('/reports', requireAuth, getCampaignReports);

// Get single campaign detailed report
router.get('/campaign/:campaignId', requireAuth, getCampaignDetail);

// Delete email campaign
router.delete('/campaign/:campaignId', requireAuth, deleteEmailCampaign);

module.exports = router;
