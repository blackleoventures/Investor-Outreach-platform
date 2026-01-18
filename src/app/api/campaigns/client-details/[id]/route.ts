import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  verifyFirebaseToken,
  verifyAdminOrSubadmin,
} from "@/lib/auth-middleware";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await verifyFirebaseToken(request);
    verifyAdminOrSubadmin(user);

    const clientId = params.id;

    // Fetch client document
    const clientDoc = await adminDb.collection("clients").doc(clientId).get();

    if (!clientDoc.exists) {
      return NextResponse.json(
        { success: false, message: "Client not found" },
        { status: 404 },
      );
    }

    const data = clientDoc.data();
    const clientInfo = data?.clientInformation;
    const smtpConfig = clientInfo?.emailConfiguration;
    const pitchAnalyses = data?.pitchAnalyses || [];
    const latestPitchAnalysis = pitchAnalyses[pitchAnalyses.length - 1];

    // Validate eligibility
    if (data?.status !== "approved" || data?.archived) {
      return NextResponse.json(
        { success: false, message: "Client is not eligible for campaigns" },
        { status: 400 },
      );
    }

    if (!smtpConfig || smtpConfig.testStatus !== "passed") {
      return NextResponse.json(
        {
          success: false,
          message: "Client's SMTP configuration is not verified",
        },
        { status: 400 },
      );
    }

    // Check if pitch analysis exists (skip for admin-created clients)
    const isAdminCreated = data?.createdBy?.method === "admin_creation";
    if (!isAdminCreated && !latestPitchAnalysis) {
      return NextResponse.json(
        { success: false, message: "Client has no pitch analysis" },
        { status: 400 },
      );
    }

    // Return full client details
    const clientDetails = {
      id: clientDoc.id,
      companyName: clientInfo.companyName,
      founderName: clientInfo.founderName,
      email: clientInfo.email,
      phone: clientInfo.phone,
      fundingStage: clientInfo.fundingStage,
      revenue: clientInfo.revenue,
      investment: clientInfo.investment,
      industry: clientInfo.industry,
      city: clientInfo.city,
      emailConfiguration: {
        platformName: smtpConfig.platformName,
        senderEmail: smtpConfig.senderEmail,
        smtpHost: smtpConfig.smtpHost,
        smtpPort: smtpConfig.smtpPort,
        smtpSecurity: smtpConfig.smtpSecurity,
        smtpUsername: smtpConfig.smtpUsername,
        smtpPassword: smtpConfig.smtpPassword, // Will be needed for sending
        dailyEmailLimit: smtpConfig.dailyEmailLimit || 50,
        testStatus: smtpConfig.testStatus,
      },
      pitchAnalysis: latestPitchAnalysis,
    };

    return NextResponse.json({
      success: true,
      client: clientDetails,
    });
  } catch (error: any) {
    console.error("[Client Details Error]:", error);

    if (error.name === "AuthenticationError") {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to fetch client details" },
      { status: 500 },
    );
  }
}
