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
 * Investor-facing startup profile.
 * GET /api/deal-room/startups/[id]
 *
 * An application that is not approved returns 404 rather than 403, so the
 * endpoint does not confirm that a given startup applied at all.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const application = (await dbHelpers.getById(
      COLLECTION,
      params.id
    )) as StartupApplication | null;

    if (!application || !isVisibleToInvestors(application)) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Startup not found." } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: toPublicProfile(application) });
  } catch (error: any) {
    if (error.name === "AuthenticationError") {
      return createAuthErrorResponse(error);
    }
    console.error("[DealRoom] Failed to load startup profile:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Unable to load this startup." },
      },
      { status: 500 }
    );
  }
}
