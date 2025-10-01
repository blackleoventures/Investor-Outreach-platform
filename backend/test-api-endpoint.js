const fetch = require('node-fetch');

async function testAPIEndpoint() {
  console.log('🧪 Testing Client Email API Endpoint...');
  
  const testPayload = {
    companyId: 'test-company-123',
    investorIds: ['priyanshusingh99p@gmail.com'], // Send to self for testing
    subject: 'API Test - Investment Opportunity',
    htmlContent: `
      <h2>🧪 API Test Email</h2>
      <p>Dear Investor,</p>
      <p>This email was sent via the API endpoint to test:</p>
      <ul>
        <li>✅ Client email service integration</li>
        <li>✅ Individual email delivery</li>
        <li>✅ Proper sender information</li>
      </ul>
      <p>If you received this email, the system is working correctly!</p>
      <p>Best regards,<br>Test Founder</p>
    `
  };

  try {
    console.log('📤 Sending POST request to /api/client-email/send-bulk...');
    
    const response = await fetch('http://localhost:5000/api/client-email/send-bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // Mock auth for testing
      },
      body: JSON.stringify(testPayload)
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ API Test Successful!');
      console.log('📊 Response:', result);
      console.log(`📧 Job ID: ${result.jobId}`);
      console.log(`📈 Total Emails: ${result.totalEmails}`);
      console.log(`⏱️ Estimated Time: ${result.estimatedTime}`);
      
      // Test job status endpoint
      console.log('\n📊 Testing job status endpoint...');
      setTimeout(async () => {
        try {
          const statusResponse = await fetch(`http://localhost:5000/api/client-email/job-status/${result.jobId}`, {
            headers: {
              'Authorization': 'Bearer test-token'
            }
          });
          const statusResult = await statusResponse.json();
          console.log('✅ Job Status Retrieved:', statusResult);
        } catch (statusError) {
          console.log('⚠️ Job status check failed:', statusError.message);
        }
      }, 2000);
      
    } else {
      console.log('❌ API Test Failed');
      console.log('Response:', result);
    }

  } catch (error) {
    console.error('❌ API Test Error:', error.message);
  }
}

testAPIEndpoint();