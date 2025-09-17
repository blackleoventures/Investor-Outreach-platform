// Simple email test without SendGrid - using nodemailer
const nodemailer = require('nodemailer');

async function testEmailSimple() {
  try {
    console.log('Testing simple email...');
    
    // Create test transporter (using Gmail SMTP)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'priyanshusingh99p@gmail.com',
        pass: 'your-app-password' // You need to set app password in Gmail
      }
    });

    const mailOptions = {
      from: 'priyanshusingh99p@gmail.com',
      to: 'priyanshuchouhan185@gmail.com',
      subject: 'Test Email from Backend - Simple',
      html: `
        <h2>Test Email</h2>
        <p>This is a test email using nodemailer.</p>
        <p>Time: ${new Date().toLocaleString()}</p>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    
  } catch (error) {
    console.error('Email sending failed:', error.message);
    console.log('Note: You need to set up Gmail app password for this to work');
  }
}

testEmailSimple();