import type { PitchAnalysis, TransformedClient } from "@/types/client";

/**
 * The subset of a client record an investor is allowed to see.
 *
 * Built as an explicit allowlist rather than an `Omit<>` of sensitive keys, so
 * any field added to `TransformedClient` later is withheld by default instead of
 * silently flowing through to investors.
 */
export interface InvestorSafeClient {
  id: string;

  companyName: string;
  /** Kept so investors can assess the team; contact details are not included. */
  founderName: string;
  industry: string;
  fundingStage: string;
  revenue: string;
  investment: string;
  city: string;

  pitchDeckFileName: string;
  pitchDeckFileUrl: string;
  pitchAnalyses: PitchAnalysis[];
  pitchAnalysisCount: number;

  status: string;
  dealRoomPermission: boolean;

  createdAt: string;
  updatedAt: string;
}

/**
 * Strip the outreach email drafts from a pitch analysis.
 *
 * These are campaign artifacts written for the client's own sending, not part of
 * the investment case, so they have no reason to reach an investor.
 */
function safeAnalysis(analysis: PitchAnalysis): PitchAnalysis {
  const { email_subject, email_body, ...rest } = analysis || ({} as PitchAnalysis);
  return rest as PitchAnalysis;
}

/**
 * Project a client record into the investor-facing shape.
 *
 * Deliberately withheld: founder email and phone, every SMTP/email-configuration
 * field, internal identifiers (userId, submissionId), usage limits, and the
 * internal review trail. Contact details are released only when the team brokers
 * an introduction.
 */
export function toInvestorSafeClient(client: TransformedClient): InvestorSafeClient {
  return {
    id: client.id,

    companyName: client.companyName || "",
    founderName: client.founderName || "",
    industry: client.industry || "",
    fundingStage: client.fundingStage || "",
    revenue: client.revenue || "",
    investment: client.investment || "",
    city: client.city || "",

    pitchDeckFileName: client.pitchDeckFileName || "",
    pitchDeckFileUrl: client.pitchDeckFileUrl || "",
    pitchAnalyses: (client.pitchAnalyses || []).map(safeAnalysis),
    pitchAnalysisCount: client.pitchAnalyses?.length || 0,

    status: client.status || "pending_review",
    dealRoomPermission: client.dealRoomPermission || false,

    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  };
}
