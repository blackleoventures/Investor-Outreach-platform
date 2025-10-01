const express = require('express');
const requireAuth = require('../middlewares/firebaseAuth.middleware');
const clientEmailService = require('../services/clientEmailService');
const { dbHelpers } = require('../config/firebase-db.config');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Update company email credentials
router.put('/credentials', requireAuth, async (req, res) => {
  try {
    const { companyId, gmailAppPassword } = req.body;

    if (!companyId || !gmailAppPassword) {
      return res.status(400).json({ error: 'Company ID and Gmail App Password are required' });
    }

    // Validate app password format
    if (!clientEmailService.validateAppPassword(gmailAppPassword)) {
      return res.status(400).json({ error: 'Invalid Gmail App Password format. Should be 16 characters.' });
    }

    // Update company with email credentials
    const company = await dbHelpers.update('companies', companyId, {
      gmail_app_password: gmailAppPassword,
      email_sending_enabled: true
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Validate Gmail email
    if (!clientEmailService.validateGmailEmail(company.email)) {
      return res.status(400).json({ error: 'Company email must be a Gmail address' });
    }

    res.json({ 
      success: true, 
      message: 'Email credentials updated successfully',
      emailSendingEnabled: true 
    });

  } catch (error) {
    console.error('Error updating email credentials:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send bulk emails to investors
router.post('/send-bulk', requireAuth, async (req, res) => {
  try {
    const { companyId, investorIds, subject, htmlContent } = req.body;

    if (!companyId || !investorIds || !subject || !htmlContent) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get company with email credentials
    let company = await dbHelpers.getById('companies', companyId);
    
    // Create test company if not found
    if (!company && companyId === 'test-company-123') {
      const testCompany = {
        company_name: 'Test Company',
        founder_name: 'Test Founder',
        email: 'priyanshusingh99p@gmail.com',
        gmail_app_password: 'mvmk vgpt zfns zpng',
        email_sending_enabled: true
      };
      company = await dbHelpers.create('companies', testCompany);
      company.id = 'test-company-123';
    }
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    if (!company.email_sending_enabled || !company.gmail_app_password) {
      return res.status(400).json({ error: 'Email sending not enabled. Please setup Gmail credentials first.' });
    }

    // Use investorIds as direct email addresses
    const recipientEmails = investorIds.filter(email => email && email.includes('@'));

    if (recipientEmails.length === 0) {
      return res.status(400).json({ error: 'No valid investor emails found' });
    }

    // Generate unique job ID
    const jobId = uuidv4();
    const clientName = company.founder_name || company.company_name;

    // Start bulk email sending (async - don't wait)
    clientEmailService.sendBulkEmailsSequentially(
      company.email,
      company.gmail_app_password,
      recipientEmails,
      subject,
      htmlContent,
      clientName,
      jobId
    ).catch(error => {
      console.error('Bulk email job failed:', error);
    });

    res.json({
      success: true,
      message: 'Bulk email job started',
      jobId,
      totalEmails: recipientEmails.length,
      estimatedTime: `${recipientEmails.length} minutes (1 minute per email)`
    });

  } catch (error) {
    console.error('Error starting bulk email:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get email job status
router.get('/job-status/:jobId', requireAuth, (req, res) => {
  try {
    const { jobId } = req.params;
    const jobStatus = clientEmailService.getJobStatus(jobId);

    if (!jobStatus) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      success: true,
      jobId,
      ...jobStatus
    });

  } catch (error) {
    console.error('Error getting job status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test email credentials
router.post('/test-credentials', requireAuth, async (req, res) => {
  try {
    const { companyId } = req.body;

    const company = await dbHelpers.getById('companies', companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    if (!company.gmail_app_password) {
      return res.status(400).json({ error: 'Gmail App Password not set' });
    }

    // Send test email to company's own email
    const transporter = clientEmailService.createClientTransporter(
      company.email,
      company.gmail_app_password
    );

    await transporter.sendMail({
      from: company.email,
      to: company.email,
      subject: 'Test Email - Credentials Working',
      html: '<h3>Success!</h3><p>Your Gmail App Password is working correctly.</p>'
    });

    res.json({ 
      success: true, 
      message: 'Test email sent successfully. Check your inbox.' 
    });

  } catch (error) {
    console.error('Test email failed:', error);
    res.status(500).json({ 
      error: 'Test email failed. Please check your Gmail App Password.',
      details: error.message 
    });
  }
});

module.exports = router;