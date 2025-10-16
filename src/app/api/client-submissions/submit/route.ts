import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken, createAuthErrorResponse } from "@/lib/auth-middleware";
import { dbHelpers } from "@/lib/db-helpers";
import { encryptAES256 } from "@/lib/encryption";

const COLLECTION = "clients";

/**
 * Submit new client application
 * POST /api/client-submissions/submit
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await verifyFirebaseToken(request);
    const userId = user.uid;

    // Parse request body
    const body = await request.json();
    const { 
      clientInformation, 
      emailConfiguration,
      pitchAnalyses, 
      usageLimits 
    } = body;

    console.log("[ClientSubmission] Creating submission for userId:", userId);

    // ============= VALIDATION =============

    // 1. Validate client information
    if (!clientInformation) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Please provide your company information to continue.",
          },
        },
        { status: 400 }
      );
    }

    // 2. Validate required fields
    const requiredFields = [
      'companyName',
      'founderName',
      'email',
      'phone',
      'fundingStage',
      'industry',
      'city'
    ];

    for (const field of requiredFields) {
      if (!clientInformation[field]) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: `${field} is required`,
            },
          },
          { status: 400 }
        );
      }
    }

    // 3. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientInformation.email)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_EMAIL",
            message: "Please provide a valid email address.",
          },
        },
        { status: 400 }
      );
    }

    // 4. Validate email configuration (NEW)
    if (!emailConfiguration) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Email configuration is required",
          },
        },
        { status: 400 }
      );
    }

    // 5. Validate SMTP test status (NEW)
    if (emailConfiguration.testStatus !== "passed") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "SMTP_TEST_REQUIRED",
            message: "You must test your email configuration before submitting",
          },
        },
        { status: 400 }
      );
    }

    // 6. Validate pitch deck (NOW REQUIRED)
    if (!pitchAnalyses || pitchAnalyses.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PITCH_DECK_REQUIRED",
            message: "Pitch deck analysis is required. Please upload and analyze your pitch deck.",
          },
        },
        { status: 400 }
      );
    }

    // 7. Check if user already has a submission
    const existingSubmission = await dbHelpers.findOne(COLLECTION, { userId });

    if (existingSubmission) {
      console.log("[ClientSubmission] User already has submission:", existingSubmission.id);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "ALREADY_EXISTS",
            message: "You have already submitted an application. You can update it from your dashboard.",
          },
        },
        { status: 400 }
      );
    }

    // ============= ENCRYPT SMTP PASSWORD =============
    
    console.log("[ClientSubmission] Encrypting SMTP password...");
    const encryptedPassword = encryptAES256(emailConfiguration.smtpPassword);

    // ============= GENERATE SUBMISSION ID =============
    
    const submissionId = `SUB-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    console.log("[ClientSubmission] Generated submission ID:", submissionId);

    // ============= PREPARE SUBMISSION DATA =============

    const submissionData = {
      userId,
      submissionId,
      
      // Entry tracking
      createdBy: {
        method: "client_submission" as const,
        userId: userId,
        role: "client" as const,
        timestamp: new Date().toISOString(),
      },
      
      // Client information with email configuration
      clientInformation: {
        ...clientInformation,
        emailConfiguration: {
          platformName: emailConfiguration.platformName,
          senderEmail: emailConfiguration.senderEmail,
          smtpHost: emailConfiguration.smtpHost,
          smtpPort: emailConfiguration.smtpPort,
          smtpSecurity: emailConfiguration.smtpSecurity,
          smtpUsername: emailConfiguration.smtpUsername,
          smtpPassword: encryptedPassword, // ENCRYPTED
          
          // System-wide fixed limit
          dailyEmailLimit: 50,
          
          // Test status
          testStatus: "passed" as const,
          testDate: new Date().toISOString(),
          testRecipient: emailConfiguration.testRecipient || null,
          testError: null,
          
          // Sending schedule
          sendingHours: {
            start: "09:00",
            end: "18:00",
            timezone: "Asia/Kolkata",
          },
        },
      },
      
      // Pitch analyses
      pitchAnalyses: pitchAnalyses || [],
      
      // Usage limits
      usageLimits: usageLimits || {
        formEditCount: 1,
        pitchAnalysisCount: pitchAnalyses?.length || 0,
        maxFormEdits: 4,
        maxPitchAnalysis: 2,
        canEditForm: true,
        canAnalyzePitch: true,
      },
      
      // Status (pending admin review)
      status: "pending_review" as const,
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: null,
      rejectionReason: null,
      
      // Metadata
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    };

    // ============= CREATE SUBMISSION =============

    const createdSubmission = await dbHelpers.create(COLLECTION, submissionData);

    console.log("[ClientSubmission] Submission created successfully:", createdSubmission.id);

    // ============= PREPARE RESPONSE =============
    
    // Don't return encrypted password in response
    const responseData = {
      ...createdSubmission,
      clientInformation: {
        ...createdSubmission.clientInformation,
        emailConfiguration: {
          ...createdSubmission.clientInformation.emailConfiguration,
          smtpPassword: "••••••••••••••", // Masked
        },
      },
    };

    return NextResponse.json(
      {
        success: true,
        data: responseData,
        message: "Your application has been submitted successfully! We will review it within 24 hours.",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[ClientSubmission] Error creating submission:", error);

    // Return auth error if authentication failed
    if (error.name === "AuthenticationError") {
      return createAuthErrorResponse(error);
    }

    // Check for specific errors
    if (error.message && error.message.includes("permission")) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PERMISSION_DENIED",
            message: "You don't have permission to submit applications. Please contact support.",
          },
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SUBMIT_ERROR",
          message: "Unable to submit your application. Please try again or contact support.",
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
