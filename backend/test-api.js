const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Test investors data
const testInvestors = [
  {
    id: 1,
    'Investor Name': 'Sequoia Capital India',
    'Partner Name': 'Shailendra Singh',
    'Partner Email': 'shailendra@sequoiacap.com',
    'Phone Number': '+91-9876543210',
    'Fund Focus (Sectors)': 'Technology, SaaS',
    'Location': 'Bangalore, India'
  },
  {
    id: 2,
    'Investor Name': 'Accel Partners',
    'Partner Name': 'Prashanth Prakash',
    'Partner Email': 'prashanth@accel.com',
    'Phone Number': '+91-9876543211',
    'Fund Focus (Sectors)': 'FinTech, B2B',
    'Location': 'Bangalore, India'
  },
  {
    id: 3,
    'Investor Name': 'Matrix Partners',
    'Partner Name': 'Avnish Bajaj',
    'Partner Email': 'avnish@matrixpartners.com',
    'Phone Number': '+91-9876543212',
    'Fund Focus (Sectors)': 'Consumer, Mobile',
    'Location': 'Delhi, India'
  }
];

// Test incubators data
const testIncubators = [
  {
    id: 1,
    'Incubator Name': 'T-Hub',
    'Partner Name': 'Ravi Narayan',
    'Partner Email': 'ravi@thub.co',
    'Phone Number': '+91-9876543213',
    'Sector Focus': 'Deep Tech',
    'Country': 'India',
    'State/City': 'Hyderabad'
  },
  {
    id: 2,
    'Incubator Name': 'NASSCOM 10000 Startups',
    'Partner Name': 'Prateek Sharma',
    'Partner Email': 'prateek@nasscom.in',
    'Phone Number': '+91-9876543214',
    'Sector Focus': 'Technology',
    'Country': 'India',
    'State/City': 'Noida'
  }
];

// Test email tracking data
const testEmailTracking = {
  campaigns: [
    {
      id: 'campaign-1',
      name: 'Q4 Investor Outreach',
      clientName: 'TechStartup Inc',
      status: 'completed',
      createdAt: new Date().toISOString(),
      metrics: {
        sent: 5,
        delivered: 5,
        failed: 0,
        opened: 3,
        clicked: 1,
        replied: 1,
        openRate: 60,
        clickRate: 20,
        responseRate: 20
      },
      recipients: [
        {
          id: '1',
          firmName: 'Sequoia Capital India',
          contactPerson: 'Shailendra Singh',
          email: 'shailendra@sequoiacap.com',
          status: 'delivered',
          opened: true,
          openedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          clicked: true,
          replied: true,
          repliedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          sector: 'Technology',
          location: 'Bangalore, India'
        },
        {
          id: '2',
          firmName: 'Accel Partners',
          contactPerson: 'Prashanth Prakash',
          email: 'prashanth@accel.com',
          status: 'delivered',
          opened: true,
          openedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          clicked: false,
          replied: false,
          sector: 'FinTech',
          location: 'Bangalore, India'
        }
      ]
    }
  ]
};

// API Routes
app.get('/api/investors', (req, res) => {
  console.log('📊 Investors API called');
  res.json({
    success: true,
    docs: testInvestors,
    total: testInvestors.length
  });
});

app.get('/api/incubators', (req, res) => {
  console.log('🏢 Incubators API called');
  res.json({
    success: true,
    docs: testIncubators,
    total: testIncubators.length
  });
});

app.get('/api/email-tracking/reports', (req, res) => {
  console.log('📧 Email tracking API called');
  res.json(testEmailTracking);
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Backend is working!',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/investors',
      '/api/incubators', 
      '/api/email-tracking/reports'
    ]
  });
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`🚀 Test Backend running on http://localhost:${PORT}`);
  console.log(`📊 Test endpoints:`);
  console.log(`   - http://localhost:${PORT}/api/test`);
  console.log(`   - http://localhost:${PORT}/api/investors`);
  console.log(`   - http://localhost:${PORT}/api/incubators`);
  console.log(`   - http://localhost:${PORT}/api/email-tracking/reports`);
});