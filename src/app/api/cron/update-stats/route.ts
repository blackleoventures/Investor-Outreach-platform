import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentTimestamp } from "@/lib/utils/date-helper";
import type { UpdateStatsResult } from "@/types";

export const maxDuration = 60; // 1 minute

export async function GET(request: NextRequest) {
  // Security: Verify CRON_SECRET
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log("[Cron Update Stats] Starting stats update job");

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
        campaignsUpdated: 0,
        totalRecipients: 0,
      });
    }

    console.log(`[Cron Update Stats] Found ${campaignsSnapshot.size} campaigns to update`);

    let campaignsUpdated = 0;
    let campaignsCompleted = 0;
    let totalRecipientsProcessed = 0;

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

        totalRecipientsProcessed += recipientsSnapshot.size;

        // Count by status
        let pending = 0;
        let sent = 0;
        let delivered = 0;
        let opened = 0;
        let replied = 0;
        let failed = 0;
        let openedNotReplied = 0;
        let deliveredNotOpened = 0;

        // Enhanced metrics
        const uniqueOpenersSet = new Set<string>();
        const uniqueRepliersSet = new Set<string>();
        let totalOpens = 0;
        let totalReplies = 0;

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

          // Calculate unique openers
          if (data.aggregatedTracking?.everOpened) {
            const uniqueOpeners = data.aggregatedTracking.uniqueOpeners || [];
            uniqueOpeners.forEach((opener: any) => {
              uniqueOpenersSet.add(opener.email);
            });
            totalOpens += data.aggregatedTracking.totalOpensAcrossAllEmails || 0;
          }

          // Calculate unique repliers
          if (data.aggregatedTracking?.everReplied) {
            const uniqueRepliers = data.aggregatedTracking.uniqueRepliers || [];
            uniqueRepliers.forEach((replier: any) => {
              uniqueRepliersSet.add(replier.email);
              totalReplies += replier.totalReplies || 0;
            });
          }
        });

        const totalRecipients = recipientsSnapshot.size;
        const uniqueOpened = uniqueOpenersSet.size;
        const uniqueResponded = uniqueRepliersSet.size;

        // Calculate rates
        const deliveryRate = sent > 0 ? Math.round((delivered / sent) * 100) : 0;
        const openRate = delivered > 0 ? Math.round((uniqueOpened / delivered) * 100) : 0;
        const replyRate = delivered > 0 ? Math.round((uniqueResponded / delivered) * 100) : 0;
        const averageOpensPerPerson = uniqueOpened > 0 ? Math.round((totalOpens / uniqueOpened) * 100) / 100 : 0;

        // Check if campaign is completed
        let status = campaignData.status;
        let completedAt = campaignData.completedAt || null;

        if (pending === 0 && (sent + failed) === totalRecipients && status === "active") {
          status = "completed";
          completedAt = getCurrentTimestamp();
          campaignsCompleted++;
          console.log(`[Cron Update Stats] Campaign ${campaignDoc.id} marked as completed`);
        }

        // Update campaign document with enhanced stats
        await adminDb
          .collection("campaigns")
          .doc(campaignDoc.id)
          .update({
            // Basic counts
            totalRecipients: totalRecipients,
            "stats.pending": pending,
            "stats.sent": sent,
            "stats.delivered": delivered,
            "stats.opened": opened,
            "stats.replied": replied,
            "stats.failed": failed,
            
            // Enhanced metrics
            "stats.totalEmailsSent": sent,
            "stats.totalDelivered": delivered,
            "stats.totalFailed": failed,
            "stats.uniqueOpened": uniqueOpened,
            "stats.totalOpens": totalOpens,
            "stats.averageOpensPerPerson": averageOpensPerPerson,
            "stats.uniqueResponded": uniqueResponded,
            "stats.totalResponses": totalReplies,
            
            // Engagement quality
            "stats.openedNotReplied": openedNotReplied,
            "stats.deliveredNotOpened": deliveredNotOpened,
            "stats.engagementQuality.openedOnce": opened - (totalOpens - opened), // Approximation
            "stats.engagementQuality.openedMultiple": totalOpens - opened, // Approximation
            "stats.engagementQuality.openedButNoReply": openedNotReplied,
            "stats.engagementQuality.deliveredButNoOpen": deliveredNotOpened,
            
            // Rates
            "stats.deliveryRate": deliveryRate,
            "stats.openRate": openRate,
            "stats.replyRate": replyRate,
            "stats.responseRate": replyRate, // Same as replyRate
            
            // Conversion funnel
            "stats.conversionFunnel.sent": sent,
            "stats.conversionFunnel.delivered": delivered,
            "stats.conversionFunnel.opened": uniqueOpened,
            "stats.conversionFunnel.replied": uniqueResponded,
            
            status: status,
            completedAt: completedAt,
            lastUpdated: getCurrentTimestamp(),
          });

        campaignsUpdated++;
        console.log(
          `[Cron Update Stats] Updated campaign ${campaignDoc.id}: ${sent}/${totalRecipients} sent, ${uniqueOpened} opened, ${uniqueResponded} replied`
        );
      } catch (error: any) {
        console.error(`[Cron Update Stats] Error updating campaign ${campaignDoc.id}:`, error.message);
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    const result: UpdateStatsResult = {
      campaignsUpdated,
      totalRecipients: totalRecipientsProcessed,
      errors: 0,
    };

    console.log(
      `[Cron Update Stats] Completed: ${campaignsUpdated} campaigns updated, ${campaignsCompleted} completed, ${totalRecipientsProcessed} recipients processed in ${duration}s`
    );

    return NextResponse.json({
      success: true,
      ...result,
      campaignsCompleted,
      duration,
    });
  } catch (error: any) {
    console.error("[Cron Update Stats] Job failed:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
