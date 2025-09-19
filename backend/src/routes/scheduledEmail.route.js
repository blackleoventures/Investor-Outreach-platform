const express = require('express');
const router = express.Router();
const scheduledEmailController = require('../controllers/scheduledEmail.controller');

// Add a scheduled email
router.post('/', scheduledEmailController.addScheduledEmail);

// Get all scheduled emails
router.get('/', scheduledEmailController.getScheduledEmails);

// Get scheduled email by ID
router.get('/:id', scheduledEmailController.getScheduledEmailById);

// Update scheduled email
router.put('/:id', scheduledEmailController.updateScheduledEmail);

// Remove scheduled email
router.delete('/:id', scheduledEmailController.removeScheduledEmail);

// Process scheduled emails (for cron job)
router.post('/process', scheduledEmailController.processScheduledEmails);

module.exports = router;
