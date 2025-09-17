require('dotenv').config();
const { sendEmail } = require('../services/email.service');

(async () => {
  try {
    const to = process.env.TEST_TO || 'priyanshuchouhan185@gmail.com';
    const from = process.env.TEST_FROM || process.env.EMAIL_FROM_DEFAULT || 'priyanshusingh99p@gmail.com';
    const subject = 'Live Email Test - Investor Outreach Platform';
    const html = `
      <div style="font-family:Arial,sans-serif;font-size:14px;color:#111">
        <p>Hi,</p>
        <p>This is a live test email sent from the backend script.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p>Regards,<br/>I.O.P</p>
      </div>
    `;
    const messageId = `test-${Date.now()}`;

    const result = await sendEmail({ to, from, subject, html, messageId });
    console.log('Send result:', result);
    if (result?.mock) {
      console.log('Note: Running in MOCK mode. Configure EMAIL_PROVIDER/sendgrid or gmail creds to send live.');
    }
    process.exit(0);
  } catch (e) {
    console.error('Failed to send test email:', e);
    process.exit(1);
  }
})();

