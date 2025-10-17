import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

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

    // Get recipient statistics - only type counts
    const recipientsSnapshot = await adminDb
      .collection("campaignRecipients")
      .where("campaignId", "==", campaignDoc.id)
      .get();

    const typeCounts: Record<string, number> = {
      investor: 0,
      incubator: 0,
    };

    recipientsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.recipientType) {
        typeCounts[data.recipientType] = (typeCounts[data.recipientType] || 0) + 1;
      }
    });

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
        deliveryRate: campaignData.stats?.deliveryRate || 0,
        openRate: campaignData.stats?.openRate || 0,
        replyRate: campaignData.stats?.replyRate || 0,
      },
      aggregates: {
        typeCounts,
      },
      createdAt: campaignData.createdAt,
    };

    console.log(`[Public Report] Campaign found: ${campaignData.campaignName}`);

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
