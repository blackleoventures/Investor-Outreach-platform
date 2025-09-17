const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000/api';

console.log('🧪 Testing Backend API Endpoints...\n');

// Test data
const testClient = {
  firstName: 'Backend',
  lastName: 'Test',
  email: 'backend@test.com',
  phone: '+1-555-7777',
  companyName: 'Backend Test Corp',
  industry: 'Technology',
  fundingStage: 'Series A',
  location: 'India',
  revenue: '10M',
  investment: '25M'
};

const testCampaign = {
  clientId: 'backend-test-123',
  clientName: 'Backend Test Corp',
  stage: 'Series A',
  location: 'India'
};

async function testEndpoints() {
  console.log('1️⃣ Testing Health Check...');
  try {
    const healthResponse = await fetch(`${BASE_URL}/../healthcheck`);
    const healthData = await healthResponse.text();
    console.log(`✅ Health Check: ${healthResponse.status} - ${healthData}`);
  } catch (error) {
    console.log(`❌ Health Check Failed: ${error.message}`);
  }

  console.log('\n2️⃣ Testing Client Creation...');
  try {
    const clientResponse = await fetch(`${BASE_URL}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testClient)
    });
    
    const clientData = await clientResponse.json();
    console.log(`Status: ${clientResponse.status}`);
    console.log('Response:', JSON.stringify(clientData, null, 2));
    
    if (clientResponse.ok) {
      console.log('✅ Client creation successful');
    } else {
      console.log('❌ Client creation failed');
    }
  } catch (error) {
    console.log(`❌ Client API Error: ${error.message}`);
  }

  console.log('\n3️⃣ Testing Get Clients...');
  try {
    const getClientsResponse = await fetch(`${BASE_URL}/clients`);
    const clientsData = await getClientsResponse.json();
    console.log(`Status: ${getClientsResponse.status}`);
    console.log('Clients count:', clientsData.clients?.length || 0);
    
    if (clientsData.clients?.length > 0) {
      console.log('Sample client:', JSON.stringify(clientsData.clients[0], null, 2));
    }
  } catch (error) {
    console.log(`❌ Get Clients Error: ${error.message}`);
  }

  console.log('\n4️⃣ Testing Campaign Creation...');
  try {
    const campaignResponse = await fetch(`${BASE_URL}/campaign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCampaign)
    });
    
    const campaignData = await campaignResponse.json();
    console.log(`Status: ${campaignResponse.status}`);
    console.log('Response:', JSON.stringify(campaignData, null, 2));
    
    if (campaignResponse.ok) {
      console.log('✅ Campaign creation successful');
    } else {
      console.log('❌ Campaign creation failed');
    }
  } catch (error) {
    console.log(`❌ Campaign API Error: ${error.message}`);
  }

  console.log('\n5️⃣ Testing Get Campaigns...');
  try {
    const getCampaignsResponse = await fetch(`${BASE_URL}/campaign`);
    const campaignsData = await getCampaignsResponse.json();
    console.log(`Status: ${getCampaignsResponse.status}`);
    console.log('Response:', JSON.stringify(campaignsData, null, 2));
  } catch (error) {
    console.log(`❌ Get Campaigns Error: ${error.message}`);
  }

  console.log('\n6️⃣ Testing Matchmaking...');
  try {
    const matchResponse = await fetch(`${BASE_URL}/campaign/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sector: 'Technology',
        stage: 'Series A',
        location: 'India',
        amount: '25M'
      })
    });
    
    const matchData = await matchResponse.json();
    console.log(`Status: ${matchResponse.status}`);
    console.log('Matches:', JSON.stringify(matchData, null, 2));
  } catch (error) {
    console.log(`❌ Matchmaking Error: ${error.message}`);
  }

  console.log('\n📋 Test Summary:');
  console.log('- Check if backend server is running on port 5000');
  console.log('- Verify client data shows revenue as string (10M)');
  console.log('- Verify campaign name format: Backend Test Corp_Series A_Outreach');
  console.log('- Check if data persists in database/storage');
}

// Run tests
testEndpoints().catch(console.error);