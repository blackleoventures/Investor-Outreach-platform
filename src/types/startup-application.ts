/**
 * Black Leo Ventures - Startup Deal Room Application
 *
 * These types back the founder application form, the internal review queue,
 * and the investor-facing deal room. They live in their own `startupApplications`
 * collection, separate from `clients` (which drives SMTP outreach campaigns and
 * requires a passing SMTP test before submission).
 */

/**
 * Review status. Only `approved` applications surface in the investor portal.
 */
export type ApplicationStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "needs_changes";

export type MonthlyRevenueBand =
  | "Pre-Revenue"
  | "Less than $10K/month"
  | "$10K-50K/month"
  | "$50K-100K/month"
  | "More than $100K/month";

export type StartupStage =
  | "Idea"
  | "Prototype"
  | "MVP"
  | "Pilot"
  | "Revenue Generating"
  | "Scaling";

export type IntellectualProperty =
  | "Patent Filed"
  | "Patent Granted"
  | "Proprietary Technology"
  | "Trade Secret"
  | "Copyright"
  | "Trademark"
  | "No IP Yet";

export type FundingHistory =
  | "No"
  | "Friends & Family"
  | "Angel Investment"
  | "Pre-Seed"
  | "Seed"
  | "Series A+"
  | "Grant Only";

/**
 * Section 1: Founder Information.
 * Contact details here are never exposed to investors — they are released by the
 * team only after an introduction request is verified.
 */
export interface FounderInformation {
  founderName: string;
  designation: string;
  email: string;
  mobileNumber: string;
  linkedinProfile: string;
}

/** Section 2: Startup Information */
export interface StartupInformation {
  startupName: string;
  companyWebsite: string;
  country: string;
  incubationCentre: string;
}

/** Section 3: Startup Overview */
export interface StartupOverview {
  oneLineDescription: string;
  sector: string;
  stage: StartupStage;
  /** Technology Readiness Level, 1-9 */
  trl: number;
  /** Max 200 words, enforced on both client and server */
  technologyDescription: string;
  /** Not on the original form; needed for the investor "Business model" filter */
  businessModel: string;
}

/** Section 4: Traction */
export interface Traction {
  monthlyRevenue: MonthlyRevenueBand;
  payingCustomers: number;
}

/** Section 5: Intellectual Property */
export interface IntellectualPropertyInfo {
  ipTypes: IntellectualProperty[];
}

/** Section 6: Fundraising */
export interface Fundraising {
  /** Free text as entered, e.g. "USD 500,000" or "Rs 5 Crore" */
  raisingAmount: string;
  /** Normalised to USD for sorting and range filtering; null when unparseable */
  raisingAmountUsd: number | null;
  currentValuation: string;
  previousFunding: FundingHistory[];
  /** Profile sections — optional, founders may leave these blank */
  useOfFunds: string;
  financialHighlights: string;
  grantHistory: string;
}

/** Section 7: Documents */
export interface ApplicationDocuments {
  pitchDeckUrl: string;
  productDemoUrl: string;
}

/** Section 8: Declaration */
export interface Declaration {
  informationAccurate: boolean;
  authorizeSharing: boolean;
  understandsNoGuarantee: boolean;
}

/**
 * Derived flags, computed once on submit so the investor portal can filter
 * without scanning nested arrays on every request.
 */
export interface DerivedFlags {
  /** True when an incubation centre was named */
  isIncubated: boolean;
  /** True when previous funding includes a grant */
  isGrantWinner: boolean;
  /** True for any band above Pre-Revenue */
  isRevenueGenerating: boolean;
}

/** Review trail written by the internal team */
export interface ReviewInfo {
  status: ApplicationStatus;
  reviewedBy: string | null;
  reviewerEmail: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  /** Shown to the founder when status is `rejected` or `needs_changes` */
  feedbackToFounder: string | null;
}

/**
 * Full application document as stored in Firestore.
 */
export interface StartupApplication {
  id: string;
  applicationId: string;

  founder: FounderInformation;
  startup: StartupInformation;
  overview: StartupOverview;
  traction: Traction;
  intellectualProperty: IntellectualPropertyInfo;
  fundraising: Fundraising;
  documents: ApplicationDocuments;
  declaration: Declaration;

  derived: DerivedFlags;
  review: ReviewInfo;

  /** Populated when a founder submitted while signed in */
  submittedByUserId: string | null;
  ipAddress: string;
  userAgent: string;

  createdAt: string;
  updatedAt: string;
}

/**
 * Investor-facing projection. Founder name and designation are included so
 * investors can assess the team, but email, phone and LinkedIn are stripped
 * server-side and released only through a verified introduction.
 */
export interface PublicStartupProfile {
  id: string;
  applicationId: string;

  startupName: string;
  companyWebsite: string;
  country: string;
  incubationCentre: string;

  oneLineDescription: string;
  sector: string;
  stage: StartupStage;
  trl: number;
  technologyDescription: string;
  businessModel: string;

  monthlyRevenue: MonthlyRevenueBand;
  payingCustomers: number;

  ipTypes: IntellectualProperty[];

  raisingAmount: string;
  raisingAmountUsd: number | null;
  currentValuation: string;
  previousFunding: FundingHistory[];
  useOfFunds: string;
  financialHighlights: string;
  grantHistory: string;

  pitchDeckUrl: string;
  productDemoUrl: string;

  founders: Array<{
    founderName: string;
    designation: string;
  }>;

  isIncubated: boolean;
  isGrantWinner: boolean;
  isRevenueGenerating: boolean;

  approvedAt: string | null;
  createdAt: string;
}

/** Workflow the team runs after an investor asks for an introduction */
export type IntroductionStage =
  | "requested"
  | "investor_verified"
  | "startup_contacted"
  | "meeting_scheduled"
  | "follow_up"
  | "closed";

export type IntroductionOutcome =
  | "pending"
  | "meeting_completed"
  | "in_diligence"
  | "term_sheet"
  | "invested"
  | "passed"
  | "no_response";

export interface IntroductionRequest {
  id: string;

  investorId: string;
  investorName: string;
  investorEmail: string;
  investorFirm: string;

  startupId: string;
  startupName: string;

  /** Optional note the investor adds when requesting */
  message: string;

  stage: IntroductionStage;
  outcome: IntroductionOutcome;

  /** Internal team notes, newest appended */
  teamNotes: Array<{
    note: string;
    authorEmail: string;
    createdAt: string;
  }>;

  assignedTo: string | null;
  meetingScheduledAt: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface ApplicationSubmissionResponse {
  success: boolean;
  message?: string;
  data?: {
    applicationId: string;
    id: string;
    status: ApplicationStatus;
  };
  error?: {
    code: string;
    message: string;
    field?: string;
  };
}
