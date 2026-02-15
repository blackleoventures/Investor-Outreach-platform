import { NextRequest, NextResponse } from "next/server";
import {
    verifyFirebaseToken,
    verifyRole,
    AuthenticationError,
    createAuthErrorResponse,
} from "@/lib/auth-middleware";
import { dbHelpers } from "@/lib/db-helpers";
import {
    ClientDocument,
    ApiResponse,
    ErrorCode,
    PitchAnalysis,
} from "@/types/client";

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await verifyFirebaseToken(request);

        // Verify "investor" role (or admin/subadmin)
        verifyRole(user, ["admin", "subadmin", "investor"]);

        // Additional check for investors: must be active
        if (user.role === "investor" && user.active === false) {
            throw new AuthenticationError(
                "Your account is inactive. Please contact support.",
                "ACCOUNT_DISABLED",
                403
            );
        }

        const { id: clientId } = params;

        const client = (await dbHelpers.getById(
            "clients",
            clientId
        )) as ClientDocument | null;

        if (!client) {
            const errorResponse: ApiResponse = {
                success: false,
                error: {
                    code: ErrorCode.CLIENT_NOT_FOUND,
                    message: "Startup not found.",
                },
            };
            return NextResponse.json(errorResponse, { status: 404 });
        }

        // Permission check for investors
        if (user.role === "investor" && !client.dealRoomPermission) {
            const errorResponse: ApiResponse = {
                success: false,
                error: {
                    code: ErrorCode.ACCESS_DENIED,
                    message: "You do not have permission to view analysis for this startup.",
                },
            };
            return NextResponse.json(errorResponse, { status: 403 });
        }

        // Retrieve latest analysis
        let analysis: PitchAnalysis | null = null;
        if (client.pitchAnalyses && client.pitchAnalyses.length > 0) {
            analysis = client.pitchAnalyses[client.pitchAnalyses.length - 1];
        }

        if (!analysis) {
            const errorResponse: ApiResponse = {
                success: false,
                error: {
                    code: ErrorCode.CLIENT_NOT_FOUND, // Or more specific if needed
                    message: "No analysis available for this startup.",
                },
            };
            return NextResponse.json(errorResponse, { status: 404 });
        }

        // Return specific objects as per user request: summary, scorecard, suggested_questions
        const responseData = {
            summary: analysis.summary,
            scorecard: analysis.scorecard,
            suggested_questions: analysis.suggested_questions || [],
            highlights: analysis.highlights || [],
        };

        const response: ApiResponse<any> = {
            success: true,
            data: responseData,
        };

        return NextResponse.json(response);
    } catch (error: any) {
        return createAuthErrorResponse(error);
    }
}
