const { db } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");

// Create a new deal room
exports.createDealRoom = async (req, res) => {
  try {
    const { companyId, pitchDeckUrl, createdBy } = req.body;
    
    if (!companyId || !pitchDeckUrl) {
      return res.status(400).json({ error: "companyId and pitchDeckUrl are required" });
    }

    const dealRoomData = {
      companyId,
      pitchDeckUrl,
      createdBy: createdBy || "unknown",
      isActive: true,
      accessibleInvestors: [],
      settings: {
        allowDirectMessaging: true,
        trackEngagement: true,
        autoFollowUp: false,
        followUpDays: 7
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const dealRoomRef = db.collection('dealRooms').doc();
    await dealRoomRef.set(dealRoomData);

    res.status(201).json({
      success: true,
      dealRoomId: dealRoomRef.id,
      data: { id: dealRoomRef.id, ...dealRoomData }
    });
  } catch (error) {
    console.error("Error creating deal room:", error);
    res.status(500).json({ error: "Failed to create deal room", details: error.message });
  }
};

// Get deal room by ID
exports.getDealRoom = async (req, res) => {
  try {
    const { id } = req.params;
    
    const dealRoomRef = db.collection('dealRooms').doc(id);
    const dealRoomDoc = await dealRoomRef.get();
    
    if (!dealRoomDoc.exists) {
      return res.status(404).json({ error: "Deal room not found" });
    }

    const dealRoomData = { id: dealRoomDoc.id, ...dealRoomDoc.data() };
    
    res.status(200).json({
      success: true,
      data: dealRoomData
    });
  } catch (error) {
    console.error("Error fetching deal room:", error);
    res.status(500).json({ error: "Failed to fetch deal room", details: error.message });
  }
};

// Update pitch deck analysis
exports.updatePitchAnalysis = async (req, res) => {
  try {
    const { id } = req.params;
    const { analysis } = req.body;
    
    if (!analysis) {
      return res.status(400).json({ error: "Analysis data is required" });
    }

    const dealRoomRef = db.collection('dealRooms').doc(id);
    const dealRoomDoc = await dealRoomRef.get();
    
    if (!dealRoomDoc.exists) {
      return res.status(404).json({ error: "Deal room not found" });
    }

    await dealRoomRef.update({
      pitchDeckAnalysis: analysis,
      updatedAt: new Date()
    });

    res.status(200).json({
      success: true,
      message: "Pitch analysis updated successfully"
    });
  } catch (error) {
    console.error("Error updating pitch analysis:", error);
    res.status(500).json({ error: "Failed to update analysis", details: error.message });
  }
};

// Grant investor access to deal room
exports.grantInvestorAccess = async (req, res) => {
  try {
    const { id } = req.params;
    const { investorIds } = req.body;
    
    if (!Array.isArray(investorIds) || investorIds.length === 0) {
      return res.status(400).json({ error: "investorIds array is required" });
    }

    const dealRoomRef = db.collection('dealRooms').doc(id);
    const dealRoomDoc = await dealRoomRef.get();
    
    if (!dealRoomDoc.exists) {
      return res.status(404).json({ error: "Deal room not found" });
    }

    const dealRoomData = dealRoomDoc.data();
    const existingInvestors = dealRoomData.accessibleInvestors || [];
    const existingIds = existingInvestors.map(inv => inv.investorId);

    const newInvestors = investorIds
      .filter(id => !existingIds.includes(id))
      .map(investorId => ({
        investorId,
        accessGrantedAt: new Date(),
        lastViewedAt: null,
        deckDownloaded: false,
        emailsSent: 0,
        lastEmailSent: null,
        replied: false,
        lastReplyAt: null,
        engagementScore: 0
      }));

    await dealRoomRef.update({
      accessibleInvestors: [...existingInvestors, ...newInvestors],
      updatedAt: new Date()
    });

    res.status(200).json({
      success: true,
      message: `Access granted to ${newInvestors.length} investors`,
      grantedInvestors: newInvestors.map(inv => inv.investorId)
    });
  } catch (error) {
    console.error("Error granting investor access:", error);
    res.status(500).json({ error: "Failed to grant access", details: error.message });
  }
};

// Track investor engagement
exports.trackEngagement = async (req, res) => {
  try {
    const { id } = req.params;
    const { investorId, action, metadata = {} } = req.body;
    
    if (!investorId || !action) {
      return res.status(400).json({ error: "investorId and action are required" });
    }

    const dealRoomRef = db.collection('dealRooms').doc(id);
    const dealRoomDoc = await dealRoomRef.get();
    
    if (!dealRoomDoc.exists) {
      return res.status(404).json({ error: "Deal room not found" });
    }

    const dealRoomData = dealRoomDoc.data();
    const accessibleInvestors = dealRoomData.accessibleInvestors || [];
    const investorIndex = accessibleInvestors.findIndex(inv => inv.investorId === investorId);
    
    if (investorIndex === -1) {
      return res.status(404).json({ error: "Investor not found in deal room" });
    }

    const investor = accessibleInvestors[investorIndex];
    const now = new Date();

    // Update based on action
    switch (action) {
      case "view_deck":
        investor.lastViewedAt = now;
        investor.engagementScore += 5;
        break;
      case "download_deck":
        investor.deckDownloaded = true;
        investor.engagementScore += 10;
        break;
      case "email_sent":
        investor.emailsSent += 1;
        investor.lastEmailSent = now;
        break;
      case "replied":
        investor.replied = true;
        investor.lastReplyAt = now;
        investor.engagementScore += 20;
        break;
      default:
        return res.status(400).json({ error: "Invalid action" });
    }

    accessibleInvestors[investorIndex] = investor;

    await dealRoomRef.update({
      accessibleInvestors,
      updatedAt: now
    });

    res.status(200).json({
      success: true,
      message: "Engagement tracked successfully",
      investor: investor
    });
  } catch (error) {
    console.error("Error tracking engagement:", error);
    res.status(500).json({ error: "Failed to track engagement", details: error.message });
  }
};

// Get investor engagement analytics
exports.getEngagementAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    
    const dealRoomRef = db.collection('dealRooms').doc(id);
    const dealRoomDoc = await dealRoomRef.get();
    
    if (!dealRoomDoc.exists) {
      return res.status(404).json({ error: "Deal room not found" });
    }

    const dealRoomData = dealRoomDoc.data();
    const investors = dealRoomData.accessibleInvestors || [];

    const analytics = {
      totalInvestors: investors.length,
      viewedDeck: investors.filter(inv => inv.lastViewedAt).length,
      downloadedDeck: investors.filter(inv => inv.deckDownloaded).length,
      emailsSent: investors.reduce((sum, inv) => sum + (inv.emailsSent || 0), 0),
      replied: investors.filter(inv => inv.replied).length,
      averageEngagementScore: investors.length > 0 
        ? investors.reduce((sum, inv) => sum + (inv.engagementScore || 0), 0) / investors.length 
        : 0,
      topEngagedInvestors: investors
        .sort((a, b) => (b.engagementScore || 0) - (a.engagementScore || 0))
        .slice(0, 10),
      recentActivity: investors
        .filter(inv => inv.lastViewedAt || inv.lastEmailSent || inv.lastReplyAt)
        .sort((a, b) => {
          const aDate = Math.max(
            new Date(a.lastViewedAt || 0).getTime(),
            new Date(a.lastEmailSent || 0).getTime(),
            new Date(a.lastReplyAt || 0).getTime()
          );
          const bDate = Math.max(
            new Date(b.lastViewedAt || 0).getTime(),
            new Date(b.lastEmailSent || 0).getTime(),
            new Date(b.lastReplyAt || 0).getTime()
          );
          return bDate - aDate;
        })
        .slice(0, 20)
    };

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error("Error fetching engagement analytics:", error);
    res.status(500).json({ error: "Failed to fetch analytics", details: error.message });
  }
};

// Get deal rooms for a company
exports.getCompanyDealRooms = async (req, res) => {
  try {
    const { companyId } = req.params;
    
    const dealRoomsRef = db.collection('dealRooms');
    const snapshot = await dealRoomsRef.where('companyId', '==', companyId).get();
    
    const dealRooms = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json({
      success: true,
      data: dealRooms
    });
  } catch (error) {
    console.error("Error fetching company deal rooms:", error);
    res.status(500).json({ error: "Failed to fetch deal rooms", details: error.message });
  }
};