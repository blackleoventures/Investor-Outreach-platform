// Direct test of email endpoint
const fetch = require('node-fetch');

// Install node-fetch if not available
if (!fetch) {
  console.log('Installing node-fetch...');
  require('child_process').execSync('npm install node-fetch@2', { stdio: 'inherit' });
}

async function testEmail() {
  try {
    console.log('Testing email endpoint...');
    
    const response = await fetch('http://localhost:5000/api/email/send-direct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: 'priyanshusingh99p@gmail.com',
        subject: 'Direct Test Email',
        html: '<h1>Direct test from Node.js</h1><p>This is a test email sent directly to the backend.</p>'
      })
    });
    
    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', result);
    
    if (response.ok) {
      console.log('✅ Email sent successfully!');
    } else {
      console.log('❌ Email failed:', result.error);
    }
    
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
}

testEmail();