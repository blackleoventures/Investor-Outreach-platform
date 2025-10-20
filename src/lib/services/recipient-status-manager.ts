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
 * Mark recipient as opened (unique tracking)
 */
export async function markAsOpened(
  recipientId: string,
  openerEmail: string,
  openerName: string,
  openerOrganization: string
): Promise<void> {
  try {
    const recipientRef = adminDb.collection('campaignRecipients').doc(recipientId);
    const recipientDoc = await recipientRef.get();

    if (!recipientDoc.exists) {
      console.error('[Recipient Status] Recipient not found:', recipientId);
      return;
    }

    const recipient = recipientDoc.data() as CampaignRecipient;
    const timestamp = new Date().toISOString();

    // Get existing tracking
    const aggregatedTracking = recipient.aggregatedTracking || {
      everOpened: false,
      totalOpensAcrossAllEmails: 0,
      uniqueOpeners: [],
      everReplied: false,
      uniqueRepliers: [],
      totalRepliesAcrossAllEmails: 0,
      engagementLevel: 'none' as const,
    };

    // Check if this opener already exists
    const existingOpenerIndex = aggregatedTracking.uniqueOpeners?.findIndex(
      (opener) => opener.email.toLowerCase() === openerEmail.toLowerCase()
    );

    const emailHistory = recipient.emailHistory || [];
    const latestEmailIndex = emailHistory.length - 1;

    if (existingOpenerIndex !== undefined && existingOpenerIndex >= 0) {
      // Existing opener - increment their count
      console.log('[Recipient Status] Existing opener detected:', openerEmail);

      const existingOpener = aggregatedTracking.uniqueOpeners[existingOpenerIndex];
      
      // Update opener info
      await recipientRef.update({
        [`aggregatedTracking.uniqueOpeners.${existingOpenerIndex}.totalOpens`]:
          admin.firestore.FieldValue.increment(1),
        [`aggregatedTracking.uniqueOpeners.${existingOpenerIndex}.lastOpenedAt`]: timestamp,
        'aggregatedTracking.totalOpensAcrossAllEmails':
          admin.firestore.FieldValue.increment(1),
        
        // Update latest email tracking
        [`emailHistory.${latestEmailIndex}.tracking.totalOpens`]:
          admin.firestore.FieldValue.increment(1),
        [`emailHistory.${latestEmailIndex}.tracking.lastOpenAt`]: timestamp,
        
        updatedAt: timestamp,
      });

      console.log('[Recipient Status] Incremented open count for:', openerEmail);
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

      // Update with new opener
      await recipientRef.update({
        status: 'opened',
        openedAt: timestamp,
        'aggregatedTracking.everOpened': true,
        'aggregatedTracking.totalOpensAcrossAllEmails':
          admin.firestore.FieldValue.increment(1),
        'aggregatedTracking.uniqueOpeners':
          admin.firestore.FieldValue.arrayUnion(newOpener),
        'aggregatedTracking.uniqueOpenerCount':
          admin.firestore.FieldValue.increment(1),
        'aggregatedTracking.engagementLevel': 'medium',
        
        // Update latest email tracking
        [`emailHistory.${latestEmailIndex}.tracking.totalOpens`]: 1,
        [`emailHistory.${latestEmailIndex}.tracking.uniqueOpenersCount`]: 1,
        [`emailHistory.${latestEmailIndex}.tracking.firstOpenAt`]: timestamp,
        [`emailHistory.${latestEmailIndex}.tracking.lastOpenAt`]: timestamp,
        [`emailHistory.${latestEmailIndex}.openedBy`]:
          admin.firestore.FieldValue.arrayUnion({
            name: openerName,
            email: openerEmail,
            organization: openerOrganization,
            openedAt: timestamp,
          }),
        
        updatedAt: timestamp,
      });

      console.log('[Recipient Status] Added new opener:', openerEmail);
    }
  } catch (error: any) {
    logError('markAsOpened', error, { recipientId, openerEmail });
    throw error;
  }
}

/**
 * Mark recipient as replied (unique tracking)
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
    const recipientDoc = await recipientRef.get();

    if (!recipientDoc.exists) {
      console.error('[Recipient Status] Recipient not found:', recipientId);
      return;
    }

    const recipient = recipientDoc.data() as CampaignRecipient;
    const timestamp = new Date().toISOString();

    // Get existing tracking
    const aggregatedTracking = recipient.aggregatedTracking || {
      everOpened: false,
      totalOpensAcrossAllEmails: 0,
      uniqueOpeners: [],
      everReplied: false,
      uniqueRepliers: [],
      totalRepliesAcrossAllEmails: 0,
      engagementLevel: 'none' as const,
    };

    // Check if this replier already exists
    const existingReplierIndex = aggregatedTracking.uniqueRepliers?.findIndex(
      (replier) => replier.email.toLowerCase() === replierEmail.toLowerCase()
    );

    const emailHistory = recipient.emailHistory || [];
    const latestEmailIndex = emailHistory.length - 1;
    const latestEmail = emailHistory[latestEmailIndex];

    if (existingReplierIndex !== undefined && existingReplierIndex >= 0) {
      // Existing replier - increment their count
      console.log('[Recipient Status] Existing replier detected:', replierEmail);

      await recipientRef.update({
        [`aggregatedTracking.uniqueRepliers.${existingReplierIndex}.totalReplies`]:
          admin.firestore.FieldValue.increment(1),
        [`aggregatedTracking.uniqueRepliers.${existingReplierIndex}.lastRepliedAt`]: replyReceivedAt,
        'aggregatedTracking.totalRepliesAcrossAllEmails':
          admin.firestore.FieldValue.increment(1),
        
        // Update latest email tracking
        [`emailHistory.${latestEmailIndex}.tracking.totalReplies`]:
          admin.firestore.FieldValue.increment(1),
        [`emailHistory.${latestEmailIndex}.tracking.lastReplyAt`]: replyReceivedAt,
        
        updatedAt: timestamp,
      });

      console.log('[Recipient Status] Incremented reply count for:', replierEmail);
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

      // Update with new replier
      await recipientRef.update({
        status: 'replied',
        repliedAt: replyReceivedAt,
        'aggregatedTracking.everReplied': true,
        'aggregatedTracking.totalRepliesAcrossAllEmails': 1,
        'aggregatedTracking.uniqueRepliers':
          admin.firestore.FieldValue.arrayUnion(newReplier),
        'aggregatedTracking.uniqueReplierCount':
          admin.firestore.FieldValue.increment(1),
        'aggregatedTracking.engagementLevel': 'high',
        
        // Update latest email tracking
        [`emailHistory.${latestEmailIndex}.tracking.totalReplies`]: 1,
        [`emailHistory.${latestEmailIndex}.tracking.firstReplyAt`]: replyReceivedAt,
        [`emailHistory.${latestEmailIndex}.tracking.lastReplyAt`]: replyReceivedAt,
        [`emailHistory.${latestEmailIndex}.repliedBy`]:
          admin.firestore.FieldValue.arrayUnion({
            name: replierName,
            email: replierEmail,
            organization: replierOrganization,
            repliedAt: replyReceivedAt,
          }),
        
        updatedAt: timestamp,
      });

      console.log('[Recipient Status] Added new replier:', replierEmail);
    }
  } catch (error: any) {
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
