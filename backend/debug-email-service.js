require('dotenv').config();

console.log('Environment variables:');
console.log('EMAIL_PROVIDER:', process.env.EMAIL_PROVIDER);
console.log('GMAIL_USER:', process.env.GMAIL_USER);
console.log('GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? 'Set' : 'Not set');

const { sendEmail } = require('./src/services/email.service');
const { v4: uuidv4 } = require('uuid');

async function debugEmailService() {
  try {
    const messageId = uuidv4();
    console.log('\nSending email with messageId:', messageId);
    
    const result = await sendEmail({
      to: 'priyanshusingh99p@gmail.com',
      from: 'priyanshusingh99p@gmail.com',
      subject: 'Debug Test Email',
      html: '<h1>Debug Test Email</h1><p>Testing email service debug.</p>',
      messageId
    });

    console.log('✅ Email result:', result);
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
  }
}

debugEmailService();