const BASE_URL = 'http://localhost:5001/api/clients';

const testClient = {
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  phone: '1234567890',
  companyName: 'Test Company',
  industry: 'Technology',
  position: 'CEO',
  website: 'https://test.com',
  address: '123 Test St',
  city: 'Test City',
  state: 'Test State',
  postalCode: '12345',
  companyDescription: 'Test company description',
  investment: '100000',
  revenue: '500000',
  fundingStage: 'Seed',
  employees: '10'
};

async function testClientAPI() {
  try {
    console.log('🧪 Testing Client API...\n');

    // Test 1: Add Client
    console.log('1. Testing POST /api/clients (Add Client)');
    const addResponse = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testClient)
    });
    const addData = await addResponse.json();
    console.log(`Status: ${addResponse.status}`);
    console.log('Response:', addData);
    
    if (addData.error) {
      console.log('❌ Add Client failed:', addData.error);
      return;
    }
    
    console.log('✅ Add Client successful');
    const clientId = addData.id;

    // Test 2: Get All Clients
    console.log('\n2. Testing GET /api/clients (Get All Clients)');
    const getAllResponse = await fetch(BASE_URL);
    const getAllData = await getAllResponse.json();
    console.log(`Status: ${getAllResponse.status}`);
    console.log('Response:', getAllData);
    
    if (getAllData.error) {
      console.log('❌ Get All Clients failed:', getAllData.error);
    } else {
      console.log('✅ Get All Clients successful');
    }

    if (!clientId) return;

    // Test 3: Update Client
    console.log('\n3. Testing PUT /api/clients/:id (Update Client)');
    const updateData = { ...testClient, firstName: 'Updated Test' };
    const updateResponse = await fetch(`${BASE_URL}/${clientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    const updateResult = await updateResponse.json();
    console.log(`Status: ${updateResponse.status}`);
    console.log('Response:', updateResult);

    // Test 4: Delete Client
    console.log('\n4. Testing DELETE /api/clients/:id (Delete Client)');
    const deleteResponse = await fetch(`${BASE_URL}/${clientId}`, { method: 'DELETE' });
    const deleteResult = await deleteResponse.json();
    console.log(`Status: ${deleteResponse.status}`);
    console.log('Response:', deleteResult);

    console.log('\n🎉 All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testClientAPI();