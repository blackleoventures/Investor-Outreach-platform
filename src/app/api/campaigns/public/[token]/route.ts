import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    console.log(`[Public Report] Fetching campaign by token ${token}...`);

    const campaignsSnapshot = await adminDb
      .collection("campaigns")
      .where("publicToken", "==", token)
      .limit(1)
      .get();

    if (campaignsSnapshot.empty) {
      return NextResponse.json(
        { success: false, message: "Campaign not found" },
        { status: 404 }
      );
    }

    const campaignDoc = campaignsSnapshot.docs[0];
    const campaignData = campaignDoc.data();

    // Get all recipients to calculate aggregates and WHO data
    const recipientsSnapshot = await adminDb
      .collection("campaignRecipients")
      .where("campaignId", "==", campaignDoc.id)
      .get();

    // Calculate type counts
    const typeCounts: Record<string, number> = {
      investor: 0,
      incubator: 0,
    };

    // Collect unique openers and repliers
    const openersMap = new Map<
      string,
      {
        name: string;
        email: string;
        organization: string;
        totalOpens: number;
      }
    >();

    const repliersMap = new Map<
      string,
      {
        name: string;
        email: string;
        organization: string;
        totalReplies: number;
      }
    >();

    let totalFollowUpsSent = 0;

    recipientsSnapshot.forEach((doc) => {
      const data = doc.data();

      // Count by type
      if (data.recipientType) {
        typeCounts[data.recipientType] = (typeCounts[data.recipientType] || 0) + 1;
      }

      // Count follow-ups
      totalFollowUpsSent += data.followUps?.totalSent || 0;

      // Collect WHO opened
      const aggregatedTracking = data.aggregatedTracking || {};
      if (aggregatedTracking.uniqueOpeners?.length > 0) {
        aggregatedTracking.uniqueOpeners.forEach((opener: any) => {
          const key = opener.email;
          if (!openersMap.has(key)) {
            openersMap.set(key, {
              name: opener.name || "Unknown",
              email: opener.email,
              organization: opener.organization || "Unknown",
              totalOpens: opener.totalOpens || 0,
            });
          }
        });
      }

      // Collect WHO replied
      if (aggregatedTracking.uniqueRepliers?.length > 0) {
        aggregatedTracking.uniqueRepliers.forEach((replier: any) => {
          const key = replier.email;
          if (!repliersMap.has(key)) {
            repliersMap.set(key, {
              name: replier.name || "Unknown",
              email: replier.email,
              organization: replier.organization || "Unknown",
              totalReplies: replier.totalReplies || 0,
            });
          }
        });
      }
    });

    // Convert maps to arrays and sort
    const uniqueOpeners = Array.from(openersMap.values()).sort(
      (a, b) => b.totalOpens - a.totalOpens
    );

    const uniqueRepliers = Array.from(repliersMap.values());

    // Build public data with enhanced stats
    const publicData = {
      campaignName: campaignData.campaignName,
      clientName: campaignData.clientName,
      status: campaignData.status,
      targetType: campaignData.targetType,
      totalRecipients: campaignData.totalRecipients,
      stats: {
        sent: campaignData.stats?.sent || 0,
        delivered: campaignData.stats?.delivered || 0,
        opened: campaignData.stats?.opened || 0,
        replied: campaignData.stats?.replied || 0,
        failed: campaignData.stats?.failed || 0,
        pending: campaignData.stats?.pending || 0,
        deliveryRate: campaignData.stats?.deliveryRate || 0,
        openRate: campaignData.stats?.openRate || 0,
        replyRate: campaignData.stats?.replyRate || 0,
        
        // Enhanced stats
        uniqueOpened: uniqueOpeners.length,
        uniqueResponded: uniqueRepliers.length,
        totalFollowUpsSent: totalFollowUpsSent,
        deliveredNotOpened: campaignData.stats?.deliveredNotOpened || 0,
        openedNotReplied: campaignData.stats?.openedNotReplied || 0,
      },
      aggregates: {
        typeCounts,
      },
      
      // WHO data (top 15 each for performance)
      uniqueOpeners: uniqueOpeners.slice(0, 15),
      uniqueRepliers: uniqueRepliers.slice(0, 15),
      
      createdAt: campaignData.createdAt,
    };

    console.log(
      `[Public Report] Campaign found: ${campaignData.campaignName} (${uniqueOpeners.length} openers, ${uniqueRepliers.length} repliers)`
    );

    return NextResponse.json({
      success: true,
      campaign: publicData,
    });
  } catch (error: any) {
    console.error("[Public Report] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch campaign report" },
      { status: 500 }
    );
  }
}
