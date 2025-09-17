require('dotenv').config();
const { sendEmail } = require('./src/services/email.service');
const { v4: uuidv4 } = require('uuid');

async function sendToYourEmail() {
  try {
    const messageId = uuidv4();
    const result = await sendEmail({
      to: 'priyanshuchouhan185@gmail.com',
      from: 'priyanshusingh99p@gmail.com',
      subject: 'Test Email - Send Email System Working',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">✅ Email System Test Successful!</h2>
          <p>This email confirms your Send Email system is working correctly.</p>
          <p><strong>Message ID:</strong> ${messageId}</p>
          <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
          <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #4CAF50;">
            <p><strong>✅ System Status:</strong> Email service is fully operational</p>
            <p><strong>📧 From:</strong> priyanshusingh99p@gmail.com</p>
            <p><strong>📬 To:</strong> priyanshuchouhan185@gmail.com</p>
          </div>
          <p>You can now use the dashboard to send emails!</p>
        </div>
      `,
      messageId
    });

    console.log('✅ Email sent to priyanshuchouhan185@gmail.com');
    console.log('Result:', result);
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
  }
}

sendToYourEmail();