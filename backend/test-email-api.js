require('dotenv').config();
const fetch = require('node-fetch');

async function testEmailAPI() {
  const baseUrl = 'http://localhost:5000';
  
  // Test direct email sending
  const emailData = {
    to: 'priyanshusingh99p@gmail.com',
    from: 'priyanshusingh99p@gmail.com',
    subject: 'API Test Email',
    html: '<h1>API Test Successful!</h1><p>This email was sent via the API endpoint.</p>'
  };

  try {
    console.log('Testing /api/email/send-direct endpoint...');
    
    const response = await fetch(`${baseUrl}/api/email/send-direct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ API email sent successfully!');
      console.log('Result:', result);
    } else {
      console.log('❌ API request failed:', result);
    }
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
    console.log('Make sure the backend server is running on port 5000');
  }
}

testEmailAPI();