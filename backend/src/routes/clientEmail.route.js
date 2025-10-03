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
router.post('/send-bulk', async (req, res) => {
  try {
    const { companyId, investorIds, subject, htmlContent } = req.body;

    console.log('📧 Bulk email request:', { companyId, investorCount: investorIds?.length, hasSubject: !!subject, hasContent: !!htmlContent });

    if (!companyId || !investorIds || !subject || !htmlContent) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get company with email credentials - try multiple sources
    let company = null;
    
    // First try: Check if clientData is provided in request
    if (req.body.clientData) {
      console.log('💼 Using client data from request');
      const clientData = req.body.clientData;
      company = {
        id: clientData.id || companyId,
        company_name: clientData.company_name,
        founder_name: (clientData.first_name || '') + ' ' + (clientData.last_name || ''),
        email: clientData.email,
        gmail_app_password: clientData.gmail_app_password,
        email_sending_enabled: !!clientData.gmail_app_password
      };
      console.log('✅ Using client data:', company.email);
    } else {
      // Database lookup
      try {
        company = await dbHelpers.getById('companies', companyId);
        console.log('🏢 Company lookup result:', company ? 'Found' : 'Not found');
      } catch (dbError) {
        console.error('❌ Database error during company lookup:', dbError.message);
      }
    }
    

    
    if (!company) {
      return res.status(404).json({ error: `Company not found: ${companyId}` });
    }

    if (!company.email_sending_enabled || !company.gmail_app_password) {
      return res.status(400).json({ error: 'Email sending not enabled. Please setup Gmail credentials first.' });
    }

    // Use investorIds as direct email addresses
    const recipientEmails = investorIds.filter(email => email && email.includes('@'));

    if (recipientEmails.length === 0) {
      return res.status(400).json({ error: 'No valid investor emails found' });
    }

    // Generate unique job ID and campaign ID
    const jobId = uuidv4();
    const campaignId = uuidv4();
    const clientName = company.company_name || 'Company';

    // Prepare maps for tracking even if tracking creation fails
    let recipientTrackingMap = {};
    let recipientMessageIdMap = {};

    // Create email tracking campaign first
    try {
      const trackingController = require('../controllers/emailTracking.controller');
      
      // Build an email -> investor info map to enrich names
      let emailToInvestor = {};
      try {
        const allInvestors = await dbHelpers.getAll('investors');
        if (Array.isArray(allInvestors)) {
          for (const inv of allInvestors) {
            const email = inv['Partner Email'] || inv.partner_email || inv.email;
            if (email) emailToInvestor[email.toLowerCase()] = inv;
          }
        }
      } catch (e) {
        console.warn('⚠️ Could not load investors to enrich tracking names:', e.message);
      }

      // Prepare recipients data for tracking with enriched names when available
      const trackingRecipients = recipientEmails.map(email => {
        const inv = emailToInvestor[email.toLowerCase()] || {};
        const investorName = inv['Investor Name'] || inv.investor_name || inv.name || email.split('@')[1]?.split('.')[0] || 'Unknown';
        const partnerName = inv['Partner Name'] || inv.partner_name || inv.contact || email.split('@')[0] || 'Unknown';
        return {
          email: email,
          name: partnerName,
          firmName: investorName,
          contactPerson: partnerName,
          sector: inv['Fund Focus (Sectors)'] || inv.fund_focus_sectors || inv.sector_focus || 'Unknown',
          location: inv['Location'] || inv.location || 'Unknown'
        };
      });

      // Create tracking campaign
      const trackingReq = {
        body: {
          campaignName: `${clientName} - ${new Date().toLocaleDateString()}`,
          clientName: clientName,
          recipients: trackingRecipients,
          subject: subject,
          content: htmlContent,
          senderEmail: company.email
        }
      };

      let createdTrackingCampaign = null;
      const trackingRes = {
        json: (data) => {
          createdTrackingCampaign = data;
          console.log('📊 Email tracking campaign created:', data.campaignId);
        },
        status: () => ({ json: () => {} })
      };

      await trackingController.createEmailCampaign(trackingReq, trackingRes);

      // Build maps for trackingId and messageId by recipient for delivery/open/click updates
      try {
        const saved = createdTrackingCampaign?.trackingData || trackingReq.body;
        if (saved && saved.recipients) {
          for (const r of saved.recipients) {
            if (r.email) {
              if (r.trackingId) recipientTrackingMap[r.email] = r.trackingId;
              if (r.messageId) recipientMessageIdMap[r.email] = r.messageId;
            }
          }
        }
      } catch {}
      
    } catch (trackingError) {
      console.error('⚠️ Failed to create tracking campaign:', trackingError.message);
      // Continue with email sending even if tracking fails
    }

    // Start bulk email sending with campaign ID (async - don't wait)
    clientEmailService.sendBulkEmailsSequentially(
      company.email,
      company.gmail_app_password,
      recipientEmails,
      subject,
      htmlContent,
      company.company_name || clientName,
      jobId,
      campaignId,
      recipientTrackingMap,
      recipientMessageIdMap
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
router.get('/job-status/:jobId', (req, res) => {
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