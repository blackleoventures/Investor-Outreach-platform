// app/api/cron/check-replies/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyCronRequest, createCronErrorResponse } from "@/lib/cron/auth";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";
import { checkAllClientsReplies } from "@/lib/imap/reply-checker";
import { parseReplyIdentity } from "@/lib/imap/reply-parser";
import { matchReplyToRecipient, shouldProcessReply } from "@/lib/imap/recipient-matcher";
import { getCurrentTimestamp } from "@/lib/utils/date-helper";
import { markAsReplied } from "@/lib/services/recipient-status-manager";
import { logError } from "@/lib/utils/error-helper";

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Global lock to prevent concurrent executions
let isJobRunning = false;
let jobStartTime = 0;

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  console.log('[Cron: Check Replies] Job triggered');
  console.log('[Cron: Check Replies] Timestamp:', new Date().toISOString());

  // Prevent concurrent executions
  if (isJobRunning) {
    const runningDuration = Date.now() - jobStartTime;
    console.log('[Cron: Check Replies] Job already running');
    console.log('[Cron: Check Replies] Running duration:', runningDuration + 'ms');
    
    if (runningDuration > 240000) { // 4 minutes timeout
      console.log('[Cron: Check Replies] Job timeout detected, forcing unlock');
      isJobRunning = false;
    } else {
      return NextResponse.json({
        success: true,
        message: 'Job already in progress',
        skipped: true,
        runningDuration: runningDuration + 'ms',
      });
    }
  }

  // Set lock
  isJobRunning = true;
  jobStartTime = Date.now();

  try {
    const authResult = verifyCronRequest(request);
    
    if (!authResult.authorized) {
      console.error('[Cron: Check Replies] Unauthorized request blocked');
      return createCronErrorResponse(authResult.error || 'Unauthorized');
    }

    console.log('[Cron: Check Replies] Authentication verified');
    console.log('[Cron: Check Replies] Source:', authResult.source);

    console.log('[Cron: Check Replies] Starting IMAP reply detection');
    console.log('[Cron: Check Replies] Checking last 7 days of emails');

    const clientRepliesMap = await checkAllClientsReplies(7);

    console.log('[Cron: Check Replies] IMAP check completed');
    console.log('[Cron: Check Replies] Clients checked:', clientRepliesMap.size);

    let totalRepliesFound = 0;
    let totalRecipientsUpdated = 0;
    let totalNewRepliers = 0;
    let totalExistingRepliers = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const [clientId, replies] of clientRepliesMap) {
      console.log('[Cron: Check Replies] Processing client:', clientId);
      console.log('[Cron: Check Replies] Replies for client:', replies.length);

      for (const reply of replies) {
        try {
          const parsedReply = parseReplyIdentity(reply);

          console.log('[Cron: Check Replies] Processing reply from:', parsedReply.from.email);
          console.log('[Cron: Check Replies] Message ID:', parsedReply.messageId);

          // CRITICAL: Check if this exact reply was already processed
          const existingReplyCheck = await adminDb
            .collection('campaignReplies')
            .where('messageId', '==', parsedReply.messageId)
            .limit(1)
            .get();

          if (!existingReplyCheck.empty) {
            console.log('[Cron: Check Replies] Reply already processed (duplicate), skipping');
            console.log('[Cron: Check Replies] Message ID:', parsedReply.messageId);
            totalSkipped++;
            continue;
          }

          // Get active campaigns for this client
          const campaignsSnapshot = await adminDb
            .collection('campaigns')
            .where('clientId', '==', clientId)
            .where('status', 'in', ['active', 'paused', 'completed'])
            .get();

          if (campaignsSnapshot.empty) {
            console.log('[Cron: Check Replies] No active campaigns for client:', clientId);
            continue;
          }

          console.log('[Cron: Check Replies] Active campaigns found:', campaignsSnapshot.size);

          let matched = false;
          let isNewReplier = false;

          for (const campaignDoc of campaignsSnapshot.docs) {
            const campaignId = campaignDoc.id;

            console.log('[Cron: Check Replies] Matching reply to campaign:', campaignId);

            const matchResult = await matchReplyToRecipient(campaignId, parsedReply);

            if (!matchResult) {
              console.log('[Cron: Check Replies] No match in campaign:', campaignId);
              continue;
            }

            const { recipient, matchType, confidence } = matchResult;

            console.log('[Cron: Check Replies] Match found!');
            console.log('[Cron: Check Replies] Recipient:', recipient.originalContact.email);
            console.log('[Cron: Check Replies] Match type:', matchType);
            console.log('[Cron: Check Replies] Confidence:', confidence);

            // Check if we should process this reply
            const shouldProcess = shouldProcessReply(recipient, parsedReply);

            if (!shouldProcess.should) {
              console.log('[Cron: Check Replies] Reply skipped');
              console.log('[Cron: Check Replies] Reason:', shouldProcess.reason);
              totalSkipped++;
              continue;
            }

            // Check if this person already replied before
            const existingReplierIndex = recipient.aggregatedTracking?.uniqueRepliers?.findIndex(
              (r: any) => r.email.toLowerCase() === parsedReply.from.email.toLowerCase()
            );

            isNewReplier = existingReplierIndex === undefined || existingReplierIndex < 0;

            if (isNewReplier) {
              console.log('[Cron: Check Replies] NEW REPLIER detected:', parsedReply.from.email);
              console.log('[Cron: Check Replies] This is their FIRST reply');
              totalNewRepliers++;
            } else {
              console.log('[Cron: Check Replies] EXISTING REPLIER detected:', parsedReply.from.email);
              console.log('[Cron: Check Replies] This is a follow-up reply');
              totalExistingRepliers++;
            }

            // Update recipient status using markAsReplied
            console.log('[Cron: Check Replies] Updating recipient status...');
            await markAsReplied(
              recipient.id!,
              parsedReply.from.email,
              parsedReply.from.name,
              parsedReply.from.organization,
              parsedReply.receivedAt
            );
            console.log('[Cron: Check Replies] Recipient status updated');

            // Store reply metadata in campaignReplies collection
            const emailHistory = recipient.emailHistory || [];
            const latestEmail = emailHistory[emailHistory.length - 1];

            if (latestEmail) {
              console.log('[Cron: Check Replies] Storing reply metadata in campaignReplies collection');

              await adminDb.collection('campaignReplies').add({
                campaignId,
                recipientId: recipient.id,
                emailId: latestEmail.emailId,
                messageId: parsedReply.messageId, // CRITICAL: Store messageId for deduplication
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
                threadPosition: 1,
                isNewReplier,
                createdAt: getCurrentTimestamp()
              });

              console.log('[Cron: Check Replies] Reply metadata stored successfully');
            }

            // Update campaign stats
            console.log('[Cron: Check Replies] Updating campaign stats');

            const wasOpenedNotReplied = recipient.status === 'opened';

            if (isNewReplier) {
              // Only increment unique replied count for new repliers
              console.log('[Cron: Check Replies] Incrementing unique replied count');
              await adminDb.collection('campaigns').doc(campaignId).update({
                'stats.replied': admin.firestore.FieldValue.increment(1),
                'stats.uniqueResponded': admin.firestore.FieldValue.increment(1),
                'stats.totalResponses': admin.firestore.FieldValue.increment(1),
                'stats.conversionFunnel.replied': admin.firestore.FieldValue.increment(1),
                'stats.openedNotReplied': wasOpenedNotReplied 
                  ? admin.firestore.FieldValue.increment(-1) 
                  : 0,
                lastUpdated: getCurrentTimestamp()
              });
            } else {
              // For existing repliers, only increment total response count
              console.log('[Cron: Check Replies] Incrementing total responses only (existing replier)');
              await adminDb.collection('campaigns').doc(campaignId).update({
                'stats.totalResponses': admin.firestore.FieldValue.increment(1),
                lastUpdated: getCurrentTimestamp()
              });
            }

            console.log('[Cron: Check Replies] Campaign stats updated successfully');

            totalRecipientsUpdated++;
            matched = true;

            console.log('[Cron: Check Replies] Reply processed successfully');
            console.log('[Cron: Check Replies] From:', parsedReply.from.email);
            console.log('[Cron: Check Replies] Is new replier:', isNewReplier);
            console.log('[Cron: Check Replies] Match type:', matchType);
            
            break; // Stop checking other campaigns once matched
          }

          if (matched) {
            totalRepliesFound++;
          } else {
            console.log('[Cron: Check Replies]  No matching recipient found for:', parsedReply.from.email);
          }

        } catch (error: any) {
          console.error('[Cron: Check Replies]  Error processing reply from:', reply.from.email);
          logError('Process Reply', error, { 
            replyFrom: reply.from.email,
            clientId 
          });
          totalErrors++;
        }
      }
    }

    const duration = Date.now() - startTime;

    console.log('[Cron: Check Replies] ========================================');
    console.log('[Cron: Check Replies] Job completed');
    console.log('[Cron: Check Replies] Replies found:', totalRepliesFound);
    console.log('[Cron: Check Replies] Recipients updated:', totalRecipientsUpdated);
    console.log('[Cron: Check Replies] New unique repliers:', totalNewRepliers);
    console.log('[Cron: Check Replies] Existing repliers (follow-ups):', totalExistingRepliers);
    console.log('[Cron: Check Replies] Skipped (duplicates):', totalSkipped);
    console.log('[Cron: Check Replies] Errors:', totalErrors);
    console.log('[Cron: Check Replies] Duration:', duration + 'ms');
    console.log('[Cron: Check Replies] ========================================');

    return NextResponse.json({
      success: true,
      message: 'Reply checking job completed',
      summary: {
        repliesFound: totalRepliesFound,
        recipientsUpdated: totalRecipientsUpdated,
        newUniqueRepliers: totalNewRepliers,
        existingRepliers: totalExistingRepliers,
        skipped: totalSkipped,
        errors: totalErrors,
        duration: duration + 'ms',
      },
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    console.error('[Cron: Check Replies] Critical error occurred');
    logError('Check Replies Cron', error);
    console.error('[Cron: Check Replies] Duration:', duration + 'ms');

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        duration: duration + 'ms',
      },
      { status: 500 }
    );
  } finally {
    // Always release lock
    isJobRunning = false;
    console.log('[Cron: Check Replies] Job lock released');
  }
}