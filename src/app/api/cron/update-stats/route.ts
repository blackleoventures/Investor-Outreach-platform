import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const maxDuration = 60; // 1 minute

export async function GET(request: NextRequest) {
  try {
    console.log("[Cron Update Stats] Starting job...");
    const startTime = Date.now();

    // Get all non-completed campaigns
    const campaignsSnapshot = await adminDb
      .collection("campaigns")
      .where("status", "in", ["active", "paused"])
      .get();

    if (campaignsSnapshot.empty) {
      console.log("[Cron Update Stats] No campaigns to update");
      return NextResponse.json({ 
        success: true, 
        campaignsUpdated: 0 
      });
    }

    console.log(`[Cron Update Stats] Found ${campaignsSnapshot.size} campaigns to update`);

    let campaignsUpdated = 0;
    let campaignsCompleted = 0;

    for (const campaignDoc of campaignsSnapshot.docs) {
      try {
        const campaignData = campaignDoc.data();
        
        if (!campaignData) {
          console.error(`[Cron Update Stats] Campaign ${campaignDoc.id} has no data`);
          continue;
        }

        // Query all recipients for this campaign
        const recipientsSnapshot = await adminDb
          .collection("campaignRecipients")
          .where("campaignId", "==", campaignDoc.id)
          .get();

        if (recipientsSnapshot.empty) {
          console.log(`[Cron Update Stats] Campaign ${campaignDoc.id} has no recipients`);
          continue;
        }

        // Count by status
        let pending = 0;
        let sent = 0;
        let delivered = 0;
        let opened = 0;
        let replied = 0;
        let failed = 0;
        let openedNotReplied = 0;
        let deliveredNotOpened = 0;

        recipientsSnapshot.forEach((doc) => {
          const data = doc.data();
          
          switch (data.status) {
            case "pending":
              pending++;
              break;
            case "delivered":
              delivered++;
              sent++;
              if (!data.trackingData?.opened) {
                deliveredNotOpened++;
              }
              break;
            case "opened":
              opened++;
              sent++;
              delivered++;
              if (!data.trackingData?.replied) {
                openedNotReplied++;
              }
              break;
            case "replied":
              replied++;
              opened++;
              sent++;
              delivered++;
              break;
            case "failed":
              failed++;
              break;
          }
        });

        const totalRecipients = recipientsSnapshot.size;

        // Calculate rates
        const deliveryRate = sent > 0 ? Math.round((delivered / sent) * 100) : 0;
        const openRate = delivered > 0 ? Math.round((opened / delivered) * 100) : 0;
        const replyRate = delivered > 0 ? Math.round((replied / delivered) * 100) : 0;

        // Check if campaign is completed
        let status = campaignData.status;
        let completedAt = campaignData.completedAt || null;
        
        if (pending === 0 && (sent + failed) === totalRecipients && status === "active") {
          status = "completed";
          completedAt = new Date().toISOString();
          campaignsCompleted++;
          console.log(`[Cron Update Stats] ✓ Campaign ${campaignDoc.id} marked as completed`);
        }

        // Update campaign document
        await adminDb.collection("campaigns").doc(campaignDoc.id).update({
          "stats.totalRecipients": totalRecipients,
          "stats.pending": pending,
          "stats.sent": sent,
          "stats.delivered": delivered,
          "stats.opened": opened,
          "stats.replied": replied,
          "stats.failed": failed,
          "stats.openedNotReplied": openedNotReplied,
          "stats.deliveredNotOpened": deliveredNotOpened,
          "stats.deliveryRate": deliveryRate,
          "stats.openRate": openRate,
          "stats.replyRate": replyRate,
          status: status,
          completedAt: completedAt,
          lastUpdated: new Date().toISOString(),
        });

        campaignsUpdated++;
        console.log(`[Cron Update Stats] ✓ Updated campaign ${campaignDoc.id}: ${sent}/${totalRecipients} sent, ${opened} opened, ${replied} replied`);

      } catch (error: any) {
        console.error(`[Cron Update Stats] Error updating campaign ${campaignDoc.id}:`, error.message);
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`[Cron Update Stats] Completed: ${campaignsUpdated} campaigns updated, ${campaignsCompleted} completed in ${duration}s`);

    return NextResponse.json({
      success: true,
      campaignsUpdated,
      campaignsCompleted,
      duration,
    });

  } catch (error: any) {
    console.error("[Cron Update Stats] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
