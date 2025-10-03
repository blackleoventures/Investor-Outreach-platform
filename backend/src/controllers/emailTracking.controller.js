const { dbHelpers } = require("../config/firebase-db.config");
const { v4: uuidv4 } = require('uuid');

// Create email campaign tracking when emails are sent
exports.createEmailCampaign = async (req, res) => {
  try {
    const { 
      campaignName, 
      clientName, 
      recipients, 
      subject, 
      content,
      senderEmail 
    } = req.body;

    if (!campaignName || !recipients || !Array.isArray(recipients)) {
      return res.status(400).json({ error: 'Campaign name and recipients array required' });
    }

    // Create email campaign record
    const emailCampaign = {
      campaignName,
      clientName: clientName || 'Client',
      subject: subject || 'Investment Opportunity',
      senderEmail: senderEmail || 'sender@example.com',
      totalRecipients: recipients.length,
      sentAt: new Date().toISOString(),
      status: 'active',
      recipients: recipients.map(recipient => ({
        id: uuidv4(),
        email: recipient.email,
        name: recipient.name || 'Unknown',
        firmName: recipient.firmName || extractFirmName(recipient.email),
        contactPerson: recipient.contactPerson || recipient.name || 'Unknown',
        sector: recipient.sector || 'Unknown',
        location: recipient.location || 'Unknown',
        // Email status tracking
        emailStatus: 'sent', // sent, delivered, failed, bounced
        sentAt: new Date().toISOString(),
        deliveredAt: null,
        // Engagement tracking
        opened: false,
        openedAt: null,
        openCount: 0,
        clicked: false,
        clickedAt: null,
        clickCount: 0,
        replied: false,
        repliedAt: null,
        // Tracking IDs
        messageId: uuidv4(),
        trackingId: uuidv4()
      })),
      // Summary metrics
      metrics: {
        sent: recipients.length,
        delivered: 0,
        failed: 0,
        bounced: 0,
        opened: 0,
        clicked: 0,
        replied: 0,
        openRate: 0,
        clickRate: 0,
        responseRate: 0
      }
    };

    const savedCampaign = await dbHelpers.create('emailCampaigns', emailCampaign);

    res.json({
      success: true,
      campaignId: savedCampaign.id,
      message: 'Email campaign tracking created',
      trackingData: emailCampaign
    });

  } catch (error) {
    console.error('Create email campaign error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update email delivery status
exports.updateEmailDelivery = async (req, res) => {
  try {
    const { messageId, status, timestamp } = req.body;

    if (!messageId || !status) {
      return res.status(400).json({ error: 'Message ID and status required' });
    }

    // Find campaign with this message ID
    const campaigns = await dbHelpers.getAll('emailCampaigns');
    let targetCampaign = null;
    let recipientIndex = -1;

    for (const campaign of campaigns) {
      const index = campaign.recipients.findIndex(r => r.messageId === messageId);
      if (index !== -1) {
        targetCampaign = campaign;
        recipientIndex = index;
        break;
      }
    }

    if (!targetCampaign) {
      return res.status(404).json({ error: 'Campaign not found for message ID' });
    }

    // Update recipient status
    targetCampaign.recipients[recipientIndex].emailStatus = status;
    if (status === 'delivered') {
      targetCampaign.recipients[recipientIndex].deliveredAt = timestamp || new Date().toISOString();
      targetCampaign.metrics.delivered++;
    } else if (status === 'failed' || status === 'bounced') {
      targetCampaign.metrics.failed++;
    }

    // Update campaign
    await dbHelpers.update('emailCampaigns', targetCampaign.id, targetCampaign);

    res.json({ success: true, message: 'Email status updated' });

  } catch (error) {
    console.error('Update email delivery error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete email campaign
exports.deleteEmailCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;

    if (!campaignId) {
      return res.status(400).json({ error: 'Campaign ID required' });
    }

    // Delete the campaign from Firebase
    await dbHelpers.delete('emailCampaigns', campaignId);

    res.json({ 
      success: true, 
      message: 'Email campaign deleted successfully',
      campaignId: campaignId
    });

  } catch (error) {
    console.error('Delete email campaign error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Track email opens
exports.trackEmailOpen = async (req, res) => {
  try {
    const { trackingId } = req.query;

    if (!trackingId) {
      // Return 1x1 transparent pixel
      const pixel = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=',
        'base64'
      );
      res.setHeader('Content-Type', 'image/png');
      return res.send(pixel);
    }

    // Find campaign with this tracking ID
    const campaigns = await dbHelpers.getAll('emailCampaigns');
    let targetCampaign = null;
    let recipientIndex = -1;

    for (const campaign of campaigns) {
      const index = campaign.recipients.findIndex(r => r.trackingId === trackingId);
      if (index !== -1) {
        targetCampaign = campaign;
        recipientIndex = index;
        break;
      }
    }

    if (targetCampaign && recipientIndex !== -1) {
      const recipient = targetCampaign.recipients[recipientIndex];
      
      // Update open tracking
      if (!recipient.opened) {
        recipient.opened = true;
        recipient.openedAt = new Date().toISOString();
        targetCampaign.metrics.opened++;
        targetCampaign.metrics.openRate = ((targetCampaign.metrics.opened / targetCampaign.metrics.sent) * 100).toFixed(1);
      }
      
      recipient.openCount++;
      
      // Update campaign
      await dbHelpers.update('emailCampaigns', targetCampaign.id, targetCampaign);
      
      console.log(`📧 Email opened by ${recipient.email} at ${new Date().toISOString()}`);
    }

    // Return 1x1 transparent pixel
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=',
      'base64'
    );
    res.setHeader('Content-Type', 'image/png');
    res.send(pixel);

  } catch (error) {
    console.error('Track email open error:', error);
    // Still return pixel even on error
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=',
      'base64'
    );
    res.setHeader('Content-Type', 'image/png');
    res.send(pixel);
  }
};

// Track email clicks
exports.trackEmailClick = async (req, res) => {
  try {
    const { trackingId, url } = req.query;

    if (!trackingId || !url) {
      return res.status(400).json({ error: 'Tracking ID and URL required' });
    }

    // Find campaign with this tracking ID
    const campaigns = await dbHelpers.getAll('emailCampaigns');
    let targetCampaign = null;
    let recipientIndex = -1;

    for (const campaign of campaigns) {
      const index = campaign.recipients.findIndex(r => r.trackingId === trackingId);
      if (index !== -1) {
        targetCampaign = campaign;
        recipientIndex = index;
        break;
      }
    }

    if (targetCampaign && recipientIndex !== -1) {
      const recipient = targetCampaign.recipients[recipientIndex];
      
      // Update click tracking
      if (!recipient.clicked) {
        recipient.clicked = true;
        recipient.clickedAt = new Date().toISOString();
        targetCampaign.metrics.clicked++;
        targetCampaign.metrics.clickRate = ((targetCampaign.metrics.clicked / targetCampaign.metrics.sent) * 100).toFixed(1);
      }
      
      recipient.clickCount++;
      
      // Update campaign
      await dbHelpers.update('emailCampaigns', targetCampaign.id, targetCampaign);
      
      console.log(`🖱️ Email clicked by ${recipient.email} at ${new Date().toISOString()}`);
    }

    // Redirect to original URL
    res.redirect(decodeURIComponent(url));

  } catch (error) {
    console.error('Track email click error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Record email reply
exports.recordEmailReply = async (req, res) => {
  try {
    const { fromEmail, toEmail, subject, content, messageId } = req.body;

    if (!fromEmail || !toEmail) {
      return res.status(400).json({ error: 'From and to email required' });
    }

    // Find campaign with recipient email
    const campaigns = await dbHelpers.getAll('emailCampaigns');
    let targetCampaign = null;
    let recipientIndex = -1;

    for (const campaign of campaigns) {
      const index = campaign.recipients.findIndex(r => r.email === fromEmail);
      if (index !== -1) {
        targetCampaign = campaign;
        recipientIndex = index;
        break;
      }
    }

    if (targetCampaign && recipientIndex !== -1) {
      const recipient = targetCampaign.recipients[recipientIndex];
      
      // Update reply tracking
      if (!recipient.replied) {
        recipient.replied = true;
        recipient.repliedAt = new Date().toISOString();
        targetCampaign.metrics.replied++;
        targetCampaign.metrics.responseRate = ((targetCampaign.metrics.replied / targetCampaign.metrics.sent) * 100).toFixed(1);
        
        // Update campaign
        await dbHelpers.update('emailCampaigns', targetCampaign.id, targetCampaign);
        
        console.log(`💬 Email reply from ${recipient.email} at ${new Date().toISOString()}`);
      }

      // Store reply content
      await dbHelpers.create('emailReplies', {
        campaignId: targetCampaign.id,
        fromEmail,
        toEmail,
        subject,
        content,
        messageId,
        receivedAt: new Date().toISOString()
      });
    }

    res.json({ success: true, message: 'Reply recorded' });

  } catch (error) {
    console.error('Record email reply error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get real-time campaign reports
exports.getCampaignReports = async (req, res) => {
  try {
    const campaigns = await dbHelpers.getAll('emailCampaigns', {
      sortBy: 'sentAt',
      sortOrder: 'desc'
    });

    const reports = campaigns.map(campaign => ({
      id: campaign.id,
      name: campaign.campaignName,
      clientName: campaign.clientName,
      type: 'Email Campaign',
      createdAt: campaign.sentAt,
      status: campaign.status,
      metrics: {
        sent: campaign.metrics.sent,
        delivered: campaign.metrics.delivered,
        failed: campaign.metrics.failed,
        opened: campaign.metrics.opened,
        clicked: campaign.metrics.clicked,
        replied: campaign.metrics.replied,
        openRate: parseFloat(campaign.metrics.openRate || 0),
        clickRate: parseFloat(campaign.metrics.clickRate || 0),
        responseRate: parseFloat(campaign.metrics.responseRate || 0)
      },
      recipients: campaign.recipients.map(recipient => ({
        id: recipient.id,
        // Fallbacks to produce human-friendly names in UI
        firmName: recipient.firmName || recipient.name || (recipient.email ? recipient.email.split('@')[1]?.split('.')[0] : 'Unknown'),
        contactPerson: recipient.contactPerson || (recipient.email ? recipient.email.split('@')[0] : 'Unknown'),
        email: recipient.email,
        status: recipient.emailStatus,
        opened: recipient.opened,
        openedAt: recipient.openedAt,
        clicked: recipient.clicked,
        clickedAt: recipient.clickedAt,
        replied: recipient.replied,
        repliedAt: recipient.repliedAt,
        sector: recipient.sector,
        location: recipient.location,
        // Calculate time ago
        openedTimeAgo: recipient.openedAt ? getTimeAgo(recipient.openedAt) : null,
        clickedTimeAgo: recipient.clickedAt ? getTimeAgo(recipient.clickedAt) : null,
        repliedTimeAgo: recipient.repliedAt ? getTimeAgo(recipient.repliedAt) : null
      }))
    }));

    res.json({
      success: true,
      campaigns: reports
    });

  } catch (error) {
    console.error('Get campaign reports error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get single campaign detailed report
exports.getCampaignDetail = async (req, res) => {
  try {
    const { campaignId } = req.params;

    const campaign = await dbHelpers.getById('emailCampaigns', campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const detailedReport = {
      campaignId: campaign.id,
      campaignName: campaign.campaignName,
      clientName: campaign.clientName,
      sentAt: campaign.sentAt,
      status: campaign.status,
      metrics: campaign.metrics,
      recipients: campaign.recipients.map(recipient => ({
        ...recipient,
        openedTimeAgo: recipient.openedAt ? getTimeAgo(recipient.openedAt) : null,
        clickedTimeAgo: recipient.clickedAt ? getTimeAgo(recipient.clickedAt) : null,
        repliedTimeAgo: recipient.repliedAt ? getTimeAgo(recipient.repliedAt) : null
      }))
    };

    res.json({
      success: true,
      data: detailedReport
    });

  } catch (error) {
    console.error('Get campaign detail error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Helper functions
function extractFirmName(email) {
  const domain = email.split('@')[1];
  if (!domain) return 'Unknown';
  
  const commonProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
  if (commonProviders.includes(domain.toLowerCase())) {
    return 'Individual';
  }
  
  return domain.split('.')[0]
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getTimeAgo(timestamp) {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now - past;
  
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (minutes < 60) {
    return `${minutes} minutes ago`;
  } else if (hours < 24) {
    return `${hours} hours ago`;
  } else {
    return `${days} days ago`;
  }
}

module.exports = exports;
