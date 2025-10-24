import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  getInvestorsFromSheet,
  getIncubatorsFromSheet,
} from "@/lib/google-sheets";
import { verifyFirebaseToken, verifyAdminOrSubadmin } from "@/lib/auth-middleware";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const user = await verifyFirebaseToken(request);
    verifyAdminOrSubadmin(user);

    console.log(`[Dashboard Stats] Aggregating metrics for admin: ${user.email}`);

    // Fetch data concurrently
    const [
      investors,
      incubators,
      clientsSnapshot,
      campaignsSnapshot,
      recipientsSnapshot,
    ] = await Promise.all([
      getInvestorsFromSheet(),
      getIncubatorsFromSheet(),
      adminDb.collection("clients").get(), // Fetch from clients collection
      adminDb.collection("campaigns").get(),
      adminDb.collection("campaignRecipients").get(),
    ]);

    // Total clients from Firestore clients collection
    const totalClients = clientsSnapshot.size;

    // Total investors/incubators from Google Sheets
    const totalInvestors = investors.length;
    const totalIncubators = incubators.length;

    // Aggregate recipient-level email stats
    let sentEmails = 0;
    let deliveredEmails = 0;
    let openedEmails = 0;
    let repliedEmails = 0;

    recipientsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.status && data.status !== "pending") sentEmails++;
      if (["delivered", "opened", "replied"].includes(data.status))
        deliveredEmails++;
      if (["opened", "replied"].includes(data.status)) openedEmails++;
      if (data.status === "replied") repliedEmails++;
    });

    const responseRate =
      sentEmails > 0 ? Number(((repliedEmails / sentEmails) * 100).toFixed(2)) : 0;

    // Build client distribution (investors vs incubators from Sheets)
    const clientDistribution = [
      { name: "Investors", value: totalInvestors },
      { name: "Incubators", value: totalIncubators },
    ];

    // Build monthly campaign performance
    const monthlyCounts: Record<string, number> = {};
    campaignsSnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt;
      if (!createdAt) return;
      const date = new Date(createdAt);
      const month = date.toLocaleString("en-US", { month: "short" });
      monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
    });

    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const performanceData = months.map((month) => ({
      name: month,
      emails: monthlyCounts[month] || 0,
    }));

    // Final stats response
    const stats = {
      totalClients, // From Firestore clients collection
      totalInvestors, // From Google Sheets
      totalIncubators, // From Google Sheets
      sentEmails,
      deliveredEmails,
      openedEmails,
      responded: repliedEmails,
      responseRate,
      clientDistribution,
      performanceData,
    };

    console.log("[Dashboard Stats] Generated successfully:", stats);

    return NextResponse.json({ success: true, stats });
  } catch (error: any) {
    console.error("[Dashboard Stats] Error:", error);
    const status = error.name === "AuthenticationError" ? 401 : 500;
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to compute dashboard statistics",
      },
      { status }
    );
  }
}
