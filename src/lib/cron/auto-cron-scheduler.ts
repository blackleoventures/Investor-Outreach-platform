// lib/cron/auto-cron-scheduler.ts
import * as cron from "node-cron";

let isSchedulerStarted = false;
const scheduledTasks: cron.ScheduledTask[] = [];

// Global lock to prevent race conditions
let initializationLock = false;

// Track active cron calls to prevent concurrent execution
const activeCronCalls = new Map<string, boolean>();

export function startAutoCronScheduler() {
  if (initializationLock) {
    console.log(
      "[Cron Scheduler] Initialization in progress, skipping duplicate call",
    );
    return;
  }

  initializationLock = true;

  const isVercel = process.env.VERCEL === "1";

  if (isVercel) {
    console.log("[Cron Scheduler] Running on Vercel platform");
    console.log("[Cron Scheduler] Node-cron disabled, using Vercel Cron Jobs");
    initializationLock = false;
    return;
  }

  // Check if cron jobs are enabled via environment variable
  const cronEnabled = process.env.CRON_ENABLED?.toLowerCase();
  if (
    cronEnabled === "false" ||
    cronEnabled === "stop" ||
    cronEnabled === "0"
  ) {
    console.log(
      "[Cron Scheduler] ⏸️  Cron jobs DISABLED via CRON_ENABLED env variable",
    );
    console.log("[Cron Scheduler] Set CRON_ENABLED=true to enable cron jobs");
    initializationLock = false;
    return;
  }

  if (isSchedulerStarted) {
    console.log(
      "[Cron Scheduler] Scheduler already running, skipping initialization",
    );
    initializationLock = false;
    return;
  }

  try {
    isSchedulerStarted = true;

    const isDev = process.env.NODE_ENV === "development";
    const baseUrl = process.env.NEXT_PUBLIC_DEV_URL || "http://localhost:3000";

    console.log("[Cron Scheduler] Starting cron scheduler");
    console.log("[Cron Scheduler] Environment: LOCAL_DEVELOPMENT");
    console.log("[Cron Scheduler] Base URL:", baseUrl);
    console.log("[Cron Scheduler] Timezone: Asia/Kolkata (IST)");
    console.log("[Cron Scheduler] Timestamp:", new Date().toISOString());

    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("[Cron Scheduler] CRITICAL: CRON_SECRET not configured");
      console.error("[Cron Scheduler] Add CRON_SECRET to your .env.local file");
      initializationLock = false;
      isSchedulerStarted = false;
      return;
    }

    async function callCronEndpoint(endpoint: string, jobName: string) {
      // CRITICAL: Prevent concurrent calls to the same endpoint
      if (activeCronCalls.get(jobName)) {
        console.log("[Cron Scheduler] Job already running, skipping:", jobName);
        return { skipped: true, message: "Job already in progress" };
      }

      // Set active flag
      activeCronCalls.set(jobName, true);

      const startTime = Date.now();

      try {
        console.log("[Cron Scheduler] Triggering job:", jobName);
        console.log("[Cron Scheduler] Endpoint:", endpoint);
        console.log("[Cron Scheduler] Time:", new Date().toISOString());

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout

        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${cronSecret}`,
            "Content-Type": "application/json",
            "x-cron-source": "node-cron-local",
          },
          cache: "no-store",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const data = await response.json();
        const duration = Date.now() - startTime;

        if (response.ok) {
          console.log("[Cron Scheduler] Job completed successfully:", jobName);
          console.log("[Cron Scheduler] Duration:", duration + "ms");
          if (data.summary) {
            console.log(
              "[Cron Scheduler] Summary:",
              JSON.stringify(data.summary),
            );
          }
        } else {
          console.error("[Cron Scheduler] Job failed:", jobName);
          console.error("[Cron Scheduler] Status:", response.status);
          console.error("[Cron Scheduler] Error:", data.error || data.message);
        }

        return data;
      } catch (error: any) {
        const duration = Date.now() - startTime;
        console.error("[Cron Scheduler] Job error:", jobName);
        console.error("[Cron Scheduler] Duration:", duration + "ms");
        console.error("[Cron Scheduler] Message:", error.message);
        return { error: error.message };
      } finally {
        // Always release the lock
        activeCronCalls.delete(jobName);
      }
    }

    // FIREBASE SPARK PLAN LIMITS:
    // - 50K reads/day, 20K writes/day
    // - Each cron run uses ~50-100 reads
    //
    // OPTIMIZED SCHEDULES (to stay under 50K reads/day):
    // - Send Emails: Every 5 mins = 288 runs/day × 100 reads = ~28,800 reads
    // - Check Replies: Every 10 mins = 144 runs/day × 50 reads = ~7,200 reads
    // - Update Stats: Every 15 mins = 96 runs/day × 50 reads = ~4,800 reads
    // TOTAL: ~40,800 reads/day (under 50K limit with buffer)

    const schedules = {
      sendEmails: "*/5 * * * *", // Every 5 minutes (was 1 min - too aggressive)
      checkReplies: "*/10 * * * *", // Every 10 minutes (was 2 min)
      updateStats: "*/15 * * * *", // Every 15 minutes (was 3 min)
    };

    console.log("[Cron Scheduler] Configuring scheduled jobs");

    const sendEmailsTask = cron.schedule(
      schedules.sendEmails,
      () => {
        callCronEndpoint("/api/cron/send-emails", "Send Emails");
      },
      {
        timezone: "Asia/Kolkata",
      },
    );

    const checkRepliesTask = cron.schedule(
      schedules.checkReplies,
      () => {
        callCronEndpoint("/api/cron/check-replies", "Check Replies");
      },
      {
        timezone: "Asia/Kolkata",
      },
    );

    const updateStatsTask = cron.schedule(
      schedules.updateStats,
      () => {
        callCronEndpoint("/api/cron/update-stats", "Update Stats");
      },
      {
        timezone: "Asia/Kolkata",
      },
    );

    scheduledTasks.push(sendEmailsTask, checkRepliesTask, updateStatsTask);

    console.log(
      "[Cron Scheduler] Job: Send Emails - Schedule:",
      schedules.sendEmails,
    );
    console.log(
      "[Cron Scheduler] Job: Check Replies - Schedule:",
      schedules.checkReplies,
    );
    console.log(
      "[Cron Scheduler] Job: Update Stats - Schedule:",
      schedules.updateStats,
    );
    console.log(
      "[Cron Scheduler] Total jobs scheduled:",
      scheduledTasks.length,
    );

    // FIXED: Run initial email send job after 10 seconds (not immediately)
    setTimeout(() => {
      console.log("[Cron Scheduler] Running initial email send job");
      callCronEndpoint("/api/cron/send-emails", "Send Emails (Initial)");
    }, 10000);

    console.log("[Cron Scheduler] Scheduler initialization complete");
    console.log("[Cron Scheduler] Jobs will execute automatically");
  } catch (error: any) {
    console.error("[Cron Scheduler] Initialization error:", error.message);
    isSchedulerStarted = false;
  } finally {
    initializationLock = false;
  }
}

export function stopAllCronJobs() {
  console.log("[Cron Scheduler] Stopping all scheduled tasks");

  scheduledTasks.forEach((task) => {
    try {
      task.stop();
    } catch (error) {
      console.error("[Cron Scheduler] Error stopping task:", error);
    }
  });

  scheduledTasks.length = 0;
  activeCronCalls.clear();
  isSchedulerStarted = false;
  initializationLock = false;

  console.log("[Cron Scheduler] All tasks stopped successfully");
}

export function getCronSchedulerStatus() {
  return {
    isRunning: isSchedulerStarted,
    totalJobs: scheduledTasks.length,
    activeJobs: Array.from(activeCronCalls.keys()),
    environment: process.env.NODE_ENV,
    platform: process.env.VERCEL === "1" ? "vercel" : "local",
    timezone: "Asia/Kolkata (IST)",
    timestamp: new Date().toISOString(),
  };
}

if (typeof process !== "undefined") {
  process.on("SIGTERM", () => {
    console.log("[Cron Scheduler] SIGTERM signal received");
    console.log("[Cron Scheduler] Initiating graceful shutdown");
    stopAllCronJobs();
    process.exit(0);
  });

  process.on("SIGINT", () => {
    console.log("[Cron Scheduler] SIGINT signal received");
    console.log("[Cron Scheduler] Initiating graceful shutdown");
    stopAllCronJobs();
    process.exit(0);
  });
}
