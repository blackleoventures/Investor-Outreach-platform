const cron = require('node-cron');
const scheduledEmailService = require('./scheduledEmail.service');

// Process scheduled emails every minute
const processScheduledEmailsJob = cron.schedule('* * * * *', async () => {
  try {
    console.log('Processing scheduled emails...');
    const results = await scheduledEmailService.processScheduledEmails();
    
    if (results.length > 0) {
      console.log(`Processed ${results.length} scheduled emails:`, results);
    }
  } catch (error) {
    console.error('Error processing scheduled emails:', error);
  }
}, {
  scheduled: false // Don't start automatically
});

// Start the cron job
function startCronJobs() {
  processScheduledEmailsJob.start();
  console.log('Cron jobs started - processing scheduled emails every minute');
}

// Stop the cron job
function stopCronJobs() {
  processScheduledEmailsJob.stop();
  console.log('Cron jobs stopped');
}

module.exports = {
  startCronJobs,
  stopCronJobs,
  processScheduledEmailsJob
};
