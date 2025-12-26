import { NextRequest, NextResponse } from "next/server";
import {
  verifyFirebaseToken,
  verifyAdminOrSubadmin,
} from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyFirebaseToken(request);
    verifyAdminOrSubadmin(user);

    const { id } = params;

    console.log(`[Campaign Detail] Fetching campaign ${id}...`);

    // Get campaign document
    const campaignDoc = await adminDb.collection("campaigns").doc(id).get();

    if (!campaignDoc.exists) {
      return NextResponse.json(
        { success: false, message: "Campaign not found" },
        { status: 404 }
      );
    }

    const campaignData = campaignDoc.data();

    if (!campaignData) {
      return NextResponse.json(
        { success: false, message: "Campaign data is empty" },
        { status: 404 }
      );
    }

    // Get client details
    let clientDetails = null;
    try {
      const clientDoc = await adminDb
        .collection("clients")
        .doc(campaignData.clientId)
        .get();

      if (clientDoc.exists) {
        const clientData = clientDoc.data();
        clientDetails = {
          id: clientDoc.id,
          companyName: clientData?.clientInformation?.companyName,
          founderName: clientData?.clientInformation?.founderName,
          email: clientData?.clientInformation?.email,
          industry: clientData?.clientInformation?.industry,
          fundingStage: clientData?.clientInformation?.fundingStage,
          founded: clientData?.clientInformation?.founded,
          website: clientData?.clientInformation?.website,
        };
      }
    } catch (error) {
      console.error("[Campaign Detail] Error fetching client:", error);
    }

    // Get recipient statistics
    const recipientsSnapshot = await adminDb
      .collection("campaignRecipients")
      .where("campaignId", "==", id)
      .get();

    // Count by status
    const statusCounts: Record<string, number> = {
      pending: 0,
      delivered: 0,
      opened: 0,
      replied: 0,
      failed: 0,
    };

    // Count by type
    const typeCounts: Record<string, number> = {
      investor: 0,
      incubator: 0,
    };

    // Count by priority
    const priorityCounts: Record<string, number> = {
      high: 0,
      medium: 0,
      low: 0,
    };

    recipientsSnapshot.forEach((doc) => {
      const data = doc.data();

      // Count by status
      if (data.status) {
        statusCounts[data.status] = (statusCounts[data.status] || 0) + 1;
      }

      // Count by type
      if (data.recipientType) {
        typeCounts[data.recipientType] =
          (typeCounts[data.recipientType] || 0) + 1;
      }

      // Count by priority
      if (data.priority) {
        priorityCounts[data.priority] =
          (priorityCounts[data.priority] || 0) + 1;
      }
    });

    // NEW: Get follow-up email statistics
    const followupSnapshot = await adminDb
      .collection("followupEmails")
      .where("campaignId", "==", id)
      .get();

    const followupStatusCounts: Record<string, number> = {
      queued: 0,
      scheduled: 0,
      sent: 0,
      delivered: 0,
      opened: 0,
      replied: 0,
      failed: 0,
    };

    followupSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.status) {
        followupStatusCounts[data.status] =
          (followupStatusCounts[data.status] || 0) + 1;
      }
    });

    // Prepare follow-up stats (use from campaign data if exists, otherwise calculate)
    const followUpStats = campaignData.followUpStats || {
      totalFollowUpsSent:
        followupStatusCounts.sent +
        followupStatusCounts.delivered +
        followupStatusCounts.opened +
        followupStatusCounts.replied,
      pending: followupStatusCounts.queued,
      scheduled: followupStatusCounts.scheduled,
      sent: followupStatusCounts.sent,
      delivered: followupStatusCounts.delivered,
      opened: followupStatusCounts.opened,
      replied: followupStatusCounts.replied,
      failed: followupStatusCounts.failed,
    };

    const response = {
      success: true,
      campaign: {
        id: campaignDoc.id,
        ...campaignData,

        // Add follow-up stats if not already present
        followUpStats: campaignData.followUpStats || followUpStats,
      },
      client: clientDetails,
      aggregates: {
        // Main email stats
        statusCounts,
        typeCounts,
        priorityCounts,
        totalRecipients: recipientsSnapshot.size,

        // NEW: Follow-up email stats
        followupStats: followupStatusCounts,
        totalFollowups: followupSnapshot.size,
      },
    };

    console.log(`[Campaign Detail] Campaign ${id} fetched successfully`);

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[Campaign Detail] Error:", error);

    if (error.name === "AuthenticationError") {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to fetch campaign details" },
      { status: 500 }
    );
  }
}

// PATCH - Update campaign status (pause/resume)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyFirebaseToken(request);
    verifyAdminOrSubadmin(user);

    const { id } = params;
    const body = await request.json();
    const { status } = body;

    if (!status || !["active", "paused"].includes(status)) {
      return NextResponse.json(
        { success: false, message: "Invalid status" },
        { status: 400 }
      );
    }

    console.log(
      `[Campaign Detail] Updating campaign ${id} status to ${status}...`
    );

    // Update campaign status
    await adminDb.collection("campaigns").doc(id).update({
      status,
      lastUpdated: new Date().toISOString(),
    });

    // Create audit log
    await adminDb.collection("campaignAuditLog").add({
      action: status === "paused" ? "campaign_paused" : "campaign_resumed",
      campaignId: id,
      performedBy: user.uid,
      performedByRole: user.role || "admin",
      timestamp: new Date().toISOString(),
    });

    console.log(`[Campaign Detail] Campaign ${id} status updated to ${status}`);

    return NextResponse.json({
      success: true,
      message: `Campaign ${
        status === "paused" ? "paused" : "resumed"
      } successfully`,
    });
  } catch (error: any) {
    console.error("[Campaign Detail] Update error:", error);

    if (error.name === "AuthenticationError") {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to update campaign" },
      { status: 500 }
    );
  }
}

// DELETE - Delete campaign (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyFirebaseToken(request);

    // Only admin can delete campaigns
    if (user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Only admin can delete campaigns" },
        { status: 403 }
      );
    }

    const { id } = params;

    console.log(
      `[Campaign Delete] Admin ${user.email} deleting campaign ${id}...`
    );

    // Check if campaign exists
    const campaignDoc = await adminDb.collection("campaigns").doc(id).get();
    if (!campaignDoc.exists) {
      return NextResponse.json(
        { success: false, message: "Campaign not found" },
        { status: 404 }
      );
    }

    const campaignData = campaignDoc.data();
    const campaignName = campaignData?.campaignName || "Unknown";
    const clientId = campaignData?.clientId;

    // Delete all campaign recipients
    console.log(`[Campaign Delete] Deleting recipients for campaign ${id}...`);
    const recipientsSnapshot = await adminDb
      .collection("campaignRecipients")
      .where("campaignId", "==", id)
      .get();

    const recipientBatches = [];
    let batch = adminDb.batch();
    let count = 0;

    recipientsSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
      count++;

      // Firestore batches are limited to 500 operations
      if (count >= 500) {
        recipientBatches.push(batch);
        batch = adminDb.batch();
        count = 0;
      }
    });

    if (count > 0) {
      recipientBatches.push(batch);
    }

    for (const batchToCommit of recipientBatches) {
      await batchToCommit.commit();
    }

    console.log(
      `[Campaign Delete] Deleted ${recipientsSnapshot.size} recipients`
    );

    // Delete all follow-up emails
    console.log(`[Campaign Delete] Deleting follow-ups for campaign ${id}...`);
    const followupsSnapshot = await adminDb
      .collection("followupEmails")
      .where("campaignId", "==", id)
      .get();

    const followupBatch = adminDb.batch();
    followupsSnapshot.forEach((doc) => {
      followupBatch.delete(doc.ref);
    });

    if (!followupsSnapshot.empty) {
      await followupBatch.commit();
    }

    console.log(
      `[Campaign Delete] Deleted ${followupsSnapshot.size} follow-ups`
    );

    // Delete the campaign document
    await adminDb.collection("campaigns").doc(id).delete();
    console.log(`[Campaign Delete] Campaign ${id} deleted`);

    // Create audit log
    await adminDb.collection("campaignAuditLog").add({
      action: "campaign_deleted",
      campaignId: id,
      campaignName,
      clientId,
      performedBy: user.uid,
      performedByEmail: user.email,
      performedByRole: "admin",
      timestamp: new Date().toISOString(),
      details: {
        recipientsDeleted: recipientsSnapshot.size,
        followupsDeleted: followupsSnapshot.size,
      },
    });

    console.log(`[Campaign Delete] Audit log created`);

    return NextResponse.json({
      success: true,
      message: `Campaign "${campaignName}" and all related data deleted successfully`,
      deleted: {
        recipients: recipientsSnapshot.size,
        followups: followupsSnapshot.size,
      },
    });
  } catch (error: any) {
    console.error("[Campaign Delete] Error:", error);

    if (error.name === "AuthenticationError") {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to delete campaign" },
      { status: 500 }
    );
  }
}
