const sgMail = require("@sendgrid/mail");

const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || "sendgrid";
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const DEFAULT_FROM_EMAIL = process.env.EMAIL_FROM_DEFAULT || "no-reply@example.com";
const BASE_URL = process.env.BASE_URL || "";

if (EMAIL_PROVIDER === "sendgrid" && SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

function buildUnsubscribeFooter(recipientEmail) {
  if (!BASE_URL) return "";
  const unsubscribeUrl = `${BASE_URL}/email/unsubscribe?email=${encodeURIComponent(
    recipientEmail
  )}`;
  return `
    <div style="margin-top:16px;font-size:12px;color:#6b7280">
      You are receiving this because we believe this is relevant to you.
      <a href="${unsubscribeUrl}">Unsubscribe</a>.
    </div>
  `;
}

function rewriteLinksWithTracking(html, messageId) {
  if (!BASE_URL || !html) return html;
  return html.replace(/href=\"([^\"]+)\"/g, (match, url) => {
    // Skip mailto and already tracked links
    if (/^mailto:/i.test(url) || url.includes("/email/click?")) return match;
    const tracked = `${BASE_URL}/email/click?messageId=${encodeURIComponent(
      messageId
    )}&url=${encodeURIComponent(url)}`;
    return `href="${tracked}"`;
  });
}

async function sendEmail({ to, from, subject, html, messageId, headers = {}, categories = [], customArgs = {} }) {
  if (!to || !subject || !html) {
    throw new Error("to, subject, html are required");
  }

  const sender = from || DEFAULT_FROM_EMAIL;

  const trackingPixel = BASE_URL
    ? `<img src="${BASE_URL}/email/track?messageId=${encodeURIComponent(
        messageId
      )}&email=${encodeURIComponent(to)}" width="1" height="1" style="display:none"/>`
    : "";

  const htmlWithTracking = rewriteLinksWithTracking(html, messageId) + buildUnsubscribeFooter(to) + trackingPixel;

  if (EMAIL_PROVIDER !== "sendgrid") {
    throw new Error("Only SendGrid provider is implemented. Set EMAIL_PROVIDER=sendgrid");
  }

  const msg = {
    to,
    from: sender,
    subject,
    html: htmlWithTracking,
    headers: {
      "X-Campaign-Message-ID": messageId,
      "Message-ID": `<${messageId}@yourdomain.com>`,
      ...headers,
    },
    categories: Array.isArray(categories) ? categories : [],
    customArgs: { messageId, ...customArgs },
  };

  const [response] = await sgMail.send(msg);
  return {
    statusCode: response.statusCode,
    messageId,
  };
}

module.exports = {
  sendEmail,
  rewriteLinksWithTracking,
  buildUnsubscribeFooter,
};

