import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";
import Imap from "imap";
import { simpleParser, ParsedMail } from "mailparser";
import { Readable } from "stream";

export const maxDuration = 300; // 5 minutes

export async function GET(request: NextRequest) {
  try {
    console.log("[Cron Check Replies] Starting job...");
    const startTime = Date.now();

    // Get all active campaigns
    const campaignsSnapshot = await adminDb
      .collection("campaigns")
      .where("status", "==", "active")
      .get();

    if (campaignsSnapshot.empty) {
      console.log("[Cron Check Replies] No active campaigns");
      return NextResponse.json({
        success: true,
        campaignsChecked: 0,
        repliesDetected: 0,
      });
    }

    console.log(
      `[Cron Check Replies] Found ${campaignsSnapshot.size} active campaigns`
    );

    let totalRepliesDetected = 0;
    let campaignsChecked = 0;

    for (const campaignDoc of campaignsSnapshot.docs) {
      const campaignData = campaignDoc.data();

      if (!campaignData) {
        console.error(
          `[Cron Check Replies] Campaign ${campaignDoc.id} has no data`
        );
        continue;
      }

      try {
        // Get client SMTP/IMAP config
        const clientDoc = await adminDb
          .collection("clients")
          .doc(campaignData.clientId)
          .get();

        if (!clientDoc.exists) {
          console.error(
            `[Cron Check Replies] Client ${campaignData.clientId} not found`
          );
          continue;
        }

        const clientData = clientDoc.data();

        if (!clientData) {
          console.error(
            `[Cron Check Replies] Client ${campaignData.clientId} has no data`
          );
          continue;
        }

        const clientInfo = clientData.clientInformation;
        const smtpConfig = clientInfo?.emailConfiguration;

        if (!smtpConfig || !smtpConfig.smtpHost || !smtpConfig.smtpUsername) {
          console.error(
            `[Cron Check Replies] Invalid SMTP config for campaign ${campaignDoc.id}`
          );
          continue;
        }

        // Determine IMAP host from SMTP host
        const imapHost = smtpConfig.smtpHost.replace("smtp", "imap");

        console.log(
          `[Cron Check Replies] Checking campaign ${campaignDoc.id} - ${campaignData.campaignName}`
        );
        console.log(`[Cron Check Replies] IMAP host: ${imapHost}`);

        // Connect to IMAP
        const replies = await checkImapForReplies(
          imapHost,
          smtpConfig.smtpUsername,
          smtpConfig.smtpPassword,
          campaignDoc.id
        );

        totalRepliesDetected += replies;
        campaignsChecked++;

        console.log(
          `[Cron Check Replies] ✓ Campaign ${campaignDoc.id}: ${replies} replies found`
        );
      } catch (error: any) {
        console.error(
          `[Cron Check Replies] Error checking campaign ${campaignDoc.id}:`,
          error.message
        );

        // Log error but continue with other campaigns
        await adminDb.collection("campaignErrors").add({
          campaignId: campaignDoc.id,
          errorType: "IMAP_CONNECTION_ERROR",
          errorMessage: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(
      `[Cron Check Replies] Completed: ${campaignsChecked} campaigns checked, ${totalRepliesDetected} replies detected in ${duration}s`
    );

    return NextResponse.json({
      success: true,
      campaignsChecked,
      repliesDetected: totalRepliesDetected,
      duration,
    });
  } catch (error: any) {
    console.error("[Cron Check Replies] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Helper function to check IMAP for replies
async function checkImapForReplies(
  imapHost: string,
  username: string,
  password: string,
  campaignId: string
): Promise<number> {
  return new Promise((resolve, reject) => {
    let repliesFound = 0;
    const processedEmails: Set<string> = new Set();

    const imap = new Imap({
      user: username,
      password: password,
      host: imapHost,
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
    });

    imap.once("ready", () => {
      imap.openBox("INBOX", false, (err: any) => {
        if (err) {
          imap.end();
          return reject(err);
        }

        // Search for emails from last 24 hours
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const searchCriteria = [
          ["SINCE", yesterday],
          ["UNSEEN"], // Only unread emails
        ];

        imap.search(searchCriteria, (err: any, results: number[]) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          if (!results || results.length === 0) {
            console.log(
              `[IMAP] No new emails found for campaign ${campaignId}`
            );
            imap.end();
            return resolve(0);
          }

          console.log(
            `[IMAP] Found ${results.length} new emails for campaign ${campaignId}`
          );

          const fetch = imap.fetch(results, { bodies: "" });
          let emailsProcessed = 0;

          fetch.on("message", (msg: any) => {
            msg.on("body", (stream: NodeJS.ReadableStream) => {
              // Convert Web ReadableStream to Node.js Readable
              const chunks: any[] = [];

              stream.on("data", (chunk: any) => {
                chunks.push(chunk);
              });

              stream.on("end", async () => {
                try {
                  const buffer = Buffer.concat(chunks);
                  const parsed: ParsedMail = await simpleParser(buffer);
                  const senderEmail =
                    parsed.from?.value[0]?.address?.toLowerCase();

                  if (!senderEmail) {
                    emailsProcessed++;
                    return;
                  }

                  // Prevent duplicate processing
                  if (processedEmails.has(senderEmail)) {
                    emailsProcessed++;
                    return;
                  }

                  processedEmails.add(senderEmail);
                  console.log(`[IMAP] Checking email from ${senderEmail}`);

                  // Check if sender is a campaign recipient
                  const recipientSnapshot = await adminDb
                    .collection("campaignRecipients")
                    .where("campaignId", "==", campaignId)
                    .where("contactInfo.email", "==", senderEmail)
                    .where("status", "in", ["delivered", "opened"])
                    .limit(1)
                    .get();

                  if (!recipientSnapshot.empty) {
                    const recipientDoc = recipientSnapshot.docs[0];
                    const recipientData = recipientDoc.data();

                    // Check if already marked as replied
                    if (recipientData.trackingData?.replied) {
                      console.log(
                        `[IMAP] Email from ${senderEmail} already marked as replied`
                      );
                      emailsProcessed++;
                      return;
                    }

                    // Mark as replied
                    await adminDb
                      .collection("campaignRecipients")
                      .doc(recipientDoc.id)
                      .update({
                        "trackingData.replied": true,
                        "trackingData.replyReceivedAt":
                          new Date().toISOString(),
                        status: "replied",
                        repliedAt: new Date().toISOString(),
                      });

                    // Update campaign stats
                    const wasOpenedNotReplied =
                      recipientData.trackingData?.opened &&
                      !recipientData.trackingData?.replied;

                    await adminDb
                      .collection("campaigns")
                      .doc(campaignId)
                      .update({
                        "stats.replied":
                          admin.firestore.FieldValue.increment(1),
                        "stats.openedNotReplied": wasOpenedNotReplied
                          ? admin.firestore.FieldValue.increment(-1)
                          : 0,
                      });

                    repliesFound++;
                    console.log(`[IMAP] ✓ Reply detected from ${senderEmail}`);
                  }

                  emailsProcessed++;

                  // If all emails processed, end connection
                  if (emailsProcessed >= results.length) {
                    setTimeout(() => imap.end(), 1000);
                  }
                } catch (error: any) {
                  console.error(`[IMAP] Error processing email:`, error);
                  emailsProcessed++;

                  if (emailsProcessed >= results.length) {
                    setTimeout(() => imap.end(), 1000);
                  }
                }
              });
            });
          });

          fetch.once("error", (err: any) => {
            console.error(`[IMAP] Fetch error:`, err);
            imap.end();
            reject(err);
          });

          fetch.once("end", () => {
            console.log(
              `[IMAP] Finished fetching emails for campaign ${campaignId}`
            );
            // Connection will be closed when all emails are processed
          });
        });
      });
    });

    imap.once("error", (err: any) => {
      console.error(`[IMAP] Connection error:`, err.message);
      reject(err);
    });

    imap.once("end", () => {
      console.log(`[IMAP] Connection ended for campaign ${campaignId}`);
      resolve(repliesFound);
    });

    imap.connect();
  });
}
