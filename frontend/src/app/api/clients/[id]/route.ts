import { NextRequest, NextResponse } from "next/server";
import {
  verifyFirebaseToken,
  verifyAdminOrSubadmin,
  verifyAdmin,
  createAuthErrorResponse,
} from "@/lib/auth-middleware";
import { dbHelpers } from "@/lib/db-helpers";
import {
  ClientDocument,
  TransformedClient,
  UpdateClientRequest,
  ApiResponse,
  ErrorCode,
  UsageLimits,
  ClientInformation,
} from "@/types/client";

/**
 * GET /api/clients/[id]
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyFirebaseToken(request);
    verifyAdminOrSubadmin(user);

    const { id } = params;

    console.log("[Get Client By ID]", id);

    const client = (await dbHelpers.getById("clients", id)) as ClientDocument | null;

    if (!client) {
      const errorResponse: ApiResponse = {
        success: false,
        error: {
          code: ErrorCode.CLIENT_NOT_FOUND,
          message: "Client not found",
        },
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    const transformedClient: TransformedClient = {
      id: client.id,
      userId: client.userId,
      founderName: client.clientInformation?.founderName || "",
      email: client.clientInformation?.email || "",
      phone: client.clientInformation?.phone || "",
      companyName: client.clientInformation?.companyName || "",
      industry: client.clientInformation?.industry || "",
      fundingStage: client.clientInformation?.fundingStage || "",
      revenue: client.clientInformation?.revenue || "",
      investment: client.clientInformation?.investment || "",
      city: client.clientInformation?.city || "",
      gmailAppPassword: client.clientInformation?.gmailAppPassword || "",
      pitchAnalyses: client.pitchAnalyses || [],
      pitchAnalysisCount: client.pitchAnalyses?.length || 0,
      usageLimits: client.usageLimits || {
        formEditCount: 0,
        pitchAnalysisCount: 0,
        maxFormEdits: 4,
        maxPitchAnalysis: 2,
        canEditForm: true,
        canAnalyzePitch: true,
      },
      emailVerified: client.emailVerified || false,
      archived: client.archived || false,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    };

    const response: ApiResponse<TransformedClient> = {
      success: true,
      data: transformedClient,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[Get Client Error]:", error);

    if (error.name === "AuthenticationError") {
      return createAuthErrorResponse(error);
    }

    const errorResponse: ApiResponse = {
      success: false,
      error: {
        code: ErrorCode.SERVER_ERROR,
        message: "Unable to fetch client details.",
      },
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * PUT /api/clients/[id]
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyFirebaseToken(request);
    verifyAdminOrSubadmin(user);

    const { id } = params;
    const body = (await request.json()) as UpdateClientRequest;

    console.log("[Update Client]", id, body);

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

    const {
      founderName,
      email,
      phone,
      companyName,
      industry,
      fundingStage,
      revenue,
      investment,
      city,
      gmailAppPassword,
      archived,
      usageLimits,
    } = body;

    const updatedClientInformation: ClientInformation = {
      ...existingClient.clientInformation,
    };

    if (founderName !== undefined) updatedClientInformation.founderName = founderName;
    if (email !== undefined) updatedClientInformation.email = email;
    if (phone !== undefined) updatedClientInformation.phone = phone;
    if (companyName !== undefined) updatedClientInformation.companyName = companyName;
    if (industry !== undefined) updatedClientInformation.industry = industry;
    if (fundingStage !== undefined) updatedClientInformation.fundingStage = fundingStage;
    if (revenue !== undefined) updatedClientInformation.revenue = revenue;
    if (investment !== undefined) updatedClientInformation.investment = investment;
    if (city !== undefined) updatedClientInformation.city = city;
    if (gmailAppPassword !== undefined) {
      updatedClientInformation.gmailAppPassword = gmailAppPassword.replace(/\s/g, "");
    }

    const updateData: Partial<ClientDocument> = {
      clientInformation: updatedClientInformation,
    };

    if (typeof archived !== "undefined") {
      updateData.archived = archived;
    }

    if (usageLimits) {
      const updatedUsageLimits: UsageLimits = {
        ...existingClient.usageLimits,
      };

      if (typeof usageLimits.formEditCount !== "undefined") {
        updatedUsageLimits.formEditCount = usageLimits.formEditCount;
      }
      if (typeof usageLimits.pitchAnalysisCount !== "undefined") {
        updatedUsageLimits.pitchAnalysisCount = usageLimits.pitchAnalysisCount;
      }
      if (typeof usageLimits.maxFormEdits !== "undefined") {
        updatedUsageLimits.maxFormEdits = usageLimits.maxFormEdits;
      }
      if (typeof usageLimits.maxPitchAnalysis !== "undefined") {
        updatedUsageLimits.maxPitchAnalysis = usageLimits.maxPitchAnalysis;
      }

      updatedUsageLimits.canEditForm = updatedUsageLimits.formEditCount < updatedUsageLimits.maxFormEdits;
      updatedUsageLimits.canAnalyzePitch =
        updatedUsageLimits.pitchAnalysisCount < updatedUsageLimits.maxPitchAnalysis;

      updateData.usageLimits = updatedUsageLimits;
    }

    await dbHelpers.update("clients", id, updateData);

    const refreshedClient = (await dbHelpers.getById("clients", id)) as ClientDocument;

    const transformedClient: TransformedClient = {
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
      gmailAppPassword: refreshedClient.clientInformation?.gmailAppPassword || "",
      pitchAnalyses: refreshedClient.pitchAnalyses || [],
      pitchAnalysisCount: refreshedClient.pitchAnalyses?.length || 0,
      usageLimits: refreshedClient.usageLimits || {
        formEditCount: 0,
        pitchAnalysisCount: 0,
        maxFormEdits: 4,
        maxPitchAnalysis: 2,
        canEditForm: true,
        canAnalyzePitch: true,
      },
      emailVerified: refreshedClient.emailVerified || false,
      archived: refreshedClient.archived || false,
      createdAt: refreshedClient.createdAt,
      updatedAt: refreshedClient.updatedAt,
    };

    console.log("[Update Client] Updated successfully");

    const response: ApiResponse<TransformedClient> = {
      success: true,
      data: transformedClient,
      message: "Client updated successfully",
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[Update Client Error]:", error);

    if (error.name === "AuthenticationError") {
      return createAuthErrorResponse(error);
    }

    const errorResponse: ApiResponse = {
      success: false,
      error: {
        code: ErrorCode.SERVER_ERROR,
        message: "Unable to update client.",
      },
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * DELETE /api/clients/[id]
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyFirebaseToken(request);
    verifyAdmin(user);

    const { id } = params;

    console.log("[Delete Client]", id);

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

    await dbHelpers.delete("clients", id);

    console.log("[Delete Client] Deleted successfully:", id);

    const response: ApiResponse = {
      success: true,
      message: "Client deleted successfully",
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[Delete Client Error]:", error);

    if (error.name === "AuthenticationError") {
      return createAuthErrorResponse(error);
    }

    const errorResponse: ApiResponse = {
      success: false,
      error: {
        code: ErrorCode.SERVER_ERROR,
        message: "Unable to delete client.",
      },
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
