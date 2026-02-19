import { NextRequest, NextResponse } from "next/server";
import {
  verifyFirebaseToken,
  verifyAdminOrSubadmin,
} from "@/lib/auth-middleware";
import admin, { adminDb } from "@/lib/firebase-admin";
import {
  initializeInvestorSheet,
  initializeIncubatorSheet,
} from "@/lib/google-sheets";
import { normalizeToArray } from "@/lib/utils/data-normalizer";
import type { OpenerInfo, ReplierInfo } from "@/types/tracking"; // adjust import path accordingly

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await verifyFirebaseToken(request);
    verifyAdminOrSubadmin(user);

    const { id } = params;

    console.log(
      `[Campaign Recipients] Fetching recipients for campaign ${id}...`,
    );

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const recipientType = searchParams.get("type");
    const priority = searchParams.get("priority");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Build query
    let query = adminDb
      .collection("campaignRecipients")
      .where("campaignId", "==", id);

    // Apply filters
    if (status) {
      query = query.where("status", "==", status);
    }
    if (recipientType) {
      query = query.where("recipientType", "==", recipientType);
    }
    if (priority) {
      query = query.where("priority", "==", priority);
    }

    // Order by scheduled time
    query = query.orderBy("scheduledFor", "asc");

    const recipientsSnapshot = await query.get();

    if (recipientsSnapshot.empty) {
      return NextResponse.json({
        success: true,
        recipients: [],
        total: 0,
        page,
        limit,
      });
    }

    // Map recipients data with correct field names and types
    const allRecipients = recipientsSnapshot.docs.map((doc) => {
      const data = doc.data();

      const aggregatedTracking = data.aggregatedTracking || {};
      const uniqueOpeners = normalizeToArray<OpenerInfo>(
        aggregatedTracking.uniqueOpeners || [],
      );
      const uniqueRepliers = normalizeToArray<ReplierInfo>(
        aggregatedTracking.uniqueRepliers || [],
      );

      const opener = uniqueOpeners[0];
      const replier = uniqueRepliers[0];

      return {
        id: doc.id,
        originalContact: {
          name: data.originalContact?.name || "",
          email: data.originalContact?.email || "",
          organization: data.originalContact?.organization || "",
          title: data.originalContact?.title || "",
        },
        recipientType: data.recipientType || "investor",
        priority: data.priority || "medium",
        matchScore: data.matchScore || 0,
        matchedCriteria: data.matchedCriteria || [],
        status: data.status || "pending",
        scheduledFor: data.scheduledFor || "",
        sentAt: data.sentAt || "",
        deliveredAt: data.deliveredAt || "",
        openedAt: data.openedAt || "",
        repliedAt: data.repliedAt || "",
        trackingData: {
          opened: aggregatedTracking.everOpened || false,
          openCount: aggregatedTracking.totalOpensAcrossAllEmails || 0,
          lastOpenedAt: opener?.lastOpenedAt ?? null,
          replied: aggregatedTracking.everReplied || false,
          replyReceivedAt: replier?.lastRepliedAt ?? null,
        },
        errorMessage: data.errorMessage || null,
        failureReason: data.failureReason || null,
        retryCount: data.retryCount || 0,
        createdAt: data.createdAt || "",
      };
    });

    console.log(
      `[Campaign Recipients] Found ${allRecipients.length} recipients`,
    );
    console.log(`[Campaign Recipients] Sample recipient:`, allRecipients[0]);

    return NextResponse.json({
      success: true,
      recipients: allRecipients,
      total: allRecipients.length,
    });
  } catch (error: any) {
    console.error("[Campaign Recipients] Error:", error);
    console.error("[Campaign Recipients] Error stack:", error.stack);

    if (error.name === "AuthenticationError") {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch recipients",
        error: error.message,
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await verifyFirebaseToken(request);
    verifyAdminOrSubadmin(user);

    const campaignId = params.id;
    const body = await request.json();
    const { recipientIds } = body;

    if (
      !recipientIds ||
      !Array.isArray(recipientIds) ||
      recipientIds.length === 0
    ) {
      return NextResponse.json(
        { success: false, error: "No recipient IDs provided" },
        { status: 400 },
      );
    }

    console.log(
      `[Recipient Delete] Deleting ${recipientIds.length} recipients for campaign ${campaignId}`,
    );

    // 1. Fetch recipients to get their emails before deleting
    const recipientsSnapshot = await adminDb
      .collection("campaignRecipients")
      .where(admin.firestore.FieldPath.documentId(), "in", recipientIds)
      .get();

    const emailsToDelete = [
      ...new Set(
        recipientsSnapshot.docs
          .map((doc) => doc.data().originalContact?.email?.toLowerCase())
          .filter(Boolean),
      ),
    ];

    console.log(
      `[Recipient Delete] Found ${emailsToDelete.length} unique emails to sync delete from sheets`,
    );

    // 2. Best-effort sync delete from Google Sheets
    if (emailsToDelete.length > 0) {
      await Promise.allSettled([
        (async () => {
          try {
            const { sheet } = await initializeInvestorSheet();
            const rows = await sheet.getRows();
            const rowsToDelete = rows.filter((row) =>
              emailsToDelete.includes(
                String(row.get("Partner Email") || "").toLowerCase(),
              ),
            );

            if (rowsToDelete.length > 0) {
              console.log(
                `[Recipient Delete] Deleting ${rowsToDelete.length} rows from Investor Sheet`,
              );
              // Delete sequentially to avoid race conditions/rate limits
              for (const row of rowsToDelete) {
                await row.delete();
              }
            }
          } catch (err: any) {
            console.error(
              "[Recipient Delete] Failed to sync delete from Investor Sheet:",
              err.message,
            );
          }
        })(),
        (async () => {
          try {
            const { sheet } = await initializeIncubatorSheet();
            const rows = await sheet.getRows();
            const rowsToDelete = rows.filter((row) =>
              emailsToDelete.includes(
                String(row.get("Partner Email") || "").toLowerCase(),
              ),
            );

            if (rowsToDelete.length > 0) {
              console.log(
                `[Recipient Delete] Deleting ${rowsToDelete.length} rows from Incubator Sheet`,
              );
              for (const row of rowsToDelete) {
                await row.delete();
              }
            }
          } catch (err: any) {
            console.error(
              "[Recipient Delete] Failed to sync delete from Incubator Sheet:",
              err.message,
            );
          }
        })(),
      ]);
    }

    // 3. Delete from Firestore
    const batch = adminDb.batch();
    const recipientsRef = adminDb.collection("campaignRecipients");

    recipientIds.forEach((id: string) => {
      const docRef = recipientsRef.doc(id);
      batch.delete(docRef);
    });

    await batch.commit();

    console.log(
      "[Recipient Delete] Successfully deleted recipients from Firestore",
    );

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${recipientIds.length} recipients`,
      deletedCount: recipientIds.length,
    });
  } catch (error: any) {
    console.error("[Recipient Delete] Error:", error);

    if (error.message === "Forbidden") {
      return NextResponse.json(
        { success: false, error: "Only admins can delete recipients" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to delete recipients" },
      { status: 500 },
    );
  }
}
