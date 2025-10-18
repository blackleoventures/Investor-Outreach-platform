import * as cron from 'node-cron';
import { getCurrentTimestamp } from '@/lib/utils/date-helper';

let isSchedulerStarted = false;
const scheduledTasks: cron.ScheduledTask[] = [];

// Global flag to prevent duplicate initialization during hot reload
declare global {
  var cronSchedulerInitialized: boolean | undefined;
}

export function startAutoCronScheduler() {
  // Check global flag first 
  if (global.cronSchedulerInitialized) {
    console.log('[Auto Cron] Scheduler already initialized (skipping duplicate)');
    return;
  }

  // Prevent duplicate schedulers
  if (isSchedulerStarted) {
    console.log('[Auto Cron] Scheduler already running');
    return;
  }

  isSchedulerStarted = true;
  global.cronSchedulerInitialized = true;

  const isDev = process.env.NODE_ENV === 'development';
  const baseUrl = isDev
    ? process.env.NEXT_PUBLIC_DEV_URL || 'http://localhost:3000'
    : process.env.NEXT_PUBLIC_PROD_URL|| 'https://your-domain.com';

  console.log(`[Auto Cron] Starting scheduler for ${isDev ? 'DEVELOPMENT' : 'PRODUCTION'}`);
  console.log(`[Auto Cron] Base URL: ${baseUrl}`);

  // Get auth token from environment
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[Auto Cron] CRON_SECRET not configured in environment variables');
    return;
  }

  // Helper function to call cron endpoint
  async function callCronEndpoint(endpoint: string, jobName: string) {
    try {
      console.log(`[Auto Cron] Triggering ${jobName}`);

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${cronSecret}`,
          'Content-Type': 'application/json',
          'x-internal-cron': 'true',
        },
        cache: 'no-store',
      });

      const data = await response.json();

      if (response.ok) {
        console.log(`[Auto Cron] ${jobName} completed successfully:`, data);
      } else {
        console.error(`[Auto Cron] ${jobName} failed:`, data);
      }

      return data;
    } catch (error: any) {
      console.error(`[Auto Cron] ${jobName} error:`, error.message);
      return { error: error.message };
    }
  }

  // ============================================
  // JOB 1: Send Emails - Every 5 minutes
  // ============================================
  const sendEmailsSchedule = isDev ? '*/2 * * * *' : '*/5 * * * *';

  const sendEmailsTask = cron.schedule(sendEmailsSchedule, () => {
    callCronEndpoint('/api/cron/send-emails', 'Send Emails');
  });

  scheduledTasks.push(sendEmailsTask);
  console.log(`[Auto Cron] Scheduled: Send Emails (${sendEmailsSchedule})`);

  // ============================================
  // JOB 2: Check Replies - Every 15 minutes
  // ============================================
  const checkRepliesSchedule = isDev ? '*/5 * * * *' : '*/15 * * * *';

  const checkRepliesTask = cron.schedule(checkRepliesSchedule, () => {
    callCronEndpoint('/api/cron/check-replies', 'Check Replies');
  });

  scheduledTasks.push(checkRepliesTask);
  console.log(`[Auto Cron] Scheduled: Check Replies (${checkRepliesSchedule})`);

  // ============================================
  // JOB 3: Update Stats - Every hour
  // ============================================
  const updateStatsSchedule = isDev ? '*/10 * * * *' : '0 * * * *';

  const updateStatsTask = cron.schedule(updateStatsSchedule, () => {
    callCronEndpoint('/api/cron/update-stats', 'Update Stats');
  });

  scheduledTasks.push(updateStatsTask);
  console.log(`[Auto Cron] Scheduled: Update Stats (${updateStatsSchedule})`);

  // ============================================
  // Optional: Run all jobs immediately on startup (dev only)
  // ============================================
  if (isDev) {
    console.log('[Auto Cron] Running initial jobs for development testing');

    setTimeout(() => {
      console.log('[Auto Cron] Starting initial job run');
      callCronEndpoint('/api/cron/send-emails', 'Send Emails (Initial)');
    }, 5000); // Wait 5 seconds after server start

    setTimeout(() => {
      callCronEndpoint('/api/cron/check-replies', 'Check Replies (Initial)');
    }, 10000); // Wait 10 seconds

    setTimeout(() => {
      callCronEndpoint('/api/cron/update-stats', 'Update Stats (Initial)');
    }, 15000); // Wait 15 seconds
  }

  console.log(`[Auto Cron] All cron jobs scheduled successfully at ${getCurrentTimestamp()}`);
  console.log('[Auto Cron] Jobs will run automatically in the background');
}

// Stop all scheduled tasks
export function stopAllCronJobs() {
  console.log('[Auto Cron] Stopping all scheduled tasks');

  scheduledTasks.forEach(task => {
    task.stop();
  });

  scheduledTasks.length = 0; // Clear the array
  isSchedulerStarted = false;
  global.cronSchedulerInitialized = false;
  
  console.log('[Auto Cron] All cron jobs stopped');
}

// Get scheduler status
export function getCronSchedulerStatus() {
  return {
    isRunning: isSchedulerStarted,
    totalJobs: scheduledTasks.length,
    environment: process.env.NODE_ENV,
    startedAt: getCurrentTimestamp(),
  };
}

// Graceful shutdown handlers
if (typeof process !== 'undefined') {
  process.on('SIGTERM', () => {
    console.log('[Auto Cron] SIGTERM received, shutting down gracefully');
    stopAllCronJobs();
  });

  process.on('SIGINT', () => {
    console.log('[Auto Cron] SIGINT received, shutting down gracefully');
    stopAllCronJobs();
  });
}
