const { v4: uuidv4 } = require("uuid");
const { db, admin } = require("../config/firebase");
const { sendEmail } = require("../services/email.service");
const { createProfessionalEmailTemplate, createInvestmentEmailContent } = require("../utils/email-templates");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

exports.sendEmail = async (req, res) => {
  const { campaignId, content, recipients, sender, subject, type } = req.body;
  if (!campaignId || !content || !recipients || !subject) {
    return res.status(400).json({
      error:
        "Missing required fields: campaignId, content, recipients, subject",
    });
  }

  try {
    // Check if campaign exists in Firebase
    const campaignRef = db.collection('campaigns').doc(campaignId);
    const campaignDoc = await campaignRef.get();
    if (!campaignDoc.exists) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    const throttleLimit = 10;
    const recipientsData = recipients.map((email) => ({
      email,
      messageId: uuidv4(),
      status: "pending",
      delivered: false,
      opened: false,
      clicks: 0,
    }));

    // Create email campaign in Firebase
    const emailCampaignRef = db.collection('emailCampaigns').doc();
    const emailCampaign = {
      campaignRef: campaignId,
      subject,
      sender,
      contentHtml: content,
      sentAt: new Date(),
      sentCount: 0,
      recipientEmails: recipientsData,
      type: type || "regular",
      owner_email: req.user?.email,
    };
    await emailCampaignRef.set(emailCampaign);

    const results = [];

    const sendOne = async ({ email, messageId }) => {
      try {
        // Get client company name from campaign data
        const campaignDoc = await campaignRef.get();
        const campaignData = campaignDoc.data();
        const clientCompanyName = campaignData?.clientCompanyName || campaignData?.companyName || "Investment Opportunity";
        
        // Extract company name from content or use client company name
        const companyNameMatch = content.match(/company[:\s]+([A-Za-z0-9\s]+)/i) || 
                                content.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g);
        const extractedCompanyName = companyNameMatch ? companyNameMatch[1] || companyNameMatch[0] : clientCompanyName;
        
        const emailContent = createInvestmentEmailContent({
          investorName: "[Investor's Name]",
          companyName: extractedCompanyName.trim(),
          sector: "FMCG",
          stage: "Series A", 
          amount: "$2M"
        });
        const professionalHtml = createProfessionalEmailTemplate(emailContent, extractedCompanyName.trim());
        
        await sendEmail({ 
          to: email, 
          from: sender, 
          subject, 
          html: content.includes('<html>') ? content : professionalHtml, 
          messageId,
          companyName: extractedCompanyName.trim()
        });
        results.push({ recipient: email, status: "sent", messageId });
      } catch (err) {
        results.push({ recipient: email, status: "failed", error: err.message, messageId });
      }
    };

    for (let i = 0; i < recipientsData.length; i += throttleLimit) {
      const batch = recipientsData.slice(i, i + throttleLimit);
      await Promise.all(batch.map(sendOne));
      await delay(800);
    }

    res.status(200).json({
      message: "Emails processed.",
      campaignId,
      totalRecipients: recipients.length,
      successCount: results.filter((r) => r.status === "sent").length,
      failureCount: results.filter((r) => r.status === "failed").length,
      results,
      emailCampaignId: emailCampaignRef.id,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal error", error: error.message });
  }
};

// Check rate limits
const checkRateLimit = async (userEmail) => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const weekStart = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
  const weekStartStr = weekStart.toISOString().split('T')[0];
  
  // Check daily limit (60 emails)
  const dailyRef = db.collection('emailLimits').doc(`${userEmail}_${todayStr}`);
  const dailyDoc = await dailyRef.get();
  const dailyCount = dailyDoc.exists ? dailyDoc.data().count : 0;
  
  if (dailyCount >= 60) {
    throw new Error('Daily email limit reached (60 emails per day)');
  }
  
  // Check weekly limit (240 emails)
  const weeklyQuery = await db.collection('emailLimits')
    .where('userEmail', '==', userEmail)
    .where('date', '>=', weekStartStr)
    .where('date', '<=', todayStr)
    .get();
  
  const weeklyCount = weeklyQuery.docs.reduce((sum, doc) => sum + doc.data().count, 0);
  
  if (weeklyCount >= 240) {
    throw new Error('Weekly email limit reached (240 emails per week)');
  }
  
  return { dailyCount, weeklyCount };
};

// Update email count
const updateEmailCount = async (userEmail, emailCount) => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  const dailyRef = db.collection('emailLimits').doc(`${userEmail}_${todayStr}`);
  const dailyDoc = await dailyRef.get();
  
  if (dailyDoc.exists) {
    await dailyRef.update({
      count: dailyDoc.data().count + emailCount,
      lastUpdated: new Date()
    });
  } else {
    await dailyRef.set({
      userEmail,
      date: todayStr,
      count: emailCount,
      createdAt: new Date(),
      lastUpdated: new Date()
    });
  }
};

// Lightweight direct sender that doesn't require a campaign in Firebase
exports.sendDirect = async (req, res) => {
  try {
    const { to, subject, html, from } = req.body || {};
    if (!to || !subject || !html) {
      return res.status(400).json({ error: "to, subject, html are required" });
    }
    
    // Get client company name from request or extract from content
    const clientCompanyName = req.body.companyName || "Investment Opportunity";
    const companyNameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || 
                            html.match(/company[:\s]+([A-Za-z0-9\s]+)/i) ||
                            subject.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g);
    const extractedCompanyName = companyNameMatch ? companyNameMatch[1] || companyNameMatch[0] : clientCompanyName;
    
    const messageId = uuidv4();
    const result = await sendEmail({ 
      to, 
      from, 
      subject, 
      html, 
      messageId,
      companyName: extractedCompanyName.trim()
    });
    
    return res.status(200).json({ 
      success: true, 
      messageId, 
      providerStatus: result.statusCode
    });
  } catch (err) {
    if (err.message.includes('limit reached')) {
      return res.status(429).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message || 'Failed to send email' });
  }
};
exports.trackOpen = async (req, res) => {
  try {
    const { messageId, email } = req.query;
    if (!messageId || !email) return res.status(400).json({ message: "Missing messageId or email" });

    // Find campaign in Firebase
    const emailCampaignsRef = db.collection('emailCampaigns');
    const snapshot = await emailCampaignsRef.where('recipientEmails', 'array-contains', { messageId }).get();
    
    if (snapshot.empty) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    const campaignDoc = snapshot.docs[0];
    const campaign = campaignDoc.data();
    const recipient = campaign.recipientEmails.find((r) => r.messageId === messageId);
    
    if (!recipient) return res.status(404).json({ message: "Recipient not found" });

    if (!recipient.opened) {
      // Update recipient in Firebase
      const recipientIndex = campaign.recipientEmails.findIndex((r) => r.messageId === messageId);
      campaign.recipientEmails[recipientIndex].opened = true;
      campaign.recipientEmails[recipientIndex].openedAt = new Date();
      campaign.openedCount = (campaign.openedCount || 0) + 1;
      
      await campaignDoc.ref.update(campaign);
      
      // Update campaign stats
      const campaignRef = db.collection('campaigns').doc(campaign.campaignRef);
      const campaignData = await campaignRef.get();
      if (campaignData.exists) {
        const currentData = campaignData.data();
        await campaignRef.update({
          totalEmailsOpened: (currentData.totalEmailsOpened || 0) + 1
        });
      }
    }

    const transparent1x1PNG = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=",
      "base64"
    );
    res.setHeader("Content-Type", "image/png");
    return res.send(transparent1x1PNG);
  } catch (err) {
    return res.status(500).end();
  }
};

// Build a professional score summary email from analysis object
function buildScoreEmailHtml(analysis) {
  console.log('Building HTML for analysis:', analysis);
  
  const s = analysis?.summary || {};
  const scorecard = analysis?.scorecard || {};
  
  // Calculate total score from scorecard if not provided
  let totalScore = s.total_score || 0;
  if (!totalScore && Object.keys(scorecard).length > 0) {
    const scores = Object.values(scorecard).map(v => parseInt(v) || 0);
    totalScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length * 10);
  }
  
  const rows = Object.entries(scorecard).map(([k, v]) => `<li>${k}: <strong>${v}/10</strong></li>`).join('');
  
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Investment Readiness Score Report</title>
</head>
<body style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#1f2937;margin:20px;background:#ffffff;">
  <h2 style="margin:0 0 16px;color:#2563eb;">Investment Readiness Score Report</h2>
  <div style="background:#f8fafc;padding:16px;border-radius:8px;margin:16px 0;">
    <p style="margin:0 0 12px;font-size:18px;">Overall Score: <strong style="color:#059669;">${totalScore}/100</strong></p>
    <p style="margin:0;color:#6b7280;">Status: <strong>${(s.status||'Under Review').toString().toUpperCase()}</strong></p>
  </div>
  <h3 style="margin:24px 0 12px;color:#374151;">Detailed Scorecard</h3>
  <ul style="padding-left:20px;margin:0 0 20px;">${rows}</ul>
  <h3 style="margin:24px 0 12px;color:#374151;">Executive Summary</h3>
  <div style="background:#ffffff;border-left:4px solid #2563eb;padding:16px;margin:12px 0;">
    <p style="margin:0 0 8px;"><strong>Problem Statement:</strong> ${s.problem||'Not specified'}</p>
    <p style="margin:0 0 8px;"><strong>Solution Approach:</strong> ${s.solution||'Not specified'}</p>
    <p style="margin:0 0 8px;"><strong>Market Analysis:</strong> ${s.market||'Not specified'}</p>
    <p style="margin:0;"><strong>Traction & Metrics:</strong> ${s.traction||'Not specified'}</p>
  </div>
  <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;">
  <p style="margin:0;color:#6b7280;font-size:14px;">This report was generated automatically. For questions, please contact our investment team.</p>
</body>
</html>`;
  
  console.log('Generated HTML content length:', htmlContent.length);
  return htmlContent;
}

// Send score email: only requires to, subject, and analysis payload; backend builds HTML
exports.sendScoreEmail = async (req, res) => {
  try {
    const { to, subject, analysis, from } = req.body || {};
    console.log('Score email request:', { to, subject, analysis: !!analysis, from });
    
    if (!to || !subject || !analysis) {
      return res.status(400).json({ error: "to, subject, analysis are required" });
    }
    
    // Build HTML content from analysis
    const html = buildScoreEmailHtml(analysis);
    console.log('Generated HTML length:', html?.length);
    
    if (!html || html.trim().length === 0) {
      return res.status(400).json({ error: "Failed to generate email content from analysis" });
    }
    
    const messageId = uuidv4();
    // Extract company name from analysis or subject
    const companyNameMatch = (analysis?.companyName) || 
                            (analysis?.summary?.companyName) ||
                            subject.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g)?.[0] ||
                            "Investment Opportunity";
    
    console.log('About to send email with HTML content');
    
    const result = await sendEmail({ 
      to, 
      from: from || 'noreply@yourdomain.com', 
      subject, 
      html, 
      messageId,
      companyName: companyNameMatch.trim()
    });
    
    console.log('Email sent result:', result);
    
    return res.status(200).json({ 
      success: true, 
      messageId, 
      providerStatus: result.statusCode,
      emailSent: true,
      htmlLength: html.length
    });
  } catch (err) {
    console.error('Score email error:', err);
    return res.status(500).json({ error: err.message || 'Failed to send score email' });
  }
};
exports.trackClick = async (req, res) => {
  try {
    const { messageId, url } = req.query;
    if (!messageId || !url) return res.status(400).send("Bad request");

    // Find campaign in Firebase
    const emailCampaignsRef = db.collection('emailCampaigns');
    const snapshot = await emailCampaignsRef.where('recipientEmails', 'array-contains', { messageId }).get();
    
    if (snapshot.empty) {
      return res.status(404).send("Not found");
    }

    const campaignDoc = snapshot.docs[0];
    const campaign = campaignDoc.data();
    const index = campaign.recipientEmails.findIndex((r) => r.messageId === messageId);
    
    if (index === -1) return res.status(404).send("Not found");

    // Update click tracking
    campaign.clickedCount = (campaign.clickedCount || 0) + 1;
    campaign.recipientEmails[index].lastClickedAt = new Date();
    campaign.recipientEmails[index].clicks = (campaign.recipientEmails[index].clicks || 0) + 1;
    
    await campaignDoc.ref.update(campaign);

    // Update campaign stats
    const campaignRef = db.collection('campaigns').doc(campaign.campaignRef);
    const campaignData = await campaignRef.get();
    if (campaignData.exists) {
      const currentData = campaignData.data();
      await campaignRef.update({
        totalClicks: (currentData.totalClicks || 0) + 1
      });
    }

    const redirect = decodeURIComponent(url);
    return res.redirect(302, redirect);
  } catch (err) {
    return res.status(500).send("Server error");
  }
};

exports.webhook = async (req, res) => {
  try {
    const events = Array.isArray(req.body) ? req.body : [];
    for (const evt of events) {
      const messageId = evt?.custom_args?.messageId || evt?.messageId;
      const eventType = evt?.event; // processed, delivered, open, click, bounce, spamreport, unsubscribe, dropped
      if (!messageId || !eventType) continue;

      // Find campaign in Firebase
      const emailCampaignsRef = db.collection('emailCampaigns');
      const snapshot = await emailCampaignsRef.where('recipientEmails', 'array-contains', { messageId }).get();
      
      if (snapshot.empty) continue;
      
      const campaignDoc = snapshot.docs[0];
      const campaign = campaignDoc.data();
      const index = campaign.recipientEmails.findIndex((r) => r.messageId === messageId);
      if (index === -1) continue;

      // Update based on event type
      if (eventType === "processed") {
        campaign.recipientEmails[index].status = "sent";
        campaign.sentCount = (campaign.sentCount || 0) + 1;
      } else if (eventType === "delivered") {
        campaign.recipientEmails[index].delivered = true;
        campaign.recipientEmails[index].status = "delivered";
        campaign.deliveredCount = (campaign.deliveredCount || 0) + 1;
      } else if (eventType === "open") {
        campaign.recipientEmails[index].opened = true;
        campaign.recipientEmails[index].openedAt = new Date();
        campaign.openedCount = (campaign.openedCount || 0) + 1;
      } else if (eventType === "click") {
        campaign.clickedCount = (campaign.clickedCount || 0) + 1;
        campaign.recipientEmails[index].clicks = (campaign.recipientEmails[index].clicks || 0) + 1;
        campaign.recipientEmails[index].lastClickedAt = new Date();
      } else if (eventType === "bounce") {
        campaign.recipientEmails[index].status = "bounced";
        campaign.bouncedCount = (campaign.bouncedCount || 0) + 1;
      } else if (eventType === "spamreport") {
        campaign.recipientEmails[index].status = "complained";
        campaign.complainedCount = (campaign.complainedCount || 0) + 1;
      }

      // Update the document
      await campaignDoc.ref.update(campaign);
    }
    return res.status(200).send("OK");
  } catch (err) {
    return res.status(500).send("Webhook error");
  }
};

exports.inbound = async (req, res) => {
  try {
    const headers = req.body?.headers || {};
    const references = headers["references"] || headers["References"] || "";
    const match = typeof references === "string" && references.match(/<campaign-(.+?)@yourdomain\.com>/);
    const originalMessageId = match && match[1];
    const from = req.body?.from || req.body?.envelope?.from;
    const to = req.body?.to || (Array.isArray(req.body?.to) ? req.body.to[0] : undefined);
    const subject = req.body?.subject || "";
    const body = req.body?.html || req.body?.text || "";

    if (!originalMessageId || !from || !to) return res.status(400).send("Bad inbound");

    // Find campaign in Firebase
    const emailCampaignsRef = db.collection('emailCampaigns');
    const snapshot = await emailCampaignsRef.where('recipientEmails', 'array-contains', { messageId: originalMessageId }).get();
    
    if (snapshot.empty) {
      return res.status(404).send("No campaign");
    }
    
    const emailCampaignDoc = snapshot.docs[0];
    const emailCampaign = emailCampaignDoc.data();

    // Create email reply in Firebase
    const emailReplyRef = db.collection('emailReplies').doc();
    await emailReplyRef.set({
      emailCampaignRef: emailCampaignDoc.id,
      campaignRef: emailCampaign.campaignRef,
      from,
      to,
      subject,
      body,
      messageId: originalMessageId,
      timestamp: new Date().toISOString(),
      createdAt: new Date(),
    });

    // Update email campaign replied count
    emailCampaign.repliedCount = (emailCampaign.repliedCount || 0) + 1;
    await emailCampaignDoc.ref.update(emailCampaign);

    // Update campaign total replies
    const campaignRef = db.collection('campaigns').doc(emailCampaign.campaignRef);
    const campaignDoc = await campaignRef.get();
    if (campaignDoc.exists) {
      const campaignData = campaignDoc.data();
      await campaignRef.update({
        totalReplies: (campaignData.totalReplies || 0) + 1
      });
    }

    return res.status(200).send("Stored");
  } catch (err) {
    return res.status(500).send("Inbound error");
  }
};

exports.unsubscribe = async (req, res) => {
  try {
    const email = (req.method === "GET" ? req.query.email : req.body.email) || "";
    if (!email) return res.status(400).json({ error: "email required" });
    
    // Add to unsubscribe list in Firebase
    const unsubscribeRef = db.collection('unsubscribes').doc(email.toLowerCase());
    await unsubscribeRef.set({
      email: email.toLowerCase(),
      createdAt: new Date(),
    });
    
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed" });
  }
};

