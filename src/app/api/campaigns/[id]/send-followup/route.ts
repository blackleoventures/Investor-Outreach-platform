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

    const now = new Date();
    const isSendNow = scheduledFor === 'now';
    const scheduleTime = isSendNow ? now : new Date(scheduledFor || now);

    console.log(
      `[Send Followup] User ${user.email} ${isSendNow ? 'sending immediately' : 'scheduling'} follow-up to ${recipientIds.length} recipients`
    );

    let successCount = 0;
    let failedCount = 0;
    const errors: any[] = [];
    const batch = adminDb.batch();

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

        // Generate unique follow-up ID
        const followupId = generateEmailId();

        // Create a NEW document in followupEmails collection
        const followupEmailRef = adminDb.collection('followupEmails').doc(followupId);

        const followupEmail = {
          followupId,
          campaignId,
          recipientId,
          
          // Recipient contact info (for easy access)
          recipientName: recipientData.originalContact?.name || 'Unknown',
          recipientEmail: recipientData.originalContact?.email || '',
          recipientOrganization: recipientData.originalContact?.organization || 'Unknown',
          
          // Email content
          subject,
          body: emailBody,
          
          // Scheduling
          scheduledFor: scheduleTime.toISOString(),
          status: isSendNow ? 'queued' : 'scheduled', // queued = send ASAP, scheduled = wait for time
          
          // Tracking
          sentAt: null,
          deliveredAt: null,
          openedAt: null,
          repliedAt: null,
          
          tracking: {
            totalOpens: 0,
            totalReplies: 0,
            opened: false,
            replied: false,
            uniqueOpeners: [],
            uniqueRepliers: [],
          },
          
          // Metadata
          createdBy: user.uid,
          createdAt: getCurrentTimestamp(),
          updatedAt: getCurrentTimestamp(),
        };

        batch.set(followupEmailRef, followupEmail);

        // Update recipient's follow-up counter ONLY (don't touch main email stats)
        const recipientRef = adminDb.collection('campaignRecipients').doc(recipientId);
        batch.update(recipientRef, {
          'followUps.totalSent': admin.firestore.FieldValue.increment(1),
          'followUps.lastFollowUpSent': getCurrentTimestamp(),
          'followUps.pendingCount': admin.firestore.FieldValue.increment(1),
          updatedAt: getCurrentTimestamp(),
        });

        successCount++;
        console.log(`[Send Followup] Queued follow-up ${followupId} for recipient ${recipientId}`);
      } catch (error: any) {
        console.error(`[Send Followup] Error processing recipient ${recipientId}:`, error.message);
        errors.push({ recipientId, error: error.message });
        failedCount++;
      }
    }

    // Update campaign follow-up stats (separate from main email stats)
    const campaignRef = adminDb.collection('campaigns').doc(campaignId);
    batch.update(campaignRef, {
      'followUpStats.totalFollowUpsSent': admin.firestore.FieldValue.increment(successCount),
      'followUpStats.pending': admin.firestore.FieldValue.increment(isSendNow ? successCount : 0),
      'followUpStats.scheduled': admin.firestore.FieldValue.increment(isSendNow ? 0 : successCount),
      lastUpdated: getCurrentTimestamp(),
    });

    // Commit batch
    await batch.commit();

    console.log(
      `[Send Followup] Completed: ${successCount} ${isSendNow ? 'queued' : 'scheduled'}, ${failedCount} failed`
    );

    return NextResponse.json({
      success: true,
      message: isSendNow
        ? 'Follow-up emails queued for immediate sending'
        : 'Follow-up emails scheduled successfully',
      summary: {
        total: recipientIds.length,
        queued: successCount,
        failed: failedCount,
        scheduledFor: scheduleTime.toISOString(),
        sendType: isSendNow ? 'immediate' : 'scheduled',
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('[Send Followup] Error:', error.message);
    return createAuthErrorResponse(error);
  }
}
