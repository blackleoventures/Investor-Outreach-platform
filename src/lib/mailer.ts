import { Resend } from "resend";

/**
 * Central outbound mail for the platform, sent through Resend from the
 * verified `mail.blackleoventures.com` domain.
 *
 * This covers transactional mail the platform sends as itself: investor magic
 * links, Deal Room application receipts, review decisions, and introduction
 * alerts. It is NOT used for client outreach campaigns, which deliberately send
 * through each client's own configured SMTP mailbox so replies land with them.
 */

let client: Resend | null = null;

function resend(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error(
      "RESEND_API_KEY is not set. Add it to your environment to enable outbound email."
    );
  }
  if (!client) {
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}

/** Verified sending identity. Override with RESEND_FROM. */
export function fromAddress(): string {
  return process.env.RESEND_FROM || "Black Leo Ventures <deals@mail.blackleoventures.com>";
}

/**
 * Where internal alerts land (new applications, introduction requests).
 * Falls back to the reply-to address so alerts are never silently dropped
 * just because the dedicated inbox wasn't configured.
 */
export function teamInbox(): string | undefined {
  return process.env.TEAM_NOTIFICATION_EMAIL || process.env.REPLY_TO_EMAIL || undefined;
}

export interface SendOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

/**
 * Send one transactional email.
 *
 * Resend reports delivery failures in the response body rather than by
 * throwing, so both paths are normalised into a thrown error and every caller
 * can rely on a rejected promise meaning "not sent".
 */
export async function sendMail({ to, subject, html, replyTo }: SendOptions) {
  const { data, error } = await resend().emails.send({
    from: fromAddress(),
    to,
    subject,
    html,
    ...(replyTo || process.env.REPLY_TO_EMAIL
      ? { replyTo: replyTo || (process.env.REPLY_TO_EMAIL as string) }
      : {}),
  });

  if (error) {
    console.error("[Mailer] Send failed:", { to, subject, error });
    throw new Error(error.message || "Resend rejected the message");
  }

  console.log("[Mailer] Sent:", { to, subject, id: data?.id });
  return { id: data?.id };
}

/** True when outbound email is configured; lets callers degrade gracefully. */
export function isMailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}
