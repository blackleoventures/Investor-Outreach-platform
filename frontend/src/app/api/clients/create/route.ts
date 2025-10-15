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
  CreatedBy,
} from "@/types/client";

interface CreateClientPayload {
  companyName: string;
  founderName: string;
  email: string;
  phone: string;
  fundingStage: string;
  revenue: string;
  investment: string;
  industry: string;
  city: string;
  platformName: string;
  senderEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecurity: "TLS" | "SSL" | "None";
  smtpUsername: string;
  smtpPassword: string;
  pitchAnalysis?: any;
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyFirebaseToken(request);
    verifyAdminOrSubadmin(user);

    const body = (await request.json()) as CreateClientPayload;

    console.log("[Create Client by Admin] Request:", {
      createdBy: user.uid,
      email: body.email,
    });

    // Validate required fields
    if (
      !body.companyName ||
      !body.founderName ||
      !body.email ||
      !body.phone ||
      !body.fundingStage ||
      !body.revenue ||
      !body.investment ||
      !body.industry ||
      !body.city
    ) {
      const errorResponse: ApiResponse = {
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: "All company information fields are required",
        },
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Validate SMTP configuration
    if (
      !body.platformName ||
      !body.senderEmail ||
      !body.smtpHost ||
      !body.smtpPort ||
      !body.smtpSecurity ||
      !body.smtpUsername ||
      !body.smtpPassword
    ) {
      const errorResponse: ApiResponse = {
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: "All email configuration fields are required",
        },
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Validate pitch analysis
    if (!body.pitchAnalysis) {
      const errorResponse: ApiResponse = {
        success: false,
        error: {
          code: ErrorCode.PITCH_DECK_REQUIRED,
          message: "Pitch deck analysis is required",
        },
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // FIXED: Check for duplicate email using getByField
    const existingClient = await dbHelpers.getByField(
      "clients",
      "clientInformation.email",
      body.email
    );

    if (existingClient) {
      const errorResponse: ApiResponse = {
        success: false,
        error: {
          code: ErrorCode.DUPLICATE_EMAIL,
          message: "A client with this email already exists",
        },
      };
      return NextResponse.json(errorResponse, { status: 409 });
    }

    // Generate submission ID
    const submissionId = `SUB-${new Date().getFullYear()}-${String(
      Date.now()
    ).slice(-6)}`;

    // FIXED: Ensure role is properly typed
    const userRole = user.role as "admin" | "subadmin" | "client";
    const createdBy: CreatedBy = {
      method: "admin_creation",
      userId: user.uid,
      role: userRole || "admin", // Fallback to admin
      timestamp: new Date().toISOString(),
    };

    // Prepare usage limits
    const usageLimits: UsageLimits = {
      formEditCount: 1,
      pitchAnalysisCount: 1,
      maxFormEdits: 4,
      maxPitchAnalysis: 2,
      canEditForm: true,
      canAnalyzePitch: true,
    };

    // FIXED: Prepare client document with correct types
    const clientData: Partial<ClientDocument> = {
      userId: `admin-created-${Date.now()}`,
      submissionId,
      createdBy,
      clientInformation: {
        companyName: body.companyName,
        founderName: body.founderName,
        email: body.email,
        phone: body.phone,
        fundingStage: body.fundingStage,
        revenue: body.revenue,
        investment: body.investment,
        industry: body.industry,
        city: body.city,
        emailConfiguration: {
          platformName: body.platformName,
          senderEmail: body.senderEmail,
          smtpHost: body.smtpHost,
          smtpPort: body.smtpPort,
          smtpSecurity: body.smtpSecurity,
          smtpUsername: body.smtpUsername,
          smtpPassword: body.smtpPassword,
          testStatus: "passed",
          testRecipient: user.email || "",
          testDate: new Date().toISOString(),
          testError: null,
          dailyEmailLimit: 50,
          sendingHours: {
            start: "09:00",
            end: "18:00",
            timezone: "Asia/Kolkata",
          },
        },
      },
      pitchAnalyses: [body.pitchAnalysis],
      usageLimits,
      status: "approved",
      reviewedBy: user.uid,
      reviewedAt: new Date().toISOString(),
      reviewNotes: "Auto-approved: Created by admin",
      rejectionReason: null,
      emailVerified: true,
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to database
    const savedClient = await dbHelpers.create("clients", clientData);

    console.log("[Create Client by Admin] Success:", savedClient.id);

    // Transform response
    const emailConfig = savedClient.clientInformation.emailConfiguration;
    const transformedClient: TransformedClient = {
      id: savedClient.id,
      userId: savedClient.userId,
      submissionId: savedClient.submissionId,
      founderName: savedClient.clientInformation.founderName,
      email: savedClient.clientInformation.email,
      phone: savedClient.clientInformation.phone,
      companyName: savedClient.clientInformation.companyName,
      industry: savedClient.clientInformation.industry,
      fundingStage: savedClient.clientInformation.fundingStage,
      revenue: savedClient.clientInformation.revenue,
      investment: savedClient.clientInformation.investment,
      city: savedClient.clientInformation.city,
      platformName: emailConfig.platformName,
      senderEmail: emailConfig.senderEmail,
      smtpHost: emailConfig.smtpHost,
      smtpPort: emailConfig.smtpPort,
      smtpSecurity: emailConfig.smtpSecurity,
      smtpTestStatus: emailConfig.testStatus,
      dailyEmailLimit: emailConfig.dailyEmailLimit,
      pitchAnalyses: savedClient.pitchAnalyses,
      pitchAnalysisCount: savedClient.pitchAnalyses.length,
      usageLimits: savedClient.usageLimits,
      status: savedClient.status,
      reviewedBy: savedClient.reviewedBy,
      reviewedAt: savedClient.reviewedAt,
      reviewNotes: savedClient.reviewNotes,
      emailVerified: savedClient.emailVerified || false,
      archived: savedClient.archived || false,
      createdAt: savedClient.createdAt,
      updatedAt: savedClient.updatedAt,
    };

    const response: ApiResponse<TransformedClient> = {
      success: true,
      data: transformedClient,
      message: "Client created successfully",
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error: any) {
    console.error("[Create Client by Admin Error]:", error);

    if (error.name === "AuthenticationError") {
      return createAuthErrorResponse(error);
    }

    const errorResponse: ApiResponse = {
      success: false,
      error: {
        code: ErrorCode.SERVER_ERROR,
        message: "Unable to create client. Please try again.",
      },
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
