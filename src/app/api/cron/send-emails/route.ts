// app/api/cron/send-emails/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyCronRequest, createCronErrorResponse } from "@/lib/cron/auth";
import { adminDb } from "@/lib/firebase-admin";
import nodemailer from "nodemailer";
import { getBaseUrl } from "@/lib/env-helper";
import * as admin from "firebase-admin";
import { getCurrentTimestamp } from "@/lib/utils/date-helper";
import { generateEmailId } from "@/lib/utils/email-helper";
import { decryptAES256 } from "@/lib/encryption";
import {
  markAsDelivered,
  markAsFailed,
} from "@/lib/services/recipient-status-manager";
import {
  categorizeEmailError,
  logError,
  calculateNextRetryTime,
  canRetryError,
} from "@/lib/utils/error-helper";
import type { ErrorCategory } from "@/types";
import { withRetry } from "@/lib/utils/retry-helper";
import {
  campaignCache,
  clientCache,
  activeCheckCache,
  getOrFetch,
} from "@/lib/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Global lock to prevent concurrent executions of the cron job
 */
let isJobRunning = false;
let jobStartTime = 0;

/**
 * Cron job handler for sending both main campaign emails and follow-up emails
 * Runs every 5 minutes to process pending and scheduled emails
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  console.log("[Cron: Send Emails] Job triggered");
  console.log("[Cron: Send Emails] Timestamp:", new Date().toISOString());

  // Prevent concurrent executions
  if (isJobRunning) {
    const runningDuration = Date.now() - jobStartTime;
    console.log("[Cron: Send Emails] Job already running");
    console.log(
      "[Cron: Send Emails] Running duration:",
      runningDuration + "ms"
    );

    // Force unlock if job has been running for more than 4 minutes
    if (runningDuration > 240000) {
      console.log("[Cron: Send Emails] Job timeout detected, forcing unlock");
      isJobRunning = false;
    } else {
      return NextResponse.json({
        success: true,
        message: "Job already in progress",
        skipped: true,
        runningDuration: runningDuration + "ms",
      });
    }
  }

  // Acquire lock
  isJobRunning = true;
  jobStartTime = Date.now();

  try {
    // Verify cron request authorization
    const authResult = verifyCronRequest(request);

    if (!authResult.authorized) {
      console.error("[Cron: Send Emails] Unauthorized request blocked");
      return createCronErrorResponse(authResult.error || "Unauthorized");
    }

    console.log("[Cron: Send Emails] Authentication verified");
    console.log("[Cron: Send Emails] Source:", authResult.source);

    const now = new Date();

    // ============================================
    // FAANG OPTIMIZATION: EARLY EXIT CHECKS
    // ============================================

    // Check 1: Are there ANY active campaigns? (1 read only)
    const hasActiveCampaigns = await getOrFetch(
      activeCheckCache,
      "has_active_campaigns",
      async () => {
        const snapshot = await adminDb
          .collection("campaigns")
          .where("status", "==", "active")
          .limit(1)
          .get();
        return !snapshot.empty;
      }
    );

    if (!hasActiveCampaigns) {
      console.log("[Cron: Send Emails] No active campaigns, skipping");
      isJobRunning = false;
      return NextResponse.json({
        success: true,
        message: "No active campaigns",
        reads: 1,
        duration: Date.now() - startTime + "ms",
      });
    }

    // Check 2: Are there ANY pending recipients? (1 read only)
    const pendingCheckSnapshot = await adminDb
      .collection("campaignRecipients")
      .where("status", "==", "pending")
      .where("scheduledFor", "<=", now.toISOString())
      .limit(1)
      .get();

    if (pendingCheckSnapshot.empty) {
      console.log(
        "[Cron: Send Emails] No pending emails ready, skipping main processing"
      );
      // Continue to follow-ups check
    }

    // ============================================
    // STEP 1: PROCESS MAIN CAMPAIGN EMAILS
    // ============================================

    console.log("\n[Cron: Main Emails] Starting main email processing...");
    console.log("[Cron: Main Emails] Querying pending recipients");

    const recipientsSnapshot = await adminDb
      .collection("campaignRecipients")
      .where("status", "==", "pending")
      .where("scheduledFor", "<=", now.toISOString())
      .orderBy("scheduledFor", "asc")
      .limit(50)
      .get();

    let totalSent = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    const errorBreakdown: Record<ErrorCategory, number> = {
      AUTH_FAILED: 0,
      INVALID_EMAIL: 0,
      CONNECTION_TIMEOUT: 0,
      QUOTA_EXCEEDED: 0,
      SPAM_BLOCKED: 0,
      SMTP_ERROR: 0,
      UNKNOWN_ERROR: 0,
    };

    let campaignGroups: Record<string, any[]> = {};

    if (!recipientsSnapshot.empty) {
      console.log(
        "[Cron: Main Emails] Found recipients:",
        recipientsSnapshot.size
      );

      recipientsSnapshot.forEach((doc) => {
        const data = doc.data();

        if (data.status !== "pending") {
          console.log(
            "[Cron: Main Emails] Skipping non-pending recipient:",
            doc.id
          );
          return;
        }

        if (!campaignGroups[data.campaignId]) {
          campaignGroups[data.campaignId] = [];
        }
        campaignGroups[data.campaignId].push({
          id: doc.id,
          ...data,
        });
      });

      console.log(
        "[Cron: Main Emails] Campaigns to process:",
        Object.keys(campaignGroups).length
      );

      // Process each campaign group
      for (const [campaignId, recipients] of Object.entries(campaignGroups)) {
        console.log(`\n[Cron: Main Emails] Processing campaign: ${campaignId}`);
        console.log(
          `[Cron: Main Emails] Recipients in campaign: ${recipients.length}`
        );

        try {
          const campaignDoc = await adminDb
            .collection("campaigns")
            .doc(campaignId)
            .get();

          if (!campaignDoc.exists) {
            console.error(
              `[Cron: Main Emails] Campaign not found: ${campaignId}`
            );
            continue;
          }

          const campaignData = campaignDoc.data();

          if (!campaignData || campaignData.status !== "active") {
            console.log(
              `[Cron: Main Emails] Campaign not active: ${campaignId}`
            );
            continue;
          }

          const clientDoc = await adminDb
            .collection("clients")
            .doc(campaignData.clientId)
            .get();

          if (!clientDoc.exists) {
            console.error(
              `[Cron: Main Emails] Client not found: ${campaignData.clientId}`
            );
            continue;
          }

          const clientData = clientDoc.data();
          if (!clientData) continue;

          const clientInfo = clientData.clientInformation;
          const smtpConfig = clientInfo?.emailConfiguration;

          if (!smtpConfig || !smtpConfig.smtpHost || !smtpConfig.smtpUsername) {
            console.error(
              `[Cron: Main Emails] Invalid SMTP configuration for campaign: ${campaignId}`
            );
            continue;
          }

          let decryptedPassword: string;
          try {
            decryptedPassword = decryptAES256(smtpConfig.smtpPassword);
            console.log(
              `[Cron: Main Emails] SMTP password decrypted successfully`
            );
          } catch (error: any) {
            console.error(
              `[Cron: Main Emails] Failed to decrypt SMTP password:`,
              error
            );
            continue;
          }

          const transporter = nodemailer.createTransport({
            host: smtpConfig.smtpHost,
            port: parseInt(smtpConfig.smtpPort),
            secure: smtpConfig.smtpSecurity === "SSL",
            auth: {
              user: smtpConfig.smtpUsername,
              pass: decryptedPassword,
            },
            tls: {
              rejectUnauthorized: smtpConfig.smtpSecurity !== "None",
            },
          });

          try {
            await transporter.verify();
            console.log(
              `[Cron: Main Emails] SMTP connection verified successfully`
            );
          } catch (error: any) {
            console.error(`[Cron: Main Emails] SMTP verification failed`);
            logError("SMTP Verification", error, { campaignId });
            continue;
          }

          let campaignSent = 0;
          let campaignFailed = 0;
          let campaignSkipped = 0;

          for (const recipient of recipients) {
            try {
              const recipientRef = adminDb
                .collection("campaignRecipients")
                .doc(recipient.id);

              // Use transaction to prevent duplicate sends
              const transactionResult = await adminDb.runTransaction(
                async (transaction) => {
                  const freshRecipientDoc = await transaction.get(recipientRef);

                  if (!freshRecipientDoc.exists) {
                    return { skip: true, reason: "deleted" };
                  }

                  const freshData = freshRecipientDoc.data();

                  // Verify recipient is still in pending status
                  if (freshData!.status !== "pending") {
                    return { skip: true, reason: "status_changed" };
                  }

                  // Check for duplicate sends within last 5 minutes
                  if (
                    freshData!.emailHistory &&
                    freshData!.emailHistory.length > 0
                  ) {
                    const lastEmail =
                      freshData!.emailHistory[
                        freshData!.emailHistory.length - 1
                      ];
                    const timeSinceLastSend =
                      Date.now() - new Date(lastEmail.sentAt).getTime();

                    if (timeSinceLastSend < 300000) {
                      return { skip: true, reason: "duplicate_prevention" };
                    }
                  }

                  // Mark as processing to prevent concurrent processing
                  transaction.update(recipientRef, {
                    status: "processing",
                    processingStartedAt: new Date().toISOString(),
                  });

                  return { skip: false };
                }
              );

              if (transactionResult.skip) {
                campaignSkipped++;
                totalSkipped++;
                continue;
              }

              const emailId = generateEmailId();
              const recipientEmail = recipient.originalContact?.email || "";
              const recipientName = recipient.originalContact?.name || "";
              const recipientOrganization =
                recipient.originalContact?.organization || "";

              if (!recipientEmail) {
                throw new Error("Recipient email is missing");
              }

              console.log(`[Cron: Main Emails] Sending to: ${recipientEmail}`);

              const personalizedSubject = personalizeText(
                campaignData.emailTemplate?.currentSubject || "",
                recipientName,
                recipientOrganization,
                clientInfo
              );

              const personalizedBody = personalizeText(
                campaignData.emailTemplate?.currentBody || "",
                recipientName,
                recipientOrganization,
                clientInfo
              );

              const baseUrl = getBaseUrl();
              const trackingPixelUrl = `${baseUrl}/api/track/open/${recipient.trackingId}`;
              const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;opacity:0" alt="" />`;

              const htmlBody = convertToHtml(personalizedBody) + trackingPixel;

              // FAANG: Exponential backoff retry for transient failures
              const info = await withRetry(
                () =>
                  transporter.sendMail({
                    from: `${clientInfo.founderName} <${
                      smtpConfig.senderEmail || clientInfo.email
                    }>`,
                    to: recipientEmail,
                    subject: personalizedSubject,
                    html: htmlBody,
                    text: stripHtml(personalizedBody),
                  }),
                { maxRetries: 3, baseDelay: 1000, maxDelay: 5000 }
              );

              if (info.accepted && info.accepted.length > 0) {
                await markAsDelivered(
                  recipient.id,
                  emailId,
                  personalizedSubject
                );
                campaignSent++;
                totalSent++;
                console.log(
                  `[Cron: Main Emails] Email sent successfully: ${recipientEmail}`
                );
              } else {
                throw new Error("Email rejected by server");
              }
            } catch (error: any) {
              const recipientEmail =
                recipient.originalContact?.email || "unknown@email.com";

              console.error(
                `[Cron: Main Emails] Send failed for: ${recipientEmail}`
              );
              logError("Email Send", error, {
                recipientId: recipient.id,
                recipientEmail,
                campaignId,
              });

              const retryAttempt = (recipient.retryCount || 0) + 1;

              await markAsFailed(
                recipient.id,
                error,
                recipientEmail,
                campaignId,
                retryAttempt
              );

              campaignFailed++;
              totalFailed++;

              const errorCategory = categorizeEmailError(error);
              errorBreakdown[errorCategory]++;

              // Schedule retry if eligible
              if (retryAttempt < 3 && canRetryError(errorCategory)) {
                const nextRetryTime = calculateNextRetryTime(retryAttempt);

                await adminDb
                  .collection("campaignRecipients")
                  .doc(recipient.id)
                  .update({
                    status: "pending",
                    scheduledFor: nextRetryTime.toISOString(),
                  });

                console.log(
                  `[Cron: Main Emails] Retry scheduled for attempt ${retryAttempt}`
                );
              }
            }
          }

          // Update campaign statistics
          const statsUpdate: any = {
            "stats.sent": admin.firestore.FieldValue.increment(campaignSent),
            "stats.delivered":
              admin.firestore.FieldValue.increment(campaignSent),
            "stats.totalEmailsSent":
              admin.firestore.FieldValue.increment(campaignSent),
            "stats.totalDelivered":
              admin.firestore.FieldValue.increment(campaignSent),
            "stats.pending": admin.firestore.FieldValue.increment(
              -(campaignSent + campaignFailed)
            ),
            "stats.failed":
              admin.firestore.FieldValue.increment(campaignFailed),
            "stats.totalFailed":
              admin.firestore.FieldValue.increment(campaignFailed),
            "stats.deliveredNotOpened":
              admin.firestore.FieldValue.increment(campaignSent),
            "stats.conversionFunnel.sent":
              admin.firestore.FieldValue.increment(campaignSent),
            "stats.conversionFunnel.delivered":
              admin.firestore.FieldValue.increment(campaignSent),
            lastSentAt: getCurrentTimestamp(),
            lastUpdated: getCurrentTimestamp(),
          };

          await adminDb
            .collection("campaigns")
            .doc(campaignId)
            .update(statsUpdate);

          console.log(`[Cron: Main Emails] Campaign stats updated`);
          console.log(`[Cron: Main Emails] Sent: ${campaignSent}`);
          console.log(`[Cron: Main Emails] Failed: ${campaignFailed}`);
          console.log(`[Cron: Main Emails] Skipped: ${campaignSkipped}`);

          transporter.close();
        } catch (error: any) {
          console.error(
            `[Cron: Main Emails] Campaign processing error:`,
            campaignId
          );
          logError("Campaign Processing", error, { campaignId });
        }
      }
    } else {
      console.log("[Cron: Main Emails] No pending main emails found");
    }

    console.log(`\n[Cron: Main Emails] Main email processing completed`);
    console.log(`[Cron: Main Emails] Total sent: ${totalSent}`);
    console.log(`[Cron: Main Emails] Total failed: ${totalFailed}`);
    console.log(`[Cron: Main Emails] Total skipped: ${totalSkipped}`);

    // ============================================
    // STEP 2: PROCESS FOLLOW-UP EMAILS
    // ============================================

    console.log("\n[Cron: Follow-ups] Starting follow-up email processing...");

    let followupsSent = 0;
    let followupsFailed = 0;
    let followupsSkipped = 0;

    try {
      console.log("[Cron: Follow-ups] Querying queued follow-ups");
      const queuedFollowups = await adminDb
        .collection("followupEmails")
        .where("status", "==", "queued")
        .limit(50)
        .get();

      console.log(
        `[Cron: Follow-ups] Found ${queuedFollowups.size} queued follow-ups`
      );

      console.log("[Cron: Follow-ups] Querying scheduled follow-ups");
      const allScheduledFollowups = await adminDb
        .collection("followupEmails")
        .where("status", "==", "scheduled")
        .limit(100)
        .get();

      // Filter scheduled follow-ups by time in-memory to avoid composite index requirement
      const scheduledFollowupsReady = allScheduledFollowups.docs
        .filter((doc) => {
          const followup = doc.data();
          const scheduledTime = new Date(followup.scheduledFor);
          const isReady = scheduledTime <= now;

          if (isReady) {
            console.log(
              `[Cron: Follow-ups] Ready: ${followup.followupId} (scheduled for ${followup.scheduledFor})`
            );
          }

          return isReady;
        })
        .slice(0, 50);

      console.log(
        `[Cron: Follow-ups] Found ${scheduledFollowupsReady.length} scheduled follow-ups ready to send`
      );

      const followupsToSend = [
        ...queuedFollowups.docs,
        ...scheduledFollowupsReady,
      ];

      console.log(
        `[Cron: Follow-ups] Total follow-ups to process: ${followupsToSend.length}`
      );

      if (followupsToSend.length === 0) {
        console.log("[Cron: Follow-ups] No follow-ups to send");
      }

      for (const followupDoc of followupsToSend) {
        try {
          const followup = followupDoc.data();

          console.log(
            `\n[Cron: Follow-ups] Processing follow-up: ${followup.followupId}`
          );

          // Use transaction to prevent duplicate sends
          const followupRef = adminDb
            .collection("followupEmails")
            .doc(followupDoc.id);

          const transactionResult = await adminDb.runTransaction(
            async (transaction) => {
              const freshFollowupDoc = await transaction.get(followupRef);

              if (!freshFollowupDoc.exists) {
                console.log(
                  `[Cron: Follow-ups] Follow-up deleted during processing`
                );
                return { skip: true, reason: "deleted" };
              }

              const freshData = freshFollowupDoc.data();

              // Verify follow-up is still in sendable state
              if (
                freshData!.status !== "queued" &&
                freshData!.status !== "scheduled"
              ) {
                console.log(
                  `[Cron: Follow-ups] Follow-up status changed: ${
                    freshData!.status
                  } (was ${followup.status})`
                );
                return {
                  skip: true,
                  reason: "status_changed",
                  currentStatus: freshData!.status,
                };
              }

              // Mark as processing to prevent concurrent processing
              transaction.update(followupRef, {
                status: "processing",
                processingStartedAt: getCurrentTimestamp(),
              });

              return { skip: false, data: freshData };
            }
          );

          if (transactionResult.skip) {
            if (transactionResult.currentStatus === "sent") {
              console.log(`[Cron: Follow-ups] Already sent, skipping`);
            }
            followupsSkipped++;
            continue;
          }

          const followupData = transactionResult.data!;

          console.log(
            `[Cron: Follow-ups] Verifying recipient status for: ${followupData.recipientId}`
          );

          const recipientDoc = await adminDb
            .collection("campaignRecipients")
            .doc(followupData.recipientId)
            .get();

          if (!recipientDoc.exists) {
            console.log(
              `[Cron: Follow-ups] Recipient not found, marking follow-up as failed`
            );
            await followupRef.update({
              status: "failed",
              errorMessage: "Recipient not found",
              updatedAt: getCurrentTimestamp(),
              processingStartedAt: null,
            });
            followupsFailed++;
            continue;
          }

          const recipientData = recipientDoc.data();

          // Only send follow-up if main email was successfully sent
          if (
            recipientData!.status === "pending" ||
            recipientData!.status === "processing"
          ) {
            console.log(
              `[Cron: Follow-ups] Skipping - main email not sent yet (status: ${
                recipientData!.status
              })`
            );

            // Revert status back to original state
            await followupRef.update({
              status: followupData.status,
              processingStartedAt: null,
            });

            followupsSkipped++;
            continue;
          }

          // Verify recipient has email history
          if (
            !recipientData!.emailHistory ||
            recipientData!.emailHistory.length === 0
          ) {
            console.log(`[Cron: Follow-ups] Skipping - no email history found`);

            // Revert status back to original state
            await followupRef.update({
              status: followupData.status,
              processingStartedAt: null,
            });

            followupsSkipped++;
            continue;
          }

          console.log(
            `[Cron: Follow-ups] Recipient verified - proceeding with follow-up`
          );

          const campaignDoc = await adminDb
            .collection("campaigns")
            .doc(followupData.campaignId)
            .get();

          if (!campaignDoc.exists) {
            console.error(
              `[Cron: Follow-ups] Campaign not found: ${followupData.campaignId}`
            );
            await followupRef.update({
              status: "failed",
              errorMessage: "Campaign not found",
              updatedAt: getCurrentTimestamp(),
              processingStartedAt: null,
            });
            followupsFailed++;
            continue;
          }

          const campaignData = campaignDoc.data();
          if (!campaignData) {
            await followupRef.update({
              status: "failed",
              errorMessage: "Campaign has no data",
              updatedAt: getCurrentTimestamp(),
              processingStartedAt: null,
            });
            followupsFailed++;
            continue;
          }

          const clientDoc = await adminDb
            .collection("clients")
            .doc(campaignData.clientId)
            .get();

          if (!clientDoc.exists) {
            console.error(
              `[Cron: Follow-ups] Client not found: ${campaignData.clientId}`
            );
            await followupRef.update({
              status: "failed",
              errorMessage: "Client not found",
              updatedAt: getCurrentTimestamp(),
              processingStartedAt: null,
            });
            followupsFailed++;
            continue;
          }

          const clientData = clientDoc.data();
          if (!clientData) {
            await followupRef.update({
              status: "failed",
              errorMessage: "Client has no data",
              updatedAt: getCurrentTimestamp(),
              processingStartedAt: null,
            });
            followupsFailed++;
            continue;
          }

          const clientInfo = clientData.clientInformation;
          const smtpConfig = clientInfo?.emailConfiguration;

          if (!smtpConfig || !smtpConfig.smtpHost || !smtpConfig.smtpUsername) {
            console.error(`[Cron: Follow-ups] Invalid SMTP configuration`);
            await followupRef.update({
              status: "failed",
              errorMessage: "Invalid SMTP configuration",
              updatedAt: getCurrentTimestamp(),
              processingStartedAt: null,
            });
            followupsFailed++;
            continue;
          }

          let decryptedPassword: string;
          try {
            decryptedPassword = decryptAES256(smtpConfig.smtpPassword);
          } catch (error: any) {
            console.error(
              `[Cron: Follow-ups] Failed to decrypt SMTP password:`,
              error
            );
            await followupRef.update({
              status: "failed",
              errorMessage: "Failed to decrypt SMTP password",
              updatedAt: getCurrentTimestamp(),
              processingStartedAt: null,
            });
            followupsFailed++;
            continue;
          }

          const transporter = nodemailer.createTransport({
            host: smtpConfig.smtpHost,
            port: parseInt(smtpConfig.smtpPort),
            secure: smtpConfig.smtpSecurity === "SSL",
            auth: {
              user: smtpConfig.smtpUsername,
              pass: decryptedPassword,
            },
            tls: {
              rejectUnauthorized: smtpConfig.smtpSecurity !== "None",
            },
          });

          try {
            await transporter.verify();
            console.log(`[Cron: Follow-ups] SMTP connection verified`);
          } catch (error: any) {
            console.error(
              `[Cron: Follow-ups] SMTP verification failed:`,
              error
            );
            await followupRef.update({
              status: "failed",
              errorMessage: error.message,
              updatedAt: getCurrentTimestamp(),
              processingStartedAt: null,
            });
            followupsFailed++;
            transporter.close();
            continue;
          }

          const personalizedSubject = personalizeText(
            followupData.subject,
            followupData.recipientName,
            followupData.recipientOrganization,
            clientInfo
          );

          const personalizedBody = personalizeText(
            followupData.body,
            followupData.recipientName,
            followupData.recipientOrganization,
            clientInfo
          );

          const trackingId =
            recipientData!.trackingId || followupData.followupId;

          const baseUrl = getBaseUrl();
          const trackingPixelUrl = `${baseUrl}/api/track/open/${trackingId}`;
          const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;opacity:0" alt="" />`;

          const htmlBody = convertToHtml(personalizedBody) + trackingPixel;

          console.log(
            `[Cron: Follow-ups] Sending to: ${followupData.recipientEmail}`
          );

          const info = await transporter.sendMail({
            from: `${clientInfo.founderName} <${
              smtpConfig.senderEmail || clientInfo.email
            }>`,
            to: followupData.recipientEmail,
            subject: personalizedSubject,
            html: htmlBody,
            text: stripHtml(personalizedBody),
            headers: {
              "X-Entity-Ref-ID": followupData.followupId,
            },
          });

          if (info.accepted && info.accepted.length > 0) {
            await followupRef.update({
              status: "sent",
              sentAt: getCurrentTimestamp(),
              updatedAt: getCurrentTimestamp(),
              processingStartedAt: null,
            });

            const campaignUpdateData: any = {
              "followUpStats.sent": admin.firestore.FieldValue.increment(1),
              lastUpdated: getCurrentTimestamp(),
            };

            if (followupData.status === "queued") {
              campaignUpdateData["followUpStats.pending"] =
                admin.firestore.FieldValue.increment(-1);
            }

            if (followupData.status === "scheduled") {
              campaignUpdateData["followUpStats.scheduled"] =
                admin.firestore.FieldValue.increment(-1);
            }

            await adminDb
              .collection("campaigns")
              .doc(followupData.campaignId)
              .update(campaignUpdateData);

            await adminDb
              .collection("campaignRecipients")
              .doc(followupData.recipientId)
              .update({
                "followUps.pendingCount":
                  admin.firestore.FieldValue.increment(-1),
                updatedAt: getCurrentTimestamp(),
              });

            followupsSent++;
            console.log(
              `[Cron: Follow-ups] Follow-up sent successfully: ${followupData.recipientEmail}`
            );
          } else {
            throw new Error("Follow-up email rejected by server");
          }

          transporter.close();
        } catch (error: any) {
          console.error(`[Cron: Follow-ups] Failed to send follow-up:`, error);
          logError("Follow-up Send", error);

          try {
            await followupDoc.ref.update({
              status: "failed",
              errorMessage: error.message,
              retryCount: admin.firestore.FieldValue.increment(1),
              updatedAt: getCurrentTimestamp(),
              processingStartedAt: null,
            });

            const followupData = followupDoc.data();

            const campaignUpdateData: any = {
              "followUpStats.failed": admin.firestore.FieldValue.increment(1),
              lastUpdated: getCurrentTimestamp(),
            };

            if (followupData.status === "queued") {
              campaignUpdateData["followUpStats.pending"] =
                admin.firestore.FieldValue.increment(-1);
            } else if (followupData.status === "scheduled") {
              campaignUpdateData["followUpStats.scheduled"] =
                admin.firestore.FieldValue.increment(-1);
            }

            await adminDb
              .collection("campaigns")
              .doc(followupData.campaignId)
              .update(campaignUpdateData);
          } catch (updateError: any) {
            console.error(
              `[Cron: Follow-ups] Failed to update error status:`,
              updateError
            );
          }

          followupsFailed++;
        }
      }

      console.log(`\n[Cron: Follow-ups] Follow-up processing completed`);
      console.log(`[Cron: Follow-ups] Sent: ${followupsSent}`);
      console.log(`[Cron: Follow-ups] Failed: ${followupsFailed}`);
      console.log(`[Cron: Follow-ups] Skipped: ${followupsSkipped}`);
    } catch (error: any) {
      console.error(
        "[Cron: Follow-ups] Critical error processing follow-ups:",
        error
      );
      logError("Follow-up Processing", error);
    }

    // ============================================
    // JOB COMPLETION SUMMARY
    // ============================================

    const duration = Date.now() - startTime;

    console.log("\n[Cron: Send Emails] Job execution summary");
    console.log("[Cron: Send Emails] Main emails sent:", totalSent);
    console.log("[Cron: Send Emails] Main emails failed:", totalFailed);
    console.log("[Cron: Send Emails] Main emails skipped:", totalSkipped);
    console.log("[Cron: Send Emails] Follow-ups sent:", followupsSent);
    console.log("[Cron: Send Emails] Follow-ups failed:", followupsFailed);
    console.log("[Cron: Send Emails] Follow-ups skipped:", followupsSkipped);
    console.log("[Cron: Send Emails] Total duration:", duration + "ms");

    return NextResponse.json({
      success: true,
      message: "Email sending job completed successfully",
      summary: {
        mainEmails: {
          sent: totalSent,
          failed: totalFailed,
          skipped: totalSkipped,
          pending: recipientsSnapshot.empty
            ? 0
            : recipientsSnapshot.size - totalSent - totalFailed - totalSkipped,
          campaignsProcessed: Object.keys(campaignGroups).length,
          errorBreakdown,
        },
        followups: {
          sent: followupsSent,
          failed: followupsFailed,
          skipped: followupsSkipped,
        },
        duration: duration + "ms",
      },
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;

    console.error("[Cron: Send Emails] Critical error occurred");
    console.error("[Cron: Send Emails] Error:", error.message);
    console.error("[Cron: Send Emails] Stack:", error.stack);
    console.error("[Cron: Send Emails] Duration:", duration + "ms");
    logError("Send Emails Cron", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        duration: duration + "ms",
      },
      { status: 500 }
    );
  } finally {
    // Always release lock
    isJobRunning = false;
    console.log("[Cron: Send Emails] Job lock released\n");
  }
}

/**
 * Personalizes email text by replacing placeholders with actual values
 * @param text - Template text with placeholders
 * @param recipientName - Name of the recipient
 * @param recipientOrganization - Organization of the recipient
 * @param clientInfo - Client information object
 * @returns Personalized text
 */
function personalizeText(
  text: string,
  recipientName: string,
  recipientOrganization: string,
  clientInfo: any
): string {
  return text
    .replace(/\{\{investorName\}\}/g, recipientName)
    .replace(/\{\{organizationName\}\}/g, recipientOrganization)
    .replace(/\{\{name\}\}/g, recipientName)
    .replace(/\{\{organization\}\}/g, recipientOrganization)
    .replace(/\{\{companyName\}\}/g, clientInfo?.companyName || "")
    .replace(/\{\{founderName\}\}/g, clientInfo?.founderName || "");
}

/**
 * Converts plain text to HTML format with paragraph tags
 * @param text - Plain text to convert
 * @returns HTML formatted text
 */
function convertToHtml(text: string): string {
  return text
    .split("\n\n")
    .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/**
 * Strips HTML tags from text
 * @param html - HTML text
 * @returns Plain text without HTML tags
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
