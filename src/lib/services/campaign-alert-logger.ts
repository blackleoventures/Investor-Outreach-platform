// lib/services/campaign-alert-logger.ts
// Campaign Health Monitoring: Log, translate, and deduplicate platform errors

import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";
import crypto from "crypto";

// ============================================
// ERROR TRANSLATION TABLE
// Maps raw error types to human-readable messages
// ============================================

export type AlertType =
  | "SMTP_AUTH_FAILED"
  | "SMTP_CONNECTION_FAILED"
  | "IMAP_CONNECTION_FAILED"
  | "IMAP_AUTH_FAILED"
  | "QUOTA_EXCEEDED"
  | "SPAM_BLOCKED"
  | "INVALID_EMAIL_BOUNCE"
  | "DOMAIN_BLOCKED"
  | "RATE_LIMITED"
  | "TEMPLATE_ERROR"
  | "SHEETS_SYNC_FAILED"
  | "UNKNOWN_ERROR";

export type AlertSeverity = "critical" | "warning" | "info";

interface AlertTranslation {
  friendlyMessage: string;
  howToFix: string;
  severity: AlertSeverity;
}

const ALERT_TRANSLATIONS: Record<AlertType, AlertTranslation> = {
  SMTP_AUTH_FAILED: {
    friendlyMessage: "Email login failed — password expired or revoked",
    howToFix:
      "Go to Client Settings → Update the App Password. If using Gmail, generate a new App Password from Google Account → Security → App Passwords.",
    severity: "critical",
  },
  SMTP_CONNECTION_FAILED: {
    friendlyMessage:
      "Cannot connect to email server — server may be down or blocked",
    howToFix:
      "Check if the SMTP host and port are correct in Client Settings. The email provider's server may be temporarily unavailable — try again in a few minutes.",
    severity: "critical",
  },
  IMAP_CONNECTION_FAILED: {
    friendlyMessage:
      "Cannot check for investor replies — inbox connection failed",
    howToFix:
      "Verify that IMAP is enabled in the email provider settings. For Gmail: Settings → Forwarding and POP/IMAP → Enable IMAP. For GoDaddy: IMAP is enabled by default.",
    severity: "warning",
  },
  IMAP_AUTH_FAILED: {
    friendlyMessage: "Cannot check for investor replies — inbox login failed",
    howToFix:
      "The email password may have changed. Go to Client Settings → Update the password. If using Gmail, generate a new App Password.",
    severity: "warning",
  },
  QUOTA_EXCEEDED: {
    friendlyMessage:
      "Daily email sending limit reached — emails paused until tomorrow",
    howToFix:
      "Your email provider has a daily send limit. Emails will automatically resume after 24 hours. To send more, consider upgrading your email plan or spreading emails across multiple days.",
    severity: "warning",
  },
  SPAM_BLOCKED: {
    friendlyMessage:
      "Some emails are being blocked as spam by recipient servers",
    howToFix:
      "Review your email content for spam triggers (excessive links, ALL CAPS, spam keywords). Check your domain's reputation at mail-tester.com. Ensure SPF, DKIM, and DMARC records are set up correctly.",
    severity: "warning",
  },
  INVALID_EMAIL_BOUNCE: {
    friendlyMessage:
      "Multiple emails bounced — recipient addresses don't exist",
    howToFix:
      "Go to the Failed Emails tab → Review and delete invalid email addresses. Consider verifying your email list before sending.",
    severity: "info",
  },
  DOMAIN_BLOCKED: {
    friendlyMessage:
      "Your sending domain has been blocked by some email providers",
    howToFix:
      "Your domain may have been blacklisted. Check your domain at mxtoolbox.com/blacklists. Contact the blocking provider to request removal. Ensure your emails comply with anti-spam laws.",
    severity: "critical",
  },
  RATE_LIMITED: {
    friendlyMessage:
      "Sending too fast — email provider is throttling your account",
    howToFix:
      "The system will automatically slow down and retry. No action needed. If this persists, consider reducing the emails per hour in campaign settings.",
    severity: "info",
  },
  TEMPLATE_ERROR: {
    friendlyMessage:
      "Email template has an error — some personalization fields are missing",
    howToFix:
      "Check your email template for broken merge tags (e.g., {{investor_name}}). Make sure all required fields exist in your recipient data.",
    severity: "warning",
  },
  SHEETS_SYNC_FAILED: {
    friendlyMessage:
      "Failed to sync changes with Google Sheets — your sheet data may be out of date",
    howToFix:
      "Check that the Google Sheets service account still has edit access to both the Investor and Incubator sheets. The data in the dashboard is still correct — only the sheet sync is affected.",
    severity: "info",
  },
  UNKNOWN_ERROR: {
    friendlyMessage: "Something went wrong with email delivery",
    howToFix:
      "An unexpected error occurred. Please share the technical details below with your developer for investigation.",
    severity: "warning",
  },
};

// ============================================
// AUTO-DETECT ERROR TYPE FROM RAW ERROR
// ============================================

export function detectAlertType(rawError: string): AlertType {
  const error = rawError.toLowerCase();

  // SMTP Auth
  if (
    error.includes("535") ||
    error.includes("username and password not accepted") ||
    error.includes("authentication failed") ||
    error.includes("invalid login") ||
    error.includes("eauth")
  ) {
    return "SMTP_AUTH_FAILED";
  }

  // SMTP Connection
  if (
    error.includes("econnrefused") ||
    error.includes("econnreset") ||
    error.includes("etimedout") ||
    error.includes("esocket") ||
    (error.includes("smtp") && error.includes("connection"))
  ) {
    return "SMTP_CONNECTION_FAILED";
  }

  // IMAP Connection
  if (
    error.includes("getaddrinfo enotfound") ||
    (error.includes("imap") && error.includes("connection")) ||
    (error.includes("imap") && error.includes("timeout"))
  ) {
    return "IMAP_CONNECTION_FAILED";
  }

  // IMAP Auth
  if (
    (error.includes("imap") && error.includes("login")) ||
    (error.includes("imap") && error.includes("authentication"))
  ) {
    return "IMAP_AUTH_FAILED";
  }

  // Quota / Rate Limit
  if (
    error.includes("quota") ||
    error.includes("rate limit") ||
    error.includes("too many") ||
    error.includes("452 4.5.3")
  ) {
    return "QUOTA_EXCEEDED";
  }

  // Spam
  if (
    error.includes("spam") ||
    error.includes("blocked") ||
    error.includes("blacklist") ||
    error.includes("554 5.7")
  ) {
    return "SPAM_BLOCKED";
  }

  // Rate limited
  if (
    error.includes("throttl") ||
    error.includes("too many connections") ||
    error.includes("try again later")
  ) {
    return "RATE_LIMITED";
  }

  // Domain blocked
  if (
    error.includes("domain") &&
    (error.includes("blocked") || error.includes("reject"))
  ) {
    return "DOMAIN_BLOCKED";
  }

  return "UNKNOWN_ERROR";
}

// ============================================
// MAIN: Log a campaign alert
// ============================================

interface LogAlertParams {
  campaignId: string;
  clientId: string;
  type?: AlertType; // If not provided, auto-detected from rawError
  rawError: string;
  source: string; // e.g. "cron:send-emails", "cron:check-replies"
}

export async function logCampaignAlert({
  campaignId,
  clientId,
  type,
  rawError,
  source,
}: LogAlertParams): Promise<void> {
  try {
    // Auto-detect type if not provided
    const alertType = type || detectAlertType(rawError);
    const translation = ALERT_TRANSLATIONS[alertType];

    // Create a hash for deduplication (same error type + campaign = 1 alert)
    const errorHash = crypto
      .createHash("md5")
      .update(`${alertType}:${campaignId}`)
      .digest("hex");

    // Check if this alert already exists (deduplication)
    const existingAlert = await adminDb
      .collection("campaignAlerts")
      .where("errorHash", "==", errorHash)
      .where("status", "==", "active")
      .limit(1)
      .get();

    const now = new Date().toISOString();

    if (!existingAlert.empty) {
      // Alert already exists — just increment count and update timestamp
      const doc = existingAlert.docs[0];
      await doc.ref.update({
        occurrenceCount: admin.firestore.FieldValue.increment(1),
        lastOccurredAt: now,
        rawError, // Update with latest raw error
      });

      console.log(
        `[Campaign Alert] Deduplicated: ${alertType} for campaign ${campaignId} (count: ${(doc.data().occurrenceCount || 1) + 1})`,
      );
      return;
    }

    // Create new alert
    await adminDb.collection("campaignAlerts").add({
      campaignId,
      clientId,
      type: alertType,

      // Human-readable
      friendlyMessage: translation.friendlyMessage,
      howToFix: translation.howToFix,
      severity: translation.severity,

      // Developer debugging
      rawError,
      source,

      // State
      status: "active",

      // Deduplication
      errorHash,
      occurrenceCount: 1,
      firstOccurredAt: now,
      lastOccurredAt: now,
    });

    console.log(
      `[Campaign Alert] NEW: ${translation.severity.toUpperCase()} - ${alertType} for campaign ${campaignId}`,
    );
    console.log(`[Campaign Alert] Message: ${translation.friendlyMessage}`);
  } catch (error: any) {
    // Alert logging should NEVER break the main flow
    console.error(
      "[Campaign Alert] Failed to log alert (non-blocking):",
      error.message,
    );
  }
}

// ============================================
// RESOLVE / DISMISS helpers
// ============================================

export async function resolveCampaignAlert(alertId: string): Promise<void> {
  await adminDb.collection("campaignAlerts").doc(alertId).update({
    status: "resolved",
    resolvedAt: new Date().toISOString(),
  });
}

export async function dismissCampaignAlert(alertId: string): Promise<void> {
  await adminDb.collection("campaignAlerts").doc(alertId).update({
    status: "dismissed",
    resolvedAt: new Date().toISOString(),
  });
}
