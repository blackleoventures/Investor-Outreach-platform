import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken, createAuthErrorResponse } from "@/lib/auth-middleware";
import { dbHelpers } from "@/lib/db-helpers";
import { encryptAES256 } from "@/lib/encryption";

const COLLECTION = "clients";

/**
 * Update client information (including SMTP config)
 * PUT /api/client-submissions/update-info
 */
export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const user = await verifyFirebaseToken(request);
    const userId = user.uid;

    // Parse request body
    const body = await request.json();
    const { clientInformation, emailConfiguration } = body;

    console.log("[ClientSubmission] Updating info for userId:", userId);

    // Validate required fields
    if (!clientInformation && !emailConfiguration) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Please provide information to update.",
          },
        },
        { status: 400 }
      );
    }

    // Validate email if provided
    if (clientInformation?.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(clientInformation.email)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_EMAIL",
              message: "Please provide a valid email address.",
            },
          },
          { status: 400 }
        );
      }
    }

    // Find user's submission
    const submission = await dbHelpers.findOne(COLLECTION, { userId });

    if (!submission) {
      console.log("[ClientSubmission] No submission found for userId:", userId);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "No submission found. Please submit your application first.",
          },
        },
        { status: 404 }
      );
    }

    // Check if user can still edit
    if (submission.usageLimits.formEditCount >= submission.usageLimits.maxFormEdits) {
      console.log("[ClientSubmission] Edit limit exceeded for userId:", userId);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "LIMIT_EXCEEDED",
            message: `You have used all ${submission.usageLimits.maxFormEdits} form edits. Please contact admin@company.com for additional edits.`,
          },
        },
        { status: 403 }
      );
    }

    // ============= CHECK IF SMTP CHANGED =============
    
    let smtpChanged = false;
    let encryptedPassword = submission.clientInformation.emailConfiguration.smtpPassword;

    if (emailConfiguration) {
      const currentSmtp = submission.clientInformation.emailConfiguration;
      
      // Check if any SMTP field changed
      smtpChanged = 
        emailConfiguration.platformName !== currentSmtp.platformName ||
        emailConfiguration.senderEmail !== currentSmtp.senderEmail ||
        emailConfiguration.smtpHost !== currentSmtp.smtpHost ||
        emailConfiguration.smtpPort !== currentSmtp.smtpPort ||
        emailConfiguration.smtpSecurity !== currentSmtp.smtpSecurity ||
        emailConfiguration.smtpUsername !== currentSmtp.smtpUsername ||
        (emailConfiguration.smtpPassword && emailConfiguration.smtpPassword !== "••••••••••••••");

      if (smtpChanged) {
        console.log("[ClientSubmission] SMTP configuration changed, re-test required");
        
        // Validate that SMTP test was passed
        if (emailConfiguration.testStatus !== "passed") {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "SMTP_TEST_REQUIRED",
                message: "You must re-test your email configuration before saving changes.",
              },
            },
            { status: 400 }
          );
        }

        // Encrypt new password if provided
        if (emailConfiguration.smtpPassword && emailConfiguration.smtpPassword !== "••••••••••••••") {
          console.log("[ClientSubmission] Encrypting new SMTP password...");
          encryptedPassword = encryptAES256(emailConfiguration.smtpPassword);
        }
      }
    }

    // ============= INCREMENT EDIT COUNT =============

    const newFormEditCount = submission.usageLimits.formEditCount + 1;
    const canEditForm = newFormEditCount < submission.usageLimits.maxFormEdits;

    // ============= PREPARE UPDATE DATA =============

    const updatedData: any = {
      usageLimits: {
        ...submission.usageLimits,
        formEditCount: newFormEditCount,
        canEditForm,
      },
    };

    // Update client information if provided
    if (clientInformation || emailConfiguration) {
      updatedData.clientInformation = {
        ...submission.clientInformation,
        ...(clientInformation || {}),
      };

      // Update email configuration if provided
      if (emailConfiguration) {
        updatedData.clientInformation.emailConfiguration = {
          ...submission.clientInformation.emailConfiguration,
          platformName: emailConfiguration.platformName,
          senderEmail: emailConfiguration.senderEmail,
          smtpHost: emailConfiguration.smtpHost,
          smtpPort: emailConfiguration.smtpPort,
          smtpSecurity: emailConfiguration.smtpSecurity,
          smtpUsername: emailConfiguration.smtpUsername,
          smtpPassword: encryptedPassword, // ENCRYPTED
          testStatus: smtpChanged ? "passed" : submission.clientInformation.emailConfiguration.testStatus,
          testDate: smtpChanged ? new Date().toISOString() : submission.clientInformation.emailConfiguration.testDate,
          testRecipient: smtpChanged ? (emailConfiguration.testRecipient || null) : submission.clientInformation.emailConfiguration.testRecipient,
        };
      }
    }

    // ============= UPDATE SUBMISSION =============

    const updatedSubmission = await dbHelpers.update(COLLECTION, submission.id, updatedData);

    console.log(
      "[ClientSubmission] Info updated successfully, edit count:",
      newFormEditCount,
      "/",
      submission.usageLimits.maxFormEdits
    );

    // ============= PREPARE RESPONSE =============

    // Add id and other fields back to response
    const responseData = {
      id: submission.id,
      userId: submission.userId,
      submissionId: submission.submissionId,
      ...updatedSubmission,
      pitchAnalyses: submission.pitchAnalyses,
      clientInformation: {
        ...updatedSubmission.clientInformation,
        emailConfiguration: {
          ...updatedSubmission.clientInformation.emailConfiguration,
          smtpPassword: "••••••••••••••", // Masked
        },
      },
    };

    return NextResponse.json({
      success: true,
      data: responseData,
      message: `Information updated successfully! You have ${
        submission.usageLimits.maxFormEdits - newFormEditCount
      } edit(s) remaining.`,
    });
  } catch (error: any) {
    console.error("[ClientSubmission] Error updating info:", error);

    // Return auth error if authentication failed
    if (error.name === "AuthenticationError") {
      return createAuthErrorResponse(error);
    }

    if (error.message && error.message.includes("permission")) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PERMISSION_DENIED",
            message: "You don't have permission to update this information.",
          },
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UPDATE_ERROR",
          message: "Unable to update your information. Please try again.",
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
