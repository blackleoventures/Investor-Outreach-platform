const nodemailer = require('nodemailer');

class ClientEmailService {
  constructor() {
    this.activeJobs = new Map(); // Track ongoing email jobs
  }

  // Create transporter using client's Gmail credentials
  createClientTransporter(clientEmail, appPassword) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: clientEmail,
        pass: appPassword
      }
    });
  }

  // Send single email to one recipient only
  async sendSingleEmail(transporter, clientEmail, recipientEmail, subject, htmlContent, clientName) {
    const mailOptions = {
      from: `"${clientName}" <${clientEmail}>`,
      to: recipientEmail, // Only one recipient
      subject: subject,
      html: htmlContent,
      replyTo: clientEmail
    };

    return await transporter.sendMail(mailOptions);
  }

  // Send emails sequentially with 1-minute delay
  async sendBulkEmailsSequentially(clientEmail, appPassword, recipients, subject, htmlContent, clientName, jobId) {
    const transporter = this.createClientTransporter(clientEmail, appPassword);
    const results = [];
    const totalEmails = recipients.length;
    
    // Initialize job tracking
    this.activeJobs.set(jobId, {
      total: totalEmails,
      sent: 0,
      failed: 0,
      status: 'running',
      startTime: new Date()
    });

    console.log(`[ClientEmailService] Starting bulk email job ${jobId} for ${totalEmails} recipients`);

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      
      try {
        console.log(`[ClientEmailService] Sending email ${i + 1}/${totalEmails} to ${recipient}`);
        
        const result = await this.sendSingleEmail(
          transporter,
          clientEmail,
          recipient,
          subject,
          htmlContent,
          clientName
        );

        results.push({
          recipient,
          status: 'sent',
          messageId: result.messageId,
          timestamp: new Date()
        });

        // Update job progress
        const job = this.activeJobs.get(jobId);
        job.sent++;
        this.activeJobs.set(jobId, job);

        console.log(`[ClientEmailService] Email sent successfully to ${recipient}`);

        // Wait 1 minute before sending next email (except for last email)
        if (i < recipients.length - 1) {
          console.log(`[ClientEmailService] Waiting 1 minute before next email...`);
          await this.delay(60000); // 1 minute = 60000ms
        }

      } catch (error) {
        console.error(`[ClientEmailService] Failed to send email to ${recipient}:`, error.message);
        
        results.push({
          recipient,
          status: 'failed',
          error: error.message,
          timestamp: new Date()
        });

        // Update job progress
        const job = this.activeJobs.get(jobId);
        job.failed++;
        this.activeJobs.set(jobId, job);
      }
    }

    // Mark job as completed
    const job = this.activeJobs.get(jobId);
    job.status = 'completed';
    job.endTime = new Date();
    this.activeJobs.set(jobId, job);

    console.log(`[ClientEmailService] Bulk email job ${jobId} completed. Sent: ${job.sent}, Failed: ${job.failed}`);

    return {
      jobId,
      totalEmails,
      sent: job.sent,
      failed: job.failed,
      results
    };
  }

  // Get job status
  getJobStatus(jobId) {
    return this.activeJobs.get(jobId) || null;
  }

  // Utility function for delay
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Validate Gmail app password format
  validateAppPassword(appPassword) {
    // App password should be 16 characters
    return appPassword && appPassword.replace(/\s/g, '').length === 16;
  }

  // Validate Gmail email
  validateGmailEmail(email) {
    return email && email.toLowerCase().includes('@gmail.com');
  }
}

module.exports = new ClientEmailService();