import { NextRequest, NextResponse } from "next/server";
import {
  verifyFirebaseToken,
  verifyAdminOrSubadmin,
} from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";
import {
  initializeInvestorSheet,
  initializeIncubatorSheet,
} from "@/lib/google-sheets";

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

    const currentData = doc.data();
    const oldEmail = currentData?.originalContact?.email?.toLowerCase();
    const oldName = currentData?.originalContact?.name;

    // --- Sync with Google Sheets if critical info changed ---
    // Only attempt sync if email or name is changing
    if (
      oldEmail &&
      (oldEmail !== email.toLowerCase() || (name && name !== oldName))
    ) {
      console.log(
        `[Recipient Update] Critical info changed. Syncing update to sheets... Old: ${oldEmail}, New: ${email}`,
      );

      // Best-effort sync update to Google Sheets
      await Promise.allSettled([
        (async () => {
          try {
            const { sheet } = await initializeInvestorSheet();
            const rows = await sheet.getRows();
            // Find row by OLD email
            const rowToUpdate = rows.find(
              (row) =>
                String(row.get("Partner Email") || "").toLowerCase() ===
                oldEmail,
            );

            if (rowToUpdate) {
              console.log(
                `[Recipient Update] Found matching Investor row. Updating...`,
              );
              // Update fields
              rowToUpdate.set("Partner Email", email);
              if (name) {
                rowToUpdate.set("Investor Name", name);
                // Optionally update Partner Name if it exists/matches logic, but "Investor Name" is safer generic
                // rowToUpdate.set("Partner Name", name);
              }
              await rowToUpdate.save();
              console.log(
                `[Recipient Update] Investor row updated successfully.`,
              );
            }
          } catch (err: any) {
            console.error(
              "[Recipient Update] Failed to sync update to Investor Sheet:",
              err.message,
            );
          }
        })(),
        (async () => {
          try {
            const { sheet } = await initializeIncubatorSheet();
            const rows = await sheet.getRows();
            // Find row by OLD email
            const rowToUpdate = rows.find(
              (row) =>
                String(row.get("Partner Email") || "").toLowerCase() ===
                oldEmail,
            );

            if (rowToUpdate) {
              console.log(
                `[Recipient Update] Found matching Incubator row. Updating...`,
              );
              // Update fields
              rowToUpdate.set("Partner Email", email);
              if (name) {
                rowToUpdate.set("Incubator Name", name);
              }
              await rowToUpdate.save();
              console.log(
                `[Recipient Update] Incubator row updated successfully.`,
              );
            }
          } catch (err: any) {
            console.error(
              "[Recipient Update] Failed to sync update to Incubator Sheet:",
              err.message,
            );
          }
        })(),
      ]);
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
