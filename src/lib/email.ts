import nodemailer from "nodemailer";
import { adminDb } from "./firebase-admin";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: process.env.SMTP_SECURE !== "false", // default to true for 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Sends a magic link email to an investor using their UID to fetch details from DB
 */
export async function sendMagicLinkByUid(uid: string, magicLink: string) {
  try {
    console.log(`[Email] Fetching investor data for UID: ${uid}`);
    const investorDoc = await adminDb.collection("investors").doc(uid).get();

    if (!investorDoc.exists) {
      throw new Error(`Investor with UID ${uid} not found in database.`);
    }

    const data = investorDoc.data();
    const email = data?.email;
    const displayName = data?.displayName || "Investor";

    if (!email) {
      throw new Error(`No email found for investor UID ${uid}`);
    }

    return await sendMagicLinkEmail(email, displayName, magicLink);
  } catch (error: any) {
    console.error(`[Email] Failed in sendMagicLinkByUid for UID ${uid}:`, error.message);
    throw error;
  }
}

export async function sendMagicLinkEmail(email: string, displayName: string, magicLink: string) {
  const mailOptions = {
    from: `"Deal Room" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: email,
    subject: "Your Exclusive Access to the Deal Room",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #1677ff;">Welcome to the Deal Room</h2>
        <p>Hello ${displayName},</p>
        <p>You have been invited as an exclusive investor to access the Deal Room platform.</p>
        <p>Click the button below to log in securely. This link is unique to you and should not be shared.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${magicLink}" style="background-color: #1677ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Access Deal Room</a>
        </div>
        <p style="font-size: 12px; color: #666;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="font-size: 12px; color: #1677ff; word-break: break-all;">${magicLink}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999;">If you were not expecting this invitation, please ignore this email.</p>
      </div>
    `,
  };

  try {
    console.log(`[Email] Attempting to send mail to: ${email} via ${process.env.SMTP_HOST || 'smtp.gmail.com'}`);
    const info = await transporter.sendMail(mailOptions);
    console.log("[Email] Magic link sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("[Email] Error sending magic link:");
    console.error("- Message:", error.message);
    console.error("- Code:", error.code);
    console.error("- SMTP User:", process.env.SMTP_USER);
    throw error;
  }
}
