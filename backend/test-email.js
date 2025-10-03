require('dotenv').config();
const { sendEmail } = require('./src/services/email.service');
const { v4: uuidv4 } = require('uuid');

async function testEmail() {
  try {
    const testContent = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#667eea;color:white;padding:20px;text-align:center;">
          <h1 style="margin:0;">TechStartup Inc</h1>
          <p style="margin:5px 0 0;">Investment Opportunity</p>
        </div>
        <div style="padding:20px;">
          <p>Dear Investor,</p>
          <p>I'm reaching out to share an exciting investment opportunity in <strong>TechStartup Inc</strong>, an AI technology company.</p>
          <p>Currently raising <strong>$5M</strong> to accelerate product development and market expansion.</p>
          <p>Best regards,<br>Investment Team</p>
        </div>
      </div>
    `;

    const result = await sendEmail({
      to: 'priyanshuchouhan102@gmail.com',
      from: 'priyanshuchouhan100@gmail.com',
      subject: 'Investment Opportunity - TechStartup Inc',
      html: testContent,
      messageId: uuidv4(),
      companyName: 'TechStartup Inc'
    });

    console.log('✅ Test email sent successfully:', result);
  } catch (error) {
    console.error('❌ Test email failed:', error.message);
  }
}

testEmail();