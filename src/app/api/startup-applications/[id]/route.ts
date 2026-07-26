import { NextRequest, NextResponse } from "next/server";
import {
  verifyFirebaseToken,
  verifyAdminOrSubadmin,
  createAuthErrorResponse,
} from "@/lib/auth-middleware";
import { dbHelpers } from "@/lib/db-helpers";
import { sendApplicationDecisionEmail } from "@/lib/deal-room-email";
import { parseFundingToUsd } from "@/lib/config/deal-room-options";
import type { ApplicationStatus, StartupApplication } from "@/types/startup-application";

const COLLECTION = "startupApplications";

const VALID_STATUSES: ApplicationStatus[] = [
  "pending_review",
  "approved",
  "rejected",
  "needs_changes",
];

/**
 * Full application detail for the review screen.
 * GET /api/startup-applications/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyFirebaseToken(request);
    verifyAdminOrSubadmin(user);

    const application = (await dbHelpers.getById(
      COLLECTION,
      params.id
    )) as StartupApplication | null;

    if (!application) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Application not found." } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: application });
  } catch (error: any) {
    if (error.name === "AuthenticationError") {
      return createAuthErrorResponse(error);
    }
    console.error("[DealRoom] Failed to load application:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Unable to load application." } },
      { status: 500 }
    );
  }
}

/**
 * Record a review decision.
 * PATCH /api/startup-applications/[id]
 *
 * Body: { status, reviewNotes?, feedbackToFounder?, notifyFounder? }
 *
 * Only `approved` applications become visible in the investor portal.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyFirebaseToken(request);
    verifyAdminOrSubadmin(user);

    const body = await request.json();
    const status = body.status as ApplicationStatus;

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: `Status must be one of: ${VALID_STATUSES.join(", ")}`,
          },
        },
        { status: 400 }
      );
    }

    const feedbackToFounder =
      typeof body.feedbackToFounder === "string" ? body.feedbackToFounder.trim() : "";

    // A rejection or a change request without an explanation leaves the founder
    // with nothing to act on, and the team with no record of the reasoning.
    if ((status === "rejected" || status === "needs_changes") && !feedbackToFounder) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Please explain the decision so the founder knows what to address.",
            field: "feedbackToFounder",
          },
        },
        { status: 400 }
      );
    }

    const existing = (await dbHelpers.getById(
      COLLECTION,
      params.id
    )) as StartupApplication | null;

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Application not found." } },
        { status: 404 }
      );
    }

    const updatePayload: Record<string, any> = {
      review: {
        status,
        reviewedBy: user.uid,
        reviewerEmail: user.email,
        reviewedAt: new Date().toISOString(),
        reviewNotes:
          typeof body.reviewNotes === "string" ? body.reviewNotes.trim() : existing.review?.reviewNotes ?? null,
        feedbackToFounder: feedbackToFounder || null,
      },
    };

    // Founders can edit and resubmit their ask; keep the sortable USD value in
    // step with whatever text is currently stored.
    if (existing.fundraising?.raisingAmount) {
      updatePayload["fundraising"] = {
        ...existing.fundraising,
        raisingAmountUsd: parseFundingToUsd(existing.fundraising.raisingAmount),
      };
    }

    await dbHelpers.update(COLLECTION, params.id, updatePayload);

    console.log("[DealRoom] Application reviewed:", {
      id: params.id,
      applicationId: existing.applicationId,
      status,
      reviewer: user.email,
    });

    // Notification is opt-out and must not fail the decision itself.
    const shouldNotify = body.notifyFounder !== false && status !== "pending_review";
    let notified = false;

    if (shouldNotify) {
      try {
        await sendApplicationDecisionEmail({
          founderName: existing.founder?.founderName || "Founder",
          founderEmail: existing.founder?.email,
          startupName: existing.startup?.startupName || "your startup",
          status: status as "approved" | "rejected" | "needs_changes",
          feedback: feedbackToFounder,
        });
        notified = true;
      } catch (error: any) {
        console.error("[DealRoom] Decision email failed:", error.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Application marked as ${status.replace(/_/g, " ")}.`,
      data: { id: params.id, status, founderNotified: notified },
    });
  } catch (error: any) {
    if (error.name === "AuthenticationError") {
      return createAuthErrorResponse(error);
    }
    console.error("[DealRoom] Failed to review application:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Unable to update application." } },
      { status: 500 }
    );
  }
}
