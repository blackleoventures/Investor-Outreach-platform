// src/lib/smtp-test.ts

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { SmtpConfiguration, SmtpTestResponse, SmtpErrorType } from "@/types/smtp";

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
    if (!smtpConfig.smtpHost || !smtpConfig.smtpPort || !smtpConfig.smtpUsername || !smtpConfig.smtpPassword) {
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
      from: `${smtpConfig.platformName || "Campaign Platform"} <${smtpConfig.senderEmail}>`,
      to: testRecipientEmail,
      subject: "Test Email from Campaign Platform",
      text: senderType === "client" 
        ? generateClientTestEmailText(smtpConfig)
        : generateAdminTestEmailText(smtpConfig),
      html: senderType === "client"
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
    errorMessage = "Authentication failed. Please check your username and password.";
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
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
        Test Email Successful
      </h1>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
        This is a test email to verify your email configuration.
      </p>
      
      <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1e40af;">
          If you received this email, your email settings are working correctly!
        </p>
      </div>
      
      <h2 style="margin: 30px 0 15px 0; font-size: 18px; font-weight: 600; color: #333333;">
        Configuration Details
      </h2>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600; color: #374151; width: 40%;">Platform</td>
          <td style="padding: 12px; background-color: #ffffff; border: 1px solid #e5e7eb; color: #6b7280;">${smtpConfig.platformName}</td>
        </tr>
        <tr>
          <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Mail Server</td>
          <td style="padding: 12px; background-color: #ffffff; border: 1px solid #e5e7eb; color: #6b7280;">${smtpConfig.smtpHost}</td>
        </tr>
        <tr>
          <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Port</td>
          <td style="padding: 12px; background-color: #ffffff; border: 1px solid #e5e7eb; color: #6b7280;">${smtpConfig.smtpPort}</td>
        </tr>
        <tr>
          <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Security</td>
          <td style="padding: 12px; background-color: #ffffff; border: 1px solid #e5e7eb; color: #6b7280;">${smtpConfig.smtpSecurity}</td>
        </tr>
        <tr>
          <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Sender Email</td>
          <td style="padding: 12px; background-color: #ffffff; border: 1px solid #e5e7eb; color: #6b7280;">${smtpConfig.senderEmail}</td>
        </tr>
      </table>
      
      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 30px 0; border-radius: 4px;">
        <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600; color: #92400e;">
          Next Steps
        </h3>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #92400e;">
          Please complete the remaining steps and submit your registration. Our platform will contact you once your registration is complete.
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb; text-align: center;">
      <p style="margin: 0; font-size: 14px; color: #6b7280;">
        This is an automated test email from the Campaign Platform
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
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
        Admin Test Successful
      </h1>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
        This is a test email to verify the client's email configuration.
      </p>
      
      <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 16px; font-weight: 600; color: #065f46;">
          If you received this email, the email settings are working correctly and the client can proceed.
        </p>
      </div>
      
      <h2 style="margin: 30px 0 15px 0; font-size: 18px; font-weight: 600; color: #333333;">
        Configuration Details
      </h2>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600; color: #374151; width: 40%;">Platform</td>
          <td style="padding: 12px; background-color: #ffffff; border: 1px solid #e5e7eb; color: #6b7280;">${smtpConfig.platformName}</td>
        </tr>
        <tr>
          <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Mail Server</td>
          <td style="padding: 12px; background-color: #ffffff; border: 1px solid #e5e7eb; color: #6b7280;">${smtpConfig.smtpHost}</td>
        </tr>
        <tr>
          <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Port</td>
          <td style="padding: 12px; background-color: #ffffff; border: 1px solid #e5e7eb; color: #6b7280;">${smtpConfig.smtpPort}</td>
        </tr>
        <tr>
          <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Security</td>
          <td style="padding: 12px; background-color: #ffffff; border: 1px solid #e5e7eb; color: #6b7280;">${smtpConfig.smtpSecurity}</td>
        </tr>
        <tr>
          <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Sender Email</td>
          <td style="padding: 12px; background-color: #ffffff; border: 1px solid #e5e7eb; color: #6b7280;">${smtpConfig.senderEmail}</td>
        </tr>
      </table>
      
      <p style="margin: 30px 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">
        The client's email configuration has been successfully tested and is ready for campaign use.
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb; text-align: center;">
      <p style="margin: 0; font-size: 14px; color: #6b7280;">
        This is an automated test email from the Campaign Platform Admin Panel
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
