import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyFirebaseToken, verifyAdminOrSubadmin, createAuthErrorResponse } from '@/lib/auth-middleware';
import { getDaysSince } from '@/lib/utils/date-helper';

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

      // Build recipient object
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
        followUpsSent: data.followUps?.totalSent || 0,
        lastFollowUpSent: data.followUps?.lastFollowUpSent || null,
      };

      // RULE 1: Delivered but not opened (>48 hours)
      if (
        data.status === 'delivered' &&
        !data.aggregatedTracking?.everOpened &&
        data.deliveredAt
      ) {
        const hoursSinceDelivered = getDaysSince(data.deliveredAt) * 24;

        if (hoursSinceDelivered >= 48) {
          const followUpsSent = data.followUps?.totalSent || 0;

          // Max 2 follow-ups allowed
          if (followUpsSent < 2) {
            // Check minimum 24-hour gap between follow-ups
            let canSend = true;
            if (data.followUps?.lastFollowUpSent) {
              const hoursSinceLastFollowUp = getDaysSince(data.followUps.lastFollowUpSent) * 24;
              if (hoursSinceLastFollowUp < 24) {
                canSend = false;
              }
            }

            if (canSend) {
              deliveredNotOpened.push({
                ...recipient,
                daysSinceSent: Math.floor(hoursSinceDelivered / 24),
                hoursSinceSent: Math.floor(hoursSinceDelivered),
                followupType: 'not_opened',
              });
            }
          }
        }
      }

      // RULE 2: Opened but not replied (>72 hours)
      if (
        (data.status === 'opened' || data.aggregatedTracking?.everOpened) &&
        !data.aggregatedTracking?.everReplied &&
        data.openedAt
      ) {
        const hoursSinceOpened = getDaysSince(data.openedAt) * 24;

        if (hoursSinceOpened >= 72) {
          const followUpsSent = data.followUps?.totalSent || 0;

          // Max 2 follow-ups allowed
          if (followUpsSent < 2) {
            // Check minimum 24-hour gap between follow-ups
            let canSend = true;
            if (data.followUps?.lastFollowUpSent) {
              const hoursSinceLastFollowUp = getDaysSince(data.followUps.lastFollowUpSent) * 24;
              if (hoursSinceLastFollowUp < 24) {
                canSend = false;
              }
            }

            if (canSend) {
              openedNotReplied.push({
                ...recipient,
                daysSinceOpened: Math.floor(hoursSinceOpened / 24),
                hoursSinceOpened: Math.floor(hoursSinceOpened),
                followupType: 'opened_not_replied',
              });
            }
          }
        }
      }
    });

    // Sort by urgency (most days first)
    deliveredNotOpened.sort((a, b) => b.daysSinceSent - a.daysSinceSent);
    openedNotReplied.sort((a, b) => b.daysSinceOpened - a.daysSinceOpened);

    const response = {
      success: true,
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
