import { NextRequest, NextResponse } from "next/server";
import {
  verifyFirebaseToken,
  verifyRole,
  AuthenticationError,
  createAuthErrorResponse,
} from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";
import { dbHelpers } from "@/lib/db-helpers";
import { sendIntroductionRequestEmail } from "@/lib/deal-room-email";
import { isVisibleToInvestors } from "@/lib/deal-room-projection";
import type { StartupApplication } from "@/types/startup-application";

const COLLECTION = "introductionRequests";
const APPLICATIONS = "startupApplications";

/**
 * List introduction requests.
 * GET /api/introduction-requests
 *
 * The team sees every request. An investor sees only their own, which is what
 * the portal uses to show "Introduction requested" on a profile they've already
 * asked about.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyFirebaseToken(request);
    verifyRole(user, ["admin", "subadmin", "investor"]);

    const all = (await dbHelpers.getAll(COLLECTION)) as any[];

    const scoped =
      user.role === "investor" ? all.filter((r) => r.investorId === user.uid) : all;

    scoped.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Investors get only what the portal needs; team notes stay internal.
    const data =
      user.role === "investor"
        ? scoped.map((r) => ({
            id: r.id,
            startupId: r.startupId,
            startupName: r.startupName,
            stage: r.stage,
            createdAt: r.createdAt,
          }))
        : scoped;

    return NextResponse.json({ success: true, data, count: data.length });
  } catch (error: any) {
    if (error.name === "AuthenticationError") {
      return createAuthErrorResponse(error);
    }
    console.error("[DealRoom] Failed to list introduction requests:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Unable to load introduction requests." },
      },
      { status: 500 }
    );
  }
}

/**
 * Request an introduction to a startup.
 * POST /api/introduction-requests
 *
 * Creates the request and emails the team immediately. Founder contact details
 * are never returned here: the team verifies the investor and brokers the
 * introduction, which is the point of routing it this way.
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const startupId = typeof body.startupId === "string" ? body.startupId.trim() : "";
    const note = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";

    if (!startupId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "A startup must be specified." },
        },
        { status: 400 }
      );
    }

    const application = (await dbHelpers.getById(
      APPLICATIONS,
      startupId
    )) as StartupApplication | null;

    if (!application || !isVisibleToInvestors(application)) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Startup not found." } },
        { status: 404 }
      );
    }

    // One open request per investor/startup pair, so the team doesn't work the
    // same introduction twice.
    const existing = (await dbHelpers.getAll(COLLECTION)) as any[];
    const duplicate = existing.find(
      (r) => r.investorId === user.uid && r.startupId === startupId && r.stage !== "closed"
    );

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "ALREADY_REQUESTED",
            message:
              "You have already requested an introduction to this startup. Our team is on it.",
          },
        },
        { status: 409 }
      );
    }

    // Firm name lives on the investor record created at invite time.
    let investorFirm = "";
    let investorName = user.displayName || user.email;
    try {
      const investorDoc = await adminDb.collection("investors").doc(user.uid).get();
      if (investorDoc.exists) {
        const investor = investorDoc.data() as any;
        investorFirm = investor?.firmName || "";
        investorName = investor?.displayName || investorName;
      }
    } catch (error: any) {
      console.warn("[DealRoom] Could not load investor record:", error.message);
    }

    const created = await dbHelpers.create(COLLECTION, {
      investorId: user.uid,
      investorName,
      investorEmail: user.email,
      investorFirm,

      startupId,
      startupName: application.startup?.startupName || "",

      message: note,

      stage: "requested" as const,
      outcome: "pending" as const,
      teamNotes: [],
      assignedTo: null,
      meetingScheduledAt: null,
    });

    console.log("[DealRoom] Introduction requested:", {
      requestId: created.id,
      investor: user.email,
      startup: application.startup?.startupName,
    });

    // The team alert is the whole mechanism here, so a delivery failure is
    // reported back rather than swallowed - but the request itself still stands.
    let teamNotified = false;
    try {
      await sendIntroductionRequestEmail({
        investorName,
        investorEmail: user.email,
        investorFirm,
        startupName: application.startup?.startupName || "",
        startupSector: application.overview?.sector || "",
        raisingAmount: application.fundraising?.raisingAmount || "",
        message: note,
        requestId: created.id,
      });
      teamNotified = true;
    } catch (error: any) {
      console.error("[DealRoom] Team alert failed for intro request:", error.message);
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Your introduction request has been sent. Our team will verify and coordinate the introduction.",
        data: { id: created.id, teamNotified },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.name === "AuthenticationError") {
      return createAuthErrorResponse(error);
    }
    console.error("[DealRoom] Failed to create introduction request:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Unable to send your request." },
      },
      { status: 500 }
    );
  }
}
