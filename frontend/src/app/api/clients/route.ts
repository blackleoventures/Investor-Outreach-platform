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
  CreateClientRequest,
  ApiResponse,
  ErrorCode,
  UsageLimits,
} from "@/types/client";

/**
 * GET /api/clients
 * Get all clients (admin/subadmin only)
 */
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

    const transformedClients: TransformedClient[] = clients.map((client: ClientDocument) => {
      const defaultUsageLimits: UsageLimits = {
        formEditCount: 0,
        pitchAnalysisCount: 0,
        maxFormEdits: 4,
        maxPitchAnalysis: 2,
        canEditForm: true,
        canAnalyzePitch: true,
      };

      return {
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
        usageLimits: client.usageLimits || defaultUsageLimits,
        emailVerified: client.emailVerified || false,
        archived: client.archived || false,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
      };
    });

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

/**
 * POST /api/clients
 * Create a new client (admin/subadmin only)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await verifyFirebaseToken(request);
    verifyAdminOrSubadmin(user);

    const body = (await request.json()) as CreateClientRequest;
    const {
      companyName,
      founderName,
      email,
      phone,
      fundingStage,
      revenue,
      investment,
      industry,
      city,
      gmailAppPassword,
    } = body;

    if (
      !companyName ||
      !founderName ||
      !email ||
      !phone ||
      !fundingStage ||
      !revenue ||
      !investment ||
      !industry ||
      !city
    ) {
      const errorResponse: ApiResponse = {
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: "All required fields must be provided",
        },
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const clientData: Partial<ClientDocument> = {
      userId: `admin-created-${Date.now()}`,
      clientInformation: {
        founderName,
        email,
        phone,
        companyName,
        industry,
        fundingStage,
        revenue,
        investment,
        city,
        gmailAppPassword: gmailAppPassword ? gmailAppPassword.replace(/\s/g, "") : "",
      },
      pitchAnalyses: [],
      usageLimits: {
        formEditCount: 0,
        pitchAnalysisCount: 0,
        maxFormEdits: 4,
        maxPitchAnalysis: 2,
        canEditForm: true,
        canAnalyzePitch: true,
      },
    };

    const savedClient = await dbHelpers.create("clients", clientData);

    const response: ApiResponse<any> = {
      success: true,
      data: savedClient,
      message: "Client created successfully",
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error: any) {
    console.error("[Create Client Error]:", error);

    if (error.name === "AuthenticationError") {
      return createAuthErrorResponse(error);
    }

    const errorResponse: ApiResponse = {
      success: false,
      error: {
        code: ErrorCode.SERVER_ERROR,
        message: "Unable to create client.",
      },
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
