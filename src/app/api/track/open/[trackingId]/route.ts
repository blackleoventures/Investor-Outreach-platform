import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";

export const maxDuration = 10; // 10 seconds - fast response needed

export async function GET(
  request: NextRequest,
  { params }: { params: { trackingId: string } }
) {
  try {
    const { trackingId } = params;

    if (!trackingId) {
      return sendTransparentGif();
    }

    console.log(`[Open Tracking] Pixel loaded for tracking ID: ${trackingId}`);

    // Find recipient by tracking ID
    const recipientSnapshot = await adminDb
      .collection("campaignRecipients")
      .where("trackingId", "==", trackingId)
      .limit(1)
      .get();

    if (recipientSnapshot.empty) {
      console.log(`[Open Tracking] No recipient found for tracking ID: ${trackingId}`);
      return sendTransparentGif();
    }

    const recipientDoc = recipientSnapshot.docs[0];
    const recipientData = recipientDoc.data();

    if (!recipientData) {
      return sendTransparentGif();
    }

    const now = new Date().toISOString();
    const isFirstOpen = !recipientData.trackingData?.opened;

    // Prepare update data
    const updates: any = {
      "trackingData.opened": true,
      "trackingData.openCount": (recipientData.trackingData?.openCount || 0) + 1,
      "trackingData.lastOpenedAt": now,
    };

    // If first open, update status and timestamp
    if (isFirstOpen) {
      updates.status = "opened";
      updates.openedAt = now;
      
      console.log(`[Open Tracking] ✓ First open detected for ${recipientData.contactInfo?.email}`);

      // Update campaign stats for first open only
      try {
        await adminDb
          .collection("campaigns")
          .doc(recipientData.campaignId)
          .update({
            "stats.opened": admin.firestore.FieldValue.increment(1),
            "stats.openedNotReplied": admin.firestore.FieldValue.increment(1),
            "stats.deliveredNotOpened": admin.firestore.FieldValue.increment(-1),
          });
      } catch (error) {
        console.error(`[Open Tracking] Error updating campaign stats:`, error);
      }
    } else {
      console.log(`[Open Tracking] Subsequent open (count: ${updates["trackingData.openCount"]}) for ${recipientData.contactInfo?.email}`);
    }

    // Update recipient document
    await adminDb
      .collection("campaignRecipients")
      .doc(recipientDoc.id)
      .update(updates);

    return sendTransparentGif();

  } catch (error: any) {
    console.error("[Open Tracking] Error:", error);
    return sendTransparentGif();
  }
}

// Helper function to return 1x1 transparent GIF
function sendTransparentGif() {
  // 1x1 transparent GIF in base64
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
