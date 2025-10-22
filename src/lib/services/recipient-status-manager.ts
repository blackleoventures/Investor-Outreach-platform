import { adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import type {
  CampaignRecipient,
  EmailError,
  OpenerInfo,
  ReplierInfo,
  EmailHistoryItem,
} from '@/types';
import { createEmailError, logError } from '@/lib/utils/error-helper';
import { normalizeToArray } from '@/lib/utils/data-normalizer';

/**
 * Update recipient status to delivered
 */
export async function markAsDelivered(
  recipientId: string,
  emailId: string,
  subject: string
): Promise<void> {
  const timestamp = new Date().toISOString();

  const emailHistoryEntry = {
    emailId,
    type: 'initial' as const,
    subject,
    sentAt: timestamp,
    deliveredAt: timestamp,
    status: 'delivered' as const,
    openedBy: [],
    repliedBy: [],
    tracking: {
      totalOpens: 0,
      uniqueOpenersCount: 0,
      firstOpenAt: null,
      lastOpenAt: null,
      totalReplies: 0,
      firstReplyAt: null,
      lastReplyAt: null,
    },
  };

  await adminDb.collection('campaignRecipients').doc(recipientId).update({
    status: 'delivered',
    sentAt: timestamp,
    deliveredAt: timestamp,
    emailHistory: admin.firestore.FieldValue.arrayUnion(emailHistoryEntry),
    updatedAt: timestamp,

    // Initialize aggregatedTracking if it doesn't exist
    'aggregatedTracking.everOpened': false,
    'aggregatedTracking.totalOpensAcrossAllEmails': 0,
    'aggregatedTracking.uniqueOpeners': [],
    'aggregatedTracking.everReplied': false,
    'aggregatedTracking.uniqueRepliers': [],
    'aggregatedTracking.totalRepliesAcrossAllEmails': 0,
    'aggregatedTracking.engagementLevel': 'none',
  });

  console.log('[Recipient Status] Marked as delivered:', recipientId);
}

/**
 * Mark recipient as opened (unique tracking) - ATOMIC TRANSACTION VERSION
 */
export async function markAsOpened(
  recipientId: string,
  openerEmail: string,
  openerName: string,
  openerOrganization: string
): Promise<void> {
  try {
    const recipientRef = adminDb.collection('campaignRecipients').doc(recipientId);

    await adminDb.runTransaction(async (transaction) => {
      const recipientDoc = await transaction.get(recipientRef);
      if (!recipientDoc.exists) {
        console.error('[Recipient Status] Recipient not found:', recipientId);
        throw new Error('Recipient not found');
      }
      const recipient = recipientDoc.data() as CampaignRecipient;
      const timestamp = new Date().toISOString();

      const aggregatedTracking = recipient.aggregatedTracking || {
        everOpened: false,
        totalOpensAcrossAllEmails: 0,
        uniqueOpeners: [],
        everReplied: false,
        uniqueRepliers: [],
        totalRepliesAcrossAllEmails: 0,
        engagementLevel: 'none' as const,
      };

      const uniqueOpeners = normalizeToArray<OpenerInfo>(aggregatedTracking.uniqueOpeners);
      const existingOpenerIndex = uniqueOpeners.findIndex(
        (opener) => opener?.email?.toLowerCase() === openerEmail.toLowerCase()
      );

      const emailHistory = normalizeToArray<EmailHistoryItem>(recipient.emailHistory || []);
      const latestEmailIndex = emailHistory.length - 1;
      const latestEmail = emailHistory[latestEmailIndex];

      let updatedOpeners: OpenerInfo[];
      let totalOpens: number;
      const isNewOpener = existingOpenerIndex === -1;

      if (existingOpenerIndex >= 0) {
        updatedOpeners = [...uniqueOpeners];
        const existingOpener = updatedOpeners[existingOpenerIndex];

        existingOpener.lastOpenedAt = timestamp;
        existingOpener.totalOpens = (existingOpener.totalOpens || 0) + 1;
        existingOpener.opensHistory = existingOpener.opensHistory || [];
        existingOpener.opensHistory.push({
          emailId: latestEmail?.emailId || '',
          emailType: 'initial' as const,
          openedAt: timestamp,
        });

        totalOpens = (aggregatedTracking.totalOpensAcrossAllEmails || 0) + 1;

        console.log('[Recipient Status] Updated existing opener - Total opens:', existingOpener.totalOpens);

      } else {
        const newOpener: OpenerInfo = {
          name: openerName,
          email: openerEmail,
          organization: openerOrganization,
          firstOpenedAt: timestamp,
          lastOpenedAt: timestamp,
          totalOpens: 1,
          opensHistory: [
            {
              emailId: latestEmail?.emailId || '',
              emailType: 'initial' as const,
              openedAt: timestamp,
            },
          ],
        };

        updatedOpeners = [...uniqueOpeners, newOpener];
        totalOpens = (aggregatedTracking.totalOpensAcrossAllEmails || 0) + 1;

        console.log('[Recipient Status] Added new opener - Total unique openers:', updatedOpeners.length);
      }

      let engagementLevel: 'high' | 'medium' | 'low' | 'none' = 'low';
      if (totalOpens >= 3) engagementLevel = 'high';
      else if (totalOpens >= 2) engagementLevel = 'medium';

      const openerEmailIndex = updatedOpeners.map((o) => o.email);

      const newStatus = recipient.status === 'replied' ? 'replied' : 'opened';

      const updates: any = {
        status: newStatus,
        openedAt: isNewOpener ? timestamp : (recipient.openedAt || timestamp),
        'aggregatedTracking.everOpened': true,
        'aggregatedTracking.uniqueOpeners': updatedOpeners,
        'aggregatedTracking.totalOpensAcrossAllEmails': totalOpens,
        'aggregatedTracking.uniqueOpenerCount': updatedOpeners.length,
        'aggregatedTracking.openerEmailIndex': openerEmailIndex,
        'aggregatedTracking.engagementLevel': engagementLevel,
        updatedAt: timestamp,
      };

      if (latestEmailIndex >= 0) {
        const currentEmailTracking = emailHistory[latestEmailIndex].tracking || {
          totalOpens: 0,
          uniqueOpenersCount: 0,
          firstOpenAt: null,
          lastOpenAt: null,
        };

        const updatedEmailTracking = {
          ...currentEmailTracking,
          totalOpens: (currentEmailTracking.totalOpens || 0) + 1,
          uniqueOpenersCount: isNewOpener ? (currentEmailTracking.uniqueOpenersCount || 0) + 1 : currentEmailTracking.uniqueOpenersCount,
          firstOpenAt: currentEmailTracking.firstOpenAt || timestamp,
          lastOpenAt: timestamp,
        };

        const updatedEmailHistory = [...emailHistory];
        updatedEmailHistory[latestEmailIndex] = {
          ...updatedEmailHistory[latestEmailIndex],
          tracking: updatedEmailTracking,
          openedBy: [
            ...(updatedEmailHistory[latestEmailIndex].openedBy || []),
            {
              name: openerName,
              email: openerEmail,
              organization: openerOrganization,
              openedAt: timestamp,
            },
          ],
        };

        updates.emailHistory = updatedEmailHistory;
      }

      transaction.update(recipientRef, updates);

      console.log('[Recipient Status] Transaction successful - Updated opener data');
    });

    console.log('[Recipient Status] Open tracking completed successfully');
  } catch (error: any) {
    console.error('[markAsOpened] Error occurred:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      recipientId,
      openerEmail,
    });
    logError('markAsOpened', error, { recipientId, openerEmail });
    throw error;
  }
}

/**
 * Mark recipient as replied (unique tracking) - ATOMIC TRANSACTION VERSION
 */
export async function markAsReplied(
  recipientId: string,
  replierEmail: string,
  replierName: string,
  replierOrganization: string,
  replyReceivedAt: string
): Promise<void> {
  try {
    const recipientRef = adminDb.collection('campaignRecipients').doc(recipientId);

    await adminDb.runTransaction(async (transaction) => {
      const recipientDoc = await transaction.get(recipientRef);
      if (!recipientDoc.exists) {
        throw new Error('Recipient not found');
      }

      const recipient = recipientDoc.data() as CampaignRecipient;
      const timestamp = new Date().toISOString();

      const aggregatedTracking = recipient.aggregatedTracking || {
        everOpened: false,
        totalOpensAcrossAllEmails: 0,
        uniqueOpeners: [],
        everReplied: false,
        uniqueRepliers: [],
        totalRepliesAcrossAllEmails: 0,
        engagementLevel: 'none' as const,
      };

      const uniqueRepliers = normalizeToArray<ReplierInfo>(aggregatedTracking.uniqueRepliers);

      const existingReplierIndex = uniqueRepliers.findIndex(
        (replier) => replier?.email?.toLowerCase() === replierEmail.toLowerCase()
      );

      const emailHistory = normalizeToArray<EmailHistoryItem>(recipient.emailHistory || []);
      const latestEmailIndex = emailHistory.length - 1;
      const latestEmail = emailHistory[latestEmailIndex];

      let updatedRepliers: ReplierInfo[];
      let totalReplies: number;
      const isNewReplier = existingReplierIndex === -1;

      if (existingReplierIndex >= 0) {
        // update existing replier
        updatedRepliers = [...uniqueRepliers];
        const existingReplier = updatedRepliers[existingReplierIndex];

        existingReplier.lastRepliedAt = replyReceivedAt;
        existingReplier.totalReplies = (existingReplier.totalReplies || 0) + 1;
        existingReplier.repliesHistory = existingReplier.repliesHistory || [];
        existingReplier.repliesHistory.push({
          emailId: latestEmail?.emailId || '',
          repliedAt: replyReceivedAt,
        });

        totalReplies = (aggregatedTracking.totalRepliesAcrossAllEmails || 0) + 1;
      } else {
        // add new replier
        const newReplier: ReplierInfo = {
          name: replierName,
          email: replierEmail,
          organization: replierOrganization,
          firstRepliedAt: replyReceivedAt,
          lastRepliedAt: replyReceivedAt,
          totalReplies: 1,
          repliesHistory: [
            {
              emailId: latestEmail?.emailId || '',
              repliedAt: replyReceivedAt,
            },
          ],
        };

        updatedRepliers = [...uniqueRepliers, newReplier];
        totalReplies = (aggregatedTracking.totalRepliesAcrossAllEmails || 0) + 1;
      }

      const updates: any = {
        status: 'replied',
        repliedAt: isNewReplier ? replyReceivedAt : (recipient.repliedAt || replyReceivedAt),
        'aggregatedTracking.everReplied': true,
        'aggregatedTracking.uniqueRepliers': updatedRepliers,
        'aggregatedTracking.totalRepliesAcrossAllEmails': totalReplies,
        'aggregatedTracking.uniqueReplierCount': updatedRepliers.length,
        'aggregatedTracking.engagementLevel': 'high',
        updatedAt: timestamp,
      };

      if (latestEmailIndex >= 0) {
        const currentEmailTracking = emailHistory[latestEmailIndex].tracking || {
          totalReplies: 0,
          firstReplyAt: null,
          lastReplyAt: null,
        };

        const updatedEmailTracking = {
          ...currentEmailTracking,
          totalReplies: (currentEmailTracking.totalReplies || 0) + 1,
          firstReplyAt: currentEmailTracking.firstReplyAt || replyReceivedAt,
          lastReplyAt: replyReceivedAt,
        };

        const updatedEmailHistory = [...emailHistory];
        updatedEmailHistory[latestEmailIndex] = {
          ...updatedEmailHistory[latestEmailIndex],
          tracking: updatedEmailTracking,
          repliedBy: [
            ...(updatedEmailHistory[latestEmailIndex].repliedBy || []),
            {
              name: replierName,
              email: replierEmail,
              organization: replierOrganization,
              repliedAt: replyReceivedAt,
            },
          ],
        };

        updates.emailHistory = updatedEmailHistory;
      }

      transaction.update(recipientRef, updates);

      console.log('[Recipient Status] Transaction successful - Updated replier data');
    });

    console.log('[Recipient Status] Reply tracking completed successfully');
  } catch (error: any) {
    console.error('[markAsReplied] Error occurred:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      recipientId,
      replierEmail,
    });
    logError('markAsReplied', error, { recipientId, replierEmail });
    throw error;
  }
}

/**
 * Mark recipient as failed with error details
 */
export async function markAsFailed(
  recipientId: string,
  error: any,
  recipientEmail: string,
  campaignId: string,
  retryAttempt: number = 0
): Promise<void> {
  try {
    const timestamp = new Date().toISOString();

    const emailError: EmailError = createEmailError(
      error,
      recipientEmail,
      campaignId,
      retryAttempt
    );

    await adminDb.collection('campaignRecipients').doc(recipientId).update({
      status: 'failed',
      failureReason: emailError.errorType,
      lastError: emailError,
      errorHistory: admin.firestore.FieldValue.arrayUnion(emailError),
      retryCount: admin.firestore.FieldValue.increment(1),
      canRetry: emailError.canRetry,
      errorMessage: emailError.friendlyMessage,
      updatedAt: timestamp,
    });

    console.log('[Recipient Status] Marked as failed:', recipientId, emailError.errorType);

    await adminDb.collection('campaignErrors').add({
      campaignId,
      recipientId,
      recipientEmail,
      errorType: emailError.errorType,
      errorMessage: emailError.errorMessage,
      friendlyMessage: emailError.friendlyMessage,
      timestamp,
      retryAttempt,
      canRetry: emailError.canRetry,
    });
  } catch (err: any) {
    logError('markAsFailed', err, { recipientId, recipientEmail });
    throw err;
  }
}

/**
 * Mark recipient as followed up
 */
export async function markAsFollowedUp(
  recipientId: string,
  followupEmailId: string,
  followupSubject: string,
  followupType: 'followup_opened_no_reply' | 'followup_not_opened'
): Promise<void> {
  try {
    const timestamp = new Date().toISOString();

    const followupEmail = {
      emailId: followupEmailId,
      type: followupType,
      subject: followupSubject,
      sentAt: timestamp,
      deliveredAt: timestamp,
      status: 'delivered' as const,
      openedBy: [],
      repliedBy: [],
      tracking: {
        totalOpens: 0,
        uniqueOpenersCount: 0,
        firstOpenAt: null,
        lastOpenAt: null,
        totalReplies: 0,
        firstReplyAt: null,
        lastReplyAt: null,
      },
    };

    await adminDb.collection('campaignRecipients').doc(recipientId).update({
      followupSent: true,
      followupSentAt: timestamp,
      followupCount: admin.firestore.FieldValue.increment(1),
      emailHistory: admin.firestore.FieldValue.arrayUnion(followupEmail),
      updatedAt: timestamp,
    });

    console.log('[Recipient Status] Marked as followed up:', recipientId);
  } catch (error: any) {
    logError('markAsFollowedUp', error, { recipientId });
    throw error;
  }
}

/**
 * Reset retry count for failed recipient
 */
export async function resetRetryCount(recipientId: string): Promise<void> {
  await adminDb.collection('campaignRecipients').doc(recipientId).update({
    retryCount: 0,
    status: 'pending',
    canRetry: true,
    updatedAt: new Date().toISOString(),
  });

  console.log('[Recipient Status] Reset retry count:', recipientId);
}

