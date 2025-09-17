require('dotenv').config();
const nodemailer = require('nodemailer');

async function testGmailDirect() {
  console.log('Gmail User:', process.env.GMAIL_USER);
  console.log('Gmail App Password:', process.env.GMAIL_APP_PASSWORD ? 'Set' : 'Not set');
  console.log('Email Provider:', process.env.EMAIL_PROVIDER);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_USER,
      subject: 'Direct Gmail Test',
      html: '<h1>Gmail SMTP Test Successful!</h1><p>This email was sent directly via Gmail SMTP.</p>'
    });

    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ Failed to send email:', error);
  }
}

testGmailDirect();