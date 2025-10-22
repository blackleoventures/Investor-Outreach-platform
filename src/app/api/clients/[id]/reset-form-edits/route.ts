import { NextRequest, NextResponse } from "next/server";
import {
  verifyFirebaseToken,
  verifyAdminOrSubadmin,
  createAuthErrorResponse,
} from "@/lib/auth-middleware";
import { dbHelpers } from "@/lib/db-helpers";
import {
  ClientDocument,
  UsageLimits,
  ApiResponse,
  ErrorCode,
} from "@/types/client";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyFirebaseToken(request);
    verifyAdminOrSubadmin(user);

    const { id } = params;

    console.log("[Reset Form Edit Limits]", id);

    const existingClient = (await dbHelpers.getById("clients", id)) as ClientDocument | null;

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

    const updatedUsageLimits: UsageLimits = {
      ...existingClient.usageLimits,
      formEditCount: 0,
      canEditForm: true,
    };

    await dbHelpers.update("clients", id, { usageLimits: updatedUsageLimits });

    const refreshedClient = (await dbHelpers.getById("clients", id)) as ClientDocument;

    const transformedClient= {
      id: id,
      userId: refreshedClient.userId,
      founderName: refreshedClient.clientInformation?.founderName || "",
      email: refreshedClient.clientInformation?.email || "",
      phone: refreshedClient.clientInformation?.phone || "",
      companyName: refreshedClient.clientInformation?.companyName || "",
      industry: refreshedClient.clientInformation?.industry || "",
      fundingStage: refreshedClient.clientInformation?.fundingStage || "",
      revenue: refreshedClient.clientInformation?.revenue || "",
      investment: refreshedClient.clientInformation?.investment || "",
      city: refreshedClient.clientInformation?.city || "",
     // gmailAppPassword: refreshedClient.clientInformation?.gmailAppPassword || "",
      pitchAnalyses: refreshedClient.pitchAnalyses || [],
      pitchAnalysisCount: refreshedClient.pitchAnalyses?.length || 0,
      usageLimits: refreshedClient.usageLimits,
      emailVerified: refreshedClient.emailVerified || false,
      archived: refreshedClient.archived || false,
      createdAt: refreshedClient.createdAt,
      updatedAt: refreshedClient.updatedAt,
    };

    console.log("[Reset Form Edit Limits] Reset successfully");

    const response= {
      success: true,
      data: transformedClient,
      message: "Form edit limits reset successfully",
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[Reset Form Edit Limits Error]:", error);

    if (error.name === "AuthenticationError") {
      return createAuthErrorResponse(error);
    }

    const errorResponse: ApiResponse = {
      success: false,
      error: {
        code: ErrorCode.SERVER_ERROR,
        message: "Unable to reset form edit limits.",
      },
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
