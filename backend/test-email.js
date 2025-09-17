const { sendEmail } = require('./src/services/email.service');

async function testEmail() {
  try {
    console.log('Testing email sending...');
    
    const result = await sendEmail({
      to: 'priyanshuchouhan185@gmail.com',
      from: 'priyanshusingh99p@gmail.com',
      subject: 'Test Email from Backend',
      html: `
        <h2>Test Email</h2>
        <p>This is a test email from the backend service.</p>
        <p>If you receive this, the email system is working correctly.</p>
        <p>Time: ${new Date().toLocaleString()}</p>
      `,
      messageId: 'test-' + Date.now()
    });
    
    console.log('Email sent successfully:', result);
  } catch (error) {
    console.error('Email sending failed:', error.message);
  }
}

testEmail();