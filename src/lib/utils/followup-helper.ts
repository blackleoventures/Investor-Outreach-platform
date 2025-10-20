// lib/utils/followup-helper.ts

import { adminDb } from '@/lib/firebase-admin';
import type { FollowupCandidate, CampaignRecipient } from '@/types';

/**
 * Get follow-up candidates for a campaign
 */
export async function getFollowupCandidates(
  campaignId: string
): Promise<FollowupCandidate[]> {
  const candidates: FollowupCandidate[] = [];
  const now = new Date();

  console.log('[Follow-up Helper] Fetching candidates for campaign:', campaignId);

  // Query recipients
  const recipientsSnapshot = await adminDb
    .collection('campaignRecipients')
    .where('campaignId', '==', campaignId)
    .where('status', 'in', ['delivered', 'opened'])
    .where('followupSent', '==', false)
    .get();

  console.log('[Follow-up Helper] Found', recipientsSnapshot.size, 'potential candidates');

  recipientsSnapshot.forEach((doc) => {
    const recipient = doc.data() as CampaignRecipient;

    if (!recipient.deliveredAt) return;

    const deliveredTime = new Date(recipient.deliveredAt);
    const hoursSince = (now.getTime() - deliveredTime.getTime()) / (1000 * 60 * 60);
    const daysSince = hoursSince / 24;

    // Check if eligible for follow-up
    const eligibility = shouldShowInFollowup(recipient, hoursSince);

    if (eligibility.shouldShow) {
      const candidate: FollowupCandidate = {
        id: recipient.id || doc.id,
        campaignId: recipient.campaignId,
        recipientEmail: recipient.originalContact.email,
        recipientName: recipient.originalContact.name,
        organization: recipient.originalContact.organization,
        followupReason: eligibility.reason!,
        emailSentAt: recipient.deliveredAt,
        lastOpenedAt: recipient.openedAt,
        daysSinceDelivery: Math.floor(daysSince),
        hoursSinceDelivery: Math.floor(hoursSince),
        openCount: recipient.aggregatedTracking?.totalOpensAcrossAllEmails || 0,
        hasReplied: recipient.aggregatedTracking?.everReplied || false,
        followupSent: recipient.followupSent || false,
        followupSentAt: recipient.followupSentAt,
        followupCount: recipient.followupCount || 0,
      };

      candidates.push(candidate);
    }
  });

  console.log('[Follow-up Helper] Eligible candidates:', candidates.length);

  return candidates;
}

/**
 * Determine if recipient should show in follow-up list
 */
export function shouldShowInFollowup(
  recipient: CampaignRecipient,
  hoursSinceDelivery: number
): { shouldShow: boolean; reason?: 'not_opened' | 'opened_not_replied' } {
  // Already sent follow-up - exclude
  if (recipient.followupSent) {
    return { shouldShow: false };
  }

  // Already replied - exclude
  if (recipient.aggregatedTracking?.everReplied) {
    return { shouldShow: false };
  }

  // Not opened after 48 hours
  if (!recipient.aggregatedTracking?.everOpened && hoursSinceDelivery >= 48) {
    return { shouldShow: true, reason: 'not_opened' };
  }

  // Opened but not replied after 72 hours
  if (
    recipient.aggregatedTracking?.everOpened &&
    !recipient.aggregatedTracking?.everReplied &&
    hoursSinceDelivery >= 72
  ) {
    return { shouldShow: true, reason: 'opened_not_replied' };
  }

  return { shouldShow: false };
}

/**
 * Calculate days since delivery
 */
export function calculateDaysSince(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculate hours since delivery
 */
export function calculateHoursSince(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60));
}

/**
 * Group follow-up candidates by reason
 */
export function groupByReason(
  candidates: FollowupCandidate[]
): {
  notOpened: FollowupCandidate[];
  openedNotReplied: FollowupCandidate[];
} {
  return {
    notOpened: candidates.filter((c) => c.followupReason === 'not_opened'),
    openedNotReplied: candidates.filter((c) => c.followupReason === 'opened_not_replied'),
  };
}

/**
 * Sort candidates by days since delivery (oldest first)
 */
export function sortByOldest(candidates: FollowupCandidate[]): FollowupCandidate[] {
  return [...candidates].sort((a, b) => b.daysSinceDelivery - a.daysSinceDelivery);
}
