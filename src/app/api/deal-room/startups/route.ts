import { NextRequest, NextResponse } from "next/server";
import {
  verifyFirebaseToken,
  verifyRole,
  AuthenticationError,
  createAuthErrorResponse,
} from "@/lib/auth-middleware";
import { dbHelpers } from "@/lib/db-helpers";
import { isVisibleToInvestors, toPublicProfile } from "@/lib/deal-room-projection";
import type { StartupApplication } from "@/types/startup-application";

const COLLECTION = "startupApplications";

/**
 * Investor portal listing.
 * GET /api/deal-room/startups
 *
 * Returns only approved applications, with founder contact details stripped.
 * Filtering and sorting run client-side against this payload; the set is a
 * curated deal room rather than an open marketplace, so it stays small enough
 * that paginating server-side would cost more than it saves.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyFirebaseToken(request);
    verifyRole(user, ["admin", "subadmin", "investor"]);

    if (user.role === "investor" && user.active === false) {
      throw new AuthenticationError(
        "Your account is inactive. Please contact support.",
        "ACCOUNT_DISABLED",
        403
      );
    }

    const applications = (await dbHelpers.getAll(COLLECTION)) as StartupApplication[];

    const profiles = applications
      .filter(isVisibleToInvestors)
      .map(toPublicProfile)
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    return NextResponse.json({
      success: true,
      data: profiles,
      count: profiles.length,
    });
  } catch (error: any) {
    if (error.name === "AuthenticationError") {
      return createAuthErrorResponse(error);
    }
    console.error("[DealRoom] Failed to list startups:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Unable to load the deal room." },
      },
      { status: 500 }
    );
  }
}
