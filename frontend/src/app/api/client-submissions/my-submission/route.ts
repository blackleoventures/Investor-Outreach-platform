import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken, createAuthErrorResponse } from "@/lib/auth-middleware";
import { dbHelpers } from "@/lib/db-helpers";

const COLLECTION = "clients";

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await verifyFirebaseToken(request);
    const userId = user.uid;

    console.log("[ClientSubmission] Fetching submission for userId:", userId);

    // Find user's submission
    const submission = await dbHelpers.findOne(COLLECTION, { userId });

    if (!submission) {
      console.log("[ClientSubmission] No submission found for userId:", userId);
      return NextResponse.json({
        success: true,
        data: null,
        message: "No submission found",
      });
    }

    console.log("[ClientSubmission] Submission found:", submission.id);

    return NextResponse.json({
      success: true,
      data: submission,
    });
  } catch (error: any) {
    console.error("[ClientSubmission] Error fetching submission:", error);
    
    // Return auth error if authentication failed
    if (error.name === "AuthenticationError") {
      return createAuthErrorResponse(error);
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FETCH_ERROR",
          message: "Unable to load your submission. Please try again.",
        },
      },
      { status: 500 }
    );
  }
}
