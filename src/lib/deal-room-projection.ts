import type {
  PublicStartupProfile,
  StartupApplication,
} from "@/types/startup-application";

/**
 * Project a stored application into the investor-facing shape.
 *
 * This is the single place contact redaction happens. Founder name and
 * designation are kept so investors can assess the team; email, mobile number
 * and LinkedIn are dropped entirely rather than masked, so they never travel to
 * the browser where a network inspector would reveal them. Contact details are
 * released by the team only after an introduction request is verified.
 */
export function toPublicProfile(application: StartupApplication): PublicStartupProfile {
  const { startup, overview, traction, fundraising, documents, founder, derived } =
    application;

  return {
    id: application.id,
    applicationId: application.applicationId,

    startupName: startup?.startupName || "",
    companyWebsite: startup?.companyWebsite || "",
    country: startup?.country || "",
    incubationCentre: startup?.incubationCentre || "",

    oneLineDescription: overview?.oneLineDescription || "",
    sector: overview?.sector || "",
    stage: overview?.stage,
    trl: overview?.trl ?? 0,
    technologyDescription: overview?.technologyDescription || "",
    businessModel: overview?.businessModel || "",

    monthlyRevenue: traction?.monthlyRevenue,
    payingCustomers: traction?.payingCustomers ?? 0,

    ipTypes: application.intellectualProperty?.ipTypes || [],

    raisingAmount: fundraising?.raisingAmount || "",
    raisingAmountUsd: fundraising?.raisingAmountUsd ?? null,
    currentValuation: fundraising?.currentValuation || "",
    previousFunding: fundraising?.previousFunding || [],
    useOfFunds: fundraising?.useOfFunds || "",
    financialHighlights: fundraising?.financialHighlights || "",
    grantHistory: fundraising?.grantHistory || "",

    pitchDeckUrl: documents?.pitchDeckUrl || "",
    productDemoUrl: documents?.productDemoUrl || "",

    // Contact fields are intentionally absent from this object.
    founders: founder?.founderName
      ? [
          {
            founderName: founder.founderName,
            designation: founder.designation || "",
          },
        ]
      : [],

    isIncubated: derived?.isIncubated ?? false,
    isGrantWinner: derived?.isGrantWinner ?? false,
    isRevenueGenerating: derived?.isRevenueGenerating ?? false,

    approvedAt: application.review?.reviewedAt ?? null,
    createdAt: application.createdAt,
  };
}

/** Applications an investor is allowed to see. */
export function isVisibleToInvestors(application: StartupApplication): boolean {
  return application.review?.status === "approved";
}
