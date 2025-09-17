// Test script to check if live email is working
const LIVE_BACKEND_URL = 'https://your-actual-backend-domain.com'; // Replace with your live URL

async function testLiveEmail() {
  console.log('🧪 Testing Live Email Functionality...\n');
  
  try {
    // Test 1: Check if backend is accessible
    console.log('1. Testing backend accessibility...');
    const healthResponse = await fetch(`${LIVE_BACKEND_URL}/api/healthcheck`);
    console.log(`✅ Backend Status: ${healthResponse.status}`);
    
    if (!healthResponse.ok) {
      throw new Error('Backend not accessible');
    }
    
    // Test 2: Send test email
    console.log('\n2. Sending test email...');
    const emailData = {
      to: 'priyanshusingh99p@gmail.com', // Your email
      subject: 'Live Site Email Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">🎉 Live Email Test Successful!</h2>
          <p>This email was sent from your live deployment.</p>
          <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
          <div style="background: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>✅ Email Service Status:</strong> Working correctly on live site</p>
            <p><strong>🌐 Backend URL:</strong> ${LIVE_BACKEND_URL}</p>
          </div>
          <p>If you received this email, your live email functionality is working!</p>
        </div>
      `
    };
    
    const emailResponse = await fetch(`${LIVE_BACKEND_URL}/api/email/send-direct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData)
    });
    
    const emailResult = await emailResponse.json();
    
    console.log(`Email Response Status: ${emailResponse.status}`);
    console.log('Email Response:', emailResult);
    
    if (emailResponse.ok) {
      console.log('\n✅ SUCCESS: Live email sent successfully!');
      console.log('📧 Check your inbox: priyanshusingh99p@gmail.com');
    } else {
      console.log('\n❌ FAILED: Email sending failed');
      console.log('Error:', emailResult.error || 'Unknown error');
    }
    
  } catch (error) {
    console.log('\n❌ TEST FAILED:', error.message);
    console.log('\n🔍 Troubleshooting:');
    console.log('1. Make sure your backend is deployed and accessible');
    console.log('2. Update LIVE_BACKEND_URL in this script with your actual URL');
    console.log('3. Check if environment variables are set in production');
    console.log('4. Verify Gmail credentials are working');
  }
}

// Instructions for manual testing
console.log('📋 Manual Testing Instructions:');
console.log('1. Update LIVE_BACKEND_URL with your actual backend URL');
console.log('2. Run: node test-live-email.js');
console.log('3. Or test directly in browser console on your live site:');
console.log(`
// Copy this to browser console on your live site:
fetch('/api/email/send-direct', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'priyanshusingh99p@gmail.com',
    subject: 'Live Site Test',
    html: '<h1>Test from live site!</h1><p>Sent at: ' + new Date() + '</p>'
  })
}).then(r => r.json()).then(console.log);
`);

// Run the test
testLiveEmail();