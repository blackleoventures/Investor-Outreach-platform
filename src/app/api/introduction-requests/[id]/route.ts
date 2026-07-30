import { NextRequest, NextResponse } from "next/server";
import {
  verifyFirebaseToken,
  verifyAdminOrSubadmin,
  createAuthErrorResponse,
} from "@/lib/auth-middleware";
import { dbHelpers } from "@/lib/db-helpers";
import type {
  IntroductionOutcome,
  IntroductionRequest,
  IntroductionStage,
} from "@/types/startup-application";

const COLLECTION = "introductionRequests";

const STAGES: IntroductionStage[] = [
  "requested",
  "investor_verified",
  "startup_contacted",
  "meeting_scheduled",
  "follow_up",
  "closed",
];

const OUTCOMES: IntroductionOutcome[] = [
  "pending",
  "meeting_completed",
  "in_diligence",
  "term_sheet",
  "invested",
  "passed",
  "no_response",
];

/**
 * Advance an introduction through the team workflow.
 * PATCH /api/introduction-requests/[id]
 *
 * Body: { stage?, outcome?, assignedTo?, meetingScheduledAt?, note? }
 * Team-only. Any subset of fields may be sent.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyFirebaseToken(request);
    verifyAdminOrSubadmin(user);

    const body = await request.json();

    const existing = (await dbHelpers.getById(
      COLLECTION,
      params.id
    )) as IntroductionRequest | null;

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Request not found." } },
        { status: 404 }
      );
    }

    const update: Record<string, any> = {};

    if (body.stage !== undefined) {
      if (!STAGES.includes(body.stage)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: `Stage must be one of: ${STAGES.join(", ")}`,
            },
          },
          { status: 400 }
        );
      }
      update.stage = body.stage;
    }

    if (body.outcome !== undefined) {
      if (!OUTCOMES.includes(body.outcome)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: `Outcome must be one of: ${OUTCOMES.join(", ")}`,
            },
          },
          { status: 400 }
        );
      }
      update.outcome = body.outcome;
    }

    if (body.assignedTo !== undefined) {
      update.assignedTo =
        typeof body.assignedTo === "string" && body.assignedTo.trim()
          ? body.assignedTo.trim()
          : null;
    }

    if (body.meetingScheduledAt !== undefined) {
      update.meetingScheduledAt = body.meetingScheduledAt || null;
    }

    // Notes are appended rather than replaced so the trail survives edits.
    const note = typeof body.note === "string" ? body.note.trim() : "";
    if (note) {
      update.teamNotes = [
        ...(existing.teamNotes || []),
        {
          note: note.slice(0, 2000),
          authorEmail: user.email,
          createdAt: new Date().toISOString(),
        },
      ];
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Nothing to update." },
        },
        { status: 400 }
      );
    }

    await dbHelpers.update(COLLECTION, params.id, update);

    console.log("[DealRoom] Introduction updated:", {
      id: params.id,
      by: user.email,
      fields: Object.keys(update),
    });

    return NextResponse.json({
      success: true,
      message: "Introduction updated.",
      data: { id: params.id, ...update },
    });
  } catch (error: any) {
    if (error.name === "AuthenticationError") {
      return createAuthErrorResponse(error);
    }
    console.error("[DealRoom] Failed to update introduction:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Unable to update this introduction." },
      },
      { status: 500 }
    );
  }
}
