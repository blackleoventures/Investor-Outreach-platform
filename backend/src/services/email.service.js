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
  console.log('[gmail] Initializing Gmail transporter for:', GMAIL_USER);
  gmailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD
    }
  });
  
  // Test the connection
  gmailTransporter.verify((error, success) => {
    if (error) {
      console.error('[gmail] Connection failed:', error.message);
    } else {
      console.log('[gmail] Server is ready to take our messages');
    }
  });
} else {
  console.log('[gmail] Gmail not configured. Provider:', EMAIL_PROVIDER, 'User:', !!GMAIL_USER, 'Password:', !!GMAIL_APP_PASSWORD);
}

function buildUnsubscribeFooter(recipientEmail) {
  if (!BASE_URL) return "";
  const unsubscribeUrl = `${BASE_URL}/email/unsubscribe?email=${encodeURIComponent(
    recipientEmail
  )}`;
  return `
    <div style="margin-top:30px;padding:20px;background:#f8fafc;border-radius:8px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0 0 8px;font-size:12px;color:#64748b;">You are receiving this email because we believe this investment opportunity aligns with your portfolio interests.</p>
      <p style="margin:0;font-size:11px;color:#94a3b8;">
        <a href="${unsubscribeUrl}" style="color:#64748b;text-decoration:none;">Unsubscribe</a> | 
        <span style="color:#94a3b8;">Cosmedream Investment Platform</span>
      </p>
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

async function sendEmail({ to, from, subject, html, messageId, headers = {}, categories = [], customArgs = {}, companyName = "Cosmedream" }) {
  if (!to || !subject || !html) {
    throw new Error("to, subject, html are required");
  }

  // Use default Gmail SMTP with proper company name
  const clientEmail = from || DEFAULT_FROM_EMAIL;
  const displayName = companyName || "Cosmedream";
  const sender = (EMAIL_PROVIDER === "gmail")
    ? `"${displayName}" <${GMAIL_USER}>`
    : `"${displayName}" <${clientEmail}>`;

  // Gmail SMTP
  if (EMAIL_PROVIDER === "gmail" && gmailTransporter) {
    try {
      const trackingPixel = BASE_URL
        ? `<img src="${BASE_URL}/email/track?messageId=${encodeURIComponent(
            messageId
          )}&email=${encodeURIComponent(to)}" width="1" height="1" style="display:none"/>`
        : "";

      const htmlWithTracking = rewriteLinksWithTracking(html, messageId) + buildUnsubscribeFooter(to) + trackingPixel;
      
      const mailOptions = {
        from: `"${displayName}" <${GMAIL_USER}>`,
        replyTo: clientEmail,
        to,
        subject,
        html: htmlWithTracking,
        headers: {
          "X-Campaign-Message-ID": messageId,
          "Message-ID": `<${messageId}@yourdomain.com>`,
          "X-Mailer": displayName,
          "Organization": displayName,
          ...headers,
        }
      };

      console.log('[gmail] Sending email from:', sender, 'to:', to);
      console.log('[gmail] HTML content length:', htmlWithTracking?.length);
      const result = await gmailTransporter.sendMail(mailOptions);
      console.log('[gmail] Email sent successfully:', result?.response || result?.messageId);
      return {
        statusCode: 200,
        messageId: result.messageId,
      };
    } catch (error) {
      console.error('[gmail] Email send failed:', error.message);
      throw new Error(`Gmail send failed: ${error.message}`);
    }
  }

  // Mock mode only when no email provider is configured at all
  if (!EMAIL_PROVIDER || (EMAIL_PROVIDER === "sendgrid" && (!SENDGRID_API_KEY || SENDGRID_API_KEY === 'SG.test-key-placeholder')) || (EMAIL_PROVIDER === "gmail" && (!GMAIL_USER || !GMAIL_APP_PASSWORD))) {
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

