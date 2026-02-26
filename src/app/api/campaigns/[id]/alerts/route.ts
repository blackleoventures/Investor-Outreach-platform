// API route for campaign alerts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  verifyFirebaseToken,
  verifyAdminOrSubadmin,
} from "@/lib/auth-middleware";
import {
  resolveCampaignAlert,
  dismissCampaignAlert,
} from "@/lib/services/campaign-alert-logger";

// GET: Fetch active alerts for a campaign
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await verifyFirebaseToken(request);
    verifyAdminOrSubadmin(user);

    const campaignId = params.id;

    console.log(
      `[Campaign Alerts] Fetching alerts for campaign: ${campaignId}`,
    );

    const alertsSnapshot = await adminDb
      .collection("campaignAlerts")
      .where("campaignId", "==", campaignId)
      .where("status", "==", "active")
      .limit(20)
      .get();

    console.log(`[Campaign Alerts] Found ${alertsSnapshot.size} alerts`);

    const alerts = alertsSnapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      // Sort client-side to avoid Firestore composite index requirement
      .sort((a: any, b: any) =>
        (b.lastOccurredAt || "").localeCompare(a.lastOccurredAt || ""),
      );

    return NextResponse.json({ success: true, alerts });
  } catch (error: any) {
    console.error("[Campaign Alerts] Error:", error.message);
    console.error("[Campaign Alerts] Stack:", error.stack);

    if (error.name === "AuthenticationError") {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch alerts" },
      { status: 500 },
    );
  }
}

// PATCH: Resolve or dismiss an alert
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await verifyFirebaseToken(request);
    verifyAdminOrSubadmin(user);

    const body = await request.json();
    const { alertId, action } = body;

    if (!alertId || !action) {
      return NextResponse.json(
        { success: false, error: "alertId and action are required" },
        { status: 400 },
      );
    }

    if (action === "resolve") {
      await resolveCampaignAlert(alertId);
    } else if (action === "dismiss") {
      await dismissCampaignAlert(alertId);
    } else {
      return NextResponse.json(
        { success: false, error: "action must be 'resolve' or 'dismiss'" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Alert ${action}d successfully`,
    });
  } catch (error: any) {
    console.error("[Campaign Alerts] Error:", error.message);
    return NextResponse.json(
      { success: false, error: "Failed to update alert" },
      { status: 500 },
    );
  }
}
