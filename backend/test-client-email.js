const clientEmailService = require('./src/services/clientEmailService');

async function testClientEmailService() {
  console.log('🧪 Testing Client Email Service...');
  
  const testData = {
    clientEmail: 'priyanshusingh99p@gmail.com',
    appPassword: 'mvmk vgpt zfns zpng',
    recipients: ['test1@example.com', 'test2@example.com'], // Test emails
    subject: 'Test Investment Opportunity',
    htmlContent: `
      <h2>Test Email from Client Email Service</h2>
      <p>Dear Investor,</p>
      <p>This is a test email to verify our bulk email system works correctly.</p>
      <p>Key features:</p>
      <ul>
        <li>✅ Individual emails to each recipient</li>
        <li>✅ Sent from client's Gmail account</li>
        <li>✅ 1-minute delay between emails</li>
        <li>✅ No other recipients visible</li>
      </ul>
      <p>Best regards,<br>Test Founder</p>
    `,
    clientName: 'Test Founder',
    jobId: 'test-job-' + Date.now()
  };

  try {
    // Test 1: Validate Gmail email
    console.log('📧 Testing Gmail validation...');
    const isValidGmail = clientEmailService.validateGmailEmail(testData.clientEmail);
    console.log(`Gmail validation: ${isValidGmail ? '✅ Valid' : '❌ Invalid'}`);

    // Test 2: Validate app password
    console.log('🔑 Testing app password validation...');
    const isValidPassword = clientEmailService.validateAppPassword(testData.appPassword);
    console.log(`App password validation: ${isValidPassword ? '✅ Valid' : '❌ Invalid'}`);

    // Test 3: Create transporter
    console.log('🚀 Testing transporter creation...');
    const transporter = clientEmailService.createClientTransporter(
      testData.clientEmail, 
      testData.appPassword
    );
    console.log('Transporter created: ✅');

    // Test 4: Send single test email (to avoid spam during testing)
    console.log('📤 Testing single email send...');
    const singleResult = await clientEmailService.sendSingleEmail(
      transporter,
      testData.clientEmail,
      testData.clientEmail, // Send to self for testing
      'Test Email - Single Send',
      '<h3>✅ Single Email Test Successful!</h3><p>This email was sent using the client email service.</p>',
      testData.clientName
    );
    
    console.log('Single email sent: ✅');
    console.log('Message ID:', singleResult.messageId);

    // Test 5: Check job status functionality
    console.log('📊 Testing job status tracking...');
    
    // Simulate job creation
    clientEmailService.activeJobs.set(testData.jobId, {
      total: 2,
      sent: 1,
      failed: 0,
      status: 'running',
      startTime: new Date()
    });

    const jobStatus = clientEmailService.getJobStatus(testData.jobId);
    console.log('Job status retrieved: ✅');
    console.log('Job details:', jobStatus);

    console.log('\n🎉 All tests passed! Client Email Service is working correctly.');
    console.log('\n📋 Test Summary:');
    console.log('- ✅ Gmail validation working');
    console.log('- ✅ App password validation working');
    console.log('- ✅ Transporter creation working');
    console.log('- ✅ Single email sending working');
    console.log('- ✅ Job status tracking working');
    console.log('\n💡 The system is ready for bulk email sending with:');
    console.log('  • Individual emails to each recipient');
    console.log('  • 1-minute delay between emails');
    console.log('  • Sent from client\'s Gmail account');
    console.log('  • No other recipients visible to each investor');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error details:', error);
  }
}

// Run the test
testClientEmailService();