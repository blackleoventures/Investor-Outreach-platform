import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { normalizeToArray } from "@/lib/utils/data-normalizer";

export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    console.log(`[Public Export] Exporting campaign via token ${token}`);

    // Find campaign by public token
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

    // Build CSV
    const csvRows: string[] = [];

    // Headers (removed: Email column)
    const headers = [
      "Founder Name",
      "Organization",
      "WHO Opened (Names)",
      "WHO Opened (Emails)",
      "WHO Replied (Names)",
      "WHO Replied (Emails)",
    ];

    csvRows.push(headers.join(","));

    // Process each recipient
    recipientsSnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Use originalContact field
      const originalContact = data.originalContact || {};
      const aggregatedTracking = data.aggregatedTracking || {};

      // SAFE: Normalize arrays
      const uniqueOpeners = normalizeToArray(aggregatedTracking.uniqueOpeners || []);
      const uniqueRepliers = normalizeToArray(aggregatedTracking.uniqueRepliers || []);

      // Extract WHO opened (names and emails only)
      const openerNames = uniqueOpeners
        .map((o: any) => o.name || "Unknown")
        .join("; ");
      const openerEmails = uniqueOpeners
        .map((o: any) => o.email || "")
        .join("; ");

      // Extract WHO replied (names and emails only)
      const replierNames = uniqueRepliers
        .map((r: any) => r.name || "Unknown")
        .join("; ");
      const replierEmails = uniqueRepliers
        .map((r: any) => r.email || "")
        .join("; ");

      const row = [
        escapeCSV(originalContact.name || "Unknown"),
        escapeCSV(originalContact.organization || "Unknown"),
        escapeCSV(openerNames || "-"),
        escapeCSV(openerEmails || "-"),
        escapeCSV(replierNames || "-"),
        escapeCSV(replierEmails || "-"),
      ];

      csvRows.push(row.join(","));
    });

    const csvContent = csvRows.join("\n");
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `campaign-report-${
      campaignData?.campaignName || "export"
    }-${timestamp}.csv`;

    console.log(
      `[Public Export] Exported ${recipientsSnapshot.size} recipients`
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
    console.error("[Public Export] Error stack:", error.stack);
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
