// lib/services/recipient-status-manager.ts

import { adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import type {
  CampaignRecipient,
  EmailError,
  OpenerInfo,
  ReplierInfo,
} from '@/types';
import { createEmailError } from '@/lib/utils/error-helper';
import { logError } from '@/lib/utils/error-helper';
import { SafeArray, normalizeToArray } from '@/lib/utils/data-normalizer';

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

    // Use transaction to ensure atomic updates
    await adminDb.runTransaction(async (transaction) => {
      const recipientDoc = await transaction.get(recipientRef);

      if (!recipientDoc.exists) {
        console.error('[Recipient Status] Recipient not found:', recipientId);
        throw new Error('Recipient not found');
      }

      const recipient = recipientDoc.data() as CampaignRecipient;
      const timestamp = new Date().toISOString();

      // Get existing tracking with safe normalization
      const aggregatedTracking = recipient.aggregatedTracking || {
        everOpened: false,
        totalOpensAcrossAllEmails: 0,
        uniqueOpeners: [],
        everReplied: false,
        uniqueRepliers: [],
        totalRepliesAcrossAllEmails: 0,
        engagementLevel: 'none' as const,
      };

      // SAFE: Normalize uniqueOpeners to array
      const uniqueOpeners = normalizeToArray<OpenerInfo>(
        aggregatedTracking.uniqueOpeners
      );

      // Check if this opener already exists with null-safe check
      const existingOpenerIndex = uniqueOpeners.findIndex(
        (opener) => opener && opener.email && opener.email.toLowerCase() === openerEmail.toLowerCase()
      );

      const emailHistory = normalizeToArray(recipient.emailHistory || []);
      const latestEmailIndex = emailHistory.length - 1;

      let updatedOpeners: OpenerInfo[];
      let totalOpens: number;
      const isNewOpener = existingOpenerIndex === -1;

      if (existingOpenerIndex >= 0) {
        // Existing opener - update their count
        console.log('[Recipient Status] Existing opener detected:', openerEmail);

        updatedOpeners = [...uniqueOpeners];
        const existingOpener = updatedOpeners[existingOpenerIndex];

        // Update opener info
        existingOpener.lastOpenedAt = timestamp;
        existingOpener.totalOpens = (existingOpener.totalOpens || 0) + 1;

        // Add to opens history
        if (!existingOpener.opensHistory) {
          existingOpener.opensHistory = [];
        }
        existingOpener.opensHistory.push({
          emailId: emailHistory[latestEmailIndex]?.emailId || '',
          emailType: 'initial' as const,
          openedAt: timestamp,
        });

        totalOpens = aggregatedTracking.totalOpensAcrossAllEmails + 1;

        console.log('[Recipient Status] Updated existing opener - Total opens:', existingOpener.totalOpens);
      } else {
        // New opener - add to array
        console.log('[Recipient Status] New opener detected:', openerEmail);

        const newOpener: OpenerInfo = {
          name: openerName,
          email: openerEmail,
          organization: openerOrganization,
          firstOpenedAt: timestamp,
          lastOpenedAt: timestamp,
          totalOpens: 1,
          opensHistory: [
            {
              emailId: emailHistory[latestEmailIndex]?.emailId || '',
              emailType: 'initial' as const,
              openedAt: timestamp,
            },
          ],
        };

        updatedOpeners = [...uniqueOpeners, newOpener];
        totalOpens = aggregatedTracking.totalOpensAcrossAllEmails + 1;

        console.log('[Recipient Status] Added new opener - Total unique openers:', updatedOpeners.length);
      }

      // Calculate engagement level
      let engagementLevel: 'high' | 'medium' | 'low' | 'none' = 'low';
      if (totalOpens >= 3) {
        engagementLevel = 'high';
      } else if (totalOpens >= 2) {
        engagementLevel = 'medium';
      }

      // Build opener email index
      const openerEmailIndex = updatedOpeners.map((o) => o.email);

      // Determine status (don't override 'replied')
      const newStatus = recipient.status === 'replied' ? 'replied' : 'opened';

      // Build update object
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

      // Update email history tracking
      if (latestEmailIndex >= 0) {
        const currentEmailTracking = emailHistory[latestEmailIndex]?.tracking || {
          totalOpens: 0,
          uniqueOpenersCount: 0,
          firstOpenAt: null,
          lastOpenAt: null,
        };

        const updatedEmailTracking = {
          ...currentEmailTracking,
          totalOpens: (currentEmailTracking.totalOpens || 0) + 1,
          uniqueOpenersCount: isNewOpener 
            ? (currentEmailTracking.uniqueOpenersCount || 0) + 1 
            : currentEmailTracking.uniqueOpenersCount,
          firstOpenAt: currentEmailTracking.firstOpenAt || timestamp,
          lastOpenAt: timestamp,
        };

        const updatedEmailHistory = [...emailHistory];
        if (updatedEmailHistory[latestEmailIndex]) {
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
        }

        updates.emailHistory = updatedEmailHistory;
      }

      // Perform atomic transaction update
      transaction.update(recipientRef, updates);

      console.log('[Recipient Status] Transaction successful - Updated opener data');
      console.log('[Recipient Status] Unique openers count:', updatedOpeners.length);
      console.log('[Recipient Status] Total opens across all emails:', totalOpens);
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

    // Use transaction to ensure atomic updates
    await adminDb.runTransaction(async (transaction) => {
      const recipientDoc = await transaction.get(recipientRef);

      if (!recipientDoc.exists) {
        console.error('[Recipient Status] Recipient not found:', recipientId);
        throw new Error('Recipient not found');
      }

      const recipient = recipientDoc.data() as CampaignRecipient;
      const timestamp = new Date().toISOString();

      // Get existing tracking with safe normalization
      const aggregatedTracking = recipient.aggregatedTracking || {
        everOpened: false,
        totalOpensAcrossAllEmails: 0,
        uniqueOpeners: [],
        everReplied: false,
        uniqueRepliers: [],
        totalRepliesAcrossAllEmails: 0,
        engagementLevel: 'none' as const,
      };

      // SAFE: Normalize uniqueRepliers to array
      const uniqueRepliers = normalizeToArray<ReplierInfo>(
        aggregatedTracking.uniqueRepliers
      );

      // Check if this replier already exists with null-safe check
      const existingReplierIndex = uniqueRepliers.findIndex(
        (replier) => replier && replier.email && replier.email.toLowerCase() === replierEmail.toLowerCase()
      );

      const emailHistory = normalizeToArray(recipient.emailHistory || []);
      const latestEmailIndex = emailHistory.length - 1;
      const latestEmail = emailHistory[latestEmailIndex];

      let updatedRepliers: ReplierInfo[];
      let totalReplies: number;
      const isNewReplier = existingReplierIndex === -1;

      if (existingReplierIndex >= 0) {
        // Existing replier - update their count
        console.log('[Recipient Status] Existing replier detected:', replierEmail);

        updatedRepliers = [...uniqueRepliers];
        const existingReplier = updatedRepliers[existingReplierIndex];

        // Update replier info
        existingReplier.lastRepliedAt = replyReceivedAt;
        existingReplier.totalReplies = (existingReplier.totalReplies || 0) + 1;

        // Add to replies history
        if (!existingReplier.repliesHistory) {
          existingReplier.repliesHistory = [];
        }
        existingReplier.repliesHistory.push({
          emailId: latestEmail?.emailId || '',
          repliedAt: replyReceivedAt,
        });

        totalReplies = aggregatedTracking.totalRepliesAcrossAllEmails + 1;

        console.log('[Recipient Status] Updated existing replier - Total replies:', existingReplier.totalReplies);
      } else {
        // New replier - add to array
        console.log('[Recipient Status] New replier detected:', replierEmail);

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
        totalReplies = aggregatedTracking.totalRepliesAcrossAllEmails + 1;

        console.log('[Recipient Status] Added new replier - Total unique repliers:', updatedRepliers.length);
      }

      // Build update object
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

      // Update email history tracking (only if index exists)
      if (latestEmailIndex >= 0) {
        // Get current email tracking
        const currentEmailTracking = emailHistory[latestEmailIndex]?.tracking || {
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

        // Update the entire email history array with modified tracking
        const updatedEmailHistory = [...emailHistory];
        if (updatedEmailHistory[latestEmailIndex]) {
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
        }

        updates.emailHistory = updatedEmailHistory;
      }

      // Perform atomic transaction update
      transaction.update(recipientRef, updates);

      console.log('[Recipient Status] Transaction successful - Updated replier data');
      console.log('[Recipient Status] Unique repliers count:', updatedRepliers.length);
      console.log('[Recipient Status] Total replies across all emails:', totalReplies);
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

    // Create error object
    const emailError: EmailError = createEmailError(
      error,
      recipientEmail,
      campaignId,
      retryAttempt
    );

    // Update recipient
    await adminDb.collection('campaignRecipients').doc(recipientId).update({
      status: 'failed',
      failureReason: emailError.errorType,
      lastError: emailError,
      errorHistory: admin.firestore.FieldValue.arrayUnion(emailError),
      retryCount: admin.firestore.FieldValue.increment(1),
      canRetry: emailError.canRetry,
      errorMessage: emailError.friendlyMessage, // Legacy field
      updatedAt: timestamp,
    });

    console.log('[Recipient Status] Marked as failed:', recipientId, emailError.errorType);

    // Log error to campaignErrors collection
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
