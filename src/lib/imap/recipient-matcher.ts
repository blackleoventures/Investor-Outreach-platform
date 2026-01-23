// lib/imap/recipient-matcher.ts
import { adminDb } from "@/lib/firebase-admin";
import { isSameDomain, normalizeEmail } from "@/lib/utils/email-helper";
import { SafeArray } from "@/lib/utils/data-normalizer";
import type { CampaignRecipient } from "@/types";
import type { ParsedReply } from "./reply-parser";

export interface MatchResult {
  recipient: CampaignRecipient & { id: string };
  matchType: "exact" | "domain" | "organization" | "forwarded" | "thread";
  confidence: "high" | "medium" | "low";
  isNewPerson: boolean;
}

export async function matchReplyToRecipient(
  campaignId: string,
  reply: ParsedReply,
): Promise<MatchResult | null> {
  console.log(
    `[Recipient Matcher] Matching reply from ${reply.from.email} to campaign ${campaignId}`,
  );

  // OPTIMIZED: Try exact email match FIRST (1 read instead of all)
  // This handles the most common case where the original recipient replies
  const exactMatchSnapshot = await adminDb
    .collection("campaignRecipients")
    .where("campaignId", "==", campaignId)
    .where("originalContact.email", "==", reply.from.email)
    .limit(1)
    .get();

  if (!exactMatchSnapshot.empty) {
    const exactMatch = {
      id: exactMatchSnapshot.docs[0].id,
      ...exactMatchSnapshot.docs[0].data(),
    } as CampaignRecipient & { id: string };

    console.log(
      `[Recipient Matcher] Exact match found: ${exactMatch.originalContact.name}`,
    );
    return {
      recipient: exactMatch,
      matchType: "exact",
      confidence: "high",
      isNewPerson: false,
    };
  }

  // FALLBACK: Only load all recipients if no exact match
  // This handles forwarded emails, domain matches, and organization matches
  console.log(
    "[Recipient Matcher] No exact match, checking domain/org matches...",
  );

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

  // Strategy 2: Check "To" field - who was this email sent to?
  // This catches forwarded emails
  const toEmail = normalizeEmail(reply.to);
  const toMatch = recipients.find(
    (r) => normalizeEmail(r.originalContact.email) === toEmail,
  );

  if (toMatch) {
    console.log(
      `[Recipient Matcher] Forwarded email detected: ${reply.from.email} replied to email sent to ${toMatch.originalContact.email}`,
    );
    return {
      recipient: toMatch,
      matchType: "forwarded",
      confidence: "high",
      isNewPerson: true,
    };
  }

  // Strategy 3: Check In-Reply-To header and match against sent emails
  // SAFE: Uses SafeArray to handle both array and object formats
  if (reply.inReplyTo) {
    console.log(`[Recipient Matcher] Checking In-Reply-To: ${reply.inReplyTo}`);

    for (const recipient of recipients) {
      // SAFE OPERATION: Handle both array and object format
      const matchingEmail = SafeArray.find(
        recipient.emailHistory,
        (email: any) => email.emailId === reply.inReplyTo,
      );

      if (matchingEmail) {
        console.log(
          `[Recipient Matcher] Thread match found via In-Reply-To for ${recipient.originalContact.email}`,
        );
        return {
          recipient,
          matchType: "thread",
          confidence: "high",
          isNewPerson:
            reply.from.email !==
            normalizeEmail(recipient.originalContact.email),
        };
      }
    }
  }

  // Strategy 4: Same domain match (someone from same organization)
  // Only match delivered/opened recipients (not pending)
  const deliveredRecipients = recipients.filter(
    (r) =>
      r.status === "delivered" ||
      r.status === "opened" ||
      r.status === "replied",
  );

  const domainMatches = deliveredRecipients.filter((r) =>
    isSameDomain(r.originalContact.email, reply.from.email),
  );

  if (domainMatches.length === 1) {
    console.log(
      `[Recipient Matcher] Domain match found: ${reply.from.email} from same org as ${domainMatches[0].originalContact.email}`,
    );
    return {
      recipient: domainMatches[0],
      matchType: "domain",
      confidence: "high",
      isNewPerson: true,
    };
  }

  if (domainMatches.length > 1) {
    const bestMatch = findBestDomainMatch(domainMatches, reply);

    if (bestMatch) {
      console.log(
        `[Recipient Matcher] Best domain match: ${bestMatch.originalContact.name}`,
      );
      return {
        recipient: bestMatch,
        matchType: "domain",
        confidence: "medium",
        isNewPerson: true,
      };
    }
  }

  // Strategy 5: Organization name match (lower confidence)
  // Only match delivered/opened recipients
  const orgMatches = deliveredRecipients.filter((r) => {
    const orgName = r.originalContact.organization.toLowerCase().trim();
    const replyOrg = reply.from.organization.toLowerCase().trim();
    return orgName && replyOrg && orgName === replyOrg;
  });

  if (orgMatches.length > 0) {
    console.log(
      `[Recipient Matcher] Organization match found: ${orgMatches[0].originalContact.organization}`,
    );
    return {
      recipient: orgMatches[0],
      matchType: "organization",
      confidence: "medium",
      isNewPerson: true,
    };
  }

  // Strategy 6: Subject-based matching for forwarded emails
  // Check if the reply subject contains our original campaign subject
  // This is reliable because "Re: [Original Subject]" pattern is standard
  if (reply.subject) {
    const replySubjectClean = reply.subject
      .toLowerCase()
      .replace(/^(re:|fwd:|fw:)\s*/gi, "")
      .trim();

    // Only proceed if we have a meaningful subject to match
    if (replySubjectClean.length > 10) {
      // Find recipients who received an email with a similar subject
      const subjectMatches = deliveredRecipients.filter((r) => {
        // Check if any email in history has a subject that matches
        const emailHistory = SafeArray.map(r.emailHistory || [], (e: any) => e);

        for (const historyEmail of emailHistory) {
          if (historyEmail.subject) {
            const originalSubjectClean = historyEmail.subject
              .toLowerCase()
              .replace(/^(re:|fwd:|fw:)\s*/gi, "")
              .trim();

            // Check if subjects are similar (one contains the other)
            if (
              replySubjectClean.includes(originalSubjectClean) ||
              originalSubjectClean.includes(replySubjectClean) ||
              // Or check for significant overlap (at least 50% of words match)
              calculateSubjectSimilarity(
                replySubjectClean,
                originalSubjectClean,
              ) > 0.5
            ) {
              return true;
            }
          }
        }
        return false;
      });

      if (subjectMatches.length > 0) {
        // Prefer opened recipients
        const prioritized = subjectMatches.sort((a, b) => {
          const statusPriority: { [key: string]: number } = {
            opened: 3,
            delivered: 2,
            replied: 1,
          };
          return (
            (statusPriority[b.status] || 0) - (statusPriority[a.status] || 0)
          );
        });

        console.log(
          `[Recipient Matcher] Subject match found: ${reply.from.email} matches ${prioritized[0].originalContact.email} via subject similarity`,
        );
        return {
          recipient: prioritized[0],
          matchType: "forwarded",
          confidence: "medium",
          isNewPerson: true,
        };
      }
    }
  }

  console.log(`[Recipient Matcher] No match found for ${reply.from.email}`);
  return null;
}

/**
 * Calculate similarity between two subject lines based on word overlap
 * Returns a value between 0 and 1 (1 = identical)
 */
function calculateSubjectSimilarity(
  subject1: string,
  subject2: string,
): number {
  const words1 = subject1.split(/\s+/).filter((w) => w.length > 2);
  const words2 = subject2.split(/\s+/).filter((w) => w.length > 2);

  if (words1.length === 0 || words2.length === 0) {
    return 0;
  }

  const matchingWords = words1.filter((w) => words2.includes(w));
  const totalUniqueWords = new Set([...words1, ...words2]).size;

  return matchingWords.length / totalUniqueWords;
}

function findBestDomainMatch(
  candidates: (CampaignRecipient & { id: string })[],
  reply: ParsedReply,
): (CampaignRecipient & { id: string }) | null {
  const deliveredCandidates = candidates.filter(
    (c) =>
      c.status === "delivered" ||
      c.status === "opened" ||
      c.status === "replied",
  );

  if (deliveredCandidates.length === 1) {
    return deliveredCandidates[0];
  }

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
  messageId: string,
): Promise<boolean> {
  const existingReply = await adminDb
    .collection("campaignReplies")
    .where("messageId", "==", messageId)
    .limit(1)
    .get();

  return !existingReply.empty;
}

export function shouldProcessReply(
  recipient: CampaignRecipient,
  reply: ParsedReply,
): { should: boolean; reason: string } {
  if (!recipient.sentAt) {
    return {
      should: false,
      reason: "Email not sent to recipient yet",
    };
  }

  const sentTime = new Date(recipient.sentAt).getTime();
  const replyTime = new Date(reply.receivedAt).getTime();

  if (replyTime < sentTime) {
    return {
      should: false,
      reason: "Reply timestamp is before email was sent",
    };
  }

  const daysSinceSent = (replyTime - sentTime) / (1000 * 60 * 60 * 24);

  if (daysSinceSent > 90) {
    return {
      should: false,
      reason: "Reply is too old (>90 days after email sent)",
    };
  }

  return {
    should: true,
    reason: "Reply is valid and should be processed",
  };
}
