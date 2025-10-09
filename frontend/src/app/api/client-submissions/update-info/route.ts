import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken, createAuthErrorResponse } from "@/lib/auth-middleware";
import { dbHelpers } from "@/lib/db-helpers";

const COLLECTION = "clients";

export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const user = await verifyFirebaseToken(request);
    const userId = user.uid;

    // Parse request body
    const body = await request.json();
    const { clientInformation } = body;

    console.log("[ClientSubmission] Updating info for userId:", userId);

    // Validate required fields
    if (!clientInformation) {
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
    if (clientInformation.email && !clientInformation.email.includes("@")) {
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

    // Increment formEditCount
    const newFormEditCount = submission.usageLimits.formEditCount + 1;
    const canEditForm = newFormEditCount < submission.usageLimits.maxFormEdits;

    const updatedData = {
      clientInformation,
      usageLimits: {
        ...submission.usageLimits,
        formEditCount: newFormEditCount,
        canEditForm,
      },
    };

    const updatedSubmission = await dbHelpers.update(COLLECTION, submission.id, updatedData);

    console.log(
      "[ClientSubmission] Info updated successfully, edit count:",
      newFormEditCount,
      "/",
      submission.usageLimits.maxFormEdits
    );

    // Add id back to response
    const responseData = {
      id: submission.id,
      userId: submission.userId,
      ...updatedSubmission,
      pitchAnalyses: submission.pitchAnalyses,
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
        },
      },
      { status: 500 }
    );
  }
}
