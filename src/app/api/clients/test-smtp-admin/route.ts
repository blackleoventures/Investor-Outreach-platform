// api/clients/test-smtp-admin/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  verifyFirebaseToken,
  verifyAdminOrSubadmin,
  createAuthErrorResponse,
} from "@/lib/auth-middleware";
import { testSmtpConnectionAdmin } from "@/lib/smtp-test";
import { ApiResponse, ErrorCode } from "@/types/client";
import { SmtpConfiguration } from "@/types/smtp";

interface TestSmtpPayload {
  smtpConfig: SmtpConfiguration;
  testRecipientEmail: string; // Changed: Now accepts custom email
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyFirebaseToken(request);
    verifyAdminOrSubadmin(user);

    const body = (await request.json()) as TestSmtpPayload;

    console.log("[Test SMTP Admin] Request:", {
      adminUid: user.uid,
      testRecipient: body.testRecipientEmail,
      smtpHost: body.smtpConfig.smtpHost,
    });

    if (!body.testRecipientEmail) {
      const errorResponse: ApiResponse = {
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: "Test recipient email is required",
        },
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Test SMTP and send to provided email
    const testResult = await testSmtpConnectionAdmin(
      body.smtpConfig,
      body.testRecipientEmail
    );

    if (!testResult.success) {
      const errorResponse: ApiResponse = {
        success: false,
        error: {
          code: ErrorCode.SMTP_TEST_FAILED,
          message: testResult.message,
          details: testResult.details,
        },
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    console.log("[Test SMTP Admin] Success");

    const response: ApiResponse = {
      success: true,
      message: `Test email sent successfully to ${body.testRecipientEmail}`,
      data: testResult.data,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[Test SMTP Admin Error]:", error);

    if (error.name === "AuthenticationError") {
      return createAuthErrorResponse(error);
    }

    const errorResponse: ApiResponse = {
      success: false,
      error: {
        code: ErrorCode.SERVER_ERROR,
        message: "Unable to test SMTP connection",
      },
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
