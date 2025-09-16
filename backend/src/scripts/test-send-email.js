const { sendEmail } = require('../services/email.service');
const { v4: uuidv4 } = require('uuid');

(async () => {
  try {
    const to = process.argv[2] || process.env.TEST_TO;
    const from = process.argv[3] || process.env.TEST_FROM || process.env.EMAIL_FROM_DEFAULT;
    if (!to || !from) {
      console.error('Usage: node src/scripts/test-send-email.js <to> <from>');
      process.exit(1);
    }

    const messageId = uuidv4();
    const subject = 'Test Verification Email';
    const html = `<div style="font-family:Arial,sans-serif;font-size:14px;">
      <p>Hello,</p>
      <p>This is a test email from Send-Email app. If you received this, SMTP/SendGrid is configured.</p>
      <p><a href="https://www.google.com">Sample link</a></p>
    </div>`;

    const res = await sendEmail({ to, from, subject, html, messageId });
    console.log('Sent', res);
    process.exit(0);
  } catch (e) {
    console.error('Failed', e.message);
    process.exit(2);
  }
})();

