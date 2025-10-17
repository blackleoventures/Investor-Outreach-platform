import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken, verifyAdminOrSubadmin } from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyFirebaseToken(request);
    verifyAdminOrSubadmin(user);

    const { id } = params;

    console.log(`[Campaign Export] Exporting campaign ${id} to CSV...`);

    // Get campaign details
    const campaignDoc = await adminDb.collection("campaigns").doc(id).get();

    if (!campaignDoc.exists) {
      return NextResponse.json(
        { success: false, message: "Campaign not found" },
        { status: 404 }
      );
    }

    const campaignData = campaignDoc.data();

    // Get all recipients
    const recipientsSnapshot = await adminDb
      .collection("campaignRecipients")
      .where("campaignId", "==", id)
      .orderBy("scheduledFor", "asc")
      .get();

    if (recipientsSnapshot.empty) {
      return NextResponse.json(
        { success: false, message: "No recipients found" },
        { status: 404 }
      );
    }

    // Build CSV content
    const headers = [
      "Name",
      "Email",
      "Organization",
      "Type",
      "Priority",
      "Match Score",
      "Status",
      "Scheduled For",
      "Sent At",
      "Delivered At",
      "Opened At",
      "Opened Count",
      "Replied At",
      "Failed Reason",
      "Retry Count",
    ];

    const rows = recipientsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return [
        data.contactInfo?.name || "",
        data.contactInfo?.email || "",
        data.contactInfo?.organization || "",
        data.recipientType || "",
        data.priority || "",
        data.matchScore || "",
        data.status || "",
        formatCSVDate(data.scheduledFor),
        formatCSVDate(data.sentAt),
        formatCSVDate(data.deliveredAt),
        formatCSVDate(data.openedAt),
        data.trackingData?.openCount || 0,
        formatCSVDate(data.repliedAt),
        data.failureReason || "",
        data.retryCount || 0,
      ];
    });

    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Create filename
    const filename = `campaign-${campaignData?.campaignName || id}-${new Date().toISOString().split("T")[0]}.csv`;

    console.log(`[Campaign Export] Exported ${rows.length} recipients`);

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });

  } catch (error: any) {
    console.error("[Campaign Export] Error:", error);
    
    if (error.name === "AuthenticationError") {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to export campaign" },
      { status: 500 }
    );
  }
}

function formatCSVDate(dateString: string | null | undefined): string {
  if (!dateString) return "";
  try {
    return new Date(dateString).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
