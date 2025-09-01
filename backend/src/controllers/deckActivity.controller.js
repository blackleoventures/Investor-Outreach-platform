const { db } = require("../config/firebase");

// Track deck view
exports.trackDeckView = async (req, res) => {
  try {
    const { companyId, deckId, deckName, investorEmail, investorName } = req.body;
    
    if (!companyId || !deckId || !investorEmail) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get IP address and user agent
    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];
    const referrer = req.headers['referer'] || req.headers['referrer'];

    // Create activity record in Firebase
    const activityRef = db.collection('deckActivities').doc();
    const activity = {
      companyId,
      deckId,
      deckName,
      investorEmail,
      investorName,
      activityType: "view",
      ipAddress,
      userAgent,
      referrer,
      sessionId: req.session?.id || generateSessionId(),
      timeSpent: 0,
      pageViews: 1,
      createdAt: new Date(),
    };
    await activityRef.set(activity);

    // Update email campaign stats if this view came from an email
    if (req.body.emailId) {
      await updateEmailCampaignStats(req.body.emailId, "deckViewed");
    }

    res.status(201).json({ 
      success: true, 
      data: activity,
      message: "Deck view tracked successfully" 
    });
  } catch (error) {
    console.error("trackDeckView error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Track deck download
exports.trackDeckDownload = async (req, res) => {
  try {
    const { companyId, deckId, deckName, investorEmail, investorName, downloadFormat } = req.body;
    
    if (!companyId || !deckId || !investorEmail || !downloadFormat) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get IP address and user agent
    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];
    const referrer = req.headers['referer'] || req.headers['referrer'];

    // Create activity record in Firebase
    const activityRef = db.collection('deckActivities').doc();
    const activity = {
      companyId,
      deckId,
      deckName,
      investorEmail,
      investorName,
      activityType: "download",
      ipAddress,
      userAgent,
      referrer,
      sessionId: req.session?.id || generateSessionId(),
      downloadFormat,
      metadata: {
        campaignId: req.body.campaignId,
        emailId: req.body.emailId,
        sequenceId: req.body.sequenceId,
      },
      createdAt: new Date(),
    };
    await activityRef.set(activity);

    // Update email campaign stats if this download came from an email
    if (req.body.emailId) {
      await updateEmailCampaignStats(req.body.emailId, "deckDownloaded");
    }

    res.status(201).json({ 
      success: true, 
      data: activity,
      message: "Deck download tracked successfully" 
    });
  } catch (error) {
    console.error("trackDeckDownload error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Track deck share
exports.trackDeckShare = async (req, res) => {
  try {
    const { companyId, deckId, deckName, investorEmail, investorName, shareMethod } = req.body;
    
    if (!companyId || !deckId || !investorEmail || !shareMethod) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const activity = await DeckActivity.create({
      companyId,
      deckId,
      deckName,
      investorEmail,
      investorName,
      activityType: "share",
      shareMethod,
      metadata: {
        campaignId: req.body.campaignId,
        emailId: req.body.emailId,
        sequenceId: req.body.sequenceId,
      },
    });

    res.status(201).json({ 
      success: true, 
      data: activity,
      message: "Deck share tracked successfully" 
    });
  } catch (error) {
    console.error("trackDeckShare error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Update time spent on deck
exports.updateTimeSpent = async (req, res) => {
  try {
    const { activityId, timeSpent, pageViews } = req.body;
    
    if (!activityId || !timeSpent) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const activity = await DeckActivity.findByIdAndUpdate(
      activityId,
      { 
        timeSpent,
        pageViews: pageViews || 1,
      },
      { new: true }
    );

    if (!activity) {
      return res.status(404).json({ error: "Activity not found" });
    }

    res.json({ 
      success: true, 
      data: activity,
      message: "Time spent updated successfully" 
    });
  } catch (error) {
    console.error("updateTimeSpent error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get deck activity analytics for a company
exports.getDeckAnalytics = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { startDate, endDate, deckId } = req.query;
    
    let query = { companyId };
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    
    if (deckId) {
      query.deckId = deckId;
    }

    // Get activity summary
    const summary = await DeckActivity.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$activityType",
          count: { $sum: 1 },
          uniqueInvestors: { $addToSet: "$investorEmail" },
        }
      },
      {
        $project: {
          activityType: "$_id",
          count: 1,
          uniqueInvestors: { $size: "$uniqueInvestors" },
        }
      }
    ]);

    // Get top investors by engagement
    const topInvestors = await DeckActivity.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$investorEmail",
          investorName: { $first: "$investorName" },
          totalActivities: { $sum: 1 },
          views: { $sum: { $cond: [{ $eq: ["$activityType", "view"] }, 1, 0] } },
          downloads: { $sum: { $cond: [{ $eq: ["$activityType", "download"] }, 1, 0] } },
          shares: { $sum: { $cond: [{ $eq: ["$activityType", "share"] }, 1, 0] } },
          lastActivity: { $max: "$createdAt" },
        }
      },
      { $sort: { totalActivities: -1 } },
      { $limit: 10 }
    ]);

    // Get activity timeline
    const timeline = await DeckActivity.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            activityType: "$activityType"
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.date": 1 } }
    ]);

    res.json({ 
      success: true, 
      data: {
        summary,
        topInvestors,
        timeline,
      }
    });
  } catch (error) {
    console.error("getDeckAnalytics error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get investor activity for a specific deck
exports.getInvestorDeckActivity = async (req, res) => {
  try {
    const { companyId, deckId, investorEmail } = req.params;
    
    const activities = await DeckActivity.find({
      companyId,
      deckId,
      investorEmail,
    }).sort({ createdAt: -1 });

    res.json({ 
      success: true, 
      data: activities
    });
  } catch (error) {
    console.error("getInvestorDeckActivity error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get real-time deck activity
exports.getRealTimeActivity = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { minutes = 60 } = req.query;
    
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    
    const recentActivity = await DeckActivity.find({
      companyId,
      createdAt: { $gte: cutoffTime }
    })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('companyId', 'name');

    res.json({ 
      success: true, 
      data: recentActivity
    });
  } catch (error) {
    console.error("getRealTimeActivity error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Helper function to generate session ID
function generateSessionId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Helper function to update email campaign stats
async function updateEmailCampaignStats(emailId, action) {
  try {
    const campaign = await EmailCampaign.findOne({ "recipientEmails.messageId": emailId });
    if (!campaign) return;

    const index = campaign.recipientEmails.findIndex(r => r.messageId === emailId);
    if (index === -1) return;

    if (action === "deckViewed") {
      await EmailCampaign.findByIdAndUpdate(campaign._id, {
        $inc: { "recipientEmails.$.deckViewed": 1 }
      });
    } else if (action === "deckDownloaded") {
      await EmailCampaign.findByIdAndUpdate(campaign._id, {
        $inc: { "recipientEmails.$.deckDownloaded": 1 }
      });
    }
  } catch (error) {
    console.error("Error updating email campaign stats:", error);
  }
} 