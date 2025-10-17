import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken, verifyAdminOrSubadmin } from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(request: NextRequest) {
  try {
    const user = await verifyFirebaseToken(request);
    verifyAdminOrSubadmin(user);

    console.log("[Campaigns List] Fetching all campaigns...");

    // Fetch all campaigns ordered by creation date
    const campaignsSnapshot = await adminDb
      .collection("campaigns")
      .orderBy("createdAt", "desc")
      .get();

    if (campaignsSnapshot.empty) {
      return NextResponse.json({
        success: true,
        campaigns: [],
        total: 0,
      });
    }

    const campaigns = campaignsSnapshot.docs.map((doc) => {
      const data = doc.data();
      
      return {
        id: doc.id,
        campaignName: data.campaignName,
        clientName: data.clientName,
        clientId: data.clientId,
        status: data.status,
        targetType: data.targetType,
        totalRecipients: data.totalRecipients,
        
        // Stats
        sent: data.stats?.sent || 0,
        delivered: data.stats?.delivered || 0,
        opened: data.stats?.opened || 0,
        replied: data.stats?.replied || 0,
        failed: data.stats?.failed || 0,
        pending: data.stats?.pending || 0,
        deliveryRate: data.stats?.deliveryRate || 0,
        openRate: data.stats?.openRate || 0,
        replyRate: data.stats?.replyRate || 0,
        
        // Schedule
        startDate: data.schedule?.startDate,
        endDate: data.schedule?.endDate,
        duration: data.schedule?.duration,
        dailyLimit: data.schedule?.dailyLimit,
        
        // Metadata
        publicToken: data.publicToken,
        createdBy: data.createdBy,
        createdAt: data.createdAt,
        lastUpdated: data.lastUpdated,
        lastSentAt: data.lastSentAt,
        completedAt: data.completedAt,
      };
    });

    console.log(`[Campaigns List] Found ${campaigns.length} campaigns`);

    return NextResponse.json({
      success: true,
      campaigns,
      total: campaigns.length,
    });

  } catch (error: any) {
    console.error("[Campaigns List] Error:", error);
    
    if (error.name === "AuthenticationError") {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}
