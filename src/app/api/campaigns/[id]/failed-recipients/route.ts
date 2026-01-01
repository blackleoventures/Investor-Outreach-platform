// app/api/campaigns/[id]/failed-recipients/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  verifyFirebaseToken,
  verifyAdminOrSubadmin,
} from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";
import type { CampaignRecipient, FailedRecipient } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const user = await verifyFirebaseToken(request);

    // ONLY admin/subadmin can access failed recipients
    verifyAdminOrSubadmin(user);

    const campaignId = params.id;

    console.log("[Failed Recipients] Fetching for campaign:", campaignId);

    // Get all failed recipients for this campaign
    const recipientsSnapshot = await adminDb
      .collection("campaignRecipients")
      .where("campaignId", "==", campaignId)
      .where("status", "==", "failed")
      .get();

    if (recipientsSnapshot.empty) {
      return NextResponse.json({
        success: true,
        failedRecipients: [],
        total: 0,
      });
    }

    const failedRecipients: FailedRecipient[] = [];

    recipientsSnapshot.forEach((doc) => {
      const data = doc.data() as CampaignRecipient;
      const rawData = doc.data() as any; // For dynamic fields not in type

      // Handle both SMTP failures (have lastError) and bounces (only have failureReason)
      const lastError = data.lastError || {
        category: rawData.failureCategory || "BOUNCE",
        errorMessage: data.failureReason || "Delivery failed",
        friendlyMessage: data.failureReason || "Email delivery failed",
      };

      const failedRecipient: FailedRecipient = {
        id: doc.id,
        campaignId: data.campaignId,
        recipientEmail: data.originalContact.email,
        recipientName: data.originalContact.name,
        organization: data.originalContact.organization,
        lastError: lastError as any,
        errorHistory: data.errorHistory || [],
        totalRetries: data.retryCount || 0,
        canRetry:
          data.canRetry !== false &&
          !rawData.failureCategory?.includes("BOUNCE"), // Bounces can't be retried
        scheduledFor: data.scheduledFor,
        firstAttemptAt: data.createdAt,
        lastAttemptAt: rawData.failedAt || data.updatedAt,
        status: "failed",
        failureReason:
          data.failureReason || rawData.failureCategory || "Unknown",
      };

      failedRecipients.push(failedRecipient);
    });

    // Sort by most recent failure
    failedRecipients.sort(
      (a, b) =>
        new Date(b.lastAttemptAt).getTime() -
        new Date(a.lastAttemptAt).getTime()
    );

    console.log("[Failed Recipients] Found:", failedRecipients.length);

    return NextResponse.json({
      success: true,
      failedRecipients,
      total: failedRecipients.length,
    });
  } catch (error: any) {
    console.error("[Failed Recipients] Error:", error);

    if (error.message === "Forbidden") {
      return NextResponse.json(
        { success: false, error: "Only admins can view failed emails" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
