import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyFirebaseToken, verifyAdminOrSubadmin, createAuthErrorResponse } from '@/lib/auth-middleware';
import * as admin from 'firebase-admin';
import { getCurrentTimestamp } from '@/lib/utils/date-helper';
import { generateEmailId } from '@/lib/utils/email-helper';

export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication and authorization
    const user = await verifyFirebaseToken(request);
    verifyAdminOrSubadmin(user);

    const campaignId = params.id;

    // Verify campaign exists
    const campaignDoc = await adminDb.collection('campaigns').doc(campaignId).get();
    if (!campaignDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const campaignData = campaignDoc.data();

    // Parse request body
    const body = await request.json();
    const { recipientIds, subject, body: emailBody, scheduledFor } = body;

    // Validation
    if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'recipientIds array is required' },
        { status: 400 }
      );
    }

    if (!subject || subject.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Subject is required' },
        { status: 400 }
      );
    }

    if (!emailBody || emailBody.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Email body is required' },
        { status: 400 }
      );
    }

    // Validate personalization tags
    if (!emailBody.includes('{{name}}')) {
      return NextResponse.json(
        { success: false, error: 'Email body must include {{name}} personalization tag' },
        { status: 400 }
      );
    }

    console.log(
      `[Send Followup] User ${user.email} sending follow-up to ${recipientIds.length} recipients`
    );

    const now = new Date();
    const scheduleTime = scheduledFor === 'now' ? now : new Date(scheduledFor || now);

    let successCount = 0;
    let failedCount = 0;
    const errors: any[] = [];

    // Process each recipient
    for (const recipientId of recipientIds) {
      try {
        // Get recipient document
        const recipientDoc = await adminDb
          .collection('campaignRecipients')
          .doc(recipientId)
          .get();

        if (!recipientDoc.exists) {
          errors.push({ recipientId, error: 'Recipient not found' });
          failedCount++;
          continue;
        }

        const recipientData = recipientDoc.data();

        // Verify recipient belongs to this campaign
        if (recipientData?.campaignId !== campaignId) {
          errors.push({ recipientId, error: 'Recipient does not belong to this campaign' });
          failedCount++;
          continue;
        }

        // Check if recipient can receive follow-up
        const followUpsSent = recipientData.followUps?.totalSent || 0;
        if (followUpsSent >= 2) {
          errors.push({ recipientId, error: 'Maximum 2 follow-ups already sent' });
          failedCount++;
          continue;
        }

        // Generate unique email ID for this follow-up
        const emailId = generateEmailId();

        // Create follow-up email history entry
        const followupEmailEntry = {
          emailId,
          type: 'followup_manual',
          subject,
          sentAt: null, // Will be set when actually sent by cron
          deliveredAt: null,
          status: 'pending',
          scheduledFor: scheduleTime.toISOString(),
          openedBy: [],
          repliedBy: [],
          tracking: {
            totalOpens: 0,
            uniqueOpenersCount: 0,
            firstOpenAt: null,
            lastOpenAt: null,
            totalReplies: 0,
            firstReplyAt: null,
            lastReplyAt: null,
          },
        };

        // Update recipient document
        await adminDb
          .collection('campaignRecipients')
          .doc(recipientId)
          .update({
            // Add new email to history
            emailHistory: admin.firestore.FieldValue.arrayUnion(followupEmailEntry),

            // Update follow-up tracking
            'followUps.totalSent': admin.firestore.FieldValue.increment(1),
            'followUps.lastFollowUpSent': getCurrentTimestamp(),

            // Store pending follow-up info temporarily
            pendingFollowup: {
              emailId,
              subject,
              body: emailBody,
              scheduledFor: scheduleTime.toISOString(),
              createdBy: user.uid,
              createdAt: getCurrentTimestamp(),
            },

            // Update status if not already replied
            status: recipientData.status === 'replied' ? 'replied' : 'pending',
            scheduledFor: scheduleTime.toISOString(),

            updatedAt: getCurrentTimestamp(),
          });

        successCount++;
        console.log(`[Send Followup] Queued for recipient ${recipientId}`);
      } catch (error: any) {
        console.error(`[Send Followup] Error processing recipient ${recipientId}:`, error.message);
        errors.push({ recipientId, error: error.message });
        failedCount++;
      }
    }

    // Update campaign stats
    await adminDb
      .collection('campaigns')
      .doc(campaignId)
      .update({
        'stats.totalFollowUpsSent': admin.firestore.FieldValue.increment(successCount),
        'stats.pending': admin.firestore.FieldValue.increment(successCount),
        lastUpdated: getCurrentTimestamp(),
      });

    console.log(
      `[Send Followup] Completed: ${successCount} queued, ${failedCount} failed`
    );

    return NextResponse.json({
      success: true,
      message: 'Follow-up emails queued successfully',
      summary: {
        total: recipientIds.length,
        queued: successCount,
        failed: failedCount,
        scheduledFor: scheduleTime.toISOString(),
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('[Send Followup] Error:', error.message);
    return createAuthErrorResponse(error);
  }
}
