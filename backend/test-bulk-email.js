require('dotenv').config();
const { sendEmail } = require('./src/services/email.service');
const { v4: uuidv4 } = require('uuid');

const investors = [
  'priyanshuchouhan185@gmail.com',
  'investor2@example.com',
  'investor3@example.com'
];

async function sendBulkTest() {
  console.log(`Sending to ${investors.length} investors...`);
  
  for (let i = 0; i < investors.length; i++) {
    const email = investors[i];
    try {
      const messageId = uuidv4();
      const result = await sendEmail({
        to: email,
        from: 'priyanshusingh99p@gmail.com',
        subject: 'Investment Opportunity - Bulk Test',
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h2>Investment Opportunity</h2>
            <p>Dear Investor,</p>
            <p>We have an exciting investment opportunity for you.</p>
            <p><strong>Recipient:</strong> ${email}</p>
            <p><strong>Sent:</strong> ${new Date().toLocaleString()}</p>
          </div>
        `,
        messageId
      });
      
      console.log(`✅ Sent to ${email}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Failed to send to ${email}:`, error.message);
    }
  }
  
  console.log('Bulk email test completed!');
}

sendBulkTest();