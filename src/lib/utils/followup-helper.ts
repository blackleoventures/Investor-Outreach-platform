// lib/utils/followup-helper.ts

import { adminDb } from "@/lib/firebase-admin";
import type { FollowupCandidate, CampaignRecipient } from "@/types";

/**
 * Get follow-up candidates for a campaign
 * Returns recipients eligible for follow-up emails based on engagement criteria
 */
export async function getFollowupCandidates(
  campaignId: string
): Promise<FollowupCandidate[]> {
  const candidates: FollowupCandidate[] = [];
  const now = new Date();

  console.log(
    "[Follow-up Helper] Fetching candidates for campaign:",
    campaignId
  );

  // Query recipients with delivered or opened status
  const recipientsSnapshot = await adminDb
    .collection("campaignRecipients")
    .where("campaignId", "==", campaignId)
    .where("status", "in", ["delivered", "opened"])
    .get();

  console.log(
    "[Follow-up Helper] Found",
    recipientsSnapshot.size,
    "potential candidates"
  );

  // Get existing follow-ups for this campaign to filter out already followed-up recipients
  const followupsSnapshot = await adminDb
    .collection("followupEmails")
    .where("campaignId", "==", campaignId)
    .get();

  // Create a map of recipient IDs to their follow-up count
  const recipientFollowupCount = new Map<string, number>();
  followupsSnapshot.forEach((doc) => {
    const followup = doc.data();
    const currentCount = recipientFollowupCount.get(followup.recipientId) || 0;
    recipientFollowupCount.set(followup.recipientId, currentCount + 1);
  });

  console.log(
    "[Follow-up Helper] Recipients with existing follow-ups:",
    recipientFollowupCount.size
  );

  recipientsSnapshot.forEach((doc) => {
    const recipient = doc.data() as CampaignRecipient;
    const recipientId = recipient.id || doc.id;

    // Get follow-up count for this recipient
    const followupCount = recipientFollowupCount.get(recipientId) || 0;

    // Skip if no delivery timestamp
    if (!recipient.deliveredAt) {
      return;
    }

    const deliveredTime = new Date(recipient.deliveredAt);
    const hoursSince =
      (now.getTime() - deliveredTime.getTime()) / (1000 * 60 * 60);
    const daysSince = hoursSince / 24;
    const minutesSince = hoursSince * 60;

    // Check if eligible for follow-up
    const eligibility = shouldShowInFollowup(recipient, hoursSince);

    if (eligibility.shouldShow) {
      const candidate: FollowupCandidate = {
        id: recipientId,
        campaignId: recipient.campaignId,
        recipientEmail: recipient.originalContact.email,
        recipientName: recipient.originalContact.name,
        organization: recipient.originalContact.organization,
        followupReason: eligibility.reason!,
        emailSentAt: recipient.deliveredAt,
        lastOpenedAt: recipient.openedAt,
        daysSinceDelivery: Math.floor(daysSince),
        minutesSinceDelivery: Math.floor(minutesSince),
        openCount: recipient.aggregatedTracking?.totalOpensAcrossAllEmails || 0,
        hasReplied: recipient.aggregatedTracking?.everReplied || false,
        followupCount: followupCount,
      };

      candidates.push(candidate);
    }
  });

  console.log("[Follow-up Helper] Eligible candidates:", candidates.length);

  return candidates;
}

/**
 * Determine if recipient should show in follow-up list
 * @param recipient - Campaign recipient data
 * @param hoursSinceDelivery - Hours elapsed since email was delivered
 * @returns Object indicating if recipient should show and the reason
 */
export function shouldShowInFollowup(
  recipient: CampaignRecipient,
  hoursSinceDelivery: number
): { shouldShow: boolean; reason?: "not_opened" | "opened_not_replied" } {
  // Already replied - exclude
  if (recipient.aggregatedTracking?.everReplied) {
    return { shouldShow: false };
  }

  // Status must be delivered or opened
  if (recipient.status !== "delivered" && recipient.status !== "opened") {
    return { shouldShow: false };
  }

  // Case 1: Not opened after 48 hours
  if (!recipient.aggregatedTracking?.everOpened && hoursSinceDelivery >= 48) {
    return { shouldShow: true, reason: "not_opened" };
  }

  // Case 2: Opened but not replied after 72 hours
  if (
    recipient.aggregatedTracking?.everOpened &&
    !recipient.aggregatedTracking?.everReplied &&
    hoursSinceDelivery >= 72
  ) {
    return { shouldShow: true, reason: "opened_not_replied" };
  }

  return { shouldShow: false };
}

/**
 * Calculate days since a given date
 * @param dateString - ISO date string
 * @returns Number of days elapsed
 */
export function calculateDaysSince(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculate hours since a given date
 * @param dateString - ISO date string
 * @returns Number of hours elapsed
 */
export function calculateHoursSince(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60));
}

/**
 * Calculate minutes since a given date
 * @param dateString - ISO date string
 * @returns Number of minutes elapsed
 */
export function calculateMinutesSince(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60));
}

/**
 * Group follow-up candidates by reason
 * @param candidates - Array of follow-up candidates
 * @returns Object with candidates grouped by reason
 */
export function groupByReason(candidates: FollowupCandidate[]): {
  notOpened: FollowupCandidate[];
  openedNotReplied: FollowupCandidate[];
} {
  return {
    notOpened: candidates.filter((c) => c.followupReason === "not_opened"),
    openedNotReplied: candidates.filter(
      (c) => c.followupReason === "opened_not_replied"
    ),
  };
}

/**
 * Sort candidates by days since delivery (oldest first)
 * @param candidates - Array of follow-up candidates
 * @returns Sorted array with oldest candidates first
 */
export function sortByOldest(
  candidates: FollowupCandidate[]
): FollowupCandidate[] {
  return [...candidates].sort(
    (a, b) => b.daysSinceDelivery - a.daysSinceDelivery
  );
}

/**
 * Get follow-up statistics for a campaign
 * @param campaignId - Campaign identifier
 * @returns Statistics about follow-up eligibility
 */
export async function getFollowupStats(campaignId: string): Promise<{
  totalCandidates: number;
  notOpened: number;
  openedNotReplied: number;
  alreadySent: number;
}> {
  const candidates = await getFollowupCandidates(campaignId);
  const grouped = groupByReason(candidates);

  const followupsSnapshot = await adminDb
    .collection("followupEmails")
    .where("campaignId", "==", campaignId)
    .where("status", "in", ["sent", "delivered", "opened", "replied"])
    .get();

  return {
    totalCandidates: candidates.length,
    notOpened: grouped.notOpened.length,
    openedNotReplied: grouped.openedNotReplied.length,
    alreadySent: followupsSnapshot.size,
  };
}

/**
 * Check if a specific recipient is eligible for follow-up
 * @param recipientId - Recipient identifier
 * @returns Eligibility status and reason
 */
export async function isRecipientEligibleForFollowup(
  recipientId: string
): Promise<{
  eligible: boolean;
  reason?: "not_opened" | "opened_not_replied";
  message?: string;
}> {
  try {
    const recipientDoc = await adminDb
      .collection("campaignRecipients")
      .doc(recipientId)
      .get();

    if (!recipientDoc.exists) {
      return { eligible: false, message: "Recipient not found" };
    }

    const recipient = recipientDoc.data() as CampaignRecipient;

    // Check if follow-up already exists
    const existingFollowup = await adminDb
      .collection("followupEmails")
      .where("recipientId", "==", recipientId)
      .limit(1)
      .get();

    if (!existingFollowup.empty) {
      return { eligible: false, message: "Follow-up already sent" };
    }

    // Check if delivered
    if (!recipient.deliveredAt) {
      return { eligible: false, message: "Email not yet delivered" };
    }

    // Check eligibility
    const now = new Date();
    const deliveredTime = new Date(recipient.deliveredAt);
    const hoursSince =
      (now.getTime() - deliveredTime.getTime()) / (1000 * 60 * 60);

    const eligibility = shouldShowInFollowup(recipient, hoursSince);

    if (eligibility.shouldShow) {
      return {
        eligible: true,
        reason: eligibility.reason,
        message: `Eligible for follow-up: ${eligibility.reason}`,
      };
    }

    return { eligible: false, message: "Not yet eligible for follow-up" };
  } catch (error: any) {
    console.error("[Follow-up Helper] Error checking eligibility:", error);
    return { eligible: false, message: "Error checking eligibility" };
  }
}

/**
 * Get follow-up count for a specific recipient
 * @param recipientId - Recipient identifier
 * @returns Number of follow-ups sent to this recipient
 */
export async function getRecipientFollowupCount(
  recipientId: string
): Promise<number> {
  try {
    const followupsSnapshot = await adminDb
      .collection("followupEmails")
      .where("recipientId", "==", recipientId)
      .get();

    return followupsSnapshot.size;
  } catch (error: any) {
    console.error("[Follow-up Helper] Error getting follow-up count:", error);
    return 0;
  }
}
