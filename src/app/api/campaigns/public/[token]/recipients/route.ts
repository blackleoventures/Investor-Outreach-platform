import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    console.log(`[Public Recipients] Fetching recipients for token ${token}...`);

    // Find campaign by token
    const campaignsSnapshot = await adminDb
      .collection("campaigns")
      .where("publicToken", "==", token)
      .limit(1)
      .get();

    if (campaignsSnapshot.empty) {
      return NextResponse.json(
        { success: false, message: "Campaign not found" },
        { status: 404 }
      );
    }

    const campaignDoc = campaignsSnapshot.docs[0];

    // Get all recipients
    const recipientsSnapshot = await adminDb
      .collection("campaignRecipients")
      .where("campaignId", "==", campaignDoc.id)
      .get();

    // Return public-safe recipient data 
    const recipients = recipientsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        name: data.contactInfo?.name || "Unknown",
        organization: data.contactInfo?.organization || "N/A",
        type: data.recipientType || "unknown",
        status: data.status || "pending",
        matchScore: data.matchScore || 0,
        opened: data.trackingData?.opened || false,
        replied: data.trackingData?.replied || false,
      };
    });

    // Sort by match score 
    recipients.sort((a, b) => b.matchScore - a.matchScore);

    console.log(`[Public Recipients] Found ${recipients.length} recipients`);

    return NextResponse.json({
      success: true,
      recipients,
      total: recipients.length,
    });

  } catch (error: any) {
    console.error("[Public Recipients] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch recipients" },
      { status: 500 }
    );
  }
}
