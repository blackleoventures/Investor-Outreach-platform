const { sendEmail } = require('./src/services/email.service');

async function testGmail() {
  try {
    console.log('Testing Gmail SMTP...');
    
    const result = await sendEmail({
      to: 'priyanshuchouhan185@gmail.com',
      from: 'priyanshusingh99p@gmail.com',
      subject: 'Test Email via Gmail SMTP',
      html: `
        <h2>Gmail SMTP Test</h2>
        <p>This email was sent using Gmail SMTP with app password.</p>
        <p>Time: ${new Date().toLocaleString()}</p>
        <p>If you receive this, Gmail SMTP is working correctly!</p>
      `,
      messageId: 'gmail-test-' + Date.now()
    });
    
    console.log('Gmail email sent successfully:', result);
  } catch (error) {
    console.error('Gmail email sending failed:', error.message);
    console.log('Make sure you have:');
    console.log('1. Enabled 2FA on Gmail account');
    console.log('2. Generated app password');
    console.log('3. Updated GMAIL_APP_PASSWORD in .env file');
  }
}

testGmail();