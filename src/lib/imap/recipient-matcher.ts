// Match email replies to campaign recipients

import { adminDb } from "@/lib/firebase-admin";
import { isSameDomain, normalizeEmail } from "@/lib/utils/email-helper";
import type { CampaignRecipient } from "@/types";
import type { ParsedReply } from "./reply-parser";

export interface MatchResult {
  recipient: CampaignRecipient & { id: string };
  matchType: "exact" | "domain" | "organization" | "none";
  confidence: "high" | "medium" | "low";
}

export async function matchReplyToRecipient(
  campaignId: string,
  reply: ParsedReply
): Promise<MatchResult | null> {
  console.log(
    `[Recipient Matcher] Matching reply from ${reply.from.email} to campaign ${campaignId}`
  );

  // Fetch all recipients for this campaign
  const recipientsSnapshot = await adminDb
    .collection("campaignRecipients")
    .where("campaignId", "==", campaignId)
    .get();

  if (recipientsSnapshot.empty) {
    console.log("[Recipient Matcher] No recipients found for campaign");
    return null;
  }

  const recipients = recipientsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as (CampaignRecipient & { id: string })[];

  // Strategy 1: Exact email match (highest confidence)
  const exactMatch = recipients.find(
    (r) => normalizeEmail(r.originalContact.email) === reply.from.email
  );

  if (exactMatch) {
    console.log(
      `[Recipient Matcher] Exact match found: ${exactMatch.originalContact.name}`
    );
    return {
      recipient: exactMatch,
      matchType: "exact",
      confidence: "high",
    };
  }

  // Strategy 2: Same domain match (medium confidence)
  // This handles cases where someone else from the same org replied
  const domainMatches = recipients.filter((r) =>
    isSameDomain(r.originalContact.email, reply.from.email)
  );

  if (domainMatches.length === 1) {
    // Only one recipient from this domain, high confidence it's related
    console.log(
      `[Recipient Matcher] Domain match found: ${domainMatches[0].originalContact.organization}`
    );
    return {
      recipient: domainMatches[0],
      matchType: "domain",
      confidence: "high",
    };
  }

  if (domainMatches.length > 1) {
    // Multiple recipients from same domain
    // Find the one most likely to be the source
    const bestMatch = findBestDomainMatch(domainMatches, reply);

    if (bestMatch) {
      console.log(
        `[Recipient Matcher] Best domain match: ${bestMatch.originalContact.name}`
      );
      return {
        recipient: bestMatch,
        matchType: "domain",
        confidence: "medium",
      };
    }
  }

  // Strategy 3: Organization name match (lower confidence)
  const orgMatches = recipients.filter(
    (r) =>
      r.originalContact.organization.toLowerCase() ===
      reply.from.organization.toLowerCase()
  );

  if (orgMatches.length > 0) {
    console.log(
      `[Recipient Matcher] Organization match found: ${orgMatches[0].originalContact.organization}`
    );
    return {
      recipient: orgMatches[0],
      matchType: "organization",
      confidence: "low",
    };
  }

  console.log(`[Recipient Matcher] No match found for ${reply.from.email}`);
  return null;
}

function findBestDomainMatch(
  candidates: (CampaignRecipient & { id: string })[],
  reply: ParsedReply
): (CampaignRecipient & { id: string }) | null {
  // Prefer recipients who have already been delivered
  const deliveredCandidates = candidates.filter(
    (c) => c.status === "delivered" || c.status === "opened"
  );

  if (deliveredCandidates.length === 1) {
    return deliveredCandidates[0];
  }

  // If multiple delivered, prefer the one with highest priority
  const sortedByPriority = [
    ...(deliveredCandidates.length > 0 ? deliveredCandidates : candidates),
  ].sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  return sortedByPriority[0] || null;
}

export async function isReplyAlreadyProcessed(
  recipientId: string,
  messageId: string
): Promise<boolean> {
  // Check if this reply was already stored
  const existingReply = await adminDb
    .collection("campaignReplies")
    .where("recipientId", "==", recipientId)
    .where("replyFrom.email", "==", messageId)
    .limit(1)
    .get();

  return !existingReply.empty;
}

export function shouldProcessReply(
  recipient: CampaignRecipient,
  reply: ParsedReply
): { should: boolean; reason: string } {
  // Don't process if recipient hasn't been sent an email yet
  if (!recipient.sentAt) {
    return {
      should: false,
      reason: "Email not sent to recipient yet",
    };
  }

  // Don't process if reply is before email was sent
  const sentTime = new Date(recipient.sentAt).getTime();
  const replyTime = new Date(reply.receivedAt).getTime();

  if (replyTime < sentTime) {
    return {
      should: false,
      reason: "Reply timestamp is before email was sent",
    };
  }

  // Check if reply is within reasonable timeframe (e.g., 30 days)
  const daysSinceSent = (replyTime - sentTime) / (1000 * 60 * 60 * 24);

  if (daysSinceSent > 30) {
    return {
      should: false,
      reason: "Reply is too old (>30 days after email sent)",
    };
  }

  return {
    should: true,
    reason: "Reply is valid and should be processed",
  };
}
