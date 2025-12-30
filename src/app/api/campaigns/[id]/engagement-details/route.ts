import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  verifyFirebaseToken,
  verifyAdminOrSubadmin,
  createAuthErrorResponse,
} from "@/lib/auth-middleware";

export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication and authorization
    const user = await verifyFirebaseToken(request);
    verifyAdminOrSubadmin(user);

    const campaignId = params.id;

    // Check for conditional request (ETag/If-None-Match)
    const ifNoneMatch = request.headers.get("if-none-match");

    // Verify campaign exists
    const campaignDoc = await adminDb
      .collection("campaigns")
      .doc(campaignId)
      .get();
    if (!campaignDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 }
      );
    }

    const campaignData = campaignDoc.data();

    // Generate ETag based on opened and replied counts
    const stats = campaignData?.stats || {};
    const openedCount = stats.opened || 0;
    const repliedCount = stats.replied || 0;
    const lastUpdated =
      campaignData?.lastUpdated || campaignData?.createdAt || "";
    const etag = `"engagement-${campaignId}-${openedCount}-${repliedCount}-${new Date(
      lastUpdated
    ).getTime()}"`;

    // If ETag matches, return 304 Not Modified (saves ALL recipient reads!)
    if (ifNoneMatch && ifNoneMatch === etag) {
      console.log(
        `[Engagement Details] Returning 304 Not Modified for campaign ${campaignId}`
      );
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
        },
      });
    }

    console.log(
      `[Engagement Details] User ${user.email} fetching for campaign ${campaignId}`
    );

    // Get all recipients for this campaign
    const recipientsSnapshot = await adminDb
      .collection("campaignRecipients")
      .where("campaignId", "==", campaignId)
      .get();

    if (recipientsSnapshot.empty) {
      return NextResponse.json({
        success: true,
        campaign: {
          id: campaignId,
          name: campaignData?.campaignName || "Unknown",
        },
        uniqueOpeners: [],
        uniqueRepliers: [],
        summary: {
          totalRecipients: 0,
          totalOpeners: 0,
          totalRepliers: 0,
          totalOpens: 0,
          totalReplies: 0,
        },
      });
    }

    // Collect all unique openers and repliers
    const openersMap = new Map<
      string,
      {
        name: string;
        email: string;
        organization: string;
        recipientType: string;
        totalOpens: number;
        firstOpenedAt: string;
        lastOpenedAt: string;
      }
    >();

    const repliersMap = new Map<
      string,
      {
        name: string;
        email: string;
        organization: string;
        recipientType: string;
        totalReplies: number;
        firstRepliedAt: string;
        lastRepliedAt: string;
      }
    >();

    let totalOpens = 0;
    let totalReplies = 0;

    recipientsSnapshot.forEach((doc) => {
      const data = doc.data();
      const aggregatedTracking = data.aggregatedTracking;

      if (!aggregatedTracking) return;

      // Process openers
      if (
        aggregatedTracking.everOpened &&
        aggregatedTracking.uniqueOpeners?.length > 0
      ) {
        aggregatedTracking.uniqueOpeners.forEach((opener: any) => {
          const key = opener.email;

          if (!openersMap.has(key)) {
            openersMap.set(key, {
              name: opener.name || "Unknown",
              email: opener.email,
              organization: opener.organization || "Unknown",
              recipientType: data.recipientType || "investor",
              totalOpens: opener.totalOpens || 0,
              firstOpenedAt: opener.firstOpenedAt || "",
              lastOpenedAt: opener.lastOpenedAt || "",
            });
          }

          totalOpens += opener.totalOpens || 0;
        });
      }

      // Process repliers
      if (
        aggregatedTracking.everReplied &&
        aggregatedTracking.uniqueRepliers?.length > 0
      ) {
        aggregatedTracking.uniqueRepliers.forEach((replier: any) => {
          const key = replier.email;

          if (!repliersMap.has(key)) {
            repliersMap.set(key, {
              name: replier.name || "Unknown",
              email: replier.email,
              organization: replier.organization || "Unknown",
              recipientType: data.recipientType || "investor",
              totalReplies: replier.totalReplies || 0,
              firstRepliedAt: replier.firstRepliedAt || "",
              lastRepliedAt: replier.lastRepliedAt || "",
            });
          }

          totalReplies += replier.totalReplies || 0;
        });
      }
    });

    // Convert maps to arrays
    const uniqueOpeners = Array.from(openersMap.values()).sort(
      (a, b) => b.totalOpens - a.totalOpens
    );

    const uniqueRepliers = Array.from(repliersMap.values()).sort(
      (a, b) =>
        new Date(b.firstRepliedAt).getTime() -
        new Date(a.firstRepliedAt).getTime()
    );

    const response = {
      success: true,
      campaign: {
        id: campaignId,
        name: campaignData?.campaignName || "Unknown",
      },
      uniqueOpeners,
      uniqueRepliers,
      summary: {
        totalRecipients: recipientsSnapshot.size,
        totalOpeners: uniqueOpeners.length,
        totalRepliers: uniqueRepliers.length,
        totalOpens,
        totalReplies,
        averageOpensPerPerson:
          uniqueOpeners.length > 0
            ? Math.round((totalOpens / uniqueOpeners.length) * 10) / 10
            : 0,
      },
    };

    console.log(
      `[Engagement Details] Found ${uniqueOpeners.length} openers, ${uniqueRepliers.length} repliers`
    );

    // Return with caching headers
    return NextResponse.json(response, {
      headers: {
        ETag: etag,
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
        "Last-Modified": new Date(lastUpdated).toUTCString(),
      },
    });
  } catch (error: any) {
    console.error("[Engagement Details] Error:", error.message);
    return createAuthErrorResponse(error);
  }
}
