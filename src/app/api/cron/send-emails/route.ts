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
  getRetryDelay,
  calculateNextRetryTime,
  canRetryError,
} from "@/lib/utils/error-helper";
import type { ErrorCategory } from "@/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Global lock to prevent concurrent executions
let isJobRunning = false;
let jobStartTime = 0;

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  console.log("[Cron: Send Emails] Job triggered");
  console.log("[Cron: Send Emails] Timestamp:", new Date().toISOString());

  // CRITICAL: Prevent concurrent executions
  if (isJobRunning) {
    const runningDuration = Date.now() - jobStartTime;
    console.log("[Cron: Send Emails] Job already running");
    console.log(
      "[Cron: Send Emails] Running duration:",
      runningDuration + "ms"
    );

    // If job has been running for more than 4 minutes, force unlock
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

  // Set lock
  isJobRunning = true;
  jobStartTime = Date.now();

  try {
    const authResult = verifyCronRequest(request);

    if (!authResult.authorized) {
      console.error("[Cron: Send Emails] Unauthorized request blocked");
      return createCronErrorResponse(authResult.error || "Unauthorized");
    }

    console.log("[Cron: Send Emails] Authentication verified");
    console.log("[Cron: Send Emails] Source:", authResult.source);

    const now = new Date();

    console.log("[Cron: Send Emails] Querying pending recipients");

    // FIXED: Query with better filtering to prevent duplicates
    const recipientsSnapshot = await adminDb
      .collection("campaignRecipients")
      .where("status", "==", "pending")
      .where("scheduledFor", "<=", now.toISOString())
      .orderBy("scheduledFor", "asc")
      .limit(50)
      .get();

    if (recipientsSnapshot.empty) {
      const duration = Date.now() - startTime;
      console.log("[Cron: Send Emails] No pending emails found");
      console.log("[Cron: Send Emails] Duration:", duration + "ms");

      return NextResponse.json({
        success: true,
        message: "No emails scheduled for sending",
        summary: {
          sent: 0,
          failed: 0,
          pending: 0,
          campaignsProcessed: 0,
          duration: duration + "ms",
        },
      });
    }

    console.log(
      "[Cron: Send Emails] Found recipients:",
      recipientsSnapshot.size
    );

    // FIXED: Pre-check for already processing recipients
    const recipientIds = recipientsSnapshot.docs.map((doc) => doc.id);
    const lockCheckSnapshot = await adminDb
      .collection("campaignRecipients")
      .where(
        admin.firestore.FieldPath.documentId(),
        "in",
        recipientIds.slice(0, 10)
      )
      .get();

    const alreadyProcessed = lockCheckSnapshot.docs.filter(
      (doc) => doc.data().status !== "pending"
    );

    if (alreadyProcessed.length > 0) {
      console.log(
        "[Cron: Send Emails] Detected race condition, some recipients already processed"
      );
    }

    const campaignGroups: Record<string, any[]> = {};

    recipientsSnapshot.forEach((doc) => {
      const data = doc.data();

      // FIXED: Double-check status before adding to group
      if (data.status !== "pending") {
        console.log(
          "[Cron: Send Emails] Skipping non-pending recipient:",
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
      "[Cron: Send Emails] Campaigns to process:",
      Object.keys(campaignGroups).length
    );

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

    for (const [campaignId, recipients] of Object.entries(campaignGroups)) {
      console.log("[Cron: Send Emails] Processing campaign:", campaignId);
      console.log(
        "[Cron: Send Emails] Recipients in campaign:",
        recipients.length
      );

      try {
        const campaignDoc = await adminDb
          .collection("campaigns")
          .doc(campaignId)
          .get();

        if (!campaignDoc.exists) {
          console.error("[Cron: Send Emails] Campaign not found:", campaignId);
          continue;
        }

        const campaignData = campaignDoc.data();

        if (!campaignData) {
          console.error(
            "[Cron: Send Emails] Campaign has no data:",
            campaignId
          );
          continue;
        }

        // FIXED: Check if campaign is actually active
        if (campaignData.status !== "active") {
          console.log(
            "[Cron: Send Emails] Campaign not active:",
            campaignId,
            "Status:",
            campaignData.status
          );
          continue;
        }

        const clientDoc = await adminDb
          .collection("clients")
          .doc(campaignData.clientId)
          .get();

        if (!clientDoc.exists) {
          console.error(
            "[Cron: Send Emails] Client not found:",
            campaignData.clientId
          );
          continue;
        }

        const clientData = clientDoc.data();

        if (!clientData) {
          console.error(
            "[Cron: Send Emails] Client has no data:",
            campaignData.clientId
          );
          continue;
        }

        const clientInfo = clientData.clientInformation;
        const smtpConfig = clientInfo?.emailConfiguration;

        console.log(
          "[Cron: Send Emails] SMTP Config loaded for campaign:",
          campaignId
        );

        if (!smtpConfig || !smtpConfig.smtpHost || !smtpConfig.smtpUsername) {
          console.error(
            "[Cron: Send Emails] Invalid SMTP configuration for campaign:",
            campaignId
          );

          for (const recipient of recipients) {
            const recipientEmail =
              recipient.originalContact?.email || "unknown@email.com";
            const error = new Error("SMTP configuration is incomplete");

            await markAsFailed(
              recipient.id,
              error,
              recipientEmail,
              campaignId,
              recipient.retryCount || 0
            );
            totalFailed++;
            errorBreakdown.AUTH_FAILED++;
          }
          continue;
        }

        console.log("[Cron: Send Emails] Creating SMTP transporter");

        let decryptedPassword: string;
        try {
          decryptedPassword = decryptAES256(smtpConfig.smtpPassword);
          console.log(
            "[Cron: Send Emails] SMTP password decrypted successfully"
          );
        } catch (error: any) {
          console.error(
            "[Cron: Send Emails] Failed to decrypt SMTP password:",
            error
          );

          for (const recipient of recipients) {
            const recipientEmail =
              recipient.originalContact?.email || "unknown@email.com";
            const decryptError = new Error("Failed to decrypt SMTP password");

            await markAsFailed(
              recipient.id,
              decryptError,
              recipientEmail,
              campaignId,
              recipient.retryCount || 0
            );
            totalFailed++;
            errorBreakdown.AUTH_FAILED++;
          }
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
            "[Cron: Send Emails] SMTP connection verified successfully"
          );
        } catch (error: any) {
          console.error("[Cron: Send Emails] SMTP verification failed");
          logError("SMTP Verification", error, {
            campaignId,
            smtpHost: smtpConfig.smtpHost,
          });

          for (const recipient of recipients) {
            const recipientEmail =
              recipient.originalContact?.email || "unknown@email.com";

            await markAsFailed(
              recipient.id,
              error,
              recipientEmail,
              campaignId,
              recipient.retryCount || 0
            );
            totalFailed++;
            const errorCategory = categorizeEmailError(error);
            errorBreakdown[errorCategory]++;
          }
          continue;
        }

        let campaignSent = 0;
        let campaignFailed = 0;
        let campaignSkipped = 0;

        for (const recipient of recipients) {
          try {
            // CRITICAL FIX: Atomic status check and update to prevent race conditions
            const recipientRef = adminDb
              .collection("campaignRecipients")
              .doc(recipient.id);

            // Use a transaction to ensure atomicity
            const transactionResult = await adminDb.runTransaction(
              async (transaction) => {
                const freshRecipientDoc = await transaction.get(recipientRef);

                if (!freshRecipientDoc.exists) {
                  console.log(
                    "[Cron: Send Emails] Recipient deleted during processing:",
                    recipient.id
                  );
                  return { skip: true, reason: "deleted" };
                }

                const freshData = freshRecipientDoc.data();

                // Check if recipient is still pending
                if (freshData!.status !== "pending") {
                  console.log(
                    "[Cron: Send Emails] Recipient status changed during processing:",
                    recipient.id,
                    "Status:",
                    freshData!.status
                  );
                  return { skip: true, reason: "status_changed" };
                }

                // ENHANCED DUPLICATE CHECK
                if (
                  freshData!.emailHistory &&
                  freshData!.emailHistory.length > 0
                ) {
                  const lastEmail =
                    freshData!.emailHistory[freshData!.emailHistory.length - 1];
                  const timeSinceLastSend =
                    Date.now() - new Date(lastEmail.sentAt).getTime();

                  // Prevent duplicate if email sent in last 5 minutes (300000ms)
                  if (timeSinceLastSend < 300000) {
                    console.log(
                      "[Cron: Send Emails] Skipping duplicate - email sent recently:",
                      freshData!.originalContact?.email
                    );
                    console.log(
                      "[Cron: Send Emails] Last sent:",
                      lastEmail.sentAt,
                      "Time since:",
                      timeSinceLastSend,
                      "ms"
                    );
                    return { skip: true, reason: "duplicate_prevention" };
                  }
                }

                // Mark as processing to prevent other concurrent jobs from picking it up
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

            console.log(
              "[Cron: Send Emails] Sending to recipient:",
              recipientEmail
            );
            console.log("[Cron: Send Emails] Email ID:", emailId);

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

            const info = await transporter.sendMail({
              from: `${clientInfo.founderName} <${
                smtpConfig.senderEmail || clientInfo.email
              }>`,
              to: recipientEmail,
              subject: personalizedSubject,
              html: htmlBody,
              text: stripHtml(personalizedBody),
            });

            if (info.accepted && info.accepted.length > 0) {
              await markAsDelivered(recipient.id, emailId, personalizedSubject);

              campaignSent++;
              totalSent++;
              console.log(
                "[Cron: Send Emails] Email sent successfully:",
                recipientEmail
              );
            } else {
              throw new Error("Email rejected by server");
            }
          } catch (error: any) {
            const recipientEmail =
              recipient.originalContact?.email || "unknown@email.com";

            console.error(
              "[Cron: Send Emails] Send failed for recipient:",
              recipientEmail
            );
            logError("Email Send", error, {
              recipientId: recipient.id,
              recipientEmail: recipientEmail,
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
                "[Cron: Send Emails] Retry scheduled for:",
                recipientEmail
              );
              console.log(
                "[Cron: Send Emails] Retry time:",
                nextRetryTime.toISOString()
              );
              console.log("[Cron: Send Emails] Retry attempt:", retryAttempt);
            } else {
              console.log(
                "[Cron: Send Emails] No retry scheduled:",
                retryAttempt >= 3
                  ? "Max retries reached"
                  : "Error not retryable"
              );
            }
          }
        }

        const statsUpdate: any = {
          "stats.sent": admin.firestore.FieldValue.increment(campaignSent),
          "stats.delivered": admin.firestore.FieldValue.increment(campaignSent),
          "stats.totalEmailsSent":
            admin.firestore.FieldValue.increment(campaignSent),
          "stats.totalDelivered":
            admin.firestore.FieldValue.increment(campaignSent),
          "stats.pending": admin.firestore.FieldValue.increment(
            -(campaignSent + campaignFailed)
          ),
          "stats.failed": admin.firestore.FieldValue.increment(campaignFailed),
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

        console.log("[Cron: Send Emails] Campaign stats updated");
        console.log("[Cron: Send Emails] Sent:", campaignSent);
        console.log("[Cron: Send Emails] Failed:", campaignFailed);
        console.log(
          "[Cron: Send Emails] Skipped (duplicates):",
          campaignSkipped
        );

        transporter.close();
      } catch (error: any) {
        console.error(
          "[Cron: Send Emails] Campaign processing error:",
          campaignId
        );
        logError("Campaign Processing", error, { campaignId });
      }
    }

    const duration = Date.now() - startTime;

    console.log("[Cron: Send Emails] Job completed");
    console.log("[Cron: Send Emails] Total sent:", totalSent);
    console.log("[Cron: Send Emails] Total failed:", totalFailed);
    console.log(
      "[Cron: Send Emails] Total skipped (duplicates):",
      totalSkipped
    );
    console.log("[Cron: Send Emails] Error breakdown:", errorBreakdown);
    console.log(
      "[Cron: Send Emails] Campaigns processed:",
      Object.keys(campaignGroups).length
    );
    console.log("[Cron: Send Emails] Duration:", duration + "ms");

    return NextResponse.json({
      success: true,
      message: "Email sending job completed",
      summary: {
        sent: totalSent,
        failed: totalFailed,
        skipped: totalSkipped,
        pending:
          recipientsSnapshot.size - totalSent - totalFailed - totalSkipped,
        campaignsProcessed: Object.keys(campaignGroups).length,
        errorBreakdown,
        duration: duration + "ms",
      },
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;

    console.error("[Cron: Send Emails] Critical error occurred");
    logError("Send Emails Cron", error);
    console.error("[Cron: Send Emails] Duration:", duration + "ms");

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        duration: duration + "ms",
      },
      { status: 500 }
    );
  } finally {
    // CRITICAL: Always release lock
    isJobRunning = false;
    console.log("[Cron: Send Emails] Job lock released");
  }
}

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

function convertToHtml(text: string): string {
  return text
    .split("\n\n")
    .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
