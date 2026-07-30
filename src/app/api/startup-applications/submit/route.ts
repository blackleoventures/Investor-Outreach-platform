import { NextRequest, NextResponse } from "next/server";
import { dbHelpers } from "@/lib/db-helpers";
import {
  MAX_TECHNOLOGY_WORDS,
  countWords,
  isGrantWinner,
  isIncubated,
  parseFundingToUsd,
  REVENUE_BANDS,
  STARTUP_STAGES,
} from "@/lib/config/deal-room-options";
import { sendApplicationReceivedEmails } from "@/lib/deal-room-email";
import type { ApplicationSubmissionResponse } from "@/types/startup-application";

const COLLECTION = "startupApplications";

/** Trim and coerce to string so undefined/number input can't reach Firestore. */
function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(str).filter(Boolean);
  const single = str(value);
  return single ? [single] : [];
}

function badRequest(
  code: string,
  message: string,
  field?: string
): NextResponse<ApplicationSubmissionResponse> {
  return NextResponse.json(
    { success: false, error: { code, message, ...(field && { field }) } },
    { status: 400 }
  );
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Submit a Deal Room application.
 * POST /api/startup-applications/submit
 *
 * Intentionally unauthenticated: this replaces a public Google Form, so founders
 * apply before they have any account on the platform. Nothing submitted here is
 * visible to investors until the internal team approves it.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const founder = body.founder || {};
    const startup = body.startup || {};
    const overview = body.overview || {};
    const traction = body.traction || {};
    const fundraising = body.fundraising || {};
    const documents = body.documents || {};
    const declaration = body.declaration || {};

    // ---------- Section 1: Founder ----------
    const founderName = str(founder.founderName);
    const designation = str(founder.designation);
    const email = str(founder.email).toLowerCase();
    const mobileNumber = str(founder.mobileNumber);
    const linkedinProfile = str(founder.linkedinProfile);

    if (!founderName) return badRequest("VALIDATION_ERROR", "Founder name is required.", "founderName");
    if (!designation) return badRequest("VALIDATION_ERROR", "Designation is required.", "designation");
    if (!EMAIL_PATTERN.test(email))
      return badRequest("VALIDATION_ERROR", "Please provide a valid email address.", "email");
    if (!mobileNumber)
      return badRequest("VALIDATION_ERROR", "Mobile number is required.", "mobileNumber");
    if (!linkedinProfile)
      return badRequest("VALIDATION_ERROR", "LinkedIn profile is required.", "linkedinProfile");

    // ---------- Section 2: Startup ----------
    const startupName = str(startup.startupName);
    const companyWebsite = str(startup.companyWebsite);
    const country = str(startup.country);
    const incubationCentre = str(startup.incubationCentre);

    if (!startupName)
      return badRequest("VALIDATION_ERROR", "Startup name is required.", "startupName");
    if (!companyWebsite)
      return badRequest("VALIDATION_ERROR", "Company website or LinkedIn is required.", "companyWebsite");
    if (!country) return badRequest("VALIDATION_ERROR", "Country is required.", "country");
    if (!incubationCentre)
      return badRequest(
        "VALIDATION_ERROR",
        "Incubation centre is required. Enter 'None' if you are not incubated.",
        "incubationCentre"
      );

    // ---------- Section 3: Overview ----------
    const oneLineDescription = str(overview.oneLineDescription);
    const sector = str(overview.sector);
    const stage = str(overview.stage);
    const businessModel = str(overview.businessModel);
    const trl = Number(overview.trl);
    const technologyDescription = str(overview.technologyDescription);

    if (!oneLineDescription)
      return badRequest("VALIDATION_ERROR", "One-line description is required.", "oneLineDescription");
    if (!sector) return badRequest("VALIDATION_ERROR", "Sector is required.", "sector");
    if (!STARTUP_STAGES.includes(stage as any))
      return badRequest("VALIDATION_ERROR", "Please select a valid startup stage.", "stage");
    if (!Number.isInteger(trl) || trl < 1 || trl > 9)
      return badRequest("VALIDATION_ERROR", "Technology Readiness Level must be between 1 and 9.", "trl");
    if (!technologyDescription)
      return badRequest(
        "VALIDATION_ERROR",
        "Please describe your technology.",
        "technologyDescription"
      );
    if (countWords(technologyDescription) > MAX_TECHNOLOGY_WORDS)
      return badRequest(
        "VALIDATION_ERROR",
        `Technology description must be ${MAX_TECHNOLOGY_WORDS} words or fewer.`,
        "technologyDescription"
      );

    // ---------- Section 4: Traction ----------
    const monthlyRevenue = str(traction.monthlyRevenue);
    const payingCustomers = Number(traction.payingCustomers);

    if (!REVENUE_BANDS.includes(monthlyRevenue as any))
      return badRequest("VALIDATION_ERROR", "Please select a valid revenue band.", "monthlyRevenue");
    if (!Number.isFinite(payingCustomers) || payingCustomers < 0)
      return badRequest(
        "VALIDATION_ERROR",
        "Number of paying customers must be zero or greater.",
        "payingCustomers"
      );

    // ---------- Section 5: IP ----------
    const ipTypes = toArray(body.intellectualProperty?.ipTypes);
    if (ipTypes.length === 0)
      return badRequest("VALIDATION_ERROR", "Please select at least one IP option.", "ipTypes");

    // ---------- Section 6: Fundraising ----------
    const raisingAmount = str(fundraising.raisingAmount);
    const previousFunding = toArray(fundraising.previousFunding);

    if (!raisingAmount)
      return badRequest("VALIDATION_ERROR", "Please state how much you are raising.", "raisingAmount");
    if (previousFunding.length === 0)
      return badRequest(
        "VALIDATION_ERROR",
        "Please indicate whether you have raised funding before.",
        "previousFunding"
      );

    // ---------- Section 7: Documents ----------
    const pitchDeckUrl = str(documents.pitchDeckUrl);
    if (!pitchDeckUrl)
      return badRequest("VALIDATION_ERROR", "A pitch deck link is required.", "pitchDeckUrl");
    if (!isHttpUrl(pitchDeckUrl))
      return badRequest(
        "VALIDATION_ERROR",
        "Pitch deck link must be a valid http(s) URL.",
        "pitchDeckUrl"
      );

    const productDemoUrl = str(documents.productDemoUrl);
    if (productDemoUrl && !isHttpUrl(productDemoUrl))
      return badRequest(
        "VALIDATION_ERROR",
        "Product demo link must be a valid http(s) URL.",
        "productDemoUrl"
      );

    // ---------- Section 8: Declaration ----------
    if (
      declaration.informationAccurate !== true ||
      declaration.authorizeSharing !== true ||
      declaration.understandsNoGuarantee !== true
    ) {
      return badRequest(
        "VALIDATION_ERROR",
        "You must accept all three declaration statements to submit.",
        "declaration"
      );
    }

    // ---------- Duplicate guard ----------
    // One live application per founder email. Rejected applications don't block
    // a resubmission, so a founder can reapply after addressing feedback.
    const existing = await dbHelpers.findOne(COLLECTION, { "founder.email": email });
    if (existing && (existing as any).review?.status !== "rejected") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "ALREADY_EXISTS",
            message:
              "An application already exists for this email address. Our team will be in touch regarding its status.",
          },
        },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const applicationId = `BLV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    const applicationData = {
      applicationId,

      founder: { founderName, designation, email, mobileNumber, linkedinProfile },
      startup: { startupName, companyWebsite, country, incubationCentre },
      overview: {
        oneLineDescription,
        sector,
        stage,
        trl,
        technologyDescription,
        businessModel: businessModel || "Other",
      },
      traction: { monthlyRevenue, payingCustomers },
      intellectualProperty: { ipTypes },
      fundraising: {
        raisingAmount,
        raisingAmountUsd: parseFundingToUsd(raisingAmount),
        currentValuation: str(fundraising.currentValuation),
        previousFunding,
        useOfFunds: str(fundraising.useOfFunds),
        financialHighlights: str(fundraising.financialHighlights),
        grantHistory: str(fundraising.grantHistory),
      },
      documents: { pitchDeckUrl, productDemoUrl },
      declaration: {
        informationAccurate: true,
        authorizeSharing: true,
        understandsNoGuarantee: true,
      },

      derived: {
        isIncubated: isIncubated(incubationCentre),
        isGrantWinner: isGrantWinner(previousFunding),
        isRevenueGenerating: monthlyRevenue !== "Pre-Revenue",
      },

      review: {
        status: "pending_review" as const,
        reviewedBy: null,
        reviewerEmail: null,
        reviewedAt: null,
        reviewNotes: null,
        feedbackToFounder: null,
      },

      submittedByUserId: null,
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    };

    const created = await dbHelpers.create(COLLECTION, applicationData);

    console.log("[DealRoom] Application submitted:", {
      applicationId,
      id: created.id,
      startupName,
      timestamp: now,
    });

    // Notifications must never block a successful submission.
    sendApplicationReceivedEmails({
      founderName,
      founderEmail: email,
      startupName,
      applicationId,
      sector,
      stage,
      raisingAmount,
      country,
      recordId: created.id,
    }).catch((error) => {
      console.error("[DealRoom] Application notification failed:", error.message);
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Your application has been submitted. Our team reviews every application and will be in touch.",
        data: { applicationId, id: created.id, status: "pending_review" as const },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[DealRoom] Application submission failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Unable to submit your application. Please try again.",
        },
      },
      { status: 500 }
    );
  }
}
