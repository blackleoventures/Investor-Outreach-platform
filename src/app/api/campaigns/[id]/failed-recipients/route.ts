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
  { params }: { params: { id: string } },
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

      // Detect errorType from stored data
      const detectErrorType = (reason: string): string => {
        const r = (reason || "").toLowerCase();
        if (
          r.includes("invalid") ||
          r.includes("does not exist") ||
          r.includes("mailbox") ||
          r.includes("address")
        )
          return "INVALID_EMAIL";
        if (r.includes("relay")) return "AUTH_FAILED";
        if (
          r.includes("auth") ||
          r.includes("credential") ||
          r.includes("login")
        )
          return "AUTH_FAILED";
        if (r.includes("timeout") || r.includes("timed out"))
          return "CONNECTION_TIMEOUT";
        if (r.includes("quota") || r.includes("rate") || r.includes("limit"))
          return "QUOTA_EXCEEDED";
        if (r.includes("spam") || r.includes("blocked") || r.includes("reject"))
          return "SPAM_BLOCKED";
        if (
          r.includes("smtp") ||
          r.includes("connection") ||
          r.includes("refused")
        )
          return "SMTP_ERROR";
        if (r.includes("full") || r.includes("disabled"))
          return "INVALID_EMAIL";
        return "UNKNOWN_ERROR";
      };

      // Human-readable labels for error types
      const getFriendlyMessage = (
        errorType: string,
        reason: string,
      ): string => {
        switch (errorType) {
          case "INVALID_EMAIL":
            return "This email address is invalid or doesn't exist. The recipient cannot receive emails.";
          case "AUTH_FAILED":
            return "Authentication failed — your SMTP credentials or relay settings need to be checked.";
          case "CONNECTION_TIMEOUT":
            return "The mail server didn't respond in time. This is usually temporary.";
          case "QUOTA_EXCEEDED":
            return "Sending limit reached. Try again later when the quota resets.";
          case "SPAM_BLOCKED":
            return "The email was blocked by the recipient's spam filter.";
          case "SMTP_ERROR":
            return "The mail server returned an error. This may be temporary.";
          default:
            return reason || "Email delivery failed for an unknown reason.";
        }
      };

      // Human-readable short labels for error types
      const getErrorLabel = (errorType: string): string => {
        switch (errorType) {
          case "INVALID_EMAIL":
            return "Bad Address";
          case "AUTH_FAILED":
            return "Auth Error";
          case "CONNECTION_TIMEOUT":
            return "Timeout";
          case "QUOTA_EXCEEDED":
            return "Quota Full";
          case "SPAM_BLOCKED":
            return "Spam Blocked";
          case "SMTP_ERROR":
            return "Server Error";
          default:
            return "Unknown";
        }
      };

      // Build lastError — use stored lastError if available, otherwise construct from failureReason
      const storedError = data.lastError as any;
      // Check ALL possible sources for the actual error text
      const rawReason =
        storedError?.errorMessage ||
        data.failureReason ||
        rawData.failureCategory ||
        "";
      const resolvedErrorType =
        storedError?.errorType || detectErrorType(rawReason);

      const lastError = {
        ...(storedError || {}), // spread stored fields first as base
        // Override with our computed, human-readable values
        errorType: resolvedErrorType,
        errorLabel: getErrorLabel(resolvedErrorType),
        errorMessage: rawReason || "Delivery failed",
        friendlyMessage: getFriendlyMessage(resolvedErrorType, rawReason),
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
          !["INVALID_EMAIL", "AUTH_FAILED", "SPAM_BLOCKED"].includes(
            resolvedErrorType,
          ),
        scheduledFor: data.scheduledFor,
        firstAttemptAt: data.createdAt,
        lastAttemptAt: rawData.failedAt || data.updatedAt,
        status: "failed",
        failureReason: rawReason || "Unknown",
      };

      failedRecipients.push(failedRecipient);
    });

    // Sort by most recent failure
    failedRecipients.sort(
      (a, b) =>
        new Date(b.lastAttemptAt).getTime() -
        new Date(a.lastAttemptAt).getTime(),
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
        { status: 403 },
      );
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
