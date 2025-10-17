import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import nodemailer from "nodemailer";
import { getBaseUrl } from "@/lib/env-helper";
import * as admin from "firebase-admin";

export const maxDuration = 300; // 5 minutes

export async function GET(request: NextRequest) {
  try {
    console.log("[Cron Send Emails] Starting job...");
    const startTime = Date.now();

    const now = new Date();

    // Query pending emails scheduled for now or earlier
    // Query pending emails scheduled for now or earlier
    const recipientsSnapshot = await adminDb
      .collection("campaignRecipients")
      .where("status", "==", "pending")
      .where("scheduledFor", "<=", now.toISOString())
      .orderBy("scheduledFor", "asc")
      .limit(50)
      .get();

    if (recipientsSnapshot.empty) {
      console.log("[Cron Send Emails] No pending emails to send");
      return NextResponse.json({
        success: true,
        sent: 0,
        failed: 0,
        message: "No pending emails",
      });
    }

    console.log(
      `[Cron Send Emails] Found ${recipientsSnapshot.size} emails to send`
    );

    // Group by campaign
    const campaignGroups: Record<string, any[]> = {};

    recipientsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (!campaignGroups[data.campaignId]) {
        campaignGroups[data.campaignId] = [];
      }
      campaignGroups[data.campaignId].push({
        id: doc.id,
        ...data,
      });
    });

    let totalSent = 0;
    let totalFailed = 0;

    // Process each campaign
    for (const [campaignId, recipients] of Object.entries(campaignGroups)) {
      console.log(
        `[Cron Send Emails] Processing campaign ${campaignId} with ${recipients.length} recipients`
      );

      try {
        // Get campaign details
        const campaignDoc = await adminDb
          .collection("campaigns")
          .doc(campaignId)
          .get();

        if (!campaignDoc.exists) {
          console.error(`[Cron Send Emails] Campaign ${campaignId} not found`);
          continue;
        }

        const campaignData = campaignDoc.data();

        if (!campaignData) {
          console.error(
            `[Cron Send Emails] Campaign ${campaignId} has no data`
          );
          continue;
        }

        // Get client SMTP config
        const clientDoc = await adminDb
          .collection("clients")
          .doc(campaignData.clientId)
          .get();

        if (!clientDoc.exists) {
          console.error(
            `[Cron Send Emails] Client ${campaignData.clientId} not found`
          );
          continue;
        }

        const clientData = clientDoc.data();

        if (!clientData) {
          console.error(
            `[Cron Send Emails] Client ${campaignData.clientId} has no data`
          );
          continue;
        }

        const clientInfo = clientData.clientInformation;
        const smtpConfig = clientInfo?.emailConfiguration;

        // Validate SMTP config
        if (!smtpConfig || !smtpConfig.smtpHost || !smtpConfig.smtpUsername) {
          console.error(
            `[Cron Send Emails] Invalid SMTP config for campaign ${campaignId}`
          );
          continue;
        }

        // Create SMTP transporter
        const transporter = nodemailer.createTransport({
          host: smtpConfig.smtpHost,
          port: parseInt(smtpConfig.smtpPort),
          secure: smtpConfig.smtpSecurity === "SSL",
          auth: {
            user: smtpConfig.smtpUsername,
            pass: smtpConfig.smtpPassword,
          },
          tls: {
            rejectUnauthorized: smtpConfig.smtpSecurity !== "None",
          },
        });

        // Verify SMTP connection
        try {
          await transporter.verify();
          console.log(
            `[Cron Send Emails] SMTP connection verified for campaign ${campaignId}`
          );
        } catch (error: any) {
          console.error(
            `[Cron Send Emails] SMTP verification failed:`,
            error.message
          );
          // Mark all recipients as failed
          for (const recipient of recipients) {
            await adminDb
              .collection("campaignRecipients")
              .doc(recipient.id)
              .update({
                status: "failed",
                errorMessage: `SMTP Auth Failed: ${error.message}`,
                failureReason: "AUTH_FAILED",
              });
            totalFailed++;
          }
          continue;
        }

        let campaignSent = 0;
        let campaignFailed = 0;

        // Send to each recipient
        for (const recipient of recipients) {
          try {
            // Personalize email
            const personalizedSubject = personalizeText(
              campaignData.emailTemplate?.currentSubject || "",
              recipient,
              clientInfo
            );

            const personalizedBody = personalizeText(
              campaignData.emailTemplate?.currentBody || "",
              recipient,
              clientInfo
            );

            // Add tracking pixel to HTML body
            const baseUrl = getBaseUrl();
            const trackingPixelUrl = `${baseUrl}/track/open/${recipient.trackingId}`;
            const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;opacity:0" alt="" />`;

            const htmlBody = convertToHtml(personalizedBody) + trackingPixel;

            // Send email
            const info = await transporter.sendMail({
              from: `${clientInfo.founderName} <${
                smtpConfig.senderEmail || clientInfo.email
              }>`,
              to: recipient.contactInfo.email,
              subject: personalizedSubject,
              html: htmlBody,
              text: stripHtml(personalizedBody),
            });

            // Update recipient as sent/delivered
            if (info.accepted && info.accepted.length > 0) {
              await adminDb
                .collection("campaignRecipients")
                .doc(recipient.id)
                .update({
                  status: "delivered",
                  sentAt: now.toISOString(),
                  deliveredAt: now.toISOString(),
                });

              campaignSent++;
              totalSent++;
              console.log(
                `[Cron Send Emails] ✓ Sent to ${recipient.contactInfo.email}`
              );
            } else {
              throw new Error("Email rejected by server");
            }
          } catch (error: any) {
            console.error(
              `[Cron Send Emails] ✗ Failed to send to ${recipient.contactInfo.email}:`,
              error.message
            );

            const errorCategory = categorizeError(error);

            // Update recipient as failed
            await adminDb
              .collection("campaignRecipients")
              .doc(recipient.id)
              .update({
                status: "failed",
                errorMessage: error.message,
                failureReason: errorCategory,
                retryCount: (recipient.retryCount || 0) + 1,
              });

            campaignFailed++;
            totalFailed++;

            // Log error
            await adminDb.collection("campaignErrors").add({
              campaignId,
              recipientId: recipient.id,
              recipientEmail: recipient.contactInfo.email,
              errorType: errorCategory,
              errorMessage: error.message,
              timestamp: now.toISOString(),
              retryCount: (recipient.retryCount || 0) + 1,
            });

            // Schedule retry if retry count < 3
            if ((recipient.retryCount || 0) < 3) {
              const retryDelay = Math.pow(2, recipient.retryCount || 0) * 30; // 30, 60, 120 minutes
              const retryTime = new Date(
                now.getTime() + retryDelay * 60 * 1000
              );

              await adminDb
                .collection("campaignRecipients")
                .doc(recipient.id)
                .update({
                  status: "pending",
                  scheduledFor: retryTime.toISOString(),
                });

              console.log(
                `[Cron Send Emails] Scheduled retry for ${
                  recipient.contactInfo.email
                } at ${retryTime.toISOString()}`
              );
            }
          }
        }

        // Update campaign stats
        await adminDb
          .collection("campaigns")
          .doc(campaignId)
          .update({
            "stats.sent": admin.firestore.FieldValue.increment(campaignSent),
            "stats.delivered":
              admin.firestore.FieldValue.increment(campaignSent),
            "stats.pending": admin.firestore.FieldValue.increment(
              -(campaignSent + campaignFailed)
            ),
            "stats.failed":
              admin.firestore.FieldValue.increment(campaignFailed),
            "stats.deliveredNotOpened":
              admin.firestore.FieldValue.increment(campaignSent),
            lastSentAt: now.toISOString(),
            lastUpdated: now.toISOString(),
          });

        transporter.close();
      } catch (error: any) {
        console.error(`[Cron Send Emails] Campaign processing error:`, error);
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(
      `[Cron Send Emails] Completed: ${totalSent} sent, ${totalFailed} failed in ${duration}s`
    );

    return NextResponse.json({
      success: true,
      sent: totalSent,
      failed: totalFailed,
      duration,
    });
  } catch (error: any) {
    console.error("[Cron Send Emails] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Helper functions
function personalizeText(
  text: string,
  recipient: any,
  clientInfo: any
): string {
  return text
    .replace(/\{\{investorName\}\}/g, recipient.contactInfo?.name || "")
    .replace(
      /\{\{organizationName\}\}/g,
      recipient.contactInfo?.organization || ""
    )
    .replace(/\{\{name\}\}/g, recipient.contactInfo?.name || "")
    .replace(/\{\{organization\}\}/g, recipient.contactInfo?.organization || "")
    .replace(/\{\{companyName\}\}/g, clientInfo?.companyName || "")
    .replace(/\{\{founderName\}\}/g, clientInfo?.founderName || "");
}

function convertToHtml(text: string): string {
  // Convert plain text to HTML with proper formatting
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

function categorizeError(error: any): string {
  const message = error.message.toLowerCase();

  if (message.includes("authentication") || message.includes("auth")) {
    return "AUTH_FAILED";
  }
  if (
    message.includes("invalid") ||
    message.includes("mailbox") ||
    message.includes("recipient")
  ) {
    return "INVALID_EMAIL";
  }
  if (message.includes("timeout") || message.includes("connect")) {
    return "CONNECTION_TIMEOUT";
  }
  if (
    message.includes("quota") ||
    message.includes("limit") ||
    message.includes("exceeded")
  ) {
    return "QUOTA_EXCEEDED";
  }
  if (message.includes("spam") || message.includes("blocked")) {
    return "SPAM_BLOCKED";
  }

  return "UNKNOWN_ERROR";
}
