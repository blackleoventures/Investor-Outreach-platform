import { NextRequest, NextResponse } from "next/server";
import {
  verifyFirebaseToken,
  verifyAdminOrSubadmin,
} from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";

// PUT - Update campaign email subject and body
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await verifyFirebaseToken(request);
    verifyAdminOrSubadmin(user);

    const { id } = params;
    const body = await request.json();
    const { subject, emailBody } = body;

    if (!subject?.trim() || !emailBody?.trim()) {
      return NextResponse.json(
        { success: false, message: "Subject and body are required" },
        { status: 400 },
      );
    }

    const campaignDoc = await adminDb.collection("campaigns").doc(id).get();
    if (!campaignDoc.exists) {
      return NextResponse.json(
        { success: false, message: "Campaign not found" },
        { status: 404 },
      );
    }

    await adminDb
      .collection("campaigns")
      .doc(id)
      .update({
        "emailTemplate.currentSubject": subject.trim(),
        "emailTemplate.currentBody": emailBody.trim(),
        "emailTemplate.currentBodyText": emailBody.replace(/<[^>]*>/g, " ").trim(),
        lastUpdated: new Date().toISOString(),
      });

    await adminDb.collection("campaignAuditLog").add({
      action: "email_template_updated",
      campaignId: id,
      performedBy: user.uid,
      performedByRole: user.role || "admin",
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Email template updated successfully",
    });
  } catch (error: any) {
    console.error("[Campaign Email Template] Update error:", error);

    if (error.name === "AuthenticationError") {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to update email template" },
      { status: 500 },
    );
  }
}
