const sgMail = require("@sendgrid/mail");
const nodemailer = require("nodemailer");

const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || "sendgrid";
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const GMAIL_USER = process.env.GMAIL_USER || "";
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || "";
const DEFAULT_FROM_EMAIL = process.env.EMAIL_FROM_DEFAULT || "no-reply@example.com";
const BASE_URL = process.env.BASE_URL || "";

if (EMAIL_PROVIDER === "sendgrid" && SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

let gmailTransporter = null;
if (EMAIL_PROVIDER === "gmail" && GMAIL_USER && GMAIL_APP_PASSWORD) {
  gmailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD
    }
  });
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

  // Ensure Gmail SPF alignment: sender must match authenticated account
  const sender = (EMAIL_PROVIDER === "gmail")
    ? (GMAIL_USER || from || DEFAULT_FROM_EMAIL)
    : (from || DEFAULT_FROM_EMAIL);

  // Gmail SMTP
  if (EMAIL_PROVIDER === "gmail" && gmailTransporter) {
    const mailOptions = {
      from: sender,
      to,
      subject,
      html,
      headers: {
        "X-Campaign-Message-ID": messageId,
        "Message-ID": `<${messageId}@yourdomain.com>`,
        ...headers,
      }
    };

    const result = await gmailTransporter.sendMail(mailOptions);
    console.log('[gmail] sendMail response:', result?.response || result);
    return {
      statusCode: 200,
      messageId: result.messageId,
    };
  }

  // Mock mode for testing when no proper email service is configured
  if (EMAIL_PROVIDER !== "sendgrid" || !SENDGRID_API_KEY || SENDGRID_API_KEY === 'SG.test-key-placeholder') {
    console.log('=== MOCK EMAIL SENT ===');
    console.log('FROM:', sender);
    console.log('TO:', to);
    console.log('SUBJECT:', subject);
    console.log('MESSAGE ID:', messageId);
    console.log('========================');
    
    return {
      statusCode: 200,
      messageId,
      mock: true
    };
  }

  // SendGrid
  const trackingPixel = BASE_URL
    ? `<img src="${BASE_URL}/email/track?messageId=${encodeURIComponent(
        messageId
      )}&email=${encodeURIComponent(to)}" width="1" height="1" style="display:none"/>`
    : "";

  const htmlWithTracking = rewriteLinksWithTracking(html, messageId) + buildUnsubscribeFooter(to) + trackingPixel;

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

