import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  verifyFirebaseToken,
  verifyAdminOrSubadmin,
} from "@/lib/auth-middleware";

export async function GET(request: NextRequest) {
  try {
    // Verify authentication and role
    const user = await verifyFirebaseToken(request);
    verifyAdminOrSubadmin(user);

    // Query eligible clients
    const clientsSnapshot = await adminDb
      .collection("clients")
      .where("status", "==", "approved")
      .where("archived", "==", false)
      .get();

    const eligibleClients: any[] = [];

    clientsSnapshot.forEach((doc) => {
      const data = doc.data();

      // Check if client has been reviewed
      if (!data.reviewedBy) return;

      // Check if SMTP config exists and is tested
      const smtpConfig = data.clientInformation?.emailConfiguration;
      if (!smtpConfig || smtpConfig.testStatus !== "passed") return;

      // Check if pitch analysis exists (skip for admin-created clients)
      const isAdminCreated = data.createdBy?.method === "admin_creation";
      if (
        !isAdminCreated &&
        (!data.pitchAnalyses || data.pitchAnalyses.length === 0)
      )
        return;

      // Add to eligible list
      eligibleClients.push({
        id: doc.id,
        companyName: data.clientInformation?.companyName || "",
        founderName: data.clientInformation?.founderName || "",
        email: data.clientInformation?.email || "",
        industry: data.clientInformation?.industry || "",
        fundingStage: data.clientInformation?.fundingStage || "",
        emailConfiguration: {
          dailyEmailLimit: smtpConfig.dailyEmailLimit || 50,
          testStatus: smtpConfig.testStatus,
          senderEmail: smtpConfig.senderEmail,
        },
      });
    });

    // Sort by company name
    eligibleClients.sort((a, b) => a.companyName.localeCompare(b.companyName));

    return NextResponse.json({
      success: true,
      clients: eligibleClients,
      total: eligibleClients.length,
    });
  } catch (error: any) {
    console.error("[Eligible Clients Error]:", error);

    if (error.name === "AuthenticationError") {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to fetch eligible clients" },
      { status: 500 },
    );
  }
}
