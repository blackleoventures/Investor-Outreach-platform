import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken, createAuthErrorResponse } from "@/lib/auth-middleware";
import { testSmtpConnectionClient } from "@/lib/smtp-test";
import type { SmtpConfiguration } from "@/types/smtp";

/**
 * Test SMTP connection for client submission
 * POST /api/client-submissions/test-smtp
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await verifyFirebaseToken(request);
    console.log("[ClientSubmission] Testing SMTP for userId:", user.uid);

    // Parse request body
    const body = await request.json();
    const { smtpConfig, testRecipientEmail } = body;

    // Validate required fields
    if (!smtpConfig) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Email configuration is required",
          },
        },
        { status: 400 }
      );
    }

    if (!testRecipientEmail) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Test recipient email is required",
          },
        },
        { status: 400 }
      );
    }

    // Validate SMTP config structure
    const requiredFields = [
      'platformName',
      'senderEmail',
      'smtpHost',
      'smtpPort',
      'smtpSecurity',
      'smtpUsername',
      'smtpPassword'
    ];

    for (const field of requiredFields) {
      if (!smtpConfig[field]) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: `Missing required field: ${field}`,
            },
          },
          { status: 400 }
        );
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testRecipientEmail)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_EMAIL",
            message: "Please provide a valid test email address",
          },
        },
        { status: 400 }
      );
    }

    console.log("[ClientSubmission] Testing SMTP connection...");
    console.log("[ClientSubmission] Platform:", smtpConfig.platformName);
    console.log("[ClientSubmission] Host:", smtpConfig.smtpHost);
    console.log("[ClientSubmission] Port:", smtpConfig.smtpPort);

    // Test SMTP connection
    const testResult = await testSmtpConnectionClient(
      smtpConfig as SmtpConfiguration,
      testRecipientEmail
    );

    if (testResult.success) {
      console.log("[ClientSubmission] SMTP test successful");
      return NextResponse.json({
        success: true,
        message: testResult.message,
        data: testResult.data,
      });
    } else {
      console.log("[ClientSubmission] SMTP test failed:", testResult.error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: testResult.errorCode || "TEST_FAILED",
            message: testResult.message,
            details: testResult.details,
          },
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("[ClientSubmission] Error testing SMTP:", error);

    // Return auth error if authentication failed
    if (error.name === "AuthenticationError") {
      return createAuthErrorResponse(error);
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SMTP_TEST_ERROR",
          message: "Unable to test email configuration. Please try again.",
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
