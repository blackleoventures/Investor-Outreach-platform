const { sendEmail } = require('./email.service');
const { v4: uuidv4 } = require('uuid');

// In-memory storage for scheduled emails (in production, use a database)
let scheduledEmails = [];

// Load scheduled emails from localStorage on startup
function loadScheduledEmails() {
  try {
    const stored = process.env.SCHEDULED_EMAILS || '[]';
    scheduledEmails = JSON.parse(stored);
  } catch (error) {
    console.error('Error loading scheduled emails:', error);
    scheduledEmails = [];
  }
}

// Save scheduled emails to localStorage
function saveScheduledEmails() {
  try {
    process.env.SCHEDULED_EMAILS = JSON.stringify(scheduledEmails);
  } catch (error) {
    console.error('Error saving scheduled emails:', error);
  }
}

// Add a scheduled email
function addScheduledEmail(emailData) {
  const scheduledEmail = {
    id: uuidv4(),
    ...emailData,
    createdAt: new Date().toISOString(),
    status: 'scheduled'
  };
  
  scheduledEmails.push(scheduledEmail);
  saveScheduledEmails();
  return scheduledEmail;
}

// Get all scheduled emails
function getScheduledEmails() {
  return scheduledEmails;
}

// Get scheduled email by ID
function getScheduledEmailById(id) {
  return scheduledEmails.find(email => email.id === id);
}

// Update scheduled email
function updateScheduledEmail(id, updates) {
  const index = scheduledEmails.findIndex(email => email.id === id);
  if (index !== -1) {
    scheduledEmails[index] = { ...scheduledEmails[index], ...updates, updatedAt: new Date().toISOString() };
    saveScheduledEmails();
    return scheduledEmails[index];
  }
  return null;
}

// Remove scheduled email
function removeScheduledEmail(id) {
  const index = scheduledEmails.findIndex(email => email.id === id);
  if (index !== -1) {
    const removed = scheduledEmails.splice(index, 1)[0];
    saveScheduledEmails();
    return removed;
  }
  return null;
}

// Process scheduled emails that are due
async function processScheduledEmails() {
  const now = new Date();
  const dueEmails = scheduledEmails.filter(email => {
    return email.status === 'scheduled' && 
           email.scheduleAt && 
           new Date(email.scheduleAt) <= now;
  });

  const results = [];
  
  for (const email of dueEmails) {
    try {
      // Update status to processing
      updateScheduledEmail(email.id, { status: 'processing' });
      
      // Send the email
      const messageId = uuidv4();
      const result = await sendEmail({
        to: email.to.join(', '),
        from: email.from || 'priyanshusingh99p@gmail.com',
        subject: email.subject,
        html: email.html,
        messageId
      });
      
      // Update status to sent
      updateScheduledEmail(email.id, { 
        status: 'sent', 
        sentAt: new Date().toISOString(),
        messageId,
        providerStatus: result.statusCode
      });
      
      results.push({ id: email.id, status: 'sent', messageId });
      console.log(`Scheduled email sent: ${email.id}`);
      
    } catch (error) {
      // Update status to failed
      updateScheduledEmail(email.id, { 
        status: 'failed', 
        error: error.message,
        failedAt: new Date().toISOString()
      });
      
      results.push({ id: email.id, status: 'failed', error: error.message });
      console.error(`Failed to send scheduled email ${email.id}:`, error);
    }
  }
  
  return results;
}

// Get emails by status
function getEmailsByStatus(status) {
  return scheduledEmails.filter(email => email.status === status);
}

// Initialize the service
loadScheduledEmails();

module.exports = {
  addScheduledEmail,
  getScheduledEmails,
  getScheduledEmailById,
  updateScheduledEmail,
  removeScheduledEmail,
  processScheduledEmails,
  getEmailsByStatus
};
