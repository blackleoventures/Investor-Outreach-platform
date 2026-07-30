import { NextRequest, NextResponse } from "next/server";
import {
  verifyFirebaseToken,
  verifyAdminOrSubadmin,
  createAuthErrorResponse,
} from "@/lib/auth-middleware";
import { dbHelpers } from "@/lib/db-helpers";
import type { StartupApplication } from "@/types/startup-application";

const COLLECTION = "startupApplications";

/**
 * List Deal Room applications for the internal review queue.
 * GET /api/startup-applications?status=pending_review
 *
 * Team-only. This returns founder contact details, which the investor-facing
 * endpoints deliberately withhold.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyFirebaseToken(request);
    verifyAdminOrSubadmin(user);

    const statusFilter = request.nextUrl.searchParams.get("status");

    // Sorted in memory rather than via orderBy so a status filter doesn't
    // require a composite index.
    const applications = (await dbHelpers.getAll(COLLECTION)) as StartupApplication[];

    const filtered = statusFilter
      ? applications.filter((app) => app.review?.status === statusFilter)
      : applications;

    filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const counts = applications.reduce<Record<string, number>>((acc, app) => {
      const status = app.review?.status || "pending_review";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: filtered,
      count: filtered.length,
      counts: {
        pending_review: counts.pending_review || 0,
        approved: counts.approved || 0,
        rejected: counts.rejected || 0,
        needs_changes: counts.needs_changes || 0,
        total: applications.length,
      },
    });
  } catch (error: any) {
    if (error.name === "AuthenticationError") {
      return createAuthErrorResponse(error);
    }
    console.error("[DealRoom] Failed to list applications:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Unable to load applications." },
      },
      { status: 500 }
    );
  }
}
