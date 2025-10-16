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
  ReviewClientRequest,
  ApiResponse,
  ErrorCode,
} from "@/types/client";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyFirebaseToken(request);
    verifyAdminOrSubadmin(user);

    const { id } = params;
    const body = (await request.json()) as ReviewClientRequest;

    console.log("[Review Client]", id, body);

    const existingClient = (await dbHelpers.getById(
      "clients",
      id
    )) as ClientDocument | null;

    if (!existingClient) {
      const errorResponse: ApiResponse = {
        success: false,
        error: {
          code: ErrorCode.CLIENT_NOT_FOUND,
          message: "Client not found",
        },
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    const { status, reviewNotes, rejectionReason } = body;

    if (!status || (status !== "approved" && status !== "rejected")) {
      const errorResponse: ApiResponse = {
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: "Valid status (approved/rejected) is required",
        },
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    if (status === "rejected" && !rejectionReason) {
      const errorResponse: ApiResponse = {
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: "Rejection reason is required when rejecting",
        },
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const updateData: Partial<ClientDocument> = {
      status,
      reviewedBy: user.uid,
      reviewedAt: new Date().toISOString(),
      reviewNotes: reviewNotes || null,
      rejectionReason: status === "rejected" ? rejectionReason : null,
    };

    await dbHelpers.update("clients", id, updateData);

    const refreshedClient = (await dbHelpers.getById(
      "clients",
      id
    )) as ClientDocument;
    const emailConfig = refreshedClient.clientInformation?.emailConfiguration;

    const transformedClient: TransformedClient = {
      id: id,
      userId: refreshedClient.userId,
      submissionId: refreshedClient.submissionId || `SUB-${id.slice(0, 8)}`,
      founderName: refreshedClient.clientInformation?.founderName || "",
      email: refreshedClient.clientInformation?.email || "",
      phone: refreshedClient.clientInformation?.phone || "",
      companyName: refreshedClient.clientInformation?.companyName || "",
      industry: refreshedClient.clientInformation?.industry || "",
      fundingStage: refreshedClient.clientInformation?.fundingStage || "",
      revenue: refreshedClient.clientInformation?.revenue || "",
      investment: refreshedClient.clientInformation?.investment || "",
      city: refreshedClient.clientInformation?.city || "",
      platformName: emailConfig?.platformName || "",
      senderEmail: emailConfig?.senderEmail || "",
      smtpHost: emailConfig?.smtpHost || "",
      smtpPort: emailConfig?.smtpPort || 587,
      smtpSecurity: emailConfig?.smtpSecurity || "TLS",
      smtpTestStatus: emailConfig?.testStatus || "pending",
      dailyEmailLimit: emailConfig?.dailyEmailLimit || 50,
      pitchAnalyses: refreshedClient.pitchAnalyses || [],
      pitchAnalysisCount: refreshedClient.pitchAnalyses?.length || 0,
      usageLimits: refreshedClient.usageLimits,
      status: refreshedClient.status || "pending_review",
      reviewedBy: refreshedClient.reviewedBy || null,
      reviewedAt: refreshedClient.reviewedAt || null,
      reviewNotes: refreshedClient.reviewNotes || null,
      emailVerified: refreshedClient.emailVerified || false,
      archived: refreshedClient.archived || false,
      createdAt: refreshedClient.createdAt,
      updatedAt: refreshedClient.updatedAt,
    };

    console.log("[Review Client] Reviewed successfully");

    const response: ApiResponse<TransformedClient> = {
      success: true,
      data: transformedClient,
      message: `Client ${status} successfully`,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[Review Client Error]:", error);

    if (error.name === "AuthenticationError") {
      return createAuthErrorResponse(error);
    }

    const errorResponse: ApiResponse = {
      success: false,
      error: {
        code: ErrorCode.SERVER_ERROR,
        message: "Unable to review client.",
      },
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
