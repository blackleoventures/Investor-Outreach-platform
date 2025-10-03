const express = require('express');
const { dbHelpers } = require('../config/firebase-db.config');

const router = express.Router();

// Save client data to Firebase (excluding Excel data)
router.post('/clients', async (req, res) => {
  try {
    const clientData = req.body;
    
    // Only save if it's not Excel data
    if (clientData.source === 'excel_import') {
      return res.status(400).json({ 
        error: 'Excel data should not be saved to Firebase',
        message: 'Investors and incubators Excel data is excluded from Firebase storage'
      });
    }
    
    // Save client to Firebase in 'clients' collection
    const savedClient = await dbHelpers.create('clients', {
      ...clientData,
      collection_type: 'client',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    console.log('✅ Client saved to Firebase clients collection:', savedClient.id);
    
    res.json({
      success: true,
      client: savedClient,
      message: 'Client saved to Firebase successfully'
    });
    
  } catch (error) {
    console.error('❌ Error saving client to Firebase:', error);
    res.status(500).json({ 
      error: error.message,
      message: 'Failed to save client to Firebase'
    });
  }
});

// Save campaign data to Firebase
router.post('/campaigns', async (req, res) => {
  try {
    const campaignData = req.body;
    
    // Save campaign to Firebase in 'campaigns' collection
    const savedCampaign = await dbHelpers.create('campaigns', {
      ...campaignData,
      collection_type: 'campaign',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    console.log('✅ Campaign saved to Firebase campaigns collection:', savedCampaign.id);
    
    res.json({
      success: true,
      campaign: savedCampaign,
      message: 'Campaign saved to Firebase successfully'
    });
    
  } catch (error) {
    console.error('❌ Error saving campaign to Firebase:', error);
    res.status(500).json({ 
      error: error.message,
      message: 'Failed to save campaign to Firebase'
    });
  }
});

// Save matchmaking data to Firebase
router.post('/matchmaking', async (req, res) => {
  try {
    const matchData = req.body;
    
    // Save matchmaking results to Firebase in 'matchmaking' collection
    const savedMatch = await dbHelpers.create('matchmaking', {
      ...matchData,
      collection_type: 'matchmaking',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    console.log('✅ Matchmaking data saved to Firebase matchmaking collection:', savedMatch.id);
    
    res.json({
      success: true,
      matchmaking: savedMatch,
      message: 'Matchmaking data saved to Firebase successfully'
    });
    
  } catch (error) {
    console.error('❌ Error saving matchmaking data to Firebase:', error);
    res.status(500).json({ 
      error: error.message,
      message: 'Failed to save matchmaking data to Firebase'
    });
  }
});

// Save reports data to Firebase
router.post('/reports', async (req, res) => {
  try {
    const reportData = req.body;
    
    // Save report to Firebase in 'reports' collection
    const savedReport = await dbHelpers.create('reports', {
      ...reportData,
      collection_type: 'report',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    console.log('✅ Report saved to Firebase reports collection:', savedReport.id);
    
    res.json({
      success: true,
      report: savedReport,
      message: 'Report saved to Firebase successfully'
    });
    
  } catch (error) {
    console.error('❌ Error saving report to Firebase:', error);
    res.status(500).json({ 
      error: error.message,
      message: 'Failed to save report to Firebase'
    });
  }
});

// Get all clients from Firebase
router.get('/clients', async (req, res) => {
  try {
    const clients = await dbHelpers.getAll('clients');
    
    res.json({
      success: true,
      data: clients,
      count: clients.length
    });
    
  } catch (error) {
    console.error('❌ Error getting clients from Firebase:', error);
    res.status(500).json({ 
      error: error.message,
      message: 'Failed to get clients from Firebase'
    });
  }
});

// Get all campaigns from Firebase
router.get('/campaigns', async (req, res) => {
  try {
    const campaigns = await dbHelpers.getAll('campaigns');
    
    res.json({
      success: true,
      data: campaigns,
      count: campaigns.length
    });
    
  } catch (error) {
    console.error('❌ Error getting campaigns from Firebase:', error);
    res.status(500).json({ 
      error: error.message,
      message: 'Failed to get campaigns from Firebase'
    });
  }
});

// Get all matchmaking data from Firebase
router.get('/matchmaking', async (req, res) => {
  try {
    const matchmaking = await dbHelpers.getAll('matchmaking');
    
    res.json({
      success: true,
      data: matchmaking,
      count: matchmaking.length
    });
    
  } catch (error) {
    console.error('❌ Error getting matchmaking data from Firebase:', error);
    res.status(500).json({ 
      error: error.message,
      message: 'Failed to get matchmaking data from Firebase'
    });
  }
});

// Get all reports from Firebase
router.get('/reports', async (req, res) => {
  try {
    const reports = await dbHelpers.getAll('reports');
    
    res.json({
      success: true,
      data: reports,
      count: reports.length
    });
    
  } catch (error) {
    console.error('❌ Error getting reports from Firebase:', error);
    res.status(500).json({ 
      error: error.message,
      message: 'Failed to get reports from Firebase'
    });
  }
});

module.exports = router;