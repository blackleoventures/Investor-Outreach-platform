// Cron Job Logger - Logs all executions to Firestore

import { adminDb } from "@/lib/firebase-admin";
import { getCurrentTimestamp } from "@/lib/utils/date-helper";
import type { CronLog } from "@/types";

/**
 * Log cron job execution to Firestore
 */
export async function logCronExecution(
  jobName: string,
  success: boolean,
  duration: number,
  details: any = {}
): Promise<void> {
  try {
    // Fix 1: Cast NODE_ENV to proper type
    const environment = (process.env.NODE_ENV || "development") as "development" | "production";

    const logEntry: CronLog = {
      jobName,
      success,
      duration,
      details,
      environment,
      timestamp: getCurrentTimestamp(),
    };

    await adminDb.collection("cronLogs").add(logEntry);

    console.log(
      `[Cron Logger] Logged execution: ${jobName} (${
        success ? "success" : "failed"
      }, ${duration}ms)`
    );
  } catch (error: any) {
    console.error("[Cron Logger] Failed to log execution:", error.message);
    // Don't throw - logging failure shouldn't stop the cron job
  }
}

/**
 * Log cron job error
 */
export async function logCronError(
  jobName: string,
  error: Error | string,
  context?: any
): Promise<void> {
  try {
    const errorMessage = typeof error === "string" ? error : error.message;
    const environment = (process.env.NODE_ENV || "development") as "development" | "production";

    await adminDb.collection("cronErrors").add({
      jobName,
      errorMessage,
      errorStack: typeof error === "object" ? error.stack : undefined,
      context: context || {},
      environment,
      timestamp: getCurrentTimestamp(),
    });

    console.error(`[Cron Logger] Logged error: ${jobName} - ${errorMessage}`);
  } catch (logError: any) {
    console.error("[Cron Logger] Failed to log error:", logError.message);
  }
}

/**
 * Get recent cron logs
 */
export async function getRecentCronLogs(
  jobName?: string,
  limit: number = 50
): Promise<CronLog[]> {
  try {
    let query: any = adminDb.collection("cronLogs");

    if (jobName) {
      query = query.where("jobName", "==", jobName);
    }

    const snapshot = await query
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get();

    // Fix 2: Add explicit type for doc parameter
    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    })) as CronLog[];
  } catch (error: any) {
    console.error("[Cron Logger] Failed to fetch logs:", error.message);
    return [];
  }
}

/**
 * Get cron job statistics
 */
export async function getCronJobStats(
  jobName: string,
  hours: number = 24
): Promise<{
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  averageDuration: number;
  successRate: number;
}> {
  try {
    const hoursAgo = new Date();
    hoursAgo.setHours(hoursAgo.getHours() - hours);

    const snapshot = await adminDb
      .collection("cronLogs")
      .where("jobName", "==", jobName)
      .where("timestamp", ">=", hoursAgo.toISOString())
      .get();

    if (snapshot.empty) {
      return {
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        averageDuration: 0,
        successRate: 0,
      };
    }

    let totalDuration = 0;
    let successCount = 0;
    let failCount = 0;

    snapshot.docs.forEach((doc: any) => {
      const data = doc.data();
      totalDuration += data.duration || 0;
      if (data.success) {
        successCount++;
      } else {
        failCount++;
      }
    });

    const totalRuns = snapshot.size;
    const averageDuration = Math.round(totalDuration / totalRuns);
    const successRate = Math.round((successCount / totalRuns) * 100);

    return {
      totalRuns,
      successfulRuns: successCount,
      failedRuns: failCount,
      averageDuration,
      successRate,
    };
  } catch (error: any) {
    console.error("[Cron Logger] Failed to fetch stats:", error.message);
    return {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      averageDuration: 0,
      successRate: 0,
    };
  }
}

/**
 * Clean up old cron logs (older than X days)
 */
export async function cleanupOldCronLogs(
  daysToKeep: number = 30
): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const snapshot = await adminDb
      .collection("cronLogs")
      .where("timestamp", "<", cutoffDate.toISOString())
      .get();

    if (snapshot.empty) {
      console.log("[Cron Logger] No old logs to clean up");
      return 0;
    }

    const batch = adminDb.batch();
    snapshot.docs.forEach((doc: any) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    console.log(`[Cron Logger] Cleaned up ${snapshot.size} old logs`);
    return snapshot.size;
  } catch (error: any) {
    console.error("[Cron Logger] Failed to clean up logs:", error.message);
    return 0;
  }
}
