require('dotenv').config();
const { sendEmail } = require('./src/services/email.service');
const { v4: uuidv4 } = require('uuid');

const recipients = [
  'priyanshuchouhan185@gmail.com',
  'priyanshubanna2525@gmail.com', 
  'priyanshu101rana@gmail.com',
  'narayanchouhan711@gmail.com',
  'deepikachouhan2025@gmail.com'
];

async function testAllEmails() {
  console.log(`Testing emails to ${recipients.length} recipients...`);
  
  for (let i = 0; i < recipients.length; i++) {
    const email = recipients[i];
    try {
      const messageId = uuidv4();
      const result = await sendEmail({
        to: email,
        from: 'priyanshusingh99p@gmail.com',
        subject: '✅ Email System Test - Mail Delivery Check',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4CAF50;">✅ Email System Working!</h2>
            <p>Hello,</p>
            <p>This is a test email to confirm that our email system is working properly.</p>
            <div style="background: #f0f8ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>📧 From:</strong> priyanshusingh99p@gmail.com</p>
              <p><strong>📬 To:</strong> ${email}</p>
              <p><strong>🕒 Sent:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>🆔 Message ID:</strong> ${messageId}</p>
            </div>
            <p>If you received this email, the system is working correctly! ✅</p>
            <hr style="margin: 20px 0;">
            <p style="font-size: 12px; color: #666;">This is a test email from Send Email System</p>
          </div>
        `,
        messageId
      });
      
      console.log(`✅ Email sent to ${email} - Status: ${result.statusCode}`);
      
      // 1 second delay between emails
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Failed to send to ${email}:`, error.message);
    }
  }
  
  console.log('\n🎉 All test emails sent! Check inboxes.');
}

testAllEmails();