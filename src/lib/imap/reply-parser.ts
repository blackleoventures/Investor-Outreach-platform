// Parse email replies and extract identity information

import { extractDomain, normalizeEmail } from "@/lib/utils/email-helper";
import type { EmailReplyDetected } from "@/types";

export interface ParsedReply {
  from: {
    name: string;
    email: string;
    organization: string;
  };
  to: string;
  receivedAt: string;
  messageId: string;
  inReplyTo: string | null;
  subject: string; // NEW: Email subject line
  body: string; // NEW: Plain text body content
}

export function parseReplyIdentity(reply: EmailReplyDetected): ParsedReply {
  const fromEmail = normalizeEmail(reply.from.email);
  const fromName = extractNameFromReply(reply.from.name, fromEmail);
  const organization = extractOrganizationFromEmail(fromEmail);

  return {
    from: {
      name: fromName,
      email: fromEmail,
      organization,
    },
    to: normalizeEmail(reply.to),
    receivedAt: reply.date.toISOString(),
    messageId: reply.messageId,
    inReplyTo: reply.inReplyTo || null,
    // NEW: Pass through subject and body for storage
    subject: reply.subject || "",
    body: reply.body || "",
  };
}

function extractNameFromReply(name: string | undefined, email: string): string {
  if (name && name.trim()) {
    return cleanName(name);
  }

  // Fallback: extract from email
  const localPart = email.split("@")[0];
  return localPart
    .split(".")
    .map((word) => capitalizeFirst(word))
    .join(" ");
}

function cleanName(name: string): string {
  // Remove quotes and extra spaces
  return name
    .replace(/["']/g, "")
    .trim()
    .split(/\s+/)
    .map((word) => capitalizeFirst(word))
    .join(" ");
}

function capitalizeFirst(word: string): string {
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function extractOrganizationFromEmail(email: string): string {
  const domain = extractDomain(email);

  // Remove common TLDs and get company name
  const orgName = domain
    .replace(/\.(com|org|net|io|co|ai|tech)$/i, "")
    .split(".")
    .map((part) => capitalizeFirst(part))
    .join(" ");

  return orgName || "Unknown Organization";
}

export function isAutoReply(reply: EmailReplyDetected): boolean {
  const subject = reply.messageId.toLowerCase();

  // Check for auto-reply patterns
  const autoReplyPatterns = [
    "auto-reply",
    "automatic reply",
    "out of office",
    "ooo",
    "vacation",
    "away",
    "autoreply",
  ];

  return autoReplyPatterns.some((pattern) => subject.includes(pattern));
}

export function extractReplyMetadata(reply: EmailReplyDetected) {
  return {
    hasInReplyTo: !!reply.inReplyTo,
    messageId: reply.messageId,
    timestamp: reply.date,
    isLikelyAutoReply: isAutoReply(reply),
  };
}

/**
 * Detect if an email is a bounce/NDR (Non-Delivery Report)
 * These should NOT be counted as replies
 */
export function isBounceEmail(reply: EmailReplyDetected): boolean {
  const subject = (reply.subject || "").toLowerCase();
  const body = (reply.body || "").toLowerCase();
  const fromEmail = reply.from.email.toLowerCase();

  // Common bounce sender patterns
  const bounceSenders = [
    "mailer-daemon",
    "postmaster",
    "mail-daemon",
    "no-reply",
    "noreply",
    "bounces",
    "maildelivery",
  ];

  // Check if from a bounce sender
  const isFromBounceSender = bounceSenders.some((sender) =>
    fromEmail.includes(sender)
  );

  // Common bounce subject patterns
  const bounceSubjectPatterns = [
    "delivery status notification",
    "undeliverable",
    "undelivered",
    "couldn't be delivered",
    "could not be delivered",
    "mail delivery failed",
    "returned mail",
    "failure notice",
    "delivery failure",
    "non-delivery",
    "delivery problem",
    "message not delivered",
    "delivery notification",
  ];

  // Common bounce body patterns
  const bounceBodyPatterns = [
    "550 5.1", // SMTP error codes
    "550 5.2",
    "550 5.4",
    "553 5.1",
    "554 5.7",
    "resolver.adr.recipientnotfound",
    "recipient not found",
    "user unknown",
    "mailbox not found",
    "address rejected",
    "unknown user",
    "no such user",
    "account disabled",
    "mailbox unavailable",
    "delivery has failed",
    "this message was created automatically",
    "action: failed",
    "final-recipient:",
    "diagnostic-code:",
  ];

  const hasBouncySubject = bounceSubjectPatterns.some((pattern) =>
    subject.includes(pattern)
  );

  const hasBouncyBody = bounceBodyPatterns.some((pattern) =>
    body.includes(pattern)
  );

  return isFromBounceSender || hasBouncySubject || hasBouncyBody;
}

/**
 * Extract a human-readable bounce reason from the email
 */
export function extractBounceReason(reply: EmailReplyDetected): string {
  const body = (reply.body || "").toLowerCase();
  const subject = (reply.subject || "").toLowerCase();

  // Check for specific error patterns and return readable reasons
  if (
    body.includes("recipient not found") ||
    body.includes("recipientnotfound")
  ) {
    return "Email address does not exist";
  }
  if (body.includes("mailbox not found") || body.includes("no such user")) {
    return "Mailbox not found";
  }
  if (body.includes("user unknown") || body.includes("unknown user")) {
    return "Unknown user";
  }
  if (body.includes("mailbox unavailable")) {
    return "Mailbox unavailable";
  }
  if (body.includes("mailbox full") || body.includes("quota exceeded")) {
    return "Mailbox full";
  }
  if (body.includes("blocked") || body.includes("spam")) {
    return "Blocked as spam";
  }
  if (body.includes("550 5.1.1")) {
    return "Email address does not exist";
  }
  if (body.includes("550 5.1.10")) {
    return "Recipient not found";
  }
  if (body.includes("550 5.2.1")) {
    return "Mailbox disabled";
  }
  if (body.includes("553") || body.includes("relay")) {
    return "Relay denied";
  }
  if (subject.includes("undeliverable") || subject.includes("undelivered")) {
    return "Email undeliverable";
  }
  if (subject.includes("failure")) {
    return "Delivery failed";
  }

  return "Email bounced - delivery failed";
}

/**
 * Extract the original recipient email from a bounce message
 */
export function extractBounceRecipient(
  reply: EmailReplyDetected
): string | null {
  const body = reply.body || "";

  // Try to find recipient in common bounce formats
  // Format: "Final-Recipient: rfc822;email@example.com"
  const finalRecipientMatch = body.match(
    /final-recipient:\s*rfc822;?\s*([^\s<>\n]+@[^\s<>\n]+)/i
  );
  if (finalRecipientMatch) {
    return normalizeEmail(finalRecipientMatch[1]);
  }

  // Format: "Recipient Address: email@example.com"
  const recipientAddressMatch = body.match(
    /recipient\s*address:\s*([^\s<>\n]+@[^\s<>\n]+)/i
  );
  if (recipientAddressMatch) {
    return normalizeEmail(recipientAddressMatch[1]);
  }

  // Format: "Your message to email@example.com"
  const yourMessageMatch = body.match(
    /your message to\s+([^\s<>\n]+@[^\s<>\n]+)/i
  );
  if (yourMessageMatch) {
    return normalizeEmail(yourMessageMatch[1]);
  }

  // Format: "<email@example.com>" in first few lines
  const emailMatch = body.substring(0, 500).match(/<([^\s<>]+@[^\s<>]+)>/);
  if (emailMatch) {
    return normalizeEmail(emailMatch[1]);
  }

  return null;
}
