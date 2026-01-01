import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  verifyFirebaseToken,
  verifyAdminOrSubadmin,
  createAuthErrorResponse,
} from "@/lib/auth-middleware";

export const maxDuration = 60;

// Vercel Edge caching - cache for 5 minutes, revalidate in background
export const revalidate = 300;

interface ReplyRecord {
  id: string;
  // Original recipient (who we sent email to)
  originalRecipient: {
    name: string;
    email: string;
    organization: string;
  };
  // Who actually replied
  replier: {
    name: string;
    email: string;
    organization: string;
  };
  // Tracking info
  isSamePerson: boolean;
  matchType: string;
  replyReceivedAt: string;
  createdAt: string;
  // NEW: Email content for admin viewing
  subject: string | null;
  bodyPreview: string | null; // First 500 chars for list view
  body: string | null; // Full body for detail view
  hasContent: boolean; // Quick check if content is available
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication and authorization
    const user = await verifyFirebaseToken(request);
    verifyAdminOrSubadmin(user);

    const campaignId = params.id;

    // Check for conditional request (ETag/If-None-Match)
    const ifNoneMatch = request.headers.get("if-none-match");

    // Verify campaign exists and get last update time
    const campaignDoc = await adminDb
      .collection("campaigns")
      .doc(campaignId)
      .get();

    if (!campaignDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 }
      );
    }

    const campaignData = campaignDoc.data();
    const lastUpdated =
      campaignData?.lastUpdated || campaignData?.createdAt || "";

    // Generate ETag based on last update time and replied count
    const repliedCount = campaignData?.stats?.replied || 0;
    const etag = `"replies-${campaignId}-${repliedCount}-${new Date(
      lastUpdated
    ).getTime()}"`;

    // If ETag matches, return 304 Not Modified (saves reads!)
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
        },
      });
    }

    console.log(
      `[Campaign Replies] User ${user.email} fetching replies for campaign ${campaignId}`
    );

    // Fetch replies from campaignReplies collection (has full context)
    const repliesSnapshot = await adminDb
      .collection("campaignReplies")
      .where("campaignId", "==", campaignId)
      .orderBy("replyReceivedAt", "desc")
      .get();

    const replies: ReplyRecord[] = [];

    repliesSnapshot.forEach((doc) => {
      const data = doc.data();

      replies.push({
        id: doc.id,
        originalRecipient: {
          name: data.originalRecipient?.name || "Unknown",
          email: data.originalRecipient?.email || "Unknown",
          organization: data.originalRecipient?.organization || "Unknown",
        },
        replier: {
          name:
            data.replyFrom?.name || data.originalRecipient?.name || "Unknown",
          email:
            data.replyFrom?.email || data.originalRecipient?.email || "Unknown",
          organization:
            data.replyFrom?.organization ||
            data.originalRecipient?.organization ||
            "Unknown",
        },
        isSamePerson: !data.isNewPerson,
        matchType: data.matchType || "exact",
        replyReceivedAt: data.replyReceivedAt || data.createdAt || "",
        createdAt: data.createdAt || "",
        // Email content fields
        subject: data.subject || null,
        bodyPreview: data.body ? data.body.substring(0, 500) : null,
        body: data.body || null,
        hasContent: !!(data.subject || data.body),
      });
    });

    // Calculate summary
    const totalReplies = replies.length;
    const samePerson = replies.filter((r) => r.isSamePerson).length;
    const forwardedReplies = replies.filter((r) => !r.isSamePerson).length;
    const uniqueRepliers = new Set(replies.map((r) => r.replier.email)).size;
    const uniqueRecipients = new Set(
      replies.map((r) => r.originalRecipient.email)
    ).size;

    const response = {
      success: true,
      campaign: {
        id: campaignId,
        name: campaignData?.campaignName || "Unknown",
      },
      replies,
      summary: {
        totalReplies,
        uniqueRepliers,
        uniqueRecipientsWithReplies: uniqueRecipients,
        samePersonReplies: samePerson,
        forwardedReplies,
      },
    };
    console.log("--------------------", response);

    console.log(
      `[Campaign Replies] Found ${totalReplies} replies (${forwardedReplies} forwarded)`
    );

    // Return with caching headers
    return NextResponse.json(response, {
      headers: {
        ETag: etag,
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
        "Last-Modified": new Date(lastUpdated).toUTCString(),
      },
    });
  } catch (error: any) {
    console.error("[Campaign Replies] Error:", error.message);
    return createAuthErrorResponse(error);
  }
}
