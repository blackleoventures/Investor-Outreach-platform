import { sendMail, teamInbox } from "./mailer";
import { appUrl } from "./app-url";

/**
 * Transactional email for the Deal Room flow: application receipts, review
 * decisions, and the instant team alert when an investor requests an
 * introduction.
 *
 * Sent as the platform itself via Resend, not through a client's configured
 * outreach mailbox.
 */

/** Escape user-supplied values before interpolating them into email HTML. */
function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function shell(heading: string, body: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 640px; margin: auto; padding: 24px; border: 1px solid #eee; border-radius: 12px; color: #1f2937;">
      <h2 style="color: #4f46e5; margin-top: 0;">${heading}</h2>
      ${body}
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="font-size: 12px; color: #9ca3af;">Black Leo Ventures &middot; Startup Deal Room</p>
    </div>
  `;
}

function row(label: string, value: unknown): string {
  return `<tr>
    <td style="padding: 6px 12px 6px 0; color: #6b7280; font-size: 13px; white-space: nowrap; vertical-align: top;">${esc(label)}</td>
    <td style="padding: 6px 0; font-size: 13px; font-weight: 600;">${esc(value) || "&mdash;"}</td>
  </tr>`;
}

const send = sendMail;

export interface ApplicationReceivedPayload {
  founderName: string;
  founderEmail: string;
  startupName: string;
  applicationId: string;
  sector: string;
  stage: string;
  raisingAmount: string;
  country: string;
  recordId: string;
}

/**
 * Confirms receipt to the founder and alerts the team that a new application is
 * waiting in the review queue. Failures are logged per-recipient so one bad
 * address cannot suppress the other message.
 */
export async function sendApplicationReceivedEmails(payload: ApplicationReceivedPayload) {
  const reviewUrl = `${appUrl()}/dashboard/applications/${payload.recordId}`;

  const founderHtml = shell(
    "We've received your application",
    `
      <p>Hello ${esc(payload.founderName)},</p>
      <p>Thank you for applying to the Black Leo Ventures Deal Room. Your application for
      <strong>${esc(payload.startupName)}</strong> is now with our review team.</p>
      <table style="border-collapse: collapse; margin: 16px 0;">
        ${row("Application ID", payload.applicationId)}
        ${row("Sector", payload.sector)}
        ${row("Stage", payload.stage)}
        ${row("Raising", payload.raisingAmount)}
      </table>
      <p>We review every application before it is shared with investors. We will contact you
      once a decision has been made.</p>
      <p style="font-size: 13px; color: #6b7280;">Submitting an application does not guarantee
      fundraising or investor meetings.</p>
    `
  );

  const teamHtml = shell(
    "New Deal Room application",
    `
      <p><strong>${esc(payload.startupName)}</strong> has submitted an application and is awaiting review.</p>
      <table style="border-collapse: collapse; margin: 16px 0;">
        ${row("Application ID", payload.applicationId)}
        ${row("Founder", payload.founderName)}
        ${row("Email", payload.founderEmail)}
        ${row("Country", payload.country)}
        ${row("Sector", payload.sector)}
        ${row("Stage", payload.stage)}
        ${row("Raising", payload.raisingAmount)}
      </table>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${reviewUrl}" style="background: #4f46e5; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Review Application</a>
      </div>
    `
  );

  const results = await Promise.allSettled([
    send({
      to: payload.founderEmail,
      subject: `Application received - ${payload.startupName}`,
      html: founderHtml,
    }),
    (async () => {
      const to = teamInbox();
      if (!to) throw new Error("No team notification address configured");
      return send({
        to,
        subject: `New application: ${payload.startupName} (${payload.sector})`,
        html: teamHtml,
      });
    })(),
  ]);

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(
        `[DealRoomEmail] ${index === 0 ? "Founder receipt" : "Team alert"} failed:`,
        result.reason?.message || result.reason
      );
    }
  });
}

export interface IntroductionRequestPayload {
  investorName: string;
  investorEmail: string;
  investorFirm: string;
  startupName: string;
  startupSector: string;
  raisingAmount: string;
  message: string;
  requestId: string;
}

/**
 * Instant team alert when an investor requests an introduction. This is the
 * signal the team acts on, so a delivery failure is surfaced to the caller.
 */
export async function sendIntroductionRequestEmail(payload: IntroductionRequestPayload) {
  const to = teamInbox();
  if (!to) {
    throw new Error("No team notification address configured");
  }

  const dashboardUrl = `${appUrl()}/dashboard/introductions`;

  const html = shell(
    "Introduction requested",
    `
      <p style="font-size: 15px;"><strong>${esc(payload.investorName)}</strong>
      ${payload.investorFirm ? `(${esc(payload.investorFirm)})` : ""}
      has requested an introduction to <strong>${esc(payload.startupName)}</strong>.</p>
      <table style="border-collapse: collapse; margin: 16px 0;">
        ${row("Investor", payload.investorName)}
        ${row("Investor email", payload.investorEmail)}
        ${row("Firm", payload.investorFirm)}
        ${row("Startup", payload.startupName)}
        ${row("Sector", payload.startupSector)}
        ${row("Raising", payload.raisingAmount)}
      </table>
      ${
        payload.message
          ? `<div style="background: #f9fafb; border-left: 3px solid #4f46e5; padding: 12px 16px; margin: 16px 0;">
               <p style="margin: 0; font-size: 13px; color: #6b7280;">Investor note</p>
               <p style="margin: 6px 0 0; font-size: 14px;">${esc(payload.message)}</p>
             </div>`
          : ""
      }
      <p style="font-size: 13px; color: #6b7280;">Next step: verify the investor, then contact the startup.</p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${dashboardUrl}" style="background: #4f46e5; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Open Introductions Dashboard</a>
      </div>
    `
  );

  return send({
    to,
    subject: `Intro request: ${payload.investorName} -> ${payload.startupName}`,
    html,
  });
}

export interface DecisionPayload {
  founderName: string;
  founderEmail: string;
  startupName: string;
  status: "approved" | "rejected" | "needs_changes";
  feedback: string;
}

/** Tells the founder the outcome of the internal review. */
export async function sendApplicationDecisionEmail(payload: DecisionPayload) {
  const copy: Record<DecisionPayload["status"], { heading: string; subject: string; body: string }> = {
    approved: {
      heading: "Your startup is live in the Deal Room",
      subject: `Approved - ${payload.startupName} is live in the Deal Room`,
      body: `<p>Your application for <strong>${esc(payload.startupName)}</strong> has been approved.
             Your profile is now visible to verified investors, venture capital firms, family
             offices, and strategic partners in our Deal Room.</p>
             <p>When an investor expresses interest, our team contacts you directly to arrange
             the introduction. Your contact details are never shared without that step.</p>`,
    },
    needs_changes: {
      heading: "Your application needs a few changes",
      subject: `Action needed - ${payload.startupName} application`,
      body: `<p>Thank you for applying to the Black Leo Ventures Deal Room. Before we can share
             <strong>${esc(payload.startupName)}</strong> with investors, we need a few updates
             from you.</p>`,
    },
    rejected: {
      heading: "Update on your application",
      subject: `Update - ${payload.startupName} application`,
      body: `<p>Thank you for applying to the Black Leo Ventures Deal Room. After review, we are
             not moving forward with <strong>${esc(payload.startupName)}</strong> at this time.</p>
             <p>This reflects our current investor mandates rather than a judgement on what you
             are building, and you are welcome to reapply as you reach new milestones.</p>`,
    },
  };

  const { heading, subject, body } = copy[payload.status];

  const html = shell(
    heading,
    `
      <p>Hello ${esc(payload.founderName)},</p>
      ${body}
      ${
        payload.feedback
          ? `<div style="background: #f9fafb; border-left: 3px solid #4f46e5; padding: 12px 16px; margin: 16px 0;">
               <p style="margin: 0; font-size: 13px; color: #6b7280;">Notes from our team</p>
               <p style="margin: 6px 0 0; font-size: 14px; white-space: pre-wrap;">${esc(payload.feedback)}</p>
             </div>`
          : ""
      }
    `
  );

  return send({ to: payload.founderEmail, subject, html });
}
