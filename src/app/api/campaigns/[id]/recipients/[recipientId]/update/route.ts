import { NextRequest, NextResponse } from "next/server";
import {
  verifyFirebaseToken,
  verifyAdminOrSubadmin,
} from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; recipientId: string } },
) {
  try {
    // Verify authentication
    const user = await verifyFirebaseToken(request);

    // ONLY admin/subadmin can update recipients
    verifyAdminOrSubadmin(user);

    const campaignId = params.id;
    const recipientId = params.recipientId;

    const body = await request.json();
    const { email, name, shouldRetry } = body;

    console.log(
      `[Recipient Update] Updating recipient ${recipientId} for campaign ${campaignId}`,
      { email, name, shouldRetry },
    );

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 },
      );
    }

    const recipientRef = adminDb
      .collection("campaignRecipients")
      .doc(recipientId);

    // Check if recipient exists
    const doc = await recipientRef.get();
    if (!doc.exists) {
      return NextResponse.json(
        { success: false, error: "Recipient not found" },
        { status: 404 },
      );
    }

    // Prepare updates
    const updates: any = {
      "originalContact.email": email, // Update email in originalContact
      "originalContact.name": name || doc.data()?.originalContact?.name,
      updatedAt: new Date().toISOString(),
    };

    // If shouldRetry is true, reset status and errors
    if (shouldRetry) {
      updates.status = "pending";
      updates.retryCount = 0;
      updates.canRetry = true;
      // Clear last error to treat as fresh attempt
      updates.lastError = admin.firestore.FieldValue.delete();
      updates.failureReason = admin.firestore.FieldValue.delete();
      updates.errorMessage = admin.firestore.FieldValue.delete();
      // Schedule for immediate retry (or next cron run)
      updates.scheduledFor = new Date().toISOString();
    }

    await recipientRef.update(updates);

    console.log(
      "[Recipient Update] Successfully updated recipient:",
      recipientId,
    );

    return NextResponse.json({
      success: true,
      message: "Recipient updated successfully",
      recipientId,
    });
  } catch (error: any) {
    console.error("[Recipient Update] Error:", error);

    if (error.message === "Forbidden") {
      return NextResponse.json(
        { success: false, error: "Only admins can update recipients" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to update recipient" },
      { status: 500 },
    );
  }
}
