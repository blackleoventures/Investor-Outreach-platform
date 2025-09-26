const nodemailer = require('nodemailer');
require('dotenv').config();

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

console.log('Testing Gmail configuration...');
console.log('Gmail User:', GMAIL_USER);
console.log('App Password configured:', !!GMAIL_APP_PASSWORD);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD
  }
});

async function testEmail() {
  try {
    // Verify connection
    console.log('Verifying connection...');
    await transporter.verify();
    console.log('✅ Gmail connection verified successfully');

    // Send test email
    console.log('Sending test email...');
    const result = await transporter.sendMail({
      from: GMAIL_USER,
      to: 'priyanshuchouhan185@gmail.com',
      subject: 'Test Email from Investor Outreach Platform',
      html: `
        <h2>Test Email</h2>
        <p>This is a test email to verify that the email service is working correctly.</p>
        <p>Sent at: ${new Date().toLocaleString()}</p>
        <p>If you receive this email, the Gmail integration is working properly!</p>
      `
    });

    console.log('✅ Email sent successfully!');
    console.log('Message ID:', result.messageId);
    console.log('Response:', result.response);
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    if (error.code === 'EAUTH') {
      console.error('Authentication failed. Check your Gmail App Password.');
    }
  }
}

testEmail();