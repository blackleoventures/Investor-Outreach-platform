import { NextRequest, NextResponse } from "next/server";
import {
  verifyFirebaseToken,
  verifyAdminOrSubadmin,
} from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";

/**
 * POST /api/campaigns/[id]/reschedule
 *
 * Reschedules all pending recipients for a campaign using the corrected algorithm.
 * Safety measures:
 * - Only admin/subadmin can access
 * - Only touches recipients with status = "pending"
 * - Only reschedules recipients scheduled for TOMORROW or later (not today)
 * - Uses campaign's own sending window settings
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const campaignId = params.id;

    // Authentication & Authorization
    const user = await verifyFirebaseToken(request);
    verifyAdminOrSubadmin(user);

    console.log(`[Reschedule] Starting reschedule for campaign: ${campaignId}`);
    console.log(`[Reschedule] Triggered by: ${user.uid} (${user.role})`);

    // Step 1: Get campaign data
    const campaignDoc = await adminDb
      .collection("campaigns")
      .doc(campaignId)
      .get();
    if (!campaignDoc.exists) {
      return NextResponse.json(
        { success: false, message: "Campaign not found" },
        { status: 404 },
      );
    }

    const campaign = campaignDoc.data();
    if (!campaign) {
      return NextResponse.json(
        { success: false, message: "Campaign data is empty" },
        { status: 404 },
      );
    }

    // Get schedule settings
    const schedule = campaign.schedule;
    if (!schedule?.sendingWindow) {
      return NextResponse.json(
        {
          success: false,
          message: "Campaign has no sending window configured",
        },
        { status: 400 },
      );
    }

    const [sendingStartHour, sendingStartMinute] = schedule.sendingWindow.start
      .split(":")
      .map(Number);
    const [sendingEndHour, sendingEndMinute] = schedule.sendingWindow.end
      .split(":")
      .map(Number);
    const dailyLimit = schedule.dailyLimit || 50;
    const pauseOnWeekends = schedule.pauseOnWeekends || false;
    const timezone = schedule.sendingWindow.timezone || "Asia/Kolkata";

    console.log(
      `[Reschedule] Window: ${schedule.sendingWindow.start} - ${schedule.sendingWindow.end}`,
    );
    console.log(
      `[Reschedule] Daily limit: ${dailyLimit}, Pause weekends: ${pauseOnWeekends}`,
    );

    // Step 2: Get pending recipients scheduled for TOMORROW or later
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    console.log(
      `[Reschedule] Only rescheduling emails from: ${tomorrow.toISOString()}`,
    );

    const pendingRecipientsSnapshot = await adminDb
      .collection("campaignRecipients")
      .where("campaignId", "==", campaignId)
      .where("status", "==", "pending")
      .where("scheduledFor", ">=", tomorrow.toISOString())
      .orderBy("scheduledFor", "asc")
      .get();

    if (pendingRecipientsSnapshot.empty) {
      return NextResponse.json({
        success: true,
        message: "No pending recipients found that need rescheduling",
        stats: { rescheduled: 0, skipped: 0 },
      });
    }

    const pendingRecipients = pendingRecipientsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(
      `[Reschedule] Found ${pendingRecipients.length} recipients to reschedule`,
    );

    // Step 3: Calculate new timestamps using corrected algorithm
    const windowMinutes =
      (sendingEndHour - sendingStartHour) * 60 +
      (sendingEndMinute - sendingStartMinute);
    const minutesBetweenEmails = Math.max(
      1,
      Math.floor(windowMinutes / dailyLimit),
    );

    console.log(
      `[Reschedule] Window: ${windowMinutes} minutes, Interval: ${minutesBetweenEmails} minutes`,
    );

    // Start from tomorrow at window start
    let currentDate = new Date(tomorrow);
    let currentTime = new Date(currentDate);
    currentTime.setHours(sendingStartHour, sendingStartMinute, 0, 0);

    let windowEndTime = new Date(currentDate);
    windowEndTime.setHours(sendingEndHour, sendingEndMinute, 0, 0);

    let emailsToday = 0;
    let currentDay = 1;

    const newTimestamps: {
      recipientId: string;
      oldTime: string;
      newTime: string;
    }[] = [];

    for (let i = 0; i < pendingRecipients.length; i++) {
      // Check if window end passed or daily limit reached
      if (currentTime >= windowEndTime || emailsToday >= dailyLimit) {
        currentDate.setDate(currentDate.getDate() + 1);

        // Skip weekends if configured
        if (pauseOnWeekends) {
          while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }

        currentTime = new Date(currentDate);
        currentTime.setHours(sendingStartHour, sendingStartMinute, 0, 0);

        windowEndTime = new Date(currentDate);
        windowEndTime.setHours(sendingEndHour, sendingEndMinute, 0, 0);

        emailsToday = 0;
        currentDay++;
      }

      // Add small random variance (±30 seconds)
      const variance = (Math.random() - 0.5) * 60 * 1000;
      const scheduledTime = new Date(currentTime.getTime() + variance);

      newTimestamps.push({
        recipientId: pendingRecipients[i].id,
        oldTime: (pendingRecipients[i] as any).scheduledFor,
        newTime: scheduledTime.toISOString(),
      });

      currentTime = new Date(
        currentTime.getTime() + minutesBetweenEmails * 60 * 1000,
      );
      emailsToday++;
    }

    console.log(
      `[Reschedule] Generated ${newTimestamps.length} new timestamps across ${currentDay} days`,
    );
    console.log(`[Reschedule] First: ${newTimestamps[0]?.newTime}`);
    console.log(
      `[Reschedule] Last: ${newTimestamps[newTimestamps.length - 1]?.newTime}`,
    );

    // Step 4: Update recipients in batches
    const BATCH_SIZE = 400; // Firestore limit is 500
    const totalBatches = Math.ceil(newTimestamps.length / BATCH_SIZE);

    for (let i = 0; i < totalBatches; i++) {
      const batch = adminDb.batch();
      const batchItems = newTimestamps.slice(
        i * BATCH_SIZE,
        (i + 1) * BATCH_SIZE,
      );

      for (const item of batchItems) {
        const recipientRef = adminDb
          .collection("campaignRecipients")
          .doc(item.recipientId);
        batch.update(recipientRef, {
          scheduledFor: item.newTime,
          updatedAt: new Date().toISOString(),
          rescheduledAt: new Date().toISOString(),
          rescheduledBy: user.uid,
        });
      }

      await batch.commit();
      console.log(`[Reschedule] Batch ${i + 1}/${totalBatches} committed`);
    }

    // Step 5: Create audit log
    await adminDb.collection("campaignAuditLog").add({
      action: "campaign_rescheduled",
      campaignId,
      performedBy: user.uid,
      performedByRole: user.role,
      timestamp: new Date().toISOString(),
      details: {
        recipientsRescheduled: newTimestamps.length,
        originalFirstTime: newTimestamps[0]?.oldTime,
        originalLastTime: newTimestamps[newTimestamps.length - 1]?.oldTime,
        newFirstTime: newTimestamps[0]?.newTime,
        newLastTime: newTimestamps[newTimestamps.length - 1]?.newTime,
        daysSpread: currentDay,
      },
    });

    console.log(
      `[Reschedule] Complete! ${newTimestamps.length} recipients rescheduled`,
    );

    return NextResponse.json({
      success: true,
      message: `Successfully rescheduled ${newTimestamps.length} recipients`,
      stats: {
        rescheduled: newTimestamps.length,
        daysSpread: currentDay,
        firstEmailAt: newTimestamps[0]?.newTime,
        lastEmailAt: newTimestamps[newTimestamps.length - 1]?.newTime,
      },
    });
  } catch (error: any) {
    console.error("[Reschedule] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Reschedule failed" },
      { status: 500 },
    );
  }
}
