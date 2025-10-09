import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken, createAuthErrorResponse } from "@/lib/auth-middleware";
import { dbHelpers } from "@/lib/db-helpers";

const COLLECTION = "clients";

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await verifyFirebaseToken(request);
    const userId = user.uid;

    // Parse request body
    const body = await request.json();
    const { clientInformation, pitchAnalyses, usageLimits } = body;

    console.log("[ClientSubmission] Creating submission for userId:", userId);

    // Validate required fields
    if (!clientInformation) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Please provide your company information to continue.",
          },
        },
        { status: 400 }
      );
    }

    // Validate email format
    if (!clientInformation.email || !clientInformation.email.includes("@")) {
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

    // Check if user already has a submission
    const existingSubmission = await dbHelpers.findOne(COLLECTION, { userId });

    if (existingSubmission) {
      console.log("[ClientSubmission] User already has submission:", existingSubmission.id);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "ALREADY_EXISTS",
            message: "You have already submitted an application. You can update it from your dashboard.",
          },
        },
        { status: 400 }
      );
    }

    // Prepare submission data
    const submissionData = {
      userId,
      clientInformation,
      pitchAnalyses: pitchAnalyses || [],
      usageLimits: usageLimits || {
        formEditCount: 1,
        pitchAnalysisCount: pitchAnalyses?.length || 0,
        maxFormEdits: 4,
        maxPitchAnalysis: 2,
        canEditForm: true,
        canAnalyzePitch: true,
      },
    };

    // Create submission
    const createdSubmission = await dbHelpers.create(COLLECTION, submissionData);

    console.log("[ClientSubmission] Submission created successfully:", createdSubmission.id);

    return NextResponse.json(
      {
        success: true,
        data: createdSubmission,
        message: "Your application has been submitted successfully!",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[ClientSubmission] Error creating submission:", error);

    // Return auth error if authentication failed
    if (error.name === "AuthenticationError") {
      return createAuthErrorResponse(error);
    }

    // Check for specific errors
    if (error.message && error.message.includes("permission")) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PERMISSION_DENIED",
            message: "You don't have permission to submit applications. Please contact support.",
          },
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SUBMIT_ERROR",
          message: "Unable to submit your application. Please try again or contact support.",
        },
      },
      { status: 500 }
    );
  }
}
