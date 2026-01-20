import { NextRequest, NextResponse } from "next/server";
import {
  verifyFirebaseToken,
  verifyAdminOrSubadmin,
} from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";
import { v4 as uuidv4 } from "uuid";
import { getBaseUrl } from "@/lib/env-helper";
import type {
  Campaign,
  CampaignStats,
  CampaignRecipient,
  AggregatedTracking,
} from "@/types";

export async function POST(request: NextRequest) {
  try {
    const user = await verifyFirebaseToken(request);
    verifyAdminOrSubadmin(user);

    const body = await request.json();
    const {
      clientId,
      targetType,
      matchResults,
      emailTemplate,
      scheduleConfig,
    } = body;
 
    if (
      !clientId ||
      !targetType ||
      !matchResults ||
      !emailTemplate ||
      !scheduleConfig
    ) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 },
      );
    }

    // Validate email template content
    if (!emailTemplate.currentSubject || !emailTemplate.currentBody) {
      return NextResponse.json(
        { success: false, message: "Email subject and body are required" },
        { status: 400 },
      );
    }

    console.log(
      "[Campaign Create] Starting campaign creation for client:",
      clientId,
    );

    const clientDoc = await adminDb.collection("clients").doc(clientId).get();

    if (!clientDoc.exists) {
      return NextResponse.json(
        { success: false, message: "Client not found" },
        { status: 404 },
      );
    }

    const clientData = clientDoc.data();
    const clientInfo = clientData?.clientInformation;

    if (!clientInfo) {
      return NextResponse.json(
        { success: false, message: "Client information incomplete" },
        { status: 400 },
      );
    }

    const campaignId = adminDb.collection("campaigns").doc().id;
    const publicToken = uuidv4();
    const currentTimestamp = new Date().toISOString();

    console.log("[Campaign Create] Generated campaign ID:", campaignId);
    console.log("[Campaign Create] Generated public token:", publicToken);
    console.log(
      "[Campaign Create] Instant start mode:",
      scheduleConfig.startInstantly,
    );

    let actualStartDate = scheduleConfig.startDate;
    if (scheduleConfig.startInstantly) {
      const now = new Date();
      actualStartDate = now.toISOString().split("T")[0];
      console.log(
        "[Campaign Create] Instant start - overriding start date to:",
        actualStartDate,
      );
    }

    const initialStats: CampaignStats = {
      totalEmailsSent: 0,
      totalDelivered: 0,
      totalFailed: 0,
      pending: matchResults.totalMatches,

      uniqueOpened: 0,
      totalOpens: 0,
      averageOpensPerPerson: 0,
      openRate: 0,

      uniqueResponded: 0,
      totalResponses: 0,
      responseRate: 0,
      averageResponseTime: 0,

      openedNotReplied: 0,
      deliveredNotOpened: 0,

      conversionFunnel: {
        sent: 0,
        delivered: 0,
        opened: 0,
        replied: 0,
      },

      engagementQuality: {
        openedOnce: 0,
        openedMultiple: 0,
        openedButNoReply: 0,
        deliveredButNoOpen: 0,
      },

      sent: 0,
      delivered: 0,
      opened: 0,
      replied: 0,
      failed: 0,
      deliveryRate: 0,
      replyRate: 0,

      followupCandidates: {
        notOpened48h: 0,
        openedNotReplied72h: 0,
        total: 0,
        readyForFollowup: 0,
      },

      errorBreakdown: {
        AUTH_FAILED: 0,
        INVALID_EMAIL: 0,
        CONNECTION_TIMEOUT: 0,
        QUOTA_EXCEEDED: 0,
        SPAM_BLOCKED: 0,
        SMTP_ERROR: 0,
        UNKNOWN_ERROR: 0,
      },
    };

    const campaignData: Omit<Campaign, "id"> & { id: string } = {
      id: campaignId,
      campaignName: scheduleConfig.campaignName,
      clientId,
      clientName: clientInfo.companyName,
      status: "creating",
      targetType,
      totalRecipients: matchResults.totalMatches,

      emailTemplate: {
        originalSubject: emailTemplate.originalSubject || "",
        currentSubject: emailTemplate.currentSubject || "",
        subjectImproved: emailTemplate.subjectImproved || false,
        originalBody: emailTemplate.originalBody || "",
        currentBody: emailTemplate.currentBody || "",
        currentBodyText: emailTemplate.currentBodyText || "",
        bodyImproved: emailTemplate.bodyImproved || false,
        // Optional: Store attachments if provided (backward compatible)
        ...(emailTemplate.attachments?.length > 0
          ? { attachments: emailTemplate.attachments }
          : {}),
      },

      schedule: {
        startDate: actualStartDate,
        endDate: scheduleConfig.endDate,
        duration: scheduleConfig.duration,
        dailyLimit: scheduleConfig.dailyLimit,
        sendingWindow: {
          start: scheduleConfig.sendingWindow.start,
          end: scheduleConfig.sendingWindow.end,
          timezone: scheduleConfig.sendingWindow.timezone || "Asia/Kolkata",
        },
        pauseOnWeekends: scheduleConfig.pauseOnWeekends || false,
      },

      stats: initialStats,

      publicToken,
      createdBy: user.uid,
      createdAt: currentTimestamp,
      lastUpdated: currentTimestamp,
    };

    // Step 1: Create campaign document with "creating" status
    await adminDb.collection("campaigns").doc(campaignId).set(campaignData);
    console.log(
      "[Campaign Create] Campaign document created with status: creating",
    );

    // Step 2: Generate timestamps
    const { timestamps, errors } = await distributeTimestamps(
      matchResults.matches,
      { ...scheduleConfig, startDate: actualStartDate },
      matchResults,
    );

    if (errors.length > 0) {
      console.error("[Campaign Create] Timestamp distribution errors:", errors);
    }

    console.log("[Campaign Create] Generated timestamps:", timestamps.length);
    if (timestamps.length > 0) {
      console.log("[Campaign Create] First timestamp:", timestamps[0]);
      console.log("[Campaign Create] Current time:", new Date().toISOString());

      const firstTimestamp = new Date(timestamps[0]);
      const now = new Date();
      const diffSeconds = (firstTimestamp.getTime() - now.getTime()) / 1000;
      console.log(
        "[Campaign Create] Time until first send:",
        diffSeconds,
        "seconds",
      );
    }

    // Step 3: Create all recipients in batches
    const batchSize = 500;
    const totalBatches = Math.ceil(matchResults.matches.length / batchSize);

    console.log(
      `[Campaign Create] Creating ${matchResults.matches.length} recipients in ${totalBatches} batches`,
    );

    for (let i = 0; i < totalBatches; i++) {
      const batch = adminDb.batch();
      const start = i * batchSize;
      const end = Math.min(start + batchSize, matchResults.matches.length);

      for (let j = start; j < end; j++) {
        const match = matchResults.matches[j];
        const recipientId = adminDb.collection("campaignRecipients").doc().id;

        const initialAggregatedTracking: AggregatedTracking = {
          everOpened: false,
          totalOpensAcrossAllEmails: 0,
          uniqueOpeners: [],
          everReplied: false,
          uniqueRepliers: [],
          totalRepliesAcrossAllEmails: 0,
          engagementLevel: "none",
          uniqueOpenerCount: 0,
          uniqueReplierCount: 0,
          openerEmailIndex: [],
        };

        const recipientData: Omit<CampaignRecipient, "id"> & { id: string } = {
          id: recipientId,
          campaignId,

          originalContact: {
            name: match.name,
            email: match.email,
            organization: match.organization,
            title: match.title || "",
          },

          recipientType: match.type,
          priority: match.priority,
          matchScore: match.matchScore,
          matchedCriteria: match.matchedCriteria || [],

          emailHistory: [],
          aggregatedTracking: initialAggregatedTracking,

          followUps: {
            totalSent: 0,
            pendingCount: 0,
            lastFollowUpSent: null,
          },

          status: "pending",
          currentStage: "initial",

          scheduledFor: timestamps[j] || currentTimestamp,

          trackingId: uuidv4(),

          retryCount: 0,
          canRetry: true,

          createdAt: currentTimestamp,
          updatedAt: currentTimestamp,
        };

        const recipientRef = adminDb
          .collection("campaignRecipients")
          .doc(recipientId);
        batch.set(recipientRef, recipientData);
      }

      await batch.commit();
      console.log(
        `[Campaign Create] Batch ${
          i + 1
        }/${totalBatches} committed successfully`,
      );
    }

    // Step 4: Create audit log
    await adminDb.collection("campaignAuditLog").add({
      action: "campaign_created",
      campaignId,
      campaignName: scheduleConfig.campaignName,
      performedBy: user.uid,
      performedByRole: user.role || "admin",
      timestamp: currentTimestamp,
      details: {
        clientId,
        clientName: clientInfo.companyName,
        totalRecipients: matchResults.totalMatches,
        targetType,
        startDate: actualStartDate,
        duration: scheduleConfig.duration,
        dailyLimit: scheduleConfig.dailyLimit,
        startInstantly: scheduleConfig.startInstantly || false,
      },
    });

    console.log("[Campaign Create] Audit log created");

    // Step 5: Update campaign status to "active" after all recipients are created
    await adminDb.collection("campaigns").doc(campaignId).update({
      status: "active",
      lastUpdated: new Date().toISOString(),
    });

    console.log("[Campaign Create] Campaign status updated to ACTIVE");

    // Step 6: Trigger instant send if requested
    if (scheduleConfig.startInstantly) {
      console.log(
        "[Campaign Create] Instant start mode - triggering immediate send",
      );

      await adminDb.collection("campaigns").doc(campaignId).update({
        instantTriggered: true,
        instantTriggerTime: currentTimestamp,
      });

      // Add delay to ensure all database writes are committed
      setTimeout(async () => {
        try {
          const baseUrl = getBaseUrl();
          const cronEndpoint = `${baseUrl}/api/cron/send-emails`;
          const cronSecret = process.env.CRON_SECRET;

          console.log(
            "[Campaign Create] Triggering cron job at:",
            cronEndpoint,
          );

          const cronResponse = await fetch(cronEndpoint, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${cronSecret}`,
              "Content-Type": "application/json",
              "x-cron-source": "instant-campaign-trigger",
            },
          });

          if (cronResponse.ok) {
            const cronResult = await cronResponse.json();
            console.log(
              "[Campaign Create] Immediate send triggered successfully:",
              cronResult,
            );
          } else {
            console.error(
              "[Campaign Create] Failed to trigger immediate send:",
              await cronResponse.text(),
            );
          }
        } catch (triggerError: any) {
          console.error(
            "[Campaign Create] Error triggering immediate send:",
            triggerError,
          );
        }
      }, 2000);
    }

    const baseUrl = getBaseUrl();
    const publicReportUrl = `${baseUrl}/campaign-report/${publicToken}`;

    return NextResponse.json({
      success: true,
      message: scheduleConfig.startInstantly
        ? "Campaign activated successfully - emails will start sending in a few moments"
        : "Campaign activated successfully",
      campaignId,
      publicReportUrl,
      data: {
        campaignId,
        campaignName: scheduleConfig.campaignName,
        totalRecipients: matchResults.totalMatches,
        startDate: actualStartDate,
        endDate: scheduleConfig.endDate,
        duration: scheduleConfig.duration,
        firstSendTime: timestamps[0] || actualStartDate,
        publicReportUrl,
        startInstantly: scheduleConfig.startInstantly || false,
        instantSendTriggered: scheduleConfig.startInstantly,
      },
    });
  } catch (error: any) {
    console.error("[Campaign Create] Error occurred:", error);

    if (error.name === "AuthenticationError") {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Campaign activation failed",
        error: error.message,
      },
      { status: 500 },
    );
  }
}

/**
 * Distributes email send timestamps across the campaign duration
 * Handles both instant send mode and scheduled send mode
 */
async function distributeTimestamps(
  matches: any[],
  scheduleConfig: any,
  matchResults: any,
): Promise<{ timestamps: string[]; errors: string[] }> {
  const timestamps: string[] = [];
  const errors: string[] = [];

  try {
    const now = new Date();

    if (scheduleConfig.startInstantly) {
      console.log("[Timestamp Distribution] Instant start mode activated");

      // Start from 30 seconds in the future to allow campaign creation to complete
      const startTime = new Date(now.getTime() + 30000);

      console.log(
        "[Timestamp Distribution] First email scheduled for:",
        startTime.toISOString(),
      );

      // Use 10 second intervals to prevent system overload
      const intervalSeconds = 10;

      for (let i = 0; i < matches.length; i++) {
        const scheduledTime = new Date(
          startTime.getTime() + i * intervalSeconds * 1000,
        );
        timestamps.push(scheduledTime.toISOString());
      }

      console.log(
        "[Timestamp Distribution] Generated",
        timestamps.length,
        "instant timestamps",
      );
      console.log(
        "[Timestamp Distribution] Interval:",
        intervalSeconds,
        "seconds",
      );
      console.log("[Timestamp Distribution] First timestamp:", timestamps[0]);
      console.log(
        "[Timestamp Distribution] Last timestamp:",
        timestamps[timestamps.length - 1],
      );

      const totalSeconds = matches.length * intervalSeconds;
      const totalMinutes = Math.ceil(totalSeconds / 60);
      console.log(
        "[Timestamp Distribution] Estimated completion time:",
        totalMinutes,
        "minutes",
      );

      return { timestamps, errors };
    }

    // Scheduled send mode
    const startDate = new Date(scheduleConfig.startDate);
    const [sendingStartHour, sendingStartMinute] =
      scheduleConfig.sendingWindow.start.split(":").map(Number);
    const [sendingEndHour, sendingEndMinute] = scheduleConfig.sendingWindow.end
      .split(":")
      .map(Number);

    // Calculate window duration in minutes
    const windowMinutes =
      (sendingEndHour - sendingStartHour) * 60 +
      (sendingEndMinute - sendingStartMinute);

    const dailyLimit = scheduleConfig.dailyLimit;

    // Calculate interval: ensure all emails fit within window
    // If dailyLimit is too high for window, we'll hit window end and carry over
    const minutesBetweenEmails = Math.max(
      1,
      Math.floor(windowMinutes / dailyLimit),
    );

    console.log("[Timestamp Distribution] Scheduled mode configuration:");
    console.log(
      `  - Window: ${scheduleConfig.sendingWindow.start} to ${scheduleConfig.sendingWindow.end}`,
    );
    console.log(`  - Window duration: ${windowMinutes} minutes`);
    console.log(`  - Daily limit: ${dailyLimit}`);
    console.log(`  - Interval: ${minutesBetweenEmails} minutes`);

    // Prioritize recipients
    const highPriority = matches.filter((m: any) => m.priority === "high");
    const mediumPriority = matches.filter((m: any) => m.priority === "medium");
    const lowPriority = matches.filter((m: any) => m.priority === "low");
    const orderedMatches = [...highPriority, ...mediumPriority, ...lowPriority];

    // Initialize: Start at window start time on start date
    let currentDate = new Date(startDate);
    let currentTime = new Date(currentDate);
    currentTime.setHours(sendingStartHour, sendingStartMinute, 0, 0);

    // Create window end time for current day
    let windowEndTime = new Date(currentDate);
    windowEndTime.setHours(sendingEndHour, sendingEndMinute, 0, 0);

    let emailsToday = 0;
    let currentDay = 1;

    console.log(
      `[Timestamp Distribution] Day ${currentDay}: Starting at ${currentTime.toISOString()}`,
    );
    console.log(
      `[Timestamp Distribution] Day ${currentDay}: Window ends at ${windowEndTime.toISOString()}`,
    );

    for (let i = 0; i < orderedMatches.length; i++) {
      // CHECK 1: Has window end time passed?
      // CHECK 2: Has daily limit been reached?
      // If either is true, move to next day
      if (currentTime >= windowEndTime || emailsToday >= dailyLimit) {
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);

        // Skip weekends if configured
        if (scheduleConfig.pauseOnWeekends) {
          while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }

        // Reset to window start on new day
        currentTime = new Date(currentDate);
        currentTime.setHours(sendingStartHour, sendingStartMinute, 0, 0);

        // Update window end for new day
        windowEndTime = new Date(currentDate);
        windowEndTime.setHours(sendingEndHour, sendingEndMinute, 0, 0);

        emailsToday = 0;
        currentDay++;

        console.log(
          `[Timestamp Distribution] Day ${currentDay}: Starting at ${currentTime.toISOString()}`,
        );
      }

      // Add small random variance (±30 seconds) to appear more natural
      const variance = (Math.random() - 0.5) * 60 * 1000; // ±30 seconds
      const scheduledTime = new Date(currentTime.getTime() + variance);

      timestamps.push(scheduledTime.toISOString());

      // Move to next slot
      currentTime = new Date(
        currentTime.getTime() + minutesBetweenEmails * 60 * 1000,
      );
      emailsToday++;
    }

    console.log(
      `[Timestamp Distribution] Generated ${timestamps.length} timestamps across ${currentDay} days`,
    );
    console.log("[Timestamp Distribution] First timestamp:", timestamps[0]);
    console.log(
      "[Timestamp Distribution] Last timestamp:",
      timestamps[timestamps.length - 1],
    );
  } catch (error: any) {
    const errorMessage = `Timestamp distribution error: ${error.message}`;
    errors.push(errorMessage);
    console.error("[Timestamp Distribution] Error occurred:", error);
  }

  return { timestamps, errors };
}
