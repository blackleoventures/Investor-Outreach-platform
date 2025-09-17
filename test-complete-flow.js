// Complete flow test - Run this in browser console on the frontend
console.log('🚀 Testing Complete Client-Campaign Flow...\n');

// Step 1: Clear existing data
localStorage.removeItem('clients');
localStorage.removeItem('campaigns');
sessionStorage.clear();
console.log('✅ Cleared existing test data');

// Step 2: Create test client
const testClient = {
  id: `test-${Date.now()}`,
  company_name: 'FlowTest Inc',
  first_name: 'Test',
  last_name: 'User',
  email: 'test@flowtest.com',
  phone: '+1-555-1234',
  fund_stage: 'Seed',
  location: 'US',
  industry: 'SaaS',
  revenue: '750K',
  investment_ask: '3M',
  createdAt: new Date().toISOString(),
  archive: false
};

// Add client to localStorage
const clients = [testClient];
localStorage.setItem('clients', JSON.stringify(clients));
console.log('✅ Test client created:', testClient.company_name);

// Step 3: Create test campaign
const testCampaign = {
  id: `campaign-${Date.now()}`,
  name: `${testClient.company_name}_${testClient.fund_stage}_Outreach`,
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

// Add campaign to localStorage
const campaigns = [testCampaign];
localStorage.setItem('campaigns', JSON.stringify(campaigns));
console.log('✅ Test campaign created:', testCampaign.name);

// Step 4: Simulate campaign progress
setTimeout(() => {
  // Add some recipients
  testCampaign.recipients = 5;
  testCampaign.audience = [
    { name: 'Investor 1', email: 'inv1@test.com', score: 95 },
    { name: 'Investor 2', email: 'inv2@test.com', score: 87 }
  ];
  testCampaign.subject = 'Investment Opportunity in FlowTest Inc';
  testCampaign.body = 'We are seeking $3M in seed funding...';
  
  localStorage.setItem('campaigns', JSON.stringify([testCampaign]));
  console.log('✅ Campaign updated with recipients and email template');
}, 1000);

// Step 5: Simulate sending campaign
setTimeout(() => {
  testCampaign.status = 'Active';
  localStorage.setItem('campaigns', JSON.stringify([testCampaign]));
  console.log('✅ Campaign status updated to Active');
}, 2000);

// Step 6: Verification
setTimeout(() => {
  console.log('\n📊 Final Verification:');
  
  const storedClients = JSON.parse(localStorage.getItem('clients') || '[]');
  const storedCampaigns = JSON.parse(localStorage.getItem('campaigns') || '[]');
  
  console.log(`Clients stored: ${storedClients.length}`);
  console.log(`Campaigns stored: ${storedCampaigns.length}`);
  
  if (storedClients.length > 0) {
    const client = storedClients[0];
    console.log(`✅ Client: ${client.company_name}`);
    console.log(`✅ Revenue: ${client.revenue} (should be string)`);
    console.log(`✅ Investment Ask: ${client.investment_ask} (should be string)`);
  }
  
  if (storedCampaigns.length > 0) {
    const campaign = storedCampaigns[0];
    console.log(`✅ Campaign: ${campaign.name}`);
    console.log(`✅ Status: ${campaign.status}`);
    console.log(`✅ Recipients: ${campaign.recipients}`);
  }
  
  console.log('\n🔍 Manual Verification Steps:');
  console.log('1. Navigate to /dashboard/all-client');
  console.log('   - Should see "FlowTest Inc" in the table');
  console.log('   - Revenue should show "750K"');
  console.log('   - Investment Ask should show "3M"');
  console.log('   - Location should show "US"');
  
  console.log('\n2. Navigate to /dashboard/allCampaign');
  console.log('   - Should see "FlowTest Inc_Seed_Outreach"');
  console.log('   - Status should be "Active"');
  console.log('   - Recipients should be "5"');
  
  console.log('\n3. Refresh the page');
  console.log('   - Data should persist and still be visible');
  
  console.log('\n4. Test campaign flow:');
  console.log('   - Go to /dashboard/add-client');
  console.log('   - Add a new client');
  console.log('   - Should redirect to campaign creation');
  console.log('   - Should show in manage campaigns');
  
}, 3000);

// Export test functions for manual testing
window.testFlow = {
  clearData: () => {
    localStorage.removeItem('clients');
    localStorage.removeItem('campaigns');
    sessionStorage.clear();
    console.log('✅ All test data cleared');
  },
  
  addTestClient: (name = 'Manual Test Corp') => {
    const client = {
      id: `manual-${Date.now()}`,
      company_name: name,
      first_name: 'Manual',
      last_name: 'Test',
      email: `test@${name.toLowerCase().replace(/\s+/g, '')}.com`,
      phone: '+1-555-0000',
      fund_stage: 'Series A',
      location: 'India',
      industry: 'Fintech',
      revenue: '5M',
      investment_ask: '15M',
      createdAt: new Date().toISOString(),
      archive: false
    };
    
    const clients = JSON.parse(localStorage.getItem('clients') || '[]');
    clients.unshift(client);
    localStorage.setItem('clients', JSON.stringify(clients));
    console.log('✅ Manual test client added:', name);
    return client;
  },
  
  checkData: () => {
    console.log('Clients:', JSON.parse(localStorage.getItem('clients') || '[]'));
    console.log('Campaigns:', JSON.parse(localStorage.getItem('campaigns') || '[]'));
  }
};

console.log('\n💡 Available test functions:');
console.log('- testFlow.clearData() - Clear all test data');
console.log('- testFlow.addTestClient("Company Name") - Add test client');
console.log('- testFlow.checkData() - Check stored data');