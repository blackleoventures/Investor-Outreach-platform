import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const maxDuration = 60;

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

    // Get all recipients with full engagement data
    const recipientsSnapshot = await adminDb
      .collection("campaignRecipients")
      .where("campaignId", "==", campaignDoc.id)
      .orderBy("scheduledFor", "asc")
      .get();

    // Return recipients with WHO opened/replied data
    const recipients = recipientsSnapshot.docs.map((doc) => {
      const data = doc.data();
      const aggregatedTracking = data.aggregatedTracking || {};
      const trackingData = data.trackingData || {};

      // Extract WHO opened
      const uniqueOpeners = aggregatedTracking.uniqueOpeners || [];
      
      // Extract WHO replied
      const uniqueRepliers = aggregatedTracking.uniqueRepliers || [];

      return {
        // Basic info
        name: data.originalContact?.name || data.contactInfo?.name || "Unknown",
        email: data.originalContact?.email || data.contactInfo?.email || "unknown@email.com",
        organization:
          data.originalContact?.organization ||
          data.contactInfo?.organization ||
          "Unknown",
        type: data.recipientType || "investor",
        status: data.status || "pending",
        matchScore: data.matchScore || 0,

        // Engagement data
        opened: aggregatedTracking.everOpened || trackingData.opened || false,
        replied: aggregatedTracking.everReplied || trackingData.replied || false,
        openCount: aggregatedTracking.totalOpensAcrossAllEmails || trackingData.openCount || 0,

        // Timestamps
        sentAt: data.sentAt || "",
        deliveredAt: data.deliveredAt || "",
        openedAt: data.openedAt || "",
        repliedAt: data.repliedAt || "",

        // WHO opened (names and emails)
        uniqueOpeners: uniqueOpeners.map((opener: any) => ({
          name: opener.name || "Unknown",
          email: opener.email || "",
          totalOpens: opener.totalOpens || 0,
        })),

        // WHO replied (names, emails, and organizations)
        uniqueRepliers: uniqueRepliers.map((replier: any) => ({
          name: replier.name || "Unknown",
          email: replier.email || "",
          organization: replier.organization || "Unknown",
          totalReplies: replier.totalReplies || 0,
        })),
      };
    });

    // Sort by match score descending
    recipients.sort((a, b) => b.matchScore - a.matchScore);

    console.log(
      `[Public Recipients] Found ${recipients.length} recipients with engagement data`
    );

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
