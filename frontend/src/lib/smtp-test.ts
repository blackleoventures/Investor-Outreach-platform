// src/lib/smtp-test.ts

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import {
  SmtpConfiguration,
  SmtpTestResponse,
  SmtpErrorType,
} from "@/types/smtp";

/**
 * Test SMTP connection and send a test email for CLIENT
 *
 * @param smtpConfig - SMTP configuration
 * @param testRecipientEmail - Email address to send test email to
 * @returns Test result with success status and details
 */
export async function testSmtpConnectionClient(
  smtpConfig: SmtpConfiguration,
  testRecipientEmail: string
): Promise<SmtpTestResponse> {
  return testSmtpConnection(smtpConfig, testRecipientEmail, "client");
}

/**
 * Test SMTP connection and send a test email for ADMIN
 *
 * @param smtpConfig - SMTP configuration
 * @param testRecipientEmail - Email address to send test email to
 * @returns Test result with success status and details
 */
export async function testSmtpConnectionAdmin(
  smtpConfig: SmtpConfiguration,
  testRecipientEmail: string
): Promise<SmtpTestResponse> {
  return testSmtpConnection(smtpConfig, testRecipientEmail, "admin");
}

/**
 * Internal function to test SMTP connection
 *
 * @param smtpConfig - SMTP configuration
 * @param testRecipientEmail - Email address to send test email to
 * @param senderType - Type of sender (client or admin)
 * @returns Test result with success status and details
 */
async function testSmtpConnection(
  smtpConfig: SmtpConfiguration,
  testRecipientEmail: string,
  senderType: "client" | "admin"
): Promise<SmtpTestResponse> {
  let transporter: Transporter | null = null;

  try {
    // Validate inputs
    if (
      !smtpConfig.smtpHost ||
      !smtpConfig.smtpPort ||
      !smtpConfig.smtpUsername ||
      !smtpConfig.smtpPassword
    ) {
      return {
        success: false,
        message: "Missing required email configuration fields",
        error: "Incomplete email configuration",
      };
    }

    if (!testRecipientEmail || !isValidEmail(testRecipientEmail)) {
      return {
        success: false,
        message: "Invalid test recipient email address",
        error: "Invalid email format",
      };
    }

    // Create transporter
    transporter = nodemailer.createTransport({
      host: smtpConfig.smtpHost,
      port: smtpConfig.smtpPort,
      secure: smtpConfig.smtpSecurity === "SSL", // true for 465, false for 587
      auth: {
        user: smtpConfig.smtpUsername,
        pass: smtpConfig.smtpPassword,
      },
      tls: {
        rejectUnauthorized: smtpConfig.smtpSecurity !== "None",
      },
      connectionTimeout: 30000, // 30 seconds
      greetingTimeout: 30000,
      socketTimeout: 30000,
    });

    // Step 1: Verify connection
    console.log("[Email Test] Verifying connection...");
    await transporter.verify();
    console.log("[Email Test] Connection verified successfully");

    // Step 2: Send test email
    console.log("[Email Test] Sending test email...");
    const info = await transporter.sendMail({
      from: `${smtpConfig.platformName || "Campaign Platform"} <${
        smtpConfig.senderEmail
      }>`,
      to: testRecipientEmail,
      subject: "Test Email from Campaign Platform",
      text:
        senderType === "client"
          ? generateClientTestEmailText(smtpConfig)
          : generateAdminTestEmailText(smtpConfig),
      html:
        senderType === "client"
          ? generateClientTestEmailHtml(smtpConfig)
          : generateAdminTestEmailHtml(smtpConfig),
    });

    console.log("[Email Test] Test email sent successfully:", info.messageId);

    // Success response
    return {
      success: true,
      message: "Connection successful! Test email sent.",
      data: {
        messageId: info.messageId,
        testEmailSentTo: testRecipientEmail,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error("[Email Test] Error:", error);

    // Parse error and return appropriate response
    const errorResponse = parseSmtpError(error);
    return errorResponse;
  } finally {
    // Close transporter connection
    if (transporter) {
      transporter.close();
    }
  }
}

/**
 * Parse SMTP error and return user-friendly error response
 */
function parseSmtpError(error: any): SmtpTestResponse {
  let errorMessage = "Connection failed. Please check your settings.";
  let errorCode = SmtpErrorType.UNKNOWN;
  let details = error.message || "Unknown error";

  // Authentication errors
  if (error.code === "EAUTH" || error.responseCode === 535) {
    errorMessage =
      "Authentication failed. Please check your username and password.";
    errorCode = SmtpErrorType.AUTH_FAILED;
  }
  // Connection errors
  else if (error.code === "ECONNECTION" || error.code === "ECONNREFUSED") {
    errorMessage = "Cannot connect to mail server. Please check host and port.";
    errorCode = SmtpErrorType.CONNECTION_FAILED;
  }
  // Timeout errors
  else if (error.code === "ETIMEDOUT" || error.code === "ESOCKET") {
    errorMessage = "Connection timeout. Please check your firewall settings.";
    errorCode = SmtpErrorType.TIMEOUT;
  }
  // Invalid credentials
  else if (error.responseCode === 550 || error.responseCode === 554) {
    errorMessage = "Invalid credentials or sender email not authorized.";
    errorCode = SmtpErrorType.INVALID_CREDENTIALS;
  }
  // Network errors
  else if (error.code === "ENOTFOUND" || error.code === "EAI_AGAIN") {
    errorMessage = "Cannot resolve mail server. Please check the hostname.";
    errorCode = SmtpErrorType.NETWORK_ERROR;
  }

  return {
    success: false,
    message: errorMessage,
    error: errorMessage,
    errorCode,
    details,
  };
}

/**
 * Generate plain text test email content for CLIENT
 */
function generateClientTestEmailText(smtpConfig: SmtpConfiguration): string {
  return `This is a test email to verify your email configuration.

If you received this email, your email settings are working correctly!

Configuration Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Platform: ${smtpConfig.platformName}
Mail Server: ${smtpConfig.smtpHost}
Port: ${smtpConfig.smtpPort}
Security: ${smtpConfig.smtpSecurity}
Sender Email: ${smtpConfig.senderEmail}

Next Steps:
Please complete the remaining steps and submit your registration.
Our platform will contact you once your registration is complete.

---
This is an automated test email from the Campaign Platform.
`;
}

/**
 * Generate HTML test email content for CLIENT
 */
function generateClientTestEmailHtml(smtpConfig: SmtpConfiguration): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    
    <!-- Header -->
    <div style="background-color: #000000; padding: 30px 20px; border-bottom: 4px solid #FFC107;">
      <h1 style="margin: 0; color: #FFC107; font-size: 24px; font-weight: bold; letter-spacing: 0.5px;">
        EMAIL CONFIGURATION TEST
      </h1>
      <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 14px;">
        ${smtpConfig.platformName || "Campaign Platform"}
      </p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #000000;">
        This is a test email to verify your email configuration.
      </p>
      
      <div style="background-color: #FFFDE7; border: 2px solid #FFC107; padding: 20px; margin: 24px 0;">
        <p style="margin: 0; font-size: 16px; font-weight: bold; color: #000000;">
          ✓ Configuration Test Successful
        </p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #424242;">
          If you received this email, your email settings are working correctly.
        </p>
      </div>
      
      <h2 style="margin: 32px 0 16px 0; font-size: 18px; font-weight: bold; color: #000000; border-bottom: 2px solid #000000; padding-bottom: 8px;">
        Configuration Details
      </h2>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 12px 16px; background-color: #f5f5f5; border: 1px solid #e0e0e0; font-weight: bold; color: #000000; width: 40%;">Platform</td>
          <td style="padding: 12px 16px; background-color: #ffffff; border: 1px solid #e0e0e0; color: #424242;">${
            smtpConfig.platformName
          }</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; background-color: #f5f5f5; border: 1px solid #e0e0e0; font-weight: bold; color: #000000;">Mail Server</td>
          <td style="padding: 12px 16px; background-color: #ffffff; border: 1px solid #e0e0e0; color: #424242;">${
            smtpConfig.smtpHost
          }</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; background-color: #f5f5f5; border: 1px solid #e0e0e0; font-weight: bold; color: #000000;">Port</td>
          <td style="padding: 12px 16px; background-color: #ffffff; border: 1px solid #e0e0e0; color: #424242;">${
            smtpConfig.smtpPort
          }</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; background-color: #f5f5f5; border: 1px solid #e0e0e0; font-weight: bold; color: #000000;">Security</td>
          <td style="padding: 12px 16px; background-color: #ffffff; border: 1px solid #e0e0e0; color: #424242;">${
            smtpConfig.smtpSecurity
          }</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; background-color: #f5f5f5; border: 1px solid #e0e0e0; font-weight: bold; color: #000000;">Sender Email</td>
          <td style="padding: 12px 16px; background-color: #ffffff; border: 1px solid #e0e0e0; color: #424242;">${
            smtpConfig.senderEmail
          }</td>
        </tr>
      </table>
      
      <div style="background-color: #ffffff; border: 2px solid #000000; padding: 20px; margin: 32px 0;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: bold; color: #000000;">
          NEXT STEPS
        </h3>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #424242;">
          Please complete the remaining steps and submit your registration. Our platform will contact you once your registration is complete.
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f5f5f5; padding: 24px 30px; border-top: 1px solid #e0e0e0;">
      <p style="margin: 0; font-size: 13px; color: #757575; line-height: 1.5;">
        This is an automated test email from the Campaign Platform.<br>
        Please do not reply to this email.
      </p>
    </div>
    
  </div>
</body>
</html>
  `;
}

/**
 * Generate plain text test email content for ADMIN
 */
function generateAdminTestEmailText(smtpConfig: SmtpConfiguration): string {
  return `This is a test email to verify the client's email configuration.

If you received this email, the email settings are working correctly and the client can proceed.

Configuration Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Platform: ${smtpConfig.platformName}
Mail Server: ${smtpConfig.smtpHost}
Port: ${smtpConfig.smtpPort}
Security: ${smtpConfig.smtpSecurity}
Sender Email: ${smtpConfig.senderEmail}

The client's email configuration has been successfully tested and is ready for campaign use.

---
This is an automated test email from the Campaign Platform Admin Panel.
`;
}

/**
 * Generate HTML test email content for ADMIN
 */
function generateAdminTestEmailHtml(smtpConfig: SmtpConfiguration): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Test Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    
    <!-- Header -->
    <div style="background-color: #000000; padding: 30px 20px; border-bottom: 4px solid #FFC107;">
      <h1 style="margin: 0; color: #FFC107; font-size: 24px; font-weight: bold; letter-spacing: 0.5px;">
        ADMIN: CLIENT EMAIL TEST
      </h1>
      <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 14px;">
        ${smtpConfig.platformName || "Campaign Platform"} - Admin Panel
      </p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #000000;">
        This is a test email to verify the client's email configuration.
      </p>
      
      <div style="background-color: #FFFDE7; border: 2px solid #FFC107; padding: 20px; margin: 24px 0;">
        <p style="margin: 0; font-size: 16px; font-weight: bold; color: #000000;">
          ✓ Client Configuration Test Successful
        </p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #424242;">
          The email settings are working correctly and the client can proceed with their registration.
        </p>
      </div>
      
      <h2 style="margin: 32px 0 16px 0; font-size: 18px; font-weight: bold; color: #000000; border-bottom: 2px solid #000000; padding-bottom: 8px;">
        Client Configuration Details
      </h2>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 12px 16px; background-color: #f5f5f5; border: 1px solid #e0e0e0; font-weight: bold; color: #000000; width: 40%;">Platform</td>
          <td style="padding: 12px 16px; background-color: #ffffff; border: 1px solid #e0e0e0; color: #424242;">${
            smtpConfig.platformName
          }</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; background-color: #f5f5f5; border: 1px solid #e0e0e0; font-weight: bold; color: #000000;">Mail Server</td>
          <td style="padding: 12px 16px; background-color: #ffffff; border: 1px solid #e0e0e0; color: #424242;">${
            smtpConfig.smtpHost
          }</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; background-color: #f5f5f5; border: 1px solid #e0e0e0; font-weight: bold; color: #000000;">Port</td>
          <td style="padding: 12px 16px; background-color: #ffffff; border: 1px solid #e0e0e0; color: #424242;">${
            smtpConfig.smtpPort
          }</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; background-color: #f5f5f5; border: 1px solid #e0e0e0; font-weight: bold; color: #000000;">Security</td>
          <td style="padding: 12px 16px; background-color: #ffffff; border: 1px solid #e0e0e0; color: #424242;">${
            smtpConfig.smtpSecurity
          }</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; background-color: #f5f5f5; border: 1px solid #e0e0e0; font-weight: bold; color: #000000;">Sender Email</td>
          <td style="padding: 12px 16px; background-color: #ffffff; border: 1px solid #e0e0e0; color: #424242;">${
            smtpConfig.senderEmail
          }</td>
        </tr>
      </table>
      
      <div style="background-color: #ffffff; border: 2px solid #000000; padding: 20px; margin: 32px 0;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: bold; color: #000000;">
          STATUS: READY FOR CAMPAIGNS
        </h3>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #424242;">
          The client's email configuration has been successfully tested and is ready for campaign use.
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f5f5f5; padding: 24px 30px; border-top: 1px solid #e0e0e0;">
      <p style="margin: 0; font-size: 13px; color: #757575; line-height: 1.5;">
        This is an automated test email from the Campaign Platform Admin Panel.<br>
        Please do not reply to this email.
      </p>
    </div>
    
  </div>
</body>
</html>
  `;
}

/**
 * Simple email validation
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
