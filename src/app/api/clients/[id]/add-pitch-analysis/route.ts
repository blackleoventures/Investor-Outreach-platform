// src/app/api/clients/[id]/add-pitch-analysis/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  verifyFirebaseToken,
  verifyAdminOrSubadmin,
  createAuthErrorResponse,
} from "@/lib/auth-middleware";
import { dbHelpers } from "@/lib/db-helpers";

const COLLECTION = "clients";

interface Params {
  id: string;
}

/**
 * Add pitch analysis to a client (Admin only)
 * POST /api/clients/[id]/add-pitch-analysis
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    // Authenticate user and verify admin/subadmin
    const user = await verifyFirebaseToken(request);
    verifyAdminOrSubadmin(user);

    const { id: clientId } = await params;

    // Parse request body
    const body = await request.json();
    const { pitchAnalysis } = body;

    console.log("[Admin] Adding pitch analysis to client:", clientId);

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
            message:
              "Invalid pitch analysis format. Please try uploading again.",
          },
        },
        { status: 400 }
      );
    }

    // Find the client
    const client = (await dbHelpers.getById(COLLECTION, clientId)) as any;

    if (!client) {
      console.log("[Admin] Client not found:", clientId);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Client not found.",
          },
        },
        { status: 404 }
      );
    }

    // Add analyzedAt timestamp if not present
    const analysisWithTimestamp = {
      ...pitchAnalysis,
      analyzedAt: pitchAnalysis.analyzedAt || new Date().toISOString(),
      addedBy: user.uid,
      addedByRole: user.role,
    };

    // Increment pitchAnalysisCount
    const currentCount = client.usageLimits?.pitchAnalysisCount || 0;
    const maxCount = client.usageLimits?.maxPitchAnalysis || 2;
    const newPitchAnalysisCount = currentCount + 1;
    const canAnalyzePitch = newPitchAnalysisCount < maxCount;

    const updatedPitchAnalyses = [
      ...(client.pitchAnalyses || []),
      analysisWithTimestamp,
    ];

    const updatedData = {
      pitchAnalyses: updatedPitchAnalyses,
      usageLimits: {
        ...(client.usageLimits || {}),
        pitchAnalysisCount: newPitchAnalysisCount,
        canAnalyzePitch,
      },
      updatedAt: new Date().toISOString(),
    };

    await dbHelpers.update(COLLECTION, clientId, updatedData);

    console.log(
      "[Admin] Pitch analysis added to client:",
      clientId,
      "count:",
      newPitchAnalysisCount
    );

    // Fetch updated client
    const updatedClient = await dbHelpers.getById(COLLECTION, clientId);

    return NextResponse.json({
      success: true,
      data: updatedClient,
      message: `Pitch analysis added successfully!`,
    });
  } catch (error: any) {
    console.error("[Admin] Error adding pitch analysis:", error);

    // Return auth error if authentication failed
    if (error.name === "AuthenticationError") {
      return createAuthErrorResponse(error);
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
