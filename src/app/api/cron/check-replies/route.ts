import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";
import { checkAllClientsReplies } from "@/lib/imap/reply-checker";
import { parseReplyIdentity } from "@/lib/imap/reply-parser";
import { matchReplyToRecipient, shouldProcessReply } from "@/lib/imap/recipient-matcher";
import { getCurrentTimestamp } from "@/lib/utils/date-helper";
import type { CheckRepliesResult } from "@/types";

export const maxDuration = 300; // 5 minutes

export async function GET(request: NextRequest) {
  // Security: Verify CRON_SECRET
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log("[Cron Check Replies] Starting reply detection job");

    const startTime = Date.now();

    // Check IMAP for all active clients
    const clientRepliesMap = await checkAllClientsReplies(7); // Check last 7 days

    let totalRepliesFound = 0;
    let totalRecipientsUpdated = 0;
    let totalErrors = 0;

    // Process replies for each client
    for (const [clientId, replies] of clientRepliesMap) {
      console.log(`[Cron Check Replies] Processing ${replies.length} replies for client ${clientId}`);

      for (const reply of replies) {
        try {
          // Parse reply identity
          const parsedReply = parseReplyIdentity(reply);

          // Get all campaigns for this client
          const campaignsSnapshot = await adminDb
            .collection('campaigns')
            .where('clientId', '==', clientId)
            .where('status', 'in', ['active', 'paused'])
            .get();

          if (campaignsSnapshot.empty) {
            console.log(`[Cron Check Replies] No active campaigns found for client ${clientId}`);
            continue;
          }

          // Try to match reply to a recipient in any of this client's campaigns
          let matched = false;

          for (const campaignDoc of campaignsSnapshot.docs) {
            const campaignId = campaignDoc.id;

            // Match reply to recipient
            const matchResult = await matchReplyToRecipient(campaignId, parsedReply);

            if (!matchResult) {
              continue;
            }

            const { recipient, matchType, confidence } = matchResult;

            // Check if we should process this reply
            const shouldProcess = shouldProcessReply(recipient, parsedReply);

            if (!shouldProcess.should) {
              console.log(`[Cron Check Replies] Skipping reply from ${parsedReply.from.email}: ${shouldProcess.reason}`);
              continue;
            }

            // Check if already marked as replied
            if (recipient.aggregatedTracking?.everReplied) {
              // Check if this specific person already replied
              const alreadyReplied = recipient.aggregatedTracking.uniqueRepliers?.some(
                r => r.email === parsedReply.from.email
              );

              if (alreadyReplied) {
                console.log(`[Cron Check Replies] Reply from ${parsedReply.from.email} already recorded`);
                continue;
              }
            }

            // Find which email this is a reply to
            const emailHistory = recipient.emailHistory || [];
            const latestEmail = emailHistory[emailHistory.length - 1];

            if (!latestEmail) {
              console.log(`[Cron Check Replies] No email history found for recipient ${recipient.id}`);
              continue;
            }

            // Add to repliedBy array for this specific email
            const repliedByData = {
              name: parsedReply.from.name,
              email: parsedReply.from.email,
              organization: parsedReply.from.organization,
              repliedAt: parsedReply.receivedAt
            };

            // Update email history
            const emailIndex = emailHistory.length - 1;
            await adminDb.collection('campaignRecipients').doc(recipient.id).update({
              [`emailHistory.${emailIndex}.repliedBy`]: admin.firestore.FieldValue.arrayUnion(repliedByData),
              [`emailHistory.${emailIndex}.tracking.totalReplies`]: admin.firestore.FieldValue.increment(1),
              [`emailHistory.${emailIndex}.tracking.firstReplyAt`]: latestEmail.tracking.firstReplyAt || parsedReply.receivedAt,
              [`emailHistory.${emailIndex}.tracking.lastReplyAt`]: parsedReply.receivedAt,
            });

            // Update aggregated tracking
            const replierInfo = {
              name: parsedReply.from.name,
              email: parsedReply.from.email,
              organization: parsedReply.from.organization,
              firstRepliedAt: parsedReply.receivedAt,
              lastRepliedAt: parsedReply.receivedAt,
              totalReplies: 1,
              repliesHistory: [{
                emailId: latestEmail.emailId,
                repliedAt: parsedReply.receivedAt
              }]
            };

            await adminDb.collection('campaignRecipients').doc(recipient.id).update({
              'aggregatedTracking.everReplied': true,
              'aggregatedTracking.uniqueRepliers': admin.firestore.FieldValue.arrayUnion(replierInfo),
              'aggregatedTracking.engagementLevel': 'high',
              status: 'replied',
              repliedAt: parsedReply.receivedAt,
              updatedAt: getCurrentTimestamp()
            });

            // Store reply metadata in campaignReplies collection
            await adminDb.collection('campaignReplies').add({
              campaignId,
              recipientId: recipient.id,
              emailId: latestEmail.emailId,
              replyFrom: {
                name: parsedReply.from.name,
                email: parsedReply.from.email,
                organization: parsedReply.from.organization
              },
              replyTo: {
                name: campaignDoc.data().clientName,
                email: parsedReply.to
              },
              replyReceivedAt: parsedReply.receivedAt,
              threadPosition: 1, // Will be incremented for subsequent replies
              createdAt: getCurrentTimestamp()
            });

            // Update campaign stats
            const wasOpenedNotReplied = recipient.status === 'opened';

            await adminDb.collection('campaigns').doc(campaignId).update({
              'stats.replied': admin.firestore.FieldValue.increment(1),
              'stats.openedNotReplied': wasOpenedNotReplied 
                ? admin.firestore.FieldValue.increment(-1) 
                : admin.firestore.FieldValue.increment(0),
              lastUpdated: getCurrentTimestamp()
            });

            totalRecipientsUpdated++;
            matched = true;

            console.log(`[Cron Check Replies] Reply processed from ${parsedReply.from.email} (match: ${matchType}, confidence: ${confidence})`);
            break; // Stop checking other campaigns once matched
          }

          if (matched) {
            totalRepliesFound++;
          } else {
            console.log(`[Cron Check Replies] No matching recipient found for ${parsedReply.from.email}`);
          }

        } catch (error: any) {
          console.error(`[Cron Check Replies] Error processing reply from ${reply.from.email}:`, error.message);
          totalErrors++;
        }
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    const result: CheckRepliesResult = {
      repliesFound: totalRepliesFound,
      recipientsUpdated: totalRecipientsUpdated,
      errors: totalErrors
    };

    console.log(`[Cron Check Replies] Completed: ${totalRepliesFound} replies found, ${totalRecipientsUpdated} recipients updated in ${duration}s`);

    return NextResponse.json({
      success: true,
      ...result,
      duration
    });

  } catch (error: any) {
    console.error("[Cron Check Replies] Job failed:", error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
