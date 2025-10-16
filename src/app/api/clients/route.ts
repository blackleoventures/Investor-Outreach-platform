import { NextRequest, NextResponse } from "next/server";
import {
  verifyFirebaseToken,
  verifyAdminOrSubadmin,
  createAuthErrorResponse,
} from "@/lib/auth-middleware";
import { dbHelpers } from "@/lib/db-helpers";
import {
  ClientDocument,
  TransformedClient,
  ApiResponse,
  ErrorCode,
  UsageLimits,
} from "@/types/client";

export async function GET(request: NextRequest) {
  try {
    const user = await verifyFirebaseToken(request);
    verifyAdminOrSubadmin(user);

    console.log("[Get All Clients] Fetching all client submissions");

    const clients = (await dbHelpers.getAll("clients", {
      sortBy: "createdAt",
      sortOrder: "desc",
    })) as ClientDocument[];

    console.log(`[Get All Clients] Found ${clients.length} clients`);

    const transformedClients: TransformedClient[] = clients.map(
      (client: ClientDocument) => {
        const defaultUsageLimits: UsageLimits = {
          formEditCount: 0,
          pitchAnalysisCount: 0,
          maxFormEdits: 4,
          maxPitchAnalysis: 2,
          canEditForm: true,
          canAnalyzePitch: true,
        };

        const emailConfig = client.clientInformation?.emailConfiguration;

        return {
          id: client.id,
          userId: client.userId,
          submissionId: client.submissionId || `SUB-${client.id.slice(0, 8)}`,
          founderName: client.clientInformation?.founderName || "",
          email: client.clientInformation?.email || "",
          phone: client.clientInformation?.phone || "",
          companyName: client.clientInformation?.companyName || "",
          industry: client.clientInformation?.industry || "",
          fundingStage: client.clientInformation?.fundingStage || "",
          revenue: client.clientInformation?.revenue || "",
          investment: client.clientInformation?.investment || "",
          city: client.clientInformation?.city || "",
          platformName: emailConfig?.platformName || "",
          senderEmail: emailConfig?.senderEmail || "",
          smtpHost: emailConfig?.smtpHost || "",
          smtpPort: emailConfig?.smtpPort || 587,
          smtpSecurity: emailConfig?.smtpSecurity || "TLS",
          smtpTestStatus: emailConfig?.testStatus || "pending",
          dailyEmailLimit: emailConfig?.dailyEmailLimit || 50,
          pitchAnalyses: client.pitchAnalyses || [],
          pitchAnalysisCount: client.pitchAnalyses?.length || 0,
          usageLimits: client.usageLimits || defaultUsageLimits,
          status: client.status || "pending_review",
          reviewedBy: client.reviewedBy || null,
          reviewedAt: client.reviewedAt || null,
          reviewNotes: client.reviewNotes || null,
          emailVerified: client.emailVerified || false,
          archived: client.archived || false,
          createdAt: client.createdAt,
          updatedAt: client.updatedAt,
        };
      }
    );

    const response: ApiResponse<TransformedClient[]> = {
      success: true,
      data: transformedClients,
      count: transformedClients.length,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[Get Clients Error]:", {
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    if (error.name === "AuthenticationError") {
      return createAuthErrorResponse(error);
    }

    const errorResponse: ApiResponse = {
      success: false,
      error: {
        code: ErrorCode.SERVER_ERROR,
        message: "Unable to fetch clients. Please try again.",
      },
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
