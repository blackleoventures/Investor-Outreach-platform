// app/api/cron/check-replies/route.ts
// app/api/cron/check-replies/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyCronRequest, createCronErrorResponse } from "@/lib/cron/auth";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";
import { checkAllClientsReplies } from "@/lib/imap/reply-checker";
import {
  parseReplyIdentity,
  isBounceEmail,
  extractBounceReason,
  extractBounceRecipient,
} from "@/lib/imap/reply-parser";
import {
  matchReplyToRecipient,
  shouldProcessReply,
} from "@/lib/imap/recipient-matcher";
import { getCurrentTimestamp } from "@/lib/utils/date-helper";
import { markAsReplied } from "@/lib/services/recipient-status-manager";
import { logError } from "@/lib/utils/error-helper";
import { SafeArray, normalizeToArray } from "@/lib/utils/data-normalizer";
import type { EmailHistoryItem } from "@/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Global lock to prevent concurrent executions
let isJobRunning = false;
let jobStartTime = 0;

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  console.log("[Cron: Check Replies] Job triggered");
  console.log("[Cron: Check Replies] Timestamp:", new Date().toISOString());

  // Prevent concurrent executions
  if (isJobRunning) {
    const runningDuration = Date.now() - jobStartTime;
    console.log("[Cron: Check Replies] Job already running");
    console.log(
      "[Cron: Check Replies] Running duration:",
      runningDuration + "ms"
    );

    if (runningDuration > 240000) {
      console.log("[Cron: Check Replies] Job timeout detected, forcing unlock");
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

  isJobRunning = true;
  jobStartTime = Date.now();

  try {
    const authResult = verifyCronRequest(request);

    if (!authResult.authorized) {
      console.error("[Cron: Check Replies] Unauthorized request blocked");
      return createCronErrorResponse(authResult.error || "Unauthorized");
    }

    console.log("[Cron: Check Replies] Authentication verified");
    console.log("[Cron: Check Replies] Source:", authResult.source);

    // ============================================
    // FAANG OPTIMIZATION: EARLY EXIT CHECK
    // ============================================
    // Check if ANY campaigns need reply checking (active, paused, completed)
    const campaignsCheck = await adminDb
      .collection("campaigns")
      .where("status", "in", ["active", "paused", "completed"])
      .limit(1)
      .get();

    if (campaignsCheck.empty) {
      console.log(
        "[Cron: Check Replies] No campaigns need reply checking, skipping"
      );
      isJobRunning = false;
      return NextResponse.json({
        success: true,
        message: "No campaigns to check replies for",
        reads: 1,
        duration: Date.now() - startTime + "ms",
      });
    }

    console.log("[Cron: Check Replies] Starting IMAP reply detection");
    console.log("[Cron: Check Replies] Checking last 7 days of emails");

    let clientRepliesMap: Map<string, any[]>;

    try {
      clientRepliesMap = await checkAllClientsReplies(7);
      console.log("[Cron: Check Replies] IMAP check completed successfully");
      console.log(
        "[Cron: Check Replies] Clients checked:",
        clientRepliesMap.size
      );

      let totalRepliesInMap = 0;
      for (const [clientId, replies] of clientRepliesMap) {
        totalRepliesInMap += replies.length;
        console.log(
          "[Cron: Check Replies] Client",
          clientId,
          "- Replies found:",
          replies.length
        );
      }
      console.log(
        "[Cron: Check Replies] Total replies in map:",
        totalRepliesInMap
      );
    } catch (imapError: any) {
      console.error(
        "[Cron: Check Replies] IMAP connection failed:",
        imapError.message
      );
      console.error("[Cron: Check Replies] Error stack:", imapError.stack);
      return NextResponse.json(
        {
          success: false,
          error: "IMAP connection failed: " + imapError.message,
          summary: {
            repliesFound: 0,
            recipientsUpdated: 0,
            errors: 1,
          },
        },
        { status: 500 }
      );
    }

    let totalRepliesFound = 0;
    let totalRecipientsUpdated = 0;
    let totalNewRepliers = 0;
    let totalExistingRepliers = 0;
    let totalForwardedReplies = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    let totalBouncesFixed = 0;

    // =============================================
    // SELF-HEALING LOGIC REMOVED
    // Main loop now handles bounce detection correctly
    // =============================================

    // OPTIMIZED: Cache campaigns per client within this request
    // This prevents re-querying campaigns for every reply
    const campaignsByClient = new Map<
      string,
      FirebaseFirestore.QueryDocumentSnapshot[]
    >();

    for (const [clientId, replies] of clientRepliesMap) {
      console.log("[Cron: Check Replies] Processing client:", clientId);
      console.log("[Cron: Check Replies] Replies for client:", replies.length);

      for (const reply of replies) {
        try {
          const parsedReply = parseReplyIdentity(reply);

          /* console.log(
            "[Cron: Check Replies] Processing reply from:",
            parsedReply.from.email
          ); */

          // =============================================
          // BOUNCE DETECTION: Check if this is a bounce/NDR
          // =============================================
          if (isBounceEmail(reply)) {
            const bounceReason = extractBounceReason(reply);
            const bouncedEmail = extractBounceRecipient(reply);

            // console.log("[Cron: Check Replies] BOUNCE DETECTED!");
            // console.log("[Cron: Check Replies] Reason:", bounceReason);
            // console.log("[Cron: Check Replies] Bounced email:", bouncedEmail);

            // Try to find and mark the original recipient as failed
            if (bouncedEmail) {
              try {
                // Find recipient by email
                const recipientSnapshot = await adminDb
                  .collection("campaignRecipients")
                  .where("originalContact.email", "==", bouncedEmail)
                  .where("status", "in", ["pending", "delivered"])
                  .limit(1)
                  .get();

                if (!recipientSnapshot.empty) {
                  const recipientDoc = recipientSnapshot.docs[0];
                  const recipientData = recipientDoc.data();

                  // Mark recipient as failed with bounce reason
                  await recipientDoc.ref.update({
                    status: "failed",
                    failedAt: getCurrentTimestamp(),
                    failureReason: bounceReason,
                    failureCategory: "BOUNCE",
                    bounceType: "hard",
                    lastUpdated: getCurrentTimestamp(),
                  });

                  // Update campaign stats: decrement delivered, increment failed
                  if (recipientData.campaignId) {
                    await adminDb
                      .collection("campaigns")
                      .doc(recipientData.campaignId)
                      .update({
                        "stats.failed": admin.firestore.FieldValue.increment(1),
                        "stats.delivered":
                          admin.firestore.FieldValue.increment(-1),
                        lastUpdated: getCurrentTimestamp(),
                      });
                  }

                  console.log(
                    `[Cron: Check Replies] Marked ${bouncedEmail} as FAILED: ${bounceReason}`
                  );
                } else {
                  console.log(
                    `[Cron: Check Replies] Could not find recipient for bounced email: ${bouncedEmail}`
                  );
                }
              } catch (bounceErr) {
                console.error(
                  "[Cron: Check Replies] Error processing bounce:",
                  bounceErr
                );
              }
            }

            totalSkipped++;
            continue; // Skip - this is not a real reply
          }

          // CRITICAL: Check if this exact reply was already processed
          const existingReplyCheck = await adminDb
            .collection("campaignReplies")
            .where("messageId", "==", parsedReply.messageId)
            .limit(1)
            .get();

          if (!existingReplyCheck.empty) {
            const existingDoc = existingReplyCheck.docs[0];
            const existingData = existingDoc.data();

            // BACKFILL: If we NOW have body content but the stored reply doesn't, update it
            if (parsedReply.body && !existingData.body) {
              try {
                await existingDoc.ref.update({
                  subject: parsedReply.subject || "",
                  body: parsedReply.body || "",
                  backfilledAt: getCurrentTimestamp(),
                });
                console.log(
                  `[Cron: Check Replies] BACKFILLED reply ${parsedReply.messageId} with content`
                );
              } catch (backfillErr) {
                console.error(
                  "[Cron: Check Replies] Backfill failed:",
                  backfillErr
                );
                // Non-critical - don't throw, just log
              }
            } else {
              console.log(
                "[Cron: Check Replies] Reply already processed (duplicate), skipping"
              );
            }

            console.log(
              "[Cron: Check Replies] Message ID:",
              parsedReply.messageId
            );
            totalSkipped++;
            continue;
          }

          // OPTIMIZED: Use cached campaigns for this client
          // Only query once per client, not once per reply
          if (!campaignsByClient.has(clientId)) {
            const snapshot = await adminDb
              .collection("campaigns")
              .where("clientId", "==", clientId)
              .where("status", "in", ["active", "paused", "completed"])
              .get();
            campaignsByClient.set(clientId, snapshot.docs);
            console.log(
              "[Cron: Check Replies] Cached campaigns for client:",
              clientId,
              "count:",
              snapshot.size
            );
          }

          const cachedCampaigns = campaignsByClient.get(clientId)!;

          if (cachedCampaigns.length === 0) {
            console.log(
              "[Cron: Check Replies] No active campaigns for client:",
              clientId
            );
            continue;
          }

          console.log(
            "[Cron: Check Replies] Using cached campaigns, count:",
            cachedCampaigns.length
          );

          let matched = false;
          const now = Date.now();
          const twoHoursAgo = now - 2 * 60 * 60 * 1000; // 2 hours in ms
          const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000; // 14 days in ms

          for (const campaignDoc of cachedCampaigns) {
            const campaignId = campaignDoc.id;
            const campaignData = campaignDoc.data();

            // OPTIMIZATION #1: Skip campaigns where emails were sent less than 2 hours ago
            // Reason: Nobody replies in 5 minutes, no point checking
            if (campaignData.lastSentAt) {
              const lastSentTime = new Date(campaignData.lastSentAt).getTime();
              if (lastSentTime > twoHoursAgo) {
                console.log(
                  "[Cron: Check Replies] Skipping campaign (sent < 2h ago):",
                  campaignId
                );
                continue;
              }
            }

            // OPTIMIZATION #5: Skip completed campaigns older than 14 days
            // Reason: Very rare to get replies after 14 days
            if (
              campaignData.status === "completed" &&
              campaignData.completedAt
            ) {
              const completedTime = new Date(
                campaignData.completedAt
              ).getTime();
              if (completedTime < fourteenDaysAgo) {
                console.log(
                  "[Cron: Check Replies] Skipping campaign (completed > 14 days):",
                  campaignId
                );
                continue;
              }
            }

            console.log(
              "[Cron: Check Replies] Matching reply to campaign:",
              campaignId
            );

            const matchResult = await matchReplyToRecipient(
              campaignId,
              parsedReply
            );

            if (!matchResult) {
              console.log(
                "[Cron: Check Replies] No match in campaign:",
                campaignId
              );
              continue;
            }

            const { recipient, matchType, confidence, isNewPerson } =
              matchResult;

            console.log("[Cron: Check Replies] Match found!");
            console.log(
              "[Cron: Check Replies] Original recipient:",
              recipient.originalContact.email
            );
            console.log(
              "[Cron: Check Replies] Replier:",
              parsedReply.from.email
            );
            console.log("[Cron: Check Replies] Match type:", matchType);
            console.log("[Cron: Check Replies] Confidence:", confidence);
            console.log("[Cron: Check Replies] Is new person:", isNewPerson);

            if (isNewPerson) {
              totalForwardedReplies++;
              console.log(
                "[Cron: Check Replies] FORWARDED/TEAM REPLY detected!"
              );
            }

            // Check if we should process this reply
            const shouldProcess = shouldProcessReply(recipient, parsedReply);

            if (!shouldProcess.should) {
              console.log("[Cron: Check Replies] Reply skipped");
              console.log(
                "[Cron: Check Replies] Reason:",
                shouldProcess.reason
              );
              totalSkipped++;
              continue;
            }

            // Check if THIS SPECIFIC PERSON already replied before
            // SAFE OPERATION: Handle both array and object format with null checks
            const existingReplierIndex = SafeArray.findIndex(
              recipient.aggregatedTracking?.uniqueRepliers,
              (r: any) => {
                // Null-safe check for email property
                if (!r || !r.email) {
                  return false;
                }
                return (
                  r.email.toLowerCase() === parsedReply.from.email.toLowerCase()
                );
              }
            );

            const isNewReplier = existingReplierIndex === -1;

            if (isNewReplier) {
              console.log(
                "[Cron: Check Replies] NEW REPLIER detected:",
                parsedReply.from.email
              );
              console.log("[Cron: Check Replies] This is their FIRST reply");
              if (isNewPerson) {
                console.log(
                  "[Cron: Check Replies] Different person from original recipient"
                );
              }
              totalNewRepliers++;
            } else {
              console.log(
                "[Cron: Check Replies] EXISTING REPLIER detected:",
                parsedReply.from.email
              );
              console.log("[Cron: Check Replies] This is a follow-up reply");
              totalExistingRepliers++;
            }

            // CRITICAL: Store reply metadata FIRST to prevent duplicate processing on next cron run
            const emailHistory = normalizeToArray<EmailHistoryItem>(
              recipient.emailHistory || []
            );
            const latestEmail = emailHistory[emailHistory.length - 1];
            const emailId = latestEmail?.emailId || "unknown";

            console.log(
              "[Cron: Check Replies] Storing reply metadata FIRST (prevents duplicates)"
            );

            await adminDb.collection("campaignReplies").add({
              campaignId,
              recipientId: recipient.id,
              emailId: emailId,

              messageId: parsedReply.messageId, // CRITICAL: Used for deduplication

              // Original recipient info
              originalRecipient: {
                name: recipient.originalContact.name,
                email: recipient.originalContact.email,
                organization: recipient.originalContact.organization,
              },

              // Actual replier info (may be different person)
              replyFrom: {
                name: parsedReply.from.name,
                email: parsedReply.from.email,
                organization: parsedReply.from.organization,
              },

              replyTo: {
                name: campaignDoc.data().clientName,
                email: parsedReply.to,
              },

              // Enhanced tracking
              matchType, // How this reply was matched
              isNewPerson, // Is this a different person?
              isDifferentEmail: parsedReply.from.email !== parsedReply.to,
              confidence, // Match confidence level

              replyReceivedAt: parsedReply.receivedAt,
              threadPosition: 1,
              isNewReplier,
              processed: true, // Mark as processed to prevent reprocessing

              // NEW: Store email content for admin viewing
              subject: parsedReply.subject || "",
              body: parsedReply.body || "",

              createdAt: getCurrentTimestamp(),
            });

            console.log(
              "[Cron: Check Replies] Reply metadata stored - Safe to update recipient now"
            );

            // NOW update recipient status - this won't be duplicated because reply is already in DB
            console.log("[Cron: Check Replies] Updating recipient status...");
            await markAsReplied(
              recipient.id!,
              parsedReply.from.email,
              parsedReply.from.name,
              parsedReply.from.organization,
              parsedReply.receivedAt
            );
            console.log("[Cron: Check Replies] Recipient status updated");

            // Update campaign stats
            console.log("[Cron: Check Replies] Updating campaign stats");

            const wasOpenedNotReplied = recipient.status === "opened";

            if (isNewReplier) {
              // Only increment unique replied count for new repliers
              console.log(
                "[Cron: Check Replies] Incrementing unique replied count"
              );
              await adminDb
                .collection("campaigns")
                .doc(campaignId)
                .update({
                  "stats.replied": admin.firestore.FieldValue.increment(1),
                  "stats.uniqueResponded":
                    admin.firestore.FieldValue.increment(1),
                  "stats.totalResponses":
                    admin.firestore.FieldValue.increment(1),
                  "stats.conversionFunnel.replied":
                    admin.firestore.FieldValue.increment(1),
                  "stats.openedNotReplied": wasOpenedNotReplied
                    ? admin.firestore.FieldValue.increment(-1)
                    : 0,
                  lastUpdated: getCurrentTimestamp(),
                });
            } else {
              // For existing repliers, only increment total response count
              console.log(
                "[Cron: Check Replies] Incrementing total responses only (existing replier)"
              );
              await adminDb
                .collection("campaigns")
                .doc(campaignId)
                .update({
                  "stats.totalResponses":
                    admin.firestore.FieldValue.increment(1),
                  lastUpdated: getCurrentTimestamp(),
                });
            }

            console.log(
              "[Cron: Check Replies] Campaign stats updated successfully"
            );

            totalRecipientsUpdated++;
            matched = true;

            console.log("[Cron: Check Replies] Reply processed successfully");
            console.log("[Cron: Check Replies] From:", parsedReply.from.email);
            console.log("[Cron: Check Replies] Is new replier:", isNewReplier);
            console.log("[Cron: Check Replies] Is new person:", isNewPerson);
            console.log("[Cron: Check Replies] Match type:", matchType);

            break; // Stop checking other campaigns once matched
          }

          if (matched) {
            totalRepliesFound++;
          } else {
            console.log(
              "[Cron: Check Replies] No matching recipient found for:",
              parsedReply.from.email
            );
          }
        } catch (error: any) {
          console.error(
            "[Cron: Check Replies] Error processing reply from:",
            reply.from.email
          );
          logError("Process Reply", error, {
            replyFrom: reply.from.email,
            clientId,
          });
          totalErrors++;
        }
      }
    }

    const duration = Date.now() - startTime;

    console.log(
      "[Cron: Check Replies] ========================================"
    );
    console.log("[Cron: Check Replies] Job completed");
    console.log("[Cron: Check Replies] Replies found:", totalRepliesFound);
    console.log(
      "[Cron: Check Replies] Recipients updated:",
      totalRecipientsUpdated
    );
    console.log("[Cron: Check Replies] New unique repliers:", totalNewRepliers);
    console.log(
      "[Cron: Check Replies] Existing repliers (follow-ups):",
      totalExistingRepliers
    );
    console.log(
      "[Cron: Check Replies] Forwarded/Team replies:",
      totalForwardedReplies
    );
    console.log("[Cron: Check Replies] Skipped (duplicates):", totalSkipped);
    console.log("[Cron: Check Replies] Errors:", totalErrors);
    console.log("[Cron: Check Replies] Duration:", duration + "ms");
    console.log(
      "[Cron: Check Replies] ========================================"
    );

    return NextResponse.json({
      success: true,
      message: "Reply checking job completed",
      summary: {
        repliesFound: totalRepliesFound,
        recipientsUpdated: totalRecipientsUpdated,
        newUniqueRepliers: totalNewRepliers,
        existingRepliers: totalExistingRepliers,
        forwardedReplies: totalForwardedReplies,
        skipped: totalSkipped,
        errors: totalErrors,
        duration: duration + "ms",
      },
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;

    console.error("[Cron: Check Replies] Critical error occurred");
    logError("Check Replies Cron", error);
    console.error("[Cron: Check Replies] Duration:", duration + "ms");

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
    console.log("[Cron: Check Replies] Job lock released");
  }
}
