const fetch = require('node-fetch');

async function testAPI() {
  try {
    console.log('Testing email API endpoint...');
    
    const payload = {
      to: 'priyanshuchouhan185@gmail.com',
      from: 'priyanshusingh99p@gmail.com',
      subject: 'Test from API Endpoint',
      html: '<h2>Test Email</h2><p>This email was sent via API endpoint.</p>'
    };
    
    const response = await fetch('http://localhost:5000/api/email/send-direct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ API Test Successful:', result);
    } else {
      console.log('❌ API Test Failed:', result);
    }
    
  } catch (error) {
    console.error('API Test Error:', error.message);
    console.log('Make sure the backend server is running on port 5000');
  }
}

testAPI();