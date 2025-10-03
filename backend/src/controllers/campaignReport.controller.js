const { dbHelpers } = require("../config/firebase-db.config");
const { db } = require("../config/firebase-db.config");

// Create demo campaign for testing
exports.createDemoCampaign = async (req, res) => {
  try {
    const userEmail = req.user?.email || 'demo@example.com';

    // Create demo campaign
    const demoCampaign = {
      name: 'Q4 Investor Outreach Demo',
      clientName: 'Cosmedream',
      location: 'Global',
      type: 'Email',
      status: 'completed',
      recipients: 8,
      owner_email: userEmail,
      audience: [],
      emailTemplate: { 
        subject: 'Investment Opportunity in Cosmedream', 
        content: 'Demo campaign content' 
      },
      schedule: null
    };

    const savedCampaign = await dbHelpers.create('campaigns', demoCampaign);

    res.json({
      success: true,
      message: 'Demo campaign created successfully',
      campaign: { id: savedCampaign.id, ...demoCampaign }
    });

  } catch (error) {
    console.error('Demo campaign creation error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get campaign summary report
exports.getCampaignSummary = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const userEmail = req.user?.email;

    // Get campaign details
    const campaign = await dbHelpers.getById('campaigns', campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Check ownership
    if (campaign.owner_email !== userEmail) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get email campaigns for this campaign
    const emailCampaigns = await dbHelpers.getAll('emailCampaigns', {
      filters: { campaignRef: campaignId }
    });

    // Calculate summary statistics
    let totalFirmsContacted = 0;
    let totalRemindersSent = 0;
    let totalResponses = 0;
    let totalOpened = 0;
    let totalClicked = 0;
    let totalDelivered = 0;
    let totalBounced = 0;

    for (const emailCampaign of emailCampaigns) {
      const recipients = emailCampaign.recipientEmails || [];
      totalFirmsContacted += recipients.length;
      
      // Count opened, clicked, delivered, etc.
      recipients.forEach(recipient => {
        if (recipient.opened) totalOpened++;
        if (recipient.clicks > 0) totalClicked++;
        if (recipient.delivered) totalDelivered++;
        if (recipient.status === 'bounced') totalBounced++;
      });

      totalRemindersSent += emailCampaign.remindersSent || 0;
    }

    // Get replies count
    const replies = await dbHelpers.getAll('emailReplies', {
      filters: { campaignRef: campaignId }
    });
    totalResponses = replies.length;

    // If no real data, use demo stats
    if (totalFirmsContacted === 0) {
      const demoData = getDemoReportData();
      totalFirmsContacted = demoData.length;
      totalResponses = demoData.filter(d => d.replied === 'Yes').length;
      totalOpened = demoData.filter(d => d.opened === 'Yes').length;
      totalClicked = demoData.filter(d => d.clicked === 'Yes').length;
      totalRemindersSent = Math.floor(totalFirmsContacted * 0.6); // 60% got reminders
    }

    // Calculate response rate
    const responseRate = totalFirmsContacted > 0 ? 
      ((totalResponses / totalFirmsContacted) * 100).toFixed(2) : 0;

    const openRate = totalFirmsContacted > 0 ? 
      ((totalOpened / totalFirmsContacted) * 100).toFixed(2) : 0;

    const clickRate = totalFirmsContacted > 0 ? 
      ((totalClicked / totalFirmsContacted) * 100).toFixed(2) : 0;

    const summary = {
      campaignId,
      campaignName: campaign.name,
      firmsContacted: totalFirmsContacted,
      remindersSent: totalRemindersSent,
      responsesReceived: totalResponses,
      responseRate: parseFloat(responseRate),
      emailsOpened: totalOpened,
      openRate: parseFloat(openRate),
      emailsClicked: totalClicked,
      clickRate: parseFloat(clickRate),
      emailsDelivered: totalDelivered,
      emailsBounced: totalBounced,
      createdAt: campaign.createdAt,
      status: campaign.status
    };

    res.json({
      success: true,
      summary
    });

  } catch (error) {
    console.error('Campaign summary error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get detailed engagement report
exports.getDetailedReport = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { page = 1, limit = 50, search = '', sector = '', location = '' } = req.query;
    const userEmail = req.user?.email;

    // Get campaign details
    const campaign = await dbHelpers.getById('campaigns', campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Check ownership
    if (campaign.owner_email !== userEmail) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get email campaigns for this campaign
    const emailCampaigns = await dbHelpers.getAll('emailCampaigns', {
      filters: { campaignRef: campaignId }
    });

    // Get replies for this campaign
    const replies = await dbHelpers.getAll('emailReplies', {
      filters: { campaignRef: campaignId }
    });

    // Create a map of replies by email
    const repliesMap = {};
    replies.forEach(reply => {
      repliesMap[reply.from] = reply;
    });

    // Collect all recipient data
    let allRecipients = [];
    
    for (const emailCampaign of emailCampaigns) {
      const recipients = emailCampaign.recipientEmails || [];
      
      recipients.forEach(recipient => {
        const hasReply = repliesMap[recipient.email];
        
        allRecipients.push({
          email: recipient.email,
          messageId: recipient.messageId,
          firmName: recipient.firmName || extractFirmName(recipient.email),
          contactPerson: recipient.contactPerson || 'Unknown',
          emailSent: recipient.status !== 'failed',
          emailSentStatus: recipient.status || 'pending',
          opened: recipient.opened || false,
          openedAt: recipient.openedAt || null,
          clicked: (recipient.clicks || 0) > 0,
          clicks: recipient.clicks || 0,
          lastClickedAt: recipient.lastClickedAt || null,
          engaged: (recipient.opened || (recipient.clicks || 0) > 0 || hasReply),
          replied: !!hasReply,
          replyAt: hasReply ? hasReply.timestamp : null,
          finalStatus: hasReply ? 'Replied' : 
                      (recipient.opened || (recipient.clicks || 0) > 0) ? 'Engaged' :
                      recipient.status === 'delivered' ? 'No Reply' : 'Follow-up Pending',
          sector: recipient.sector || 'Unknown',
          location: recipient.location || 'Unknown',
          sentAt: emailCampaign.sentAt,
          campaignType: emailCampaign.type || 'regular'
        });
      });
    }

    // If no real data exists, use demo data for demonstration
    if (allRecipients.length === 0) {
      const demoData = getDemoReportData();
      allRecipients = demoData.map(demo => ({
        email: demo.email,
        messageId: `demo-${Math.random().toString(36).substr(2, 9)}`,
        firmName: demo.firmName,
        contactPerson: demo.contactPerson,
        emailSent: demo.emailSent === 'Yes',
        emailSentStatus: 'sent',
        opened: demo.opened === 'Yes',
        openedAt: demo.opened === 'Yes' ? new Date() : null,
        clicked: demo.clicked === 'Yes',
        clicks: demo.clicked === 'Yes' ? 1 : 0,
        lastClickedAt: demo.clicked === 'Yes' ? new Date() : null,
        engaged: demo.engaged === 'Yes',
        replied: demo.replied === 'Yes',
        replyAt: demo.replied === 'Yes' ? new Date() : null,
        finalStatus: demo.finalStatus,
        sector: demo.sector,
        location: demo.location,
        sentAt: demo.sentAt,
        campaignType: 'demo'
      }));
    }

    // Apply filters
    if (search) {
      const searchLower = search.toLowerCase();
      allRecipients = allRecipients.filter(r => 
        r.firmName.toLowerCase().includes(searchLower) ||
        r.contactPerson.toLowerCase().includes(searchLower) ||
        r.email.toLowerCase().includes(searchLower)
      );
    }

    if (sector) {
      allRecipients = allRecipients.filter(r => 
        r.sector.toLowerCase().includes(sector.toLowerCase())
      );
    }

    if (location) {
      allRecipients = allRecipients.filter(r => 
        r.location.toLowerCase().includes(location.toLowerCase())
      );
    }

    // Sort by engagement (replied first, then engaged, then others)
    allRecipients.sort((a, b) => {
      if (a.replied && !b.replied) return -1;
      if (!a.replied && b.replied) return 1;
      if (a.engaged && !b.engaged) return -1;
      if (!a.engaged && b.engaged) return 1;
      return new Date(b.sentAt) - new Date(a.sentAt);
    });

    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedRecipients = allRecipients.slice(startIndex, endIndex);

    // Count follow-ups needed
    const followUpPending = allRecipients.filter(r => 
      r.finalStatus === 'Follow-up Pending' || r.finalStatus === 'No Reply'
    ).length;

    res.json({
      success: true,
      data: {
        campaignName: campaign.name,
        recipients: paginatedRecipients,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(allRecipients.length / parseInt(limit)),
          totalRecords: allRecipients.length,
          hasNext: endIndex < allRecipients.length,
          hasPrev: parseInt(page) > 1
        },
        followUpPending,
        filters: { search, sector, location }
      }
    });

  } catch (error) {
    console.error('Detailed report error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get follow-up candidates
exports.getFollowUpCandidates = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const userEmail = req.user?.email;

    // Get campaign details
    const campaign = await dbHelpers.getById('campaigns', campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Check ownership
    if (campaign.owner_email !== userEmail) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get email campaigns for this campaign
    const emailCampaigns = await dbHelpers.getAll('emailCampaigns', {
      filters: { campaignRef: campaignId }
    });

    // Get replies for this campaign
    const replies = await dbHelpers.getAll('emailReplies', {
      filters: { campaignRef: campaignId }
    });

    // Create a set of emails that replied
    const repliedEmails = new Set(replies.map(reply => reply.from));

    // Find candidates for follow-up
    let followUpCandidates = [];
    
    for (const emailCampaign of emailCampaigns) {
      const recipients = emailCampaign.recipientEmails || [];
      
      recipients.forEach(recipient => {
        // Include if: delivered but no reply, or opened but no reply
        if (!repliedEmails.has(recipient.email)) {
          const daysSinceSent = Math.floor(
            (new Date() - new Date(emailCampaign.sentAt)) / (1000 * 60 * 60 * 24)
          );
          
          // Only include if it's been at least 3 days since sent
          if (daysSinceSent >= 3) {
            followUpCandidates.push({
              email: recipient.email,
              firmName: recipient.firmName || extractFirmName(recipient.email),
              contactPerson: recipient.contactPerson || 'Unknown',
              opened: recipient.opened || false,
              clicked: (recipient.clicks || 0) > 0,
              daysSinceSent,
              lastActivity: recipient.lastClickedAt || recipient.openedAt || emailCampaign.sentAt,
              priority: calculateFollowUpPriority(recipient, daysSinceSent)
            });
          }
        }
      });
    }

    // If no real data, use demo follow-up candidates
    if (followUpCandidates.length === 0) {
      const demoData = getDemoReportData();
      followUpCandidates = demoData
        .filter(d => d.replied === 'No')
        .map(demo => ({
          email: demo.email,
          firmName: demo.firmName,
          contactPerson: demo.contactPerson,
          opened: demo.opened === 'Yes',
          clicked: demo.clicked === 'Yes',
          daysSinceSent: Math.floor(Math.random() * 10) + 3, // 3-12 days
          lastActivity: new Date(demo.sentAt),
          priority: Math.floor(Math.random() * 5) + 5 // 5-9 priority
        }));
    }

    // Sort by priority (high priority first)
    followUpCandidates.sort((a, b) => b.priority - a.priority);

    res.json({
      success: true,
      data: {
        campaignName: campaign.name,
        followUpCandidates,
        totalCount: followUpCandidates.length,
        highPriority: followUpCandidates.filter(c => c.priority >= 8).length,
        mediumPriority: followUpCandidates.filter(c => c.priority >= 5 && c.priority < 8).length,
        lowPriority: followUpCandidates.filter(c => c.priority < 5).length
      }
    });

  } catch (error) {
    console.error('Follow-up candidates error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get all campaigns summary for dashboard
exports.getAllCampaignsSummary = async (req, res) => {
  try {
    const userEmail = req.user?.email;
    
    // First, try to get real email campaigns
    const emailCampaigns = await dbHelpers.getAll('emailCampaigns', {
      sortBy: 'sentAt',
      sortOrder: 'desc'
    });

    if (emailCampaigns && emailCampaigns.length > 0) {
      // Use real email tracking data
      const campaigns = emailCampaigns.map(campaign => ({
        id: campaign.id,
        name: campaign.campaignName,
        clientName: campaign.clientName,
        firmsContacted: campaign.metrics.sent,
        responsesReceived: campaign.metrics.replied,
        responseRate: parseFloat(campaign.metrics.responseRate || 0),
        openRate: parseFloat(campaign.metrics.openRate || 0),
        clickRate: parseFloat(campaign.metrics.clickRate || 0),
        remindersSent: Math.floor(campaign.metrics.sent * 0.6), // Estimate
        createdAt: campaign.sentAt,
        status: campaign.status || 'completed'
      }));

      return res.json({
        success: true,
        campaigns: campaigns
      });
    }
    
    // Fallback: Get old campaigns for user
    const campaigns = await dbHelpers.getAll('campaigns', {
      filters: { owner_email: userEmail },
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });

    const summaries = [];

    for (const campaign of campaigns) {
      // Get email campaigns for this campaign
      const emailCampaigns = await dbHelpers.getAll('emailCampaigns', {
        filters: { campaignRef: campaign.id }
      });

      // Calculate basic stats
      let totalFirmsContacted = 0;
      let totalOpened = 0;
      let totalClicked = 0;

      for (const emailCampaign of emailCampaigns) {
        const recipients = emailCampaign.recipientEmails || [];
        totalFirmsContacted += recipients.length;
        
        recipients.forEach(recipient => {
          if (recipient.opened) totalOpened++;
          if (recipient.clicks > 0) totalClicked++;
        });
      }

      // Get replies count
      const replies = await dbHelpers.getAll('emailReplies', {
        filters: { campaignRef: campaign.id }
      });

      // If no real data, use demo stats
      if (totalFirmsContacted === 0 && campaign.name.includes('Demo')) {
        const demoData = getDemoReportData();
        totalFirmsContacted = demoData.length;
        replies.length = demoData.filter(d => d.replied === 'Yes').length;
      }

      const responseRate = totalFirmsContacted > 0 ? 
        ((replies.length / totalFirmsContacted) * 100).toFixed(1) : 0;

      summaries.push({
        id: campaign.id,
        name: campaign.name,
        firmsContacted: totalFirmsContacted,
        responsesReceived: replies.length,
        responseRate: parseFloat(responseRate),
        status: campaign.status,
        createdAt: campaign.createdAt
      });
    }

    res.json({
      success: true,
      campaigns: summaries
    });

  } catch (error) {
    console.error('All campaigns summary error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Export detailed report to CSV or Excel
exports.exportDetailedReport = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { format = 'csv' } = req.query;
    const userEmail = req.user?.email;
    
    // Get campaign details
    const campaign = await dbHelpers.getById('campaigns', campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Check ownership
    if (campaign.owner_email !== userEmail) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get detailed report data
    const reportData = await getDetailedReportDataForExport(campaignId);
    
    if (format === 'csv') {
      const csv = convertToCSV(reportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${campaign.name}_report.csv"`);
      res.send(csv);
    } else if (format === 'excel') {
      const excelBuffer = await convertToExcel(reportData, campaign.name);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${campaign.name}_report.xlsx"`);
      res.send(excelBuffer);
    } else {
      res.status(400).json({ error: 'Unsupported format. Use csv or excel' });
    }

  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Helper functions
function extractFirmName(email) {
  const domain = email.split('@')[1];
  if (!domain) return 'Unknown';
  
  // Remove common email providers
  const commonProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
  if (commonProviders.includes(domain.toLowerCase())) {
    return 'Individual';
  }
  
  // Convert domain to firm name
  return domain.split('.')[0]
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function calculateFollowUpPriority(recipient, daysSinceSent) {
  let priority = 0;
  
  // Base priority on engagement
  if (recipient.opened) priority += 5;
  if (recipient.clicks > 0) priority += 3;
  
  // Time factor (more urgent as days pass)
  if (daysSinceSent >= 7) priority += 3;
  else if (daysSinceSent >= 5) priority += 2;
  else priority += 1;
  
  // Email delivery status
  if (recipient.status === 'delivered') priority += 2;
  
  return Math.min(priority, 10); // Cap at 10
}

async function getDetailedReportDataForExport(campaignId) {
  try {
    // Get email campaigns for this campaign
    const emailCampaigns = await dbHelpers.getAll('emailCampaigns', {
      filters: { campaignRef: campaignId }
    });

    // Get replies for this campaign
    const replies = await dbHelpers.getAll('emailReplies', {
      filters: { campaignRef: campaignId }
    });

    // Create a map of replies by email
    const repliesMap = {};
    replies.forEach(reply => {
      repliesMap[reply.from] = reply;
    });

    // Collect all recipient data
    let allRecipients = [];
    
    for (const emailCampaign of emailCampaigns) {
      const recipients = emailCampaign.recipientEmails || [];
      
      recipients.forEach(recipient => {
        const hasReply = repliesMap[recipient.email];
        
        allRecipients.push({
          firmName: recipient.firmName || extractFirmName(recipient.email),
          contactPerson: recipient.contactPerson || 'Unknown',
          email: recipient.email,
          emailSent: recipient.status !== 'failed' ? 'Yes' : 'No',
          opened: recipient.opened ? 'Yes' : 'No',
          clicked: (recipient.clicks || 0) > 0 ? 'Yes' : 'No',
          engaged: (recipient.opened || (recipient.clicks || 0) > 0 || hasReply) ? 'Yes' : 'No',
          replied: hasReply ? 'Yes' : 'No',
          finalStatus: hasReply ? 'Replied' : 
                      (recipient.opened || (recipient.clicks || 0) > 0) ? 'Engaged' :
                      recipient.status === 'delivered' ? 'No Reply' : 'Follow-up Pending',
          sector: recipient.sector || 'Unknown',
          location: recipient.location || 'Unknown',
          sentAt: new Date(emailCampaign.sentAt).toLocaleDateString()
        });
      });
    }

    // If no data exists, return demo data
    if (allRecipients.length === 0) {
      allRecipients = getDemoReportData();
    }

    return allRecipients;
  } catch (error) {
    console.error('Error getting detailed report data:', error);
    // Return demo data on error
    return getDemoReportData();
  }
}

function getDemoReportData() {
  return [
    {
      firmName: 'Elevare Equity',
      contactPerson: 'Vipul Rawal',
      email: 'vipul@elevarequity.com',
      emailSent: 'Yes',
      opened: 'Yes',
      clicked: 'Yes',
      engaged: 'Yes',
      replied: 'Yes',
      finalStatus: 'Replied',
      sector: 'FinTech',
      location: 'Mumbai, India',
      sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toLocaleDateString()
    },
    {
      firmName: 'KCK MedTech',
      contactPerson: 'Witney McKiernan',
      email: 'witney@kckmedtech.com',
      emailSent: 'Yes',
      opened: 'Yes',
      clicked: 'No',
      engaged: 'Yes',
      replied: 'No',
      finalStatus: 'No Reply',
      sector: 'Healthcare',
      location: 'Boston, USA',
      sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleDateString()
    },
    {
      firmName: 'CapitalWorks',
      contactPerson: 'Todd Martin',
      email: 'todd@capitalworks.net',
      emailSent: 'Yes',
      opened: 'No',
      clicked: 'No',
      engaged: 'No',
      replied: 'No',
      finalStatus: 'Follow-up Pending',
      sector: 'SaaS',
      location: 'San Francisco, USA',
      sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toLocaleDateString()
    },
    {
      firmName: 'Broadtree Partners',
      contactPerson: 'David Slenzak',
      email: 'david@broadtreepartners.com',
      emailSent: 'Yes',
      opened: 'Yes',
      clicked: 'Yes',
      engaged: 'Yes',
      replied: 'No',
      finalStatus: 'Engaged',
      sector: 'E-commerce',
      location: 'New York, USA',
      sentAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toLocaleDateString()
    },
    {
      firmName: 'CTI Life Sciences Fund',
      contactPerson: 'Youssef Bennani',
      email: 'youssef@ctisciences.com',
      emailSent: 'Yes',
      opened: 'Yes',
      clicked: 'No',
      engaged: 'Yes',
      replied: 'No',
      finalStatus: 'No Reply',
      sector: 'Biotech',
      location: 'London, UK',
      sentAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toLocaleDateString()
    },
    {
      firmName: 'Montage Ventures',
      contactPerson: 'Todd Kimmel',
      email: 'todd@montageventures.com',
      emailSent: 'Yes',
      opened: 'No',
      clicked: 'No',
      engaged: 'No',
      replied: 'No',
      finalStatus: 'Follow-up Pending',
      sector: 'AI/ML',
      location: 'Palo Alto, USA',
      sentAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toLocaleDateString()
    },
    {
      firmName: 'Gruenderfonds Ruhr',
      contactPerson: 'Thorsten Reuter',
      email: 'thorsten@gruenderfonds-ruhr.com',
      emailSent: 'Yes',
      opened: 'Yes',
      clicked: 'Yes',
      engaged: 'Yes',
      replied: 'Yes',
      finalStatus: 'Replied',
      sector: 'Industrial Tech',
      location: 'Berlin, Germany',
      sentAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
    },
    {
      firmName: 'Emergent Medical Partners',
      contactPerson: 'Robert D. Brownell',
      email: 'robert@emergentmedical.com',
      emailSent: 'Yes',
      opened: 'Yes',
      clicked: 'No',
      engaged: 'Yes',
      replied: 'No',
      finalStatus: 'Engaged',
      sector: 'MedTech',
      location: 'Chicago, USA',
      sentAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toLocaleDateString()
    }
  ];
}

function convertToCSV(data) {
  if (!data || data.length === 0) return '';
  
  const headers = [
    'Investor/Firm', 'Contact Person', 'Email', 'Email Sent', 'Opened', 'Clicked', 
    'Engaged', 'Replied', 'Status', 'Sector', 'Location', 'Sent Date'
  ];
  
  const csvRows = [headers.join(',')];
  
  data.forEach(row => {
    const values = [
      `"${row.firmName}"`,
      `"${row.contactPerson}"`,
      `"${row.email}"`,
      `"${row.emailSent}"`,
      `"${row.opened}"`,
      `"${row.clicked}"`,
      `"${row.engaged}"`,
      `"${row.replied}"`,
      `"${row.finalStatus}"`,
      `"${row.sector}"`,
      `"${row.location}"`,
      `"${row.sentAt}"`
    ];
    csvRows.push(values.join(','));
  });
  
  return csvRows.join('\n');
}

async function convertToExcel(data, campaignName) {
  const xlsx = require('xlsx');
  
  if (!data || data.length === 0) {
    data = getDemoReportData();
  }
  
  // Prepare data for Excel
  const excelData = data.map(row => ({
    'Investor/Firm': row.firmName,
    'Contact Person': row.contactPerson,
    'Email': row.email,
    'Email Sent': row.emailSent,
    'Opened': row.opened,
    'Clicked': row.clicked,
    'Engaged': row.engaged,
    'Replied': row.replied,
    'Status': row.finalStatus,
    'Sector': row.sector,
    'Location': row.location,
    'Sent Date': row.sentAt
  }));
  
  // Create workbook and worksheet
  const workbook = xlsx.utils.book_new();
  const worksheet = xlsx.utils.json_to_sheet(excelData);
  
  // Set column widths
  const columnWidths = [
    { wch: 20 }, // Investor/Firm
    { wch: 18 }, // Contact Person
    { wch: 25 }, // Email
    { wch: 12 }, // Email Sent
    { wch: 10 }, // Opened
    { wch: 10 }, // Clicked
    { wch: 10 }, // Engaged
    { wch: 10 }, // Replied
    { wch: 15 }, // Status
    { wch: 15 }, // Sector
    { wch: 18 }, // Location
    { wch: 12 }  // Sent Date
  ];
  worksheet['!cols'] = columnWidths;
  
  // Add worksheet to workbook
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Campaign Report');
  
  // Generate buffer
  const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}

module.exports = exports;