// app/api/cron/update-stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyCronRequest, createCronErrorResponse } from "@/lib/cron/auth";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentTimestamp } from "@/lib/utils/date-helper";

// Import Phase 1 utility
import { calculateCampaignStats } from "@/lib/utils/stats-calculator";
import { logError } from "@/lib/utils/error-helper";
import type { CampaignRecipient, ErrorCategory } from "@/types";

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  console.log('[Cron: Update Stats] Job triggered');
  console.log('[Cron: Update Stats] Timestamp:', new Date().toISOString());

  const authResult = verifyCronRequest(request);
  
  if (!authResult.authorized) {
    console.error('[Cron: Update Stats] Unauthorized request blocked');
    return createCronErrorResponse(authResult.error || 'Unauthorized');
  }

  console.log('[Cron: Update Stats] Authentication verified');
  console.log('[Cron: Update Stats] Source:', authResult.source);

  try {
    console.log('[Cron: Update Stats] Querying active campaigns');

    const campaignsSnapshot = await adminDb
      .collection("campaigns")
      .where("status", "in", ["active", "paused"])
      .get();

    if (campaignsSnapshot.empty) {
      const duration = Date.now() - startTime;
      console.log('[Cron: Update Stats] No active campaigns found');
      console.log('[Cron: Update Stats] Duration:', duration + 'ms');
      
      return NextResponse.json({
        success: true,
        message: 'No campaigns to update',
        summary: {
          campaignsUpdated: 0,
          totalRecipients: 0,
          duration: duration + 'ms',
        },
      });
    }

    console.log('[Cron: Update Stats] Campaigns found:', campaignsSnapshot.size);

    let campaignsUpdated = 0;
    let totalRecipientsProcessed = 0;

    for (const campaignDoc of campaignsSnapshot.docs) {
      const campaignId = campaignDoc.id;
      
      try {
        const campaignData = campaignDoc.data();

        if (!campaignData) {
          console.error('[Cron: Update Stats] Campaign has no data:', campaignId);
          continue;
        }

        console.log('[Cron: Update Stats] Processing campaign:', campaignId);

        // Fetch all recipients for this campaign
        const recipientsSnapshot = await adminDb
          .collection("campaignRecipients")
          .where("campaignId", "==", campaignId)
          .get();

        if (recipientsSnapshot.empty) {
          console.log('[Cron: Update Stats] No recipients for campaign:', campaignId);
          continue;
        }

        const recipientCount = recipientsSnapshot.size;
        totalRecipientsProcessed += recipientCount;

        console.log('[Cron: Update Stats] Recipients found:', recipientCount);

        // Convert to array of recipients
        const recipients: CampaignRecipient[] = [];
        recipientsSnapshot.forEach((doc) => {
          recipients.push({
            id: doc.id,
            ...doc.data()
          } as CampaignRecipient);
        });

        // Use stats calculator utility to calculate all stats
        console.log('[Cron: Update Stats] Calculating campaign statistics');
        const calculatedStats = calculateCampaignStats(recipients);

        console.log('[Cron: Update Stats] Statistics calculated');
        console.log('[Cron: Update Stats] Sent:', calculatedStats.sent);
        console.log('[Cron: Update Stats] Delivered:', calculatedStats.delivered);
        console.log('[Cron: Update Stats] Unique opened:', calculatedStats.uniqueOpened);
        console.log('[Cron: Update Stats] Total opens:', calculatedStats.totalOpens);
        console.log('[Cron: Update Stats] Unique responded:', calculatedStats.uniqueResponded);
        console.log('[Cron: Update Stats] Total replies:', calculatedStats.totalResponses);
        console.log('[Cron: Update Stats] Open rate:', calculatedStats.openRate + '%');
        console.log('[Cron: Update Stats] Reply rate:', calculatedStats.replyRate + '%');


        // Update campaign with calculated stats
        const updateData: any = {
          totalRecipients: recipientCount,
          
          // Basic counts
          "stats.pending": calculatedStats.pending,
          "stats.sent": calculatedStats.sent,
          "stats.delivered": calculatedStats.delivered,
          "stats.opened": calculatedStats.opened,
          "stats.replied": calculatedStats.replied,
          "stats.failed": calculatedStats.failed,
          
          // Totals
          "stats.totalEmailsSent": calculatedStats.totalEmailsSent,
          "stats.totalDelivered": calculatedStats.totalDelivered,
          "stats.totalFailed": calculatedStats.totalFailed,
          
          // Unique tracking (FIXED)
          "stats.uniqueOpened": calculatedStats.uniqueOpened,
          "stats.totalOpens": calculatedStats.totalOpens,
          "stats.averageOpensPerPerson": calculatedStats.averageOpensPerPerson,
          "stats.uniqueResponded": calculatedStats.uniqueResponded,
          "stats.totalResponses": calculatedStats.totalResponses,
          
          // Engagement
          "stats.openedNotReplied": calculatedStats.openedNotReplied,
          "stats.deliveredNotOpened": calculatedStats.deliveredNotOpened,
          
          // Engagement quality
          "stats.engagementQuality.openedOnce": calculatedStats.engagementQuality?.openedOnce || 0,
          "stats.engagementQuality.openedMultiple": calculatedStats.engagementQuality?.openedMultiple || 0,
          "stats.engagementQuality.openedButNoReply": calculatedStats.engagementQuality?.openedButNoReply || 0,
          "stats.engagementQuality.deliveredButNoOpen": calculatedStats.engagementQuality?.deliveredButNoOpen || 0,
          
          // Rates
          "stats.deliveryRate": calculatedStats.deliveryRate,
          "stats.openRate": calculatedStats.openRate,
          "stats.replyRate": calculatedStats.replyRate,
          "stats.responseRate": calculatedStats.responseRate,
          
          // Conversion funnel
          "stats.conversionFunnel.sent": calculatedStats.conversionFunnel?.sent || 0,
          "stats.conversionFunnel.delivered": calculatedStats.conversionFunnel?.delivered || 0,
          "stats.conversionFunnel.opened": calculatedStats.conversionFunnel?.opened || 0,
          "stats.conversionFunnel.replied": calculatedStats.conversionFunnel?.replied || 0,
          
          // Follow-up tracking
          "stats.totalFollowUpsSent": calculatedStats.totalFollowUpsSent || 0,
          "stats.followupCandidates.notOpened48h": calculatedStats.followupCandidates?.notOpened48h || 0,
          "stats.followupCandidates.openedNotReplied72h": calculatedStats.followupCandidates?.openedNotReplied72h || 0,
          "stats.followupCandidates.total": calculatedStats.followupCandidates?.total || 0,
          "stats.followupCandidates.readyForFollowup": calculatedStats.followupCandidates?.readyForFollowup || 0,
          
          // Error breakdown
          "stats.errorBreakdown": calculatedStats.errorBreakdown,
          

          lastUpdated: getCurrentTimestamp(),
        };

        await adminDb.collection("campaigns").doc(campaignId).update(updateData);

        campaignsUpdated++;
        console.log('[Cron: Update Stats] Campaign updated successfully:', campaignId);

        // Log follow-up candidates if any
        if (calculatedStats.followupCandidates && calculatedStats.followupCandidates.total > 0) {
          console.log('[Cron: Update Stats] Follow-up candidates found:', calculatedStats.followupCandidates.total);
          console.log('[Cron: Update Stats] Not opened (48h):', calculatedStats.followupCandidates.notOpened48h);
          console.log('[Cron: Update Stats] Opened not replied (72h):', calculatedStats.followupCandidates.openedNotReplied72h);
        }

        // Log error breakdown if any failures
        if (calculatedStats.failed && calculatedStats.failed > 0) {
          console.log('[Cron: Update Stats] Error breakdown:', calculatedStats.errorBreakdown);
        }

      } catch (error: any) {
        console.error('[Cron: Update Stats] Error updating campaign:', campaignId);
        logError('Update Campaign Stats', error, { campaignId });
      }
    }

    const duration = Date.now() - startTime;

    console.log('[Cron: Update Stats] Job completed');
    console.log('[Cron: Update Stats] Campaigns updated:', campaignsUpdated);
    console.log('[Cron: Update Stats] Total recipients processed:', totalRecipientsProcessed);
    console.log('[Cron: Update Stats] Duration:', duration + 'ms');

    return NextResponse.json({
      success: true,
      message: 'Stats update job completed',
      summary: {
        campaignsUpdated,
        totalRecipients: totalRecipientsProcessed,
        duration: duration + 'ms',
      },
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    console.error('[Cron: Update Stats] Critical error occurred');
    logError('Update Stats Cron', error);
    console.error('[Cron: Update Stats] Duration:', duration + 'ms');

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        duration: duration + 'ms',
      },
      { status: 500 }
    );
  }
}
