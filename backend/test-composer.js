require('dotenv').config();
const { sendEmail } = require('./src/services/email.service');
const { v4: uuidv4 } = require('uuid');

async function testComposer() {
  const testData = {
    recipients: [
      'priyanshuchouhan185@gmail.com',
      'priyanshubanna2525@gmail.com'
    ],
    subject: 'Test Subject from Composer',
    message: 'This is a test message from the email composer.\n\nIt should work perfectly!'
  };

  console.log('Testing composer functionality...');
  
  for (const email of testData.recipients) {
    try {
      const messageId = uuidv4();
      const result = await sendEmail({
        to: email,
        from: 'priyanshusingh99p@gmail.com',
        subject: testData.subject,
        html: `<div style="font-family: Arial, sans-serif;">${testData.message.replace(/\n/g, '<br>')}</div>`,
        messageId
      });
      
      console.log(`✅ Sent to ${email}`);
    } catch (error) {
      console.error(`❌ Failed to send to ${email}:`, error.message);
    }
  }
  
  console.log('Composer test completed!');
}

testComposer();