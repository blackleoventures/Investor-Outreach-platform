import { NextRequest, NextResponse } from "next/server";
import {
  verifyFirebaseToken,
  verifyAdminOrSubadmin,
} from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";
import { v4 as uuidv4 } from "uuid";
import { getBaseUrl } from "@/lib/env-helper"; // Import the helper

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

    // Validation
    if (
      !clientId ||
      !targetType ||
      !matchResults ||
      !emailTemplate ||
      !scheduleConfig
    ) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log("[Campaign Activation] Starting for client:", clientId);

    // Verify client still exists and is eligible
    const clientDoc = await adminDb.collection("clients").doc(clientId).get();

    if (!clientDoc.exists) {
      return NextResponse.json(
        { success: false, message: "Client not found" },
        { status: 404 }
      );
    }

    const clientData = clientDoc.data();
    const clientInfo = clientData?.clientInformation;

    // Generate campaign ID and public token
    const campaignId = adminDb.collection("campaigns").doc().id;
    const publicToken = uuidv4();

    console.log("[Campaign Activation] Campaign ID:", campaignId);
    console.log("[Campaign Activation] Public Token:", publicToken);

    // Handle instant start
    let actualStartDate = scheduleConfig.startDate;
    if (scheduleConfig.startInstantly) {
      // Set to now + 1 minute
      const now = new Date();
      now.setMinutes(now.getMinutes() + 1);
      actualStartDate = now.toISOString().split("T")[0];
    }

    // Create campaign document
    const campaignData = {
      id: campaignId,
      clientId,
      clientName: clientInfo.companyName,
      campaignName: scheduleConfig.campaignName,
      targetType,
      totalRecipients: matchResults.totalMatches,

      emailTemplate: {
        originalSubject: emailTemplate.originalSubject,
        currentSubject: emailTemplate.currentSubject,
        subjectImproved: emailTemplate.subjectImproved || false,
        originalBody: emailTemplate.originalBody,
        currentBody: emailTemplate.currentBody,
        bodyImproved: emailTemplate.bodyImproved || false,
      },

      schedule: {
        startDate: actualStartDate,
        endDate: scheduleConfig.endDate,
        duration: scheduleConfig.duration,
        dailyLimit: scheduleConfig.dailyLimit,
        sendingWindow: {
          start: scheduleConfig.sendingWindow.start,
          end: scheduleConfig.sendingWindow.end,
          timezone: "Asia/Kolkata",
        },
        pauseOnWeekends: scheduleConfig.pauseOnWeekends || false,
        priorityAllocation: scheduleConfig.priorityAllocation || {
          high: 25,
          medium: 50,
          low: 25,
        },
        startInstantly: scheduleConfig.startInstantly || false,
      },

      status: "active",

      stats: {
        totalRecipients: matchResults.totalMatches,
        sent: 0,
        delivered: 0,
        opened: 0,
        replied: 0,
        failed: 0,
        pending: matchResults.totalMatches,
        openedNotReplied: 0,
        deliveredNotOpened: 0,
        deliveryRate: 0,
        openRate: 0,
        replyRate: 0,
      },

      followUps: {
        totalSent: 0,
        openedNoReplyCandidates: 0,
        deliveredNotOpenedCandidates: 0,
      },

      publicToken,
      createdBy: user.uid,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      lastSentAt: null,
    };

    // Save campaign document
    await adminDb.collection("campaigns").doc(campaignId).set(campaignData);
    console.log("[Campaign Activation] Campaign document created");

    // Calculate timestamp distribution
    const { timestamps, errors } = await distributeTimestamps(
      matchResults.matches,
      { ...scheduleConfig, startDate: actualStartDate },
      matchResults
    );

    if (errors.length > 0) {
      console.error(
        "[Campaign Activation] Timestamp distribution errors:",
        errors
      );
    }

    console.log(
      "[Campaign Activation] Timestamps distributed:",
      timestamps.length
    );

    // Create recipient documents in batches
    const batchSize = 500; // Firestore limit
    const totalBatches = Math.ceil(matchResults.matches.length / batchSize);

    console.log(
      `[Campaign Activation] Creating ${matchResults.matches.length} recipients in ${totalBatches} batches`
    );

    for (let i = 0; i < totalBatches; i++) {
      const batch = adminDb.batch();
      const start = i * batchSize;
      const end = Math.min(start + batchSize, matchResults.matches.length);

      for (let j = start; j < end; j++) {
        const match = matchResults.matches[j];
        const recipientId = adminDb.collection("campaignRecipients").doc().id;

        const recipientData = {
          id: recipientId,
          campaignId,
          recipientType: match.type,

          contactInfo: {
            name: match.name,
            email: match.email,
            organization: match.organization,
          },

          matchScore: match.matchScore,
          priority: match.priority,
          matchedCriteria: match.matchedCriteria,

          trackingId: uuidv4(), // For open tracking

          scheduledFor: timestamps[j] || new Date().toISOString(),

          status: "pending",
          sentAt: null,
          deliveredAt: null,
          openedAt: null,
          repliedAt: null,

          trackingData: {
            opened: false,
            openCount: 0,
            lastOpenedAt: null,
            replied: false,
            replyReceivedAt: null,
          },

          followUpsSent: 0,
          lastFollowUpSentAt: null,

          errorMessage: null,
          failureReason: null,
          retryCount: 0,

          createdAt: new Date().toISOString(),
        };

        const recipientRef = adminDb
          .collection("campaignRecipients")
          .doc(recipientId);
        batch.set(recipientRef, recipientData);
      }

      await batch.commit();
      console.log(
        `[Campaign Activation] Batch ${i + 1}/${totalBatches} created`
      );
    }

    // Create audit log
    await adminDb.collection("campaignAuditLog").add({
      action: "campaign_created",
      campaignId,
      campaignName: scheduleConfig.campaignName,
      performedBy: user.uid,
      performedByRole: user.role || "admin",
      timestamp: new Date().toISOString(),
      details: {
        clientId,
        clientName: clientInfo.companyName,
        totalRecipients: matchResults.totalMatches,
        targetType,
        startDate: actualStartDate,
        duration: scheduleConfig.duration,
        startInstantly: scheduleConfig.startInstantly || false,
      },
    });

    console.log("[Campaign Activation] Audit log created");

    // Generate public report URL using helper (works in dev and prod)
    const baseUrl = getBaseUrl();
    const publicReportUrl = `${baseUrl}/campaign-report/${publicToken}`;

    return NextResponse.json({
      success: true,
      message: "Campaign activated successfully",
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
      },
    });
  } catch (error: any) {
    console.error("[Campaign Activation Error]:", error);

    if (error.name === "AuthenticationError") {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Campaign activation failed",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// Helper function to distribute timestamps
async function distributeTimestamps(
  matches: any[],
  scheduleConfig: any,
  matchResults: any
) {
  const timestamps: string[] = [];
  const errors: string[] = [];

  try {
    const startDate = new Date(scheduleConfig.startDate);

    // If instant start, use current time + 1 minute
    if (scheduleConfig.startInstantly) {
      const now = new Date();
      now.setMinutes(now.getMinutes() + 1);
      startDate.setTime(now.getTime());
    }

    const dailyLimit = scheduleConfig.dailyLimit;
    const sendingStart = scheduleConfig.sendingWindow.start
      .split(":")
      .map(Number);
    const sendingEnd = scheduleConfig.sendingWindow.end.split(":").map(Number);

    const windowMinutes =
      (sendingEnd[0] - sendingStart[0]) * 60 +
      (sendingEnd[1] - sendingStart[1]);
    const minutesBetweenEmails = windowMinutes / dailyLimit;

    // Group by priority
    const highPriority = matches.filter((m: any) => m.priority === "high");
    const mediumPriority = matches.filter((m: any) => m.priority === "medium");
    const lowPriority = matches.filter((m: any) => m.priority === "low");

    let currentDate = new Date(startDate);
    let emailsToday = 0;
    let currentTime = new Date(currentDate);

    // If instant start and within sending window, use current time
    if (scheduleConfig.startInstantly) {
      const currentHour = currentTime.getHours();
      const currentMinute = currentTime.getMinutes();

      // Check if current time is within sending window
      if (currentHour >= sendingStart[0] && currentHour < sendingEnd[0]) {
        currentTime.setHours(currentHour, currentMinute, 0, 0);
      } else {
        // If outside window, start from next day's window start
        currentDate.setDate(currentDate.getDate() + 1);
        currentTime = new Date(currentDate);
        currentTime.setHours(sendingStart[0], sendingStart[1], 0, 0);
      }
    } else {
      currentTime.setHours(sendingStart[0], sendingStart[1], 0, 0);
    }

    // Process in order: high, medium, low
    const orderedMatches = [...highPriority, ...mediumPriority, ...lowPriority];

    for (const match of orderedMatches) {
      // Check if we need to move to next day
      if (emailsToday >= dailyLimit) {
        currentDate.setDate(currentDate.getDate() + 1);

        // Skip weekends if configured
        if (scheduleConfig.pauseOnWeekends) {
          while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }

        currentTime = new Date(currentDate);
        currentTime.setHours(sendingStart[0], sendingStart[1], 0, 0);
        emailsToday = 0;
      }

      // Add slight random variance (±2 minutes)
      const variance = (Math.random() - 0.5) * 4;
      const scheduledTime = new Date(
        currentTime.getTime() + variance * 60 * 1000
      );

      timestamps.push(scheduledTime.toISOString());

      // Move to next time slot
      currentTime = new Date(
        currentTime.getTime() + minutesBetweenEmails * 60 * 1000
      );
      emailsToday++;
    }
  } catch (error: any) {
    errors.push(`Timestamp distribution error: ${error.message}`);
  }

  return { timestamps, errors };
}
