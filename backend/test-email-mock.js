// Mock email test - simulates sending without actual email service
async function testEmailMock() {
  try {
    console.log('=== MOCK EMAIL TEST ===');
    console.log('FROM: priyanshusingh99p@gmail.com');
    console.log('TO: priyanshuchouhan185@gmail.com');
    console.log('SUBJECT: Test Email from Backend');
    console.log('TIME:', new Date().toLocaleString());
    console.log('');
    console.log('EMAIL CONTENT:');
    console.log('---');
    console.log('Subject: Test Email from Backend');
    console.log('');
    console.log('Hi Priyanshu,');
    console.log('');
    console.log('This is a test email from the investor outreach platform.');
    console.log('The email system is configured and ready to send emails.');
    console.log('');
    console.log('Best regards,');
    console.log('Platform Team');
    console.log('---');
    console.log('');
    console.log('✅ EMAIL WOULD BE SENT SUCCESSFULLY');
    console.log('📧 Message ID: mock-' + Date.now());
    console.log('');
    console.log('To enable actual email sending:');
    console.log('1. Set up SendGrid API key in .env file');
    console.log('2. Or configure Gmail app password');
    console.log('3. Update email service configuration');
    
  } catch (error) {
    console.error('Mock email test failed:', error.message);
  }
}

testEmailMock();