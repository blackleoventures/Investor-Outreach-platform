import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    console.log(
      `[Public Recipients] Fetching recipients for token ${token}...`
    );

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

    // Get all recipients with engagement data
    const recipientsSnapshot = await adminDb
      .collection("campaignRecipients")
      .where("campaignId", "==", campaignDoc.id)
      .orderBy("scheduledFor", "asc")
      .get();

    // Return recipients WITHOUT type, status, counts, organizations, and timestamps
    // Filter out failed recipients (bounces)
    const recipients = recipientsSnapshot.docs
      .filter((doc) => doc.data().status !== "failed")
      .map((doc) => {
        const data = doc.data();
        const aggregatedTracking = data.aggregatedTracking || {};

        // Extract WHO opened (names and emails only)
        const uniqueOpeners = (aggregatedTracking.uniqueOpeners || []).map(
          (opener: any) => ({
            name: opener.name || "Unknown",
            email: opener.email || "",
          })
        );

        // Extract WHO replied (names and emails only)
        const uniqueRepliers = (aggregatedTracking.uniqueRepliers || []).map(
          (replier: any) => ({
            name: replier.name || "Unknown",
            email: replier.email || "",
          })
        );

        return {
          // Basic info only
          name:
            data.originalContact?.name || data.contactInfo?.name || "Unknown",
          email:
            data.originalContact?.email ||
            data.contactInfo?.email ||
            "unknown@email.com",
          organization:
            data.originalContact?.organization ||
            data.contactInfo?.organization ||
            "Unknown",
          matchScore: data.matchScore || 0,

          // Engagement flags only (no counts)
          opened: aggregatedTracking.everOpened || false,
          replied: aggregatedTracking.everReplied || false,

          // WHO opened/replied (names and emails only)
          uniqueOpeners,
          uniqueRepliers,
        };
      });

    // Sort by match score descending
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
