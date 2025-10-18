import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    console.log(`[Public Export] Exporting campaign via token ${token}`);

    // Find campaign by public token (NO AUTHENTICATION REQUIRED)
    const campaignsSnapshot = await adminDb
      .collection("campaigns")
      .where("publicToken", "==", token)
      .limit(1)
      .get();

    if (campaignsSnapshot.empty) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 }
      );
    }

    const campaignDoc = campaignsSnapshot.docs[0];
    const campaignData = campaignDoc.data();
    const campaignId = campaignDoc.id;

    // Get recipients
    const recipientsSnapshot = await adminDb
      .collection("campaignRecipients")
      .where("campaignId", "==", campaignId)
      .orderBy("scheduledFor", "asc")
      .get();

    if (recipientsSnapshot.empty) {
      return NextResponse.json(
        { success: false, error: "No recipients found" },
        { status: 404 }
      );
    }

    // Build CSV with engagement details
    const csvRows: string[] = [];

    // ENHANCED HEADERS (Now includes WHO opened/replied)
    const headers = [
      "Name",
      "Email",
      "Organization",
      "Type",
      "Status",
      "Sent At",
      "Delivered At",
      "Total Opens",
      "WHO Opened (Names)",
      "WHO Opened (Emails)",
      "Opened At",
      "Last Opened At",
      "Total Replies",
      "WHO Replied (Names)",
      "WHO Replied (Emails)",
      "WHO Replied (Organizations)",
      "Replied At",
      "Last Replied At",
    ];

    csvRows.push(headers.join(","));

    // Process each recipient with full engagement details
    recipientsSnapshot.forEach((doc) => {
      const data = doc.data();
      const contactInfo = data.contactInfo || {};
      const trackingData = data.trackingData || {};
      const aggregatedTracking = data.aggregatedTracking || {};

      // Extract WHO opened
      const uniqueOpeners = aggregatedTracking.uniqueOpeners || [];
      const openerNames = uniqueOpeners
        .map((o: any) => o.name || "Unknown")
        .join("; ");
      const openerEmails = uniqueOpeners
        .map((o: any) => o.email || "")
        .join("; ");

      // Extract WHO replied
      const uniqueRepliers = aggregatedTracking.uniqueRepliers || [];
      const replierNames = uniqueRepliers
        .map((r: any) => r.name || "Unknown")
        .join("; ");
      const replierEmails = uniqueRepliers
        .map((r: any) => r.email || "")
        .join("; ");
      const replierOrgs = uniqueRepliers
        .map((r: any) => r.organization || "Unknown")
        .join("; ");

      // Get timestamps
      let firstOpenAt = "";
      let lastOpenAt = "";
      let firstReplyAt = "";
      let lastReplyAt = "";

      if (uniqueOpeners.length > 0) {
        firstOpenAt = uniqueOpeners[0].firstOpenedAt || "";
        lastOpenAt = uniqueOpeners[0].lastOpenedAt || "";
      }

      if (uniqueRepliers.length > 0) {
        firstReplyAt = uniqueRepliers[0].firstRepliedAt || "";
        lastReplyAt = uniqueRepliers[0].lastRepliedAt || "";
      }

      const row = [
        escapeCSV(contactInfo.name || "Unknown"),
        escapeCSV(contactInfo.email || ""),
        escapeCSV(contactInfo.organization || "Unknown"),
        data.recipientType || "investor",
        data.status || "pending",
        formatDate(data.sentAt),
        formatDate(data.deliveredAt),
        aggregatedTracking.totalOpensAcrossAllEmails || trackingData.openCount || 0,
        escapeCSV(openerNames),
        escapeCSV(openerEmails),
        formatDate(firstOpenAt || data.openedAt),
        formatDate(lastOpenAt),
        uniqueRepliers.reduce(
          (sum: number, r: any) => sum + (r.totalReplies || 0),
          0
        ) || (trackingData.replied ? 1 : 0),
        escapeCSV(replierNames),
        escapeCSV(replierEmails),
        escapeCSV(replierOrgs),
        formatDate(firstReplyAt || data.repliedAt),
        formatDate(lastReplyAt),
      ];

      csvRows.push(row.join(","));
    });

    // Add summary
    csvRows.push("");
    csvRows.push("Campaign Summary");
    csvRows.push(
      `Campaign Name,${escapeCSV(campaignData?.campaignName || "")}`
    );
    csvRows.push(`Client Name,${escapeCSV(campaignData?.clientName || "")}`);
    csvRows.push(`Total Recipients,${recipientsSnapshot.size}`);
    csvRows.push(`Total Sent,${campaignData?.stats?.sent || 0}`);
    csvRows.push(`Total Delivered,${campaignData?.stats?.delivered || 0}`);
    csvRows.push(`Total Opened,${campaignData?.stats?.opened || 0}`);
    csvRows.push(`Total Replied,${campaignData?.stats?.replied || 0}`);
    csvRows.push(`Open Rate,${campaignData?.stats?.openRate || 0}%`);
    csvRows.push(`Reply Rate,${campaignData?.stats?.replyRate || 0}%`);

    const csvContent = csvRows.join("\n");
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `campaign-report-${
      campaignData?.campaignName || "export"
    }-${timestamp}.csv`;

    console.log(
      `[Public Export] Exported ${recipientsSnapshot.size} recipients with engagement details`
    );

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("[Public Export] Error:", error.message);
    return NextResponse.json(
      { success: false, error: "Failed to export campaign" },
      { status: 500 }
    );
  }
}

function escapeCSV(value: string | number): string {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);

  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function formatDate(dateString: string | null | undefined): string {
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
