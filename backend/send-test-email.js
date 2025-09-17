const { sendEmail } = require('./src/services/email.service');
const { v4: uuidv4 } = require('uuid');

async function sendTestEmail() {
  try {
    const messageId = uuidv4();
    const result = await sendEmail({
      to: 'priyanshusingh99p@gmail.com',
      from: 'priyanshusingh99p@gmail.com',
      subject: 'Test Email - Send Email System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Test Email Successful!</h2>
          <p>This is a test email from your Send Email system.</p>
          <p><strong>Message ID:</strong> ${messageId}</p>
          <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>System Status:</strong> ✅ Email service is working correctly</p>
          </div>
        </div>
      `,
      messageId
    });

    console.log('✅ Email sent successfully!');
    console.log('Result:', result);
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
  }
}

sendTestEmail();