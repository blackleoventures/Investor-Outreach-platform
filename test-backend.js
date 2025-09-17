const fetch = require('node-fetch');

async function testBackend() {
  try {
    console.log('Testing backend connection...');
    
    // Test health check
    const healthResponse = await fetch('http://localhost:5000/api/healthcheck');
    const healthData = await healthResponse.text();
    console.log('Health check:', healthResponse.status, healthData);
    
    // Test email endpoint
    const emailPayload = {
      to: 'test@example.com',
      subject: 'Test Email',
      html: '<p>This is a test email</p>',
      from: 'priyanshusingh99p@gmail.com'
    };
    
    const emailResponse = await fetch('http://localhost:5000/api/email/send-direct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailPayload)
    });
    
    const emailData = await emailResponse.json();
    console.log('Email endpoint:', emailResponse.status, emailData);
    
  } catch (error) {
    console.error('Backend test failed:', error.message);
    console.log('Make sure to start the backend server with: cd backend && npm start');
  }
}

testBackend();