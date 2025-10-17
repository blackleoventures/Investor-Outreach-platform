import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken, verifyAdminOrSubadmin } from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";

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
    let query = adminDb
      .collection("campaignRecipients")
      .where("campaignId", "==", id);

    // Apply filters if provided
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

    // Get all recipients (we'll paginate in memory for simplicity)
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

    // Map recipients data
    const allRecipients = recipientsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        contactInfo: {
          name: data.contactInfo?.name || "",
          email: data.contactInfo?.email || "",
          organization: data.contactInfo?.organization || "",
        },
        recipientType: data.recipientType,
        priority: data.priority,
        matchScore: data.matchScore,
        matchedCriteria: data.matchedCriteria,
        status: data.status,
        scheduledFor: data.scheduledFor,
        sentAt: data.sentAt,
        deliveredAt: data.deliveredAt,
        openedAt: data.openedAt,
        repliedAt: data.repliedAt,
        trackingData: {
          opened: data.trackingData?.opened || false,
          openCount: data.trackingData?.openCount || 0,
          lastOpenedAt: data.trackingData?.lastOpenedAt || null,
          replied: data.trackingData?.replied || false,
          replyReceivedAt: data.trackingData?.replyReceivedAt || null,
        },
        errorMessage: data.errorMessage,
        failureReason: data.failureReason,
        retryCount: data.retryCount || 0,
        createdAt: data.createdAt,
      };
    });

    console.log(`[Campaign Recipients] Found ${allRecipients.length} recipients`);

    return NextResponse.json({
      success: true,
      recipients: allRecipients,
      total: allRecipients.length,
    });

  } catch (error: any) {
    console.error("[Campaign Recipients] Error:", error);
    
    if (error.name === "AuthenticationError") {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to fetch recipients" },
      { status: 500 }
    );
  }
}
