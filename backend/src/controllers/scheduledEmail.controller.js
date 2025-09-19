const scheduledEmailService = require('../services/scheduledEmail.service');

// Add a scheduled email
exports.addScheduledEmail = async (req, res) => {
  try {
    const { to, subject, html, scheduleAt, from } = req.body;
    
    if (!to || !subject || !html || !scheduleAt) {
      return res.status(400).json({
        error: 'Missing required fields: to, subject, html, scheduleAt'
      });
    }

    // Validate scheduleAt is in the future
    const scheduleDate = new Date(scheduleAt);
    const now = new Date();
    
    if (scheduleDate <= now) {
      return res.status(400).json({
        error: 'Schedule date must be in the future'
      });
    }

    const scheduledEmail = scheduledEmailService.addScheduledEmail({
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      scheduleAt,
      from
    });

    res.status(201).json({
      success: true,
      message: 'Email scheduled successfully',
      scheduledEmail
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Failed to schedule email'
    });
  }
};

// Get all scheduled emails
exports.getScheduledEmails = async (req, res) => {
  try {
    const { status } = req.query;
    const emails = status 
      ? scheduledEmailService.getEmailsByStatus(status)
      : scheduledEmailService.getScheduledEmails();
    
    res.json({
      success: true,
      emails
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Failed to get scheduled emails'
    });
  }
};

// Get scheduled email by ID
exports.getScheduledEmailById = async (req, res) => {
  try {
    const { id } = req.params;
    const email = scheduledEmailService.getScheduledEmailById(id);
    
    if (!email) {
      return res.status(404).json({
        error: 'Scheduled email not found'
      });
    }
    
    res.json({
      success: true,
      email
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Failed to get scheduled email'
    });
  }
};

// Update scheduled email
exports.updateScheduledEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // If updating scheduleAt, validate it's in the future
    if (updates.scheduleAt) {
      const scheduleDate = new Date(updates.scheduleAt);
      const now = new Date();
      
      if (scheduleDate <= now) {
        return res.status(400).json({
          error: 'Schedule date must be in the future'
        });
      }
    }
    
    const updatedEmail = scheduledEmailService.updateScheduledEmail(id, updates);
    
    if (!updatedEmail) {
      return res.status(404).json({
        error: 'Scheduled email not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Scheduled email updated successfully',
      email: updatedEmail
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Failed to update scheduled email'
    });
  }
};

// Remove scheduled email
exports.removeScheduledEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const removedEmail = scheduledEmailService.removeScheduledEmail(id);
    
    if (!removedEmail) {
      return res.status(404).json({
        error: 'Scheduled email not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Scheduled email removed successfully',
      email: removedEmail
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Failed to remove scheduled email'
    });
  }
};

// Process scheduled emails (called by cron job or manually)
exports.processScheduledEmails = async (req, res) => {
  try {
    const results = await scheduledEmailService.processScheduledEmails();
    
    res.json({
      success: true,
      message: `Processed ${results.length} scheduled emails`,
      results
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Failed to process scheduled emails'
    });
  }
};
