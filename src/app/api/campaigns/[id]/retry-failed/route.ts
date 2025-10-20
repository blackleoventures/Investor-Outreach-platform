// app/api/campaigns/[id]/retry-failed/route.ts

import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken, verifyAdminOrSubadmin } from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";
import { resetRetryCount } from "@/lib/services/recipient-status-manager";
import { getCurrentTimestamp } from "@/lib/utils/date-helper";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const user = await verifyFirebaseToken(request);
    
    // ONLY admin/subadmin can retry failed emails
    verifyAdminOrSubadmin(user);

    const campaignId = params.id;
    const body = await request.json();
    const { recipientIds } = body; // Array of recipient IDs to retry

    if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No recipients specified for retry' },
        { status: 400 }
      );
    }

    console.log('[Retry Failed] Campaign:', campaignId);
    console.log('[Retry Failed] Recipients to retry:', recipientIds.length);

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Retry each recipient
    for (const recipientId of recipientIds) {
      try {
        // Get recipient to check if retryable
        const recipientDoc = await adminDb
          .collection('campaignRecipients')
          .doc(recipientId)
          .get();

        if (!recipientDoc.exists) {
          errors.push(`Recipient ${recipientId} not found`);
          failedCount++;
          continue;
        }

        const recipientData = recipientDoc.data();

        // Check if can retry
        if (!recipientData?.canRetry) {
          errors.push(`Recipient ${recipientData?.originalContact.email} cannot be retried`);
          failedCount++;
          continue;
        }

        // Reset retry count and schedule for immediate send
        await resetRetryCount(recipientId);
        
        // Schedule for immediate sending (current time)
        await adminDb.collection('campaignRecipients').doc(recipientId).update({
          scheduledFor: getCurrentTimestamp(),
          updatedAt: getCurrentTimestamp(),
        });

        successCount++;
        console.log('[Retry Failed] Scheduled retry for:', recipientData?.originalContact.email);

      } catch (error: any) {
        console.error('[Retry Failed] Error retrying recipient:', recipientId, error);
        errors.push(`Failed to retry ${recipientId}: ${error.message}`);
        failedCount++;
      }
    }

    console.log('[Retry Failed] Success:', successCount);
    console.log('[Retry Failed] Failed:', failedCount);

    return NextResponse.json({
      success: true,
      message: `Retry scheduled for ${successCount} recipients`,
      successCount,
      failedCount,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: any) {
    console.error('[Retry Failed] Error:', error);
    
    if (error.message === 'Forbidden') {
      return NextResponse.json(
        { success: false, error: 'Only admins can retry failed emails' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
