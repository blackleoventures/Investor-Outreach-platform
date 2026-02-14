// frontend/src/app/api/client-submissions/add-pitch-analysis/route.ts
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
    const { pitchAnalysis, pitchDeckData } = body;

    console.log("[ClientSubmission] Adding pitch analysis for userId:", userId);

    // Validate required fields
    if (!pitchAnalysis) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Please provide pitch analysis data.",
          },
        },
        { status: 400 }
      );
    }

    // Validate pitch analysis structure
    if (!pitchAnalysis.summary || !pitchAnalysis.scorecard) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_DATA",
            message: "Invalid pitch analysis format. Please try uploading again.",
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

    // Check if user can still add pitch analysis
    if (submission.usageLimits.pitchAnalysisCount >= submission.usageLimits.maxPitchAnalysis) {
      console.log("[ClientSubmission] Analysis limit exceeded for userId:", userId);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "LIMIT_EXCEEDED",
            message: `You have used all ${submission.usageLimits.maxPitchAnalysis} pitch analyses. Please contact admin@company.com for additional analyses.`,
          },
        },
        { status: 403 }
      );
    }

    // Add analyzedAt timestamp if not present
    const analysisWithTimestamp = {
      ...pitchAnalysis,
      analyzedAt: pitchAnalysis.analyzedAt || new Date().toISOString(),
    };

    // Increment pitchAnalysisCount
    const newPitchAnalysisCount = submission.usageLimits.pitchAnalysisCount + 1;
    const canAnalyzePitch = newPitchAnalysisCount < submission.usageLimits.maxPitchAnalysis;

    const updatedPitchAnalyses = [...(submission.pitchAnalyses || []), analysisWithTimestamp];

    const updatedData = {
      pitchAnalyses: updatedPitchAnalyses,
      usageLimits: {
        ...submission.usageLimits,
        pitchAnalysisCount: newPitchAnalysisCount,
        canAnalyzePitch,
      },
    };

    if (pitchDeckData) {
      (updatedData as any).pitchDeckFileName = pitchDeckData.fileName;
      (updatedData as any).pitchDeckFileUrl = pitchDeckData.fileUrl;
      (updatedData as any).pitchDeckFileSize = pitchDeckData.fileSize;
    }

    const updatedSubmission = await dbHelpers.update(COLLECTION, submission.id, updatedData);

    console.log(
      "[ClientSubmission] Pitch analysis added, count:",
      newPitchAnalysisCount,
      "/",
      submission.usageLimits.maxPitchAnalysis
    );

    // Add id and other fields back to response
    const responseData = {
      id: submission.id,
      userId: submission.userId,
      clientInformation: submission.clientInformation,
      ...updatedSubmission,
    };

    return NextResponse.json({
      success: true,
      data: responseData,
      message: `Pitch analysis added successfully! You have ${submission.usageLimits.maxPitchAnalysis - newPitchAnalysisCount
        } analysis credit(s) remaining.`,
    });
  } catch (error: any) {
    console.error("[ClientSubmission] Error adding pitch analysis:", error);

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
            message: "You don't have permission to add pitch analyses.",
          },
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ADD_ERROR",
          message: "Unable to add pitch analysis. Please try again.",
        },
      },
      { status: 500 }
    );
  }
}
