// Test file to verify client and campaign flow
console.log('Testing Client and Campaign Flow...');

// Test 1: Add test client data to localStorage
const testClient = {
  id: Date.now().toString(),
  company_name: 'TestTech Solutions',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@testtech.com',
  phone: '+1-555-0123',
  fund_stage: 'Seed',
  location: 'US',
  industry: 'SaaS',
  revenue: '500K',
  investment_ask: '2M',
  createdAt: new Date().toISOString(),
  archive: false
};

// Add to localStorage
const existingClients = JSON.parse(localStorage.getItem('clients') || '[]');
existingClients.unshift(testClient);
localStorage.setItem('clients', JSON.stringify(existingClients));
console.log('✅ Test client added to localStorage:', testClient.company_name);

// Test 2: Create test campaign
const testCampaign = {
  id: Date.now().toString(),
  name: 'TestTech Solutions_Seed_Outreach',
  clientId: testClient.id,
  clientName: testClient.company_name,
  location: testClient.location,
  type: 'Email',
  status: 'Draft',
  recipients: 0,
  createdAt: new Date().toISOString(),
  audience: [],
  emailTemplate: { subject: '', content: '' }
};

// Add to localStorage
const existingCampaigns = JSON.parse(localStorage.getItem('campaigns') || '[]');
existingCampaigns.unshift(testCampaign);
localStorage.setItem('campaigns', JSON.stringify(existingCampaigns));
console.log('✅ Test campaign added to localStorage:', testCampaign.name);

// Test 3: Verify data
console.log('\n📊 Current Data:');
console.log('Clients in localStorage:', JSON.parse(localStorage.getItem('clients') || '[]').length);
console.log('Campaigns in localStorage:', JSON.parse(localStorage.getItem('campaigns') || '[]').length);

// Test 4: Test API endpoints (if available)
async function testAPI() {
  try {
    // Test client creation
    const clientResponse = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'API',
        lastName: 'Test',
        email: 'api@test.com',
        phone: '+1-555-9999',
        companyName: 'API Test Company',
        industry: 'Testing',
        fundingStage: 'Seed',
        location: 'US',
        revenue: '1M',
        investment: '5M'
      })
    });
    
    if (clientResponse.ok) {
      const clientData = await clientResponse.json();
      console.log('✅ API Client creation successful:', clientData);
    } else {
      console.log('❌ API Client creation failed:', clientResponse.status);
    }

    // Test campaign creation
    const campaignResponse = await fetch('/api/campaign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: 'api-test-123',
        clientName: 'API Test Company',
        stage: 'Seed',
        location: 'US'
      })
    });
    
    if (campaignResponse.ok) {
      const campaignData = await campaignResponse.json();
      console.log('✅ API Campaign creation successful:', campaignData);
    } else {
      console.log('❌ API Campaign creation failed:', campaignResponse.status);
    }

  } catch (error) {
    console.log('❌ API test failed:', error.message);
  }
}

// Run API tests
testAPI();

console.log('\n🔍 To verify:');
console.log('1. Go to /dashboard/all-client - should see TestTech Solutions');
console.log('2. Go to /dashboard/allCampaign - should see TestTech Solutions_Seed_Outreach');
console.log('3. Revenue should show "500K" and Investment Ask should show "2M"');
console.log('4. Data should persist after page refresh');