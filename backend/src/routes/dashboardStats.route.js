const express = require('express');
const router = express.Router();
const requireAuth = require('../middlewares/firebaseAuth.middleware');
const {
  getDashboardStats,
  getEmailMonthlyReport,
  getUserActivityReport
} = require('../controllers/dashboardStats.controller');

// Get dashboard statistics
router.get('/stats', requireAuth, getDashboardStats);

// Get email monthly report data
router.get('/email-monthly-report', requireAuth, getEmailMonthlyReport);

// Get user activity report
router.get('/user-activity-report', requireAuth, getUserActivityReport);

// Debug endpoint to test Excel service
router.get('/debug', async (req, res) => {
  try {
    const excelService = require('../services/excel.service');
    
    console.log('🔍 Testing Excel service...');
    
    // Test investors
    let investorsCount = 0;
    let investorsSample = null;
    try {
      const investors = await excelService.readInvestors();
      investorsCount = investors ? investors.length : 0;
      investorsSample = investors && investors.length > 0 ? investors[0] : null;
    } catch (error) {
      console.log('❌ Investors error:', error.message);
    }
    
    // Test incubators  
    let incubatorsCount = 0;
    let incubatorsSample = null;
    try {
      const incubators = await excelService.readIncubators();
      incubatorsCount = incubators ? incubators.length : 0;
      incubatorsSample = incubators && incubators.length > 0 ? incubators[0] : null;
    } catch (error) {
      console.log('❌ Incubators error:', error.message);
    }
    
    res.json({
      success: true,
      debug: {
        investors: {
          count: investorsCount,
          sample: investorsSample,
          hasData: investorsCount > 0
        },
        incubators: {
          count: incubatorsCount, 
          sample: incubatorsSample,
          hasData: incubatorsCount > 0
        }
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
