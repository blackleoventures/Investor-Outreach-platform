import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyFirebaseToken, verifyAdminOrSubadmin, createAuthErrorResponse } from '@/lib/auth-middleware';
import { getDaysSince } from '@/lib/utils/date-helper';
import { isDevelopment } from '@/lib/config/environment';

export const maxDuration = 60;

// Environment-based time thresholds
const TIME_THRESHOLDS = {
  development: {
    deliveredNotOpened: 5, // 5 minutes
    openedNotReplied: 10, // 10 minutes
    minFollowUpGap: 1, // 1 minute between follow-ups
  },
  production: {
    deliveredNotOpened: 48 * 60, // 48 hours in minutes
    openedNotReplied: 72 * 60, // 72 hours in minutes
    minFollowUpGap: 24 * 60, // 24 hours in minutes
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication and authorization
    const user = await verifyFirebaseToken(request);
    verifyAdminOrSubadmin(user);

    const campaignId = params.id;

    // Get environment-specific thresholds
    const thresholds = isDevelopment() 
      ? TIME_THRESHOLDS.development 
      : TIME_THRESHOLDS.production;

    console.log(
      `[Followup Candidates] Using ${isDevelopment() ? 'DEVELOPMENT' : 'PRODUCTION'} thresholds:`,
      thresholds
    );

    // Verify campaign exists
    const campaignDoc = await adminDb.collection('campaigns').doc(campaignId).get();
    if (!campaignDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const campaignData = campaignDoc.data();

    console.log(
      `[Followup Candidates] User ${user.email} fetching candidates for campaign ${campaignId}`
    );

    // Get all recipients for this campaign
    const recipientsSnapshot = await adminDb
      .collection('campaignRecipients')
      .where('campaignId', '==', campaignId)
      .get();

    if (recipientsSnapshot.empty) {
      return NextResponse.json({
        success: true,
        campaign: {
          id: campaignId,
          name: campaignData?.campaignName || 'Unknown',
        },
        candidates: {
          deliveredNotOpened: [],
          openedNotReplied: [],
        },
        summary: {
          totalDeliveredNotOpened: 0,
          totalOpenedNotReplied: 0,
          totalCandidates: 0,
        },
      });
    }

    // Process recipients to find follow-up candidates
    const deliveredNotOpened: any[] = [];
    const openedNotReplied: any[] = [];

    recipientsSnapshot.forEach((doc) => {
      const data = doc.data();

      // Build recipient object using NEW followUps structure
      const recipient = {
        id: doc.id,
        name: data.originalContact?.name || data.contactInfo?.name || 'Unknown',
        email: data.originalContact?.email || data.contactInfo?.email || '',
        organization:
          data.originalContact?.organization || data.contactInfo?.organization || 'Unknown',
        recipientType: data.recipientType || 'investor',
        status: data.status,
        sentAt: data.sentAt,
        deliveredAt: data.deliveredAt,
        openedAt: data.openedAt,
        repliedAt: data.repliedAt,
        emailsSent: data.emailHistory?.length || 0,
        totalOpens: data.aggregatedTracking?.totalOpensAcrossAllEmails || 0,
        
        // UPDATED: Use new followUps structure
        followUpsSent: data.followUps?.totalSent || 0,
        pendingFollowUps: data.followUps?.pendingCount || 0,
        lastFollowUpSent: data.followUps?.lastFollowUpSent || null,
      };

      // RULE 1: Delivered but not opened
      if (
        data.status === 'delivered' &&
        !data.aggregatedTracking?.everOpened &&
        data.deliveredAt
      ) {
        const minutesSinceDelivered = getDaysSince(data.deliveredAt) * 24 * 60;

        if (minutesSinceDelivered >= thresholds.deliveredNotOpened) {
          // Check minimum gap between follow-ups
          let canSend = true;
          if (data.followUps?.lastFollowUpSent) {
            const minutesSinceLastFollowUp = getDaysSince(data.followUps.lastFollowUpSent) * 24 * 60;
            if (minutesSinceLastFollowUp < thresholds.minFollowUpGap) {
              canSend = false;
            }
          }

          if (canSend) {
            deliveredNotOpened.push({
              ...recipient,
              daysSinceSent: Math.floor(minutesSinceDelivered / (24 * 60)),
              minutesSinceSent: Math.floor(minutesSinceDelivered),
              followupType: 'not_opened',
            });
          }
        }
      }

      // RULE 2: Opened but not replied
      if (
        (data.status === 'opened' || data.aggregatedTracking?.everOpened) &&
        !data.aggregatedTracking?.everReplied &&
        data.openedAt
      ) {
        const minutesSinceOpened = getDaysSince(data.openedAt) * 24 * 60;

        if (minutesSinceOpened >= thresholds.openedNotReplied) {
          // Check minimum gap between follow-ups
          let canSend = true;
          if (data.followUps?.lastFollowUpSent) {
            const minutesSinceLastFollowUp = getDaysSince(data.followUps.lastFollowUpSent) * 24 * 60;
            if (minutesSinceLastFollowUp < thresholds.minFollowUpGap) {
              canSend = false;
            }
          }

          if (canSend) {
            openedNotReplied.push({
              ...recipient,
              daysSinceOpened: Math.floor(minutesSinceOpened / (24 * 60)),
              minutesSinceOpened: Math.floor(minutesSinceOpened),
              followupType: 'opened_not_replied',
            });
          }
        }
      }
    });

    // Sort by urgency (most time elapsed first)
    deliveredNotOpened.sort((a, b) => b.minutesSinceSent - a.minutesSinceSent);
    openedNotReplied.sort((a, b) => b.minutesSinceOpened - a.minutesSinceOpened);

    const response = {
      success: true,
      environment: isDevelopment() ? 'development' : 'production',
      thresholds: {
        deliveredNotOpened: `${thresholds.deliveredNotOpened} minutes`,
        openedNotReplied: `${thresholds.openedNotReplied} minutes`,
        minFollowUpGap: `${thresholds.minFollowUpGap} minutes`,
      },
      campaign: {
        id: campaignId,
        name: campaignData?.campaignName || 'Unknown Campaign',
        clientId: campaignData?.clientId,
        emailTemplate: {
          subject: campaignData?.emailTemplate?.currentSubject || '',
          body: campaignData?.emailTemplate?.currentBody || '',
        },
      },
      candidates: {
        deliveredNotOpened,
        openedNotReplied,
      },
      summary: {
        totalDeliveredNotOpened: deliveredNotOpened.length,
        totalOpenedNotReplied: openedNotReplied.length,
        totalCandidates: deliveredNotOpened.length + openedNotReplied.length,
      },
    };

    console.log(
      `[Followup Candidates] Found ${response.summary.totalCandidates} candidates (${deliveredNotOpened.length} not opened, ${openedNotReplied.length} opened not replied)`
    );

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Followup Candidates] Error:', error.message);
    return createAuthErrorResponse(error);
  }
}
