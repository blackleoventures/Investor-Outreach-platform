const fetch = require('node-fetch');

const BACKEND_URL = 'http://localhost:5000/api';

async function testScheduledEmail() {
  console.log('🧪 Testing Scheduled Email Functionality\n');

  try {
    // Test 1: Add a scheduled email
    console.log('1️⃣ Testing: Add scheduled email');
    const scheduleTime = new Date();
    scheduleTime.setMinutes(scheduleTime.getMinutes() + 2); // Schedule 2 minutes from now

    const scheduledEmailData = {
      to: ['test@example.com'],
      subject: 'Test Scheduled Email',
      html: '<p>This is a test scheduled email.</p>',
      scheduleAt: scheduleTime.toISOString(),
      from: 'priyanshusingh99p@gmail.com'
    };

    const addResponse = await fetch(`${BACKEND_URL}/scheduled-emails`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scheduledEmailData)
    });

    if (!addResponse.ok) {
      const errorData = await addResponse.json().catch(() => ({}));
      throw new Error(`Failed to add scheduled email: ${errorData.error || addResponse.statusText}`);
    }

    const addResult = await addResponse.json();
    console.log('✅ Scheduled email added successfully');
    console.log('📧 Email ID:', addResult.scheduledEmail.id);
    console.log('⏰ Scheduled for:', addResult.scheduledEmail.scheduleAt);
    console.log('');

    // Test 2: Get all scheduled emails
    console.log('2️⃣ Testing: Get all scheduled emails');
    const getResponse = await fetch(`${BACKEND_URL}/scheduled-emails`);
    
    if (!getResponse.ok) {
      throw new Error(`Failed to get scheduled emails: ${getResponse.statusText}`);
    }

    const getResult = await getResponse.json();
    console.log('✅ Retrieved scheduled emails');
    console.log('📊 Total scheduled emails:', getResult.emails.length);
    console.log('');

    // Test 3: Get scheduled emails by status
    console.log('3️⃣ Testing: Get scheduled emails by status');
    const statusResponse = await fetch(`${BACKEND_URL}/scheduled-emails?status=scheduled`);
    
    if (!statusResponse.ok) {
      throw new Error(`Failed to get scheduled emails by status: ${statusResponse.statusText}`);
    }

    const statusResult = await statusResponse.json();
    console.log('✅ Retrieved scheduled emails by status');
    console.log('📊 Scheduled emails count:', statusResult.emails.length);
    console.log('');

    // Test 4: Update scheduled email
    console.log('4️⃣ Testing: Update scheduled email');
    const emailId = addResult.scheduledEmail.id;
    const newScheduleTime = new Date();
    newScheduleTime.setMinutes(newScheduleTime.getMinutes() + 5); // Reschedule to 5 minutes from now

    const updateData = {
      scheduleAt: newScheduleTime.toISOString(),
      subject: 'Updated Test Scheduled Email'
    };

    const updateResponse = await fetch(`${BACKEND_URL}/scheduled-emails/${emailId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json().catch(() => ({}));
      throw new Error(`Failed to update scheduled email: ${errorData.error || updateResponse.statusText}`);
    }

    const updateResult = await updateResponse.json();
    console.log('✅ Scheduled email updated successfully');
    console.log('⏰ New schedule time:', updateResult.email.scheduleAt);
    console.log('');

    // Test 5: Process scheduled emails (this will only process emails that are due)
    console.log('5️⃣ Testing: Process scheduled emails');
    const processResponse = await fetch(`${BACKEND_URL}/scheduled-emails/process`, {
      method: 'POST'
    });

    if (!processResponse.ok) {
      const errorData = await processResponse.json().catch(() => ({}));
      throw new Error(`Failed to process scheduled emails: ${errorData.error || processResponse.statusText}`);
    }

    const processResult = await processResponse.json();
    console.log('✅ Processed scheduled emails');
    console.log('📊 Processed count:', processResult.results.length);
    console.log('');

    // Test 6: Remove scheduled email
    console.log('6️⃣ Testing: Remove scheduled email');
    const removeResponse = await fetch(`${BACKEND_URL}/scheduled-emails/${emailId}`, {
      method: 'DELETE'
    });

    if (!removeResponse.ok) {
      const errorData = await removeResponse.json().catch(() => ({}));
      throw new Error(`Failed to remove scheduled email: ${errorData.error || removeResponse.statusText}`);
    }

    const removeResult = await removeResponse.json();
    console.log('✅ Scheduled email removed successfully');
    console.log('🗑️ Removed email ID:', removeResult.email.id);
    console.log('');

    console.log('🎉 All tests passed! Scheduled email functionality is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testScheduledEmail();
