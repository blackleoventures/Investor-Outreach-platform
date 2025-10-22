import { NextRequest, NextResponse } from "next/server";
import {
  verifyFirebaseToken,
  verifyAdminOrSubadmin,
} from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";
import { normalizeToArray } from "@/lib/utils/data-normalizer";
import type { OpenerInfo, ReplierInfo } from "@/types/tracking"; // adjust import path accordingly

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyFirebaseToken(request);
    verifyAdminOrSubadmin(user);

    const { id } = params;

    console.log(`[Campaign Recipients] Fetching recipients for campaign ${id}...`);

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const recipientType = searchParams.get("type");
    const priority = searchParams.get("priority");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Build query
    let query = adminDb.collection("campaignRecipients").where("campaignId", "==", id);

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
      const uniqueOpeners = normalizeToArray<OpenerInfo>(aggregatedTracking.uniqueOpeners || []);
      const uniqueRepliers = normalizeToArray<ReplierInfo>(aggregatedTracking.uniqueRepliers || []);

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

    console.log(`[Campaign Recipients] Found ${allRecipients.length} recipients`);
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
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch recipients",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
