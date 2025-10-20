// lib/utils/stats-calculator.ts

import type { CampaignRecipient, CampaignStats } from '@/types';

/**
 * Calculate campaign statistics from recipients
 */
export function calculateCampaignStats(
  recipients: CampaignRecipient[]
): Partial<CampaignStats> {
  const totalRecipients = recipients.length;

  // Count by status
  let pending = 0;
  let sent = 0;
  let delivered = 0;
  let failed = 0;

  // Unique tracking sets
  const uniqueOpenerEmails = new Set<string>();
  const uniqueReplierEmails = new Set<string>();

  // Total counts
  let totalOpens = 0;
  let totalReplies = 0;

  // Error breakdown
  const errorBreakdown: CampaignStats['errorBreakdown'] = {
    AUTH_FAILED: 0,
    INVALID_EMAIL: 0,
    CONNECTION_TIMEOUT: 0,
    QUOTA_EXCEEDED: 0,
    SPAM_BLOCKED: 0,
    SMTP_ERROR: 0,
    UNKNOWN_ERROR: 0,
  };

  // Engagement tracking
  let deliveredNotOpened = 0;
  let openedNotReplied = 0;

  // Follow-up tracking
  let followupsSent = 0;
  const now = new Date();
  const HOURS_48 = 48 * 60 * 60 * 1000;
  const HOURS_72 = 72 * 60 * 60 * 1000;
  let notOpened48h = 0;
  let openedNotReplied72h = 0;

  // Process each recipient
  recipients.forEach((recipient) => {
    const status = recipient.status;

    // Count by status
    switch (status) {
      case 'pending':
        pending++;
        break;
      case 'delivered':
        delivered++;
        sent++;
        if (!recipient.aggregatedTracking?.everOpened) {
          deliveredNotOpened++;
        }
        break;
      case 'opened':
        delivered++;
        sent++;
        if (!recipient.aggregatedTracking?.everReplied) {
          openedNotReplied++;
        }
        break;
      case 'replied':
        delivered++;
        sent++;
        break;
      case 'failed':
        failed++;
        // Count error types
        if (recipient.failureReason && errorBreakdown[recipient.failureReason] !== undefined) {
          errorBreakdown[recipient.failureReason]++;
        }
        break;
    }

    // Unique opens
    if (recipient.aggregatedTracking?.uniqueOpeners) {
      recipient.aggregatedTracking.uniqueOpeners.forEach((opener) => {
        uniqueOpenerEmails.add(opener.email);
        totalOpens += opener.totalOpens || 0;
      });
    }

    // Total opens from tracking
    if (recipient.aggregatedTracking?.totalOpensAcrossAllEmails) {
      // Already counted above, but keep this as fallback
    }

    // Unique replies
    if (recipient.aggregatedTracking?.uniqueRepliers) {
      recipient.aggregatedTracking.uniqueRepliers.forEach((replier) => {
        uniqueReplierEmails.add(replier.email);
        totalReplies += replier.totalReplies || 0;
      });
    }

    // Total replies from tracking
    if (recipient.aggregatedTracking?.totalRepliesAcrossAllEmails) {
      // Already counted above
    }

    // Follow-up tracking
    if (recipient.followupSent) {
      followupsSent++;
    }

    // Follow-up candidates
    if (recipient.deliveredAt && !recipient.followupSent) {
      const deliveredTime = new Date(recipient.deliveredAt).getTime();
      const timeSince = now.getTime() - deliveredTime;

      // Not opened after 48h
      if (!recipient.aggregatedTracking?.everOpened && timeSince > HOURS_48) {
        notOpened48h++;
      }

      // Opened but not replied after 72h
      if (
        recipient.aggregatedTracking?.everOpened &&
        !recipient.aggregatedTracking?.everReplied &&
        timeSince > HOURS_72
      ) {
        openedNotReplied72h++;
      }
    }
  });

  // Calculate unique counts
  const uniqueOpened = uniqueOpenerEmails.size;
  const uniqueReplied = uniqueReplierEmails.size;

  // Calculate rates
  const deliveryRate = sent > 0 ? Math.round((delivered / sent) * 100) : 0;
  const openRate = delivered > 0 ? Math.round((uniqueOpened / delivered) * 100) : 0;
  const replyRate = delivered > 0 ? Math.round((uniqueReplied / delivered) * 100) : 0;
  const averageOpensPerPerson = uniqueOpened > 0 ? totalOpens / uniqueOpened : 0;

  // Build stats object
  const stats: Partial<CampaignStats> = {
    // Basic counts
    pending,
    sent,
    delivered,
    failed,
    totalEmailsSent: sent,
    totalDelivered: delivered,
    totalFailed: failed,

    // Unique tracking
    uniqueOpened,
    totalOpens,
    averageOpensPerPerson: Math.round(averageOpensPerPerson * 100) / 100,
    uniqueResponded: uniqueReplied,
    totalResponses: totalReplies,

    // Rates
    deliveryRate,
    openRate,
    replyRate,
    responseRate: replyRate,

    // Engagement
    deliveredNotOpened,
    openedNotReplied,

    // Conversion funnel
    conversionFunnel: {
      sent,
      delivered,
      opened: uniqueOpened,
      replied: uniqueReplied,
    },

    // Engagement quality
    engagementQuality: {
      openedOnce: uniqueOpened > 0 ? uniqueOpened - (totalOpens - uniqueOpened) : 0,
      openedMultiple: totalOpens > uniqueOpened ? totalOpens - uniqueOpened : 0,
      openedButNoReply: openedNotReplied,
      deliveredButNoOpen: deliveredNotOpened,
    },

    // Follow-ups
    totalFollowUpsSent: followupsSent,
    followupCandidates: {
      notOpened48h,
      openedNotReplied72h,
      total: notOpened48h + openedNotReplied72h,
      readyForFollowup: notOpened48h + openedNotReplied72h,
    },

    // Errors
    errorBreakdown,

    // Legacy fields (for compatibility)
    opened: uniqueOpened,
    replied: uniqueReplied,
  };

  return stats;
}

/**
 * Count unique openers from recipients
 */
export function countUniqueOpeners(recipients: CampaignRecipient[]): number {
  const uniqueEmails = new Set<string>();

  recipients.forEach((recipient) => {
    if (recipient.aggregatedTracking?.uniqueOpeners) {
      recipient.aggregatedTracking.uniqueOpeners.forEach((opener) => {
        uniqueEmails.add(opener.email);
      });
    }
  });

  return uniqueEmails.size;
}

/**
 * Count unique repliers from recipients
 */
export function countUniqueRepliers(recipients: CampaignRecipient[]): number {
  const uniqueEmails = new Set<string>();

  recipients.forEach((recipient) => {
    if (recipient.aggregatedTracking?.uniqueRepliers) {
      recipient.aggregatedTracking.uniqueRepliers.forEach((replier) => {
        uniqueEmails.add(replier.email);
      });
    }
  });

  return uniqueEmails.size;
}

/**
 * Calculate total opens across all recipients
 */
export function calculateTotalOpens(recipients: CampaignRecipient[]): number {
  let total = 0;

  recipients.forEach((recipient) => {
    if (recipient.aggregatedTracking?.totalOpensAcrossAllEmails) {
      total += recipient.aggregatedTracking.totalOpensAcrossAllEmails;
    }
  });

  return total;
}

/**
 * Calculate total replies across all recipients
 */
export function calculateTotalReplies(recipients: CampaignRecipient[]): number {
  let total = 0;

  recipients.forEach((recipient) => {
    if (recipient.aggregatedTracking?.totalRepliesAcrossAllEmails) {
      total += recipient.aggregatedTracking.totalRepliesAcrossAllEmails;
    }
  });

  return total;
}
