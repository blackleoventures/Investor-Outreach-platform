const fetch = require('node-fetch');

async function testAPI() {
  console.log('🧪 Testing Backend API...\n');
  
  try {
    // Test health check
    console.log('1. Testing health check...');
    const health = await fetch('http://localhost:5000/api/healthcheck');
    console.log(`✅ Health: ${health.status}`);
    
    // Test client creation
    console.log('\n2. Testing client creation...');
    const clientData = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      phone: '+1-555-0123',
      companyName: 'Test Company',
      industry: 'SaaS',
      fundingStage: 'Seed',
      location: 'US',
      revenue: '1.5M',
      investment: '5M'
    };
    
    const clientRes = await fetch('http://localhost:5000/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clientData)
    });
    
    const clientResult = await clientRes.json();
    console.log(`Status: ${clientRes.status}`);
    console.log('Result:', clientResult);
    
    if (clientResult.success) {
      console.log('✅ Client creation successful');
    } else {
      console.log('❌ Client creation failed');
    }
    
    // Test campaign creation
    console.log('\n3. Testing campaign creation...');
    const campaignData = {
      clientId: 'test-123',
      clientName: 'Test Company',
      stage: 'Seed',
      location: 'US'
    };
    
    const campaignRes = await fetch('http://localhost:5000/api/campaign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campaignData)
    });
    
    const campaignResult = await campaignRes.json();
    console.log(`Status: ${campaignRes.status}`);
    console.log('Result:', campaignResult);
    
    if (campaignResult.success) {
      console.log('✅ Campaign creation successful');
      console.log('Campaign name:', campaignResult.campaign.name);
    } else {
      console.log('❌ Campaign creation failed');
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testAPI();