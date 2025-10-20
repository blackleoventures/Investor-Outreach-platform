// app/api/track/open/[trackingId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";
import { markAsOpened } from "@/lib/services/recipient-status-manager";
import { logError } from "@/lib/utils/error-helper";
import type { CampaignRecipient } from "@/types";

export const maxDuration = 10;

export async function GET(
  request: NextRequest,
  { params }: { params: { trackingId: string } }
) {
  try {
    const { trackingId } = params;

    if (!trackingId) {
      return sendTransparentGif();
    }

    console.log('[Open Tracking] Pixel loaded for tracking ID:', trackingId);

    // Find recipient by tracking ID
    const recipientSnapshot = await adminDb
      .collection("campaignRecipients")
      .where("trackingId", "==", trackingId)
      .limit(1)
      .get();

    if (recipientSnapshot.empty) {
      console.log('[Open Tracking] No recipient found for tracking ID:', trackingId);
      return sendTransparentGif();
    }

    const recipientDoc = recipientSnapshot.docs[0];
    const recipientData = recipientDoc.data() as CampaignRecipient;

    if (!recipientData) {
      return sendTransparentGif();
    }

    const recipientId = recipientDoc.id;
    const recipientEmail = recipientData.originalContact.email;
    const recipientName = recipientData.originalContact.name;
    const recipientOrg = recipientData.originalContact.organization;

    console.log('[Open Tracking] Email opened by:', recipientEmail);

    // Check if this is the FIRST open by THIS specific person
    const aggregatedTracking = recipientData.aggregatedTracking;
    const existingOpener = aggregatedTracking?.uniqueOpeners?.find(
      (opener) => opener.email.toLowerCase() === recipientEmail.toLowerCase()
    );

    const isFirstOpenByThisPerson = !existingOpener;
    const isFirstOpenEver = !aggregatedTracking?.everOpened;

    if (isFirstOpenByThisPerson) {
      console.log('[Open Tracking] First open by this person:', recipientEmail);
    } else {
      console.log('[Open Tracking] Subsequent open by this person:', recipientEmail);
      console.log('[Open Tracking] Previous opens by this person:', existingOpener?.totalOpens || 0);
    }

    // Use recipient-status-manager to handle all tracking
    // This will:
    // - Add to uniqueOpeners if new person
    // - Increment totalOpens for this person if existing
    // - Update all tracking fields properly
    await markAsOpened(
      recipientId,
      recipientEmail,
      recipientName,
      recipientOrg
    );

    console.log('[Open Tracking] Recipient tracking updated');

    // Update campaign stats ONLY if this is a new unique opener
    if (isFirstOpenByThisPerson) {
      try {
        console.log('[Open Tracking] Updating campaign stats (new unique opener)');

        const campaignUpdates: any = {
          "stats.uniqueOpened": admin.firestore.FieldValue.increment(1),
          "stats.totalOpens": admin.firestore.FieldValue.increment(1),
        };

        // If this is the very first open for this recipient, update conversion funnel
        if (isFirstOpenEver) {
          campaignUpdates["stats.opened"] = admin.firestore.FieldValue.increment(1);
          campaignUpdates["stats.openedNotReplied"] = admin.firestore.FieldValue.increment(1);
          campaignUpdates["stats.deliveredNotOpened"] = admin.firestore.FieldValue.increment(-1);
          campaignUpdates["stats.conversionFunnel.opened"] = admin.firestore.FieldValue.increment(1);

          console.log('[Open Tracking] First open ever - updated conversion funnel');
        }

        await adminDb
          .collection("campaigns")
          .doc(recipientData.campaignId)
          .update(campaignUpdates);

        console.log('[Open Tracking] Campaign stats updated successfully');
      } catch (error: any) {
        console.error('[Open Tracking] Error updating campaign stats:', error.message);
        logError('Update Campaign Stats on Open', error, {
          campaignId: recipientData.campaignId,
          recipientId,
        });
      }
    } else {
      // Existing opener - only increment total opens count
      try {
        console.log('[Open Tracking] Incrementing total opens count (existing opener)');

        await adminDb
          .collection("campaigns")
          .doc(recipientData.campaignId)
          .update({
            "stats.totalOpens": admin.firestore.FieldValue.increment(1),
          });

        console.log('[Open Tracking] Total opens count incremented');
      } catch (error: any) {
        console.error('[Open Tracking] Error incrementing total opens:', error.message);
        logError('Increment Total Opens', error, {
          campaignId: recipientData.campaignId,
          recipientId,
        });
      }
    }

    console.log('[Open Tracking] Tracking completed successfully');

    return sendTransparentGif();

  } catch (error: any) {
    console.error('[Open Tracking] Critical error:', error.message);
    logError('Open Tracking', error, { trackingId: params.trackingId });
    return sendTransparentGif();
  }
}

// Helper function to return 1x1 transparent GIF
function sendTransparentGif() {
  const transparentGif = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64"
  );

  return new Response(transparentGif, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}
