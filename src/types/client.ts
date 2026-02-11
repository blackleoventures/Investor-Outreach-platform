import { SmtpConfigurationWithStatus } from "./smtp";

/**
 * Client Creation Method
 */
export type ClientCreationMethod = "client_submission" | "admin_creation";

/**
 * Client Status
 */
export type ClientStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "active"
  | "inactive"
  | "rejected";

/**
 * Pitch Analysis Status
 */
export type PitchAnalysisStatus = "GREEN" | "YELLOW" | "RED";

/**
 * Created By Information
 */
export interface CreatedBy {
  method: ClientCreationMethod;
  userId: string | null;
  role: "client" | "admin" | "subadmin";
  timestamp: string; // ISO string format
}

/**
 * Client Information - nested object in client document
 * UPDATED: Added SMTP configuration
 */
export interface ClientInformation {
  // Basic company info (existing)
  founderName: string;
  email: string;
  phone: string;
  companyName: string;
  industry: string;
  fundingStage: string;
  revenue: string;
  investment: string;
  city: string;

  // Email configuration
  emailConfiguration: SmtpConfigurationWithStatus;
}

/**
 * Usage Limits - tracks form edits and pitch analysis usage
 */
export interface UsageLimits {
  formEditCount: number;
  pitchAnalysisCount: number;
  maxFormEdits: number;
  maxPitchAnalysis: number;
  canEditForm: boolean;
  canAnalyzePitch: boolean;
}

/**
 * Pitch Analysis Summary
 */
export interface PitchSummary {
  problem: string;
  solution: string;
  market: string;
  traction: string;
  status: "GREEN" | "YELLOW" | "RED";
  total_score: number;
}

/**
 * Pitch Analysis Scorecard
 */
export interface PitchScorecard {
  "Problem & Solution Fit": number;
  "Market Size & Opportunity": number;
  "Business Model": number;
  "Traction & Metrics": number;
  Team: number;
  "Competitive Advantage": number;
  "Go-To-Market Strategy": number;
  "Financials & Ask": number;
  "Exit Potential": number;
  "Alignment with Investor": number;
}

/**
 * Single Pitch Analysis
 */
export interface PitchAnalysis {
  fileName?: string;
  analyzedAt?: string;
  summary: PitchSummary;
  scorecard: PitchScorecard;
  suggested_questions: string[];
  highlights: string[];
  email_subject?: string;
  email_body?: string;
}

/**
 * Admin Metadata (only for admin-created clients)
 */
export interface AdminMetadata {
  internalNotes: string;
  priorityLevel: "high" | "medium" | "low";
  assignedTo: string; // Admin/Subadmin UID
  tags: string[];
}

/**
 * Client Document (from Firestore) - with nested clientInformation
 * UPDATED: Added new fields for client submission flow
 */
export interface ClientDocument {
  // Basic identifiers
  id: string;
  userId: string;
  submissionId: string;

  // Entry tracking
  createdBy: CreatedBy;

  // Client information (includes SMTP config now)
  clientInformation: ClientInformation;

  // Pitch analyses
  pitchAnalyses: PitchAnalysis[];

  // Usage limits
  usageLimits: UsageLimits;

  // Status and review
  status: ClientStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  rejectionReason: string | null;
  dealRoomPermission?: boolean;

  // Admin metadata (optional, only if created by admin)
  adminMetadata?: AdminMetadata;

  // Existing fields
  emailVerified?: boolean;
  archived?: boolean;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  expiresAt?: string | null;

  // Metadata
  ipAddress?: string;
  userAgent?: string;
  pitchDeckFileName?: string;
  pitchDeckFileUrl?: string;
  pitchDeckFileSize?: number;
}

/**
 * Transformed Client (flattened for API responses)
 * UPDATED: Added SMTP fields at root level
 */
export interface TransformedClient {
  id: string;
  userId: string;
  submissionId: string;

  // Flattened from clientInformation
  founderName: string;
  email: string;
  phone: string;
  companyName: string;
  industry: string;
  fundingStage: string;
  revenue: string;
  investment: string;
  city: string;

  // Email configuration
  platformName: string;
  senderEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecurity: "TLS" | "SSL" | "None";
  smtpTestStatus: "pending" | "passed" | "failed";
  //  gmailAppPassword?: string;
  dailyEmailLimit: number;
  dealRoomPermission?: boolean;
  pitchDeckFileName?: string;
  pitchDeckFileUrl?: string;

  // Nested data
  pitchAnalyses: PitchAnalysis[];
  pitchAnalysisCount: number;
  usageLimits: UsageLimits;

  // Status
  status: ClientStatus;
  emailVerified: boolean;
  archived?: boolean;

  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Create Client Request Body
 * UPDATED: Added SMTP configuration fields
 */
export interface CreateClientRequest {
  // Company information
  companyName: string;
  founderName: string;
  email: string;
  phone: string;
  fundingStage: string;
  revenue: string;
  investment: string;
  industry: string;
  city: string;

  // SMTP configuration (NEW)
  platformName: string;
  senderEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecurity: "TLS" | "SSL" | "None";
  smtpUsername: string;
  smtpPassword: string;
  testRecipientEmail: string; // Email used for SMTP test

  // Pitch deck data (optional)
  pitchDeckFileName?: string;
  pitchDeckFileUrl?: string;
  pitchDeckFileSize?: number;
}

/**
 * Update Client Request Body
 * UPDATED: Added SMTP update fields
 */
export interface UpdateClientRequest {
  // Company information (optional)
  founderName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  industry?: string;
  fundingStage?: string;
  revenue?: string;
  investment?: string;
  city?: string;

  // SMTP configuration (optional, but if any SMTP field is changed, must re-test)
  platformName?: string;
  senderEmail?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecurity?: "TLS" | "SSL" | "None";
  smtpUsername?: string;
  smtpPassword?: string;
  testRecipientEmail?: string; // For re-testing SMTP

  // Other fields
  archived?: boolean;
  usageLimits?: Partial<UsageLimits>;
}

/**
 * Client Submission Form Values (frontend form data)
 */
export interface ClientSubmissionFormValues {
  // Company information
  companyName: string;
  founderName: string;
  email: string;
  phone: string;
  fundingStage: string;
  revenue: string;
  investment: string;
  industry: string;
  city: string;

  // SMTP configuration
  platformName: string;
  senderEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecurity: "TLS" | "SSL" | "None";
  smtpUsername: string;
  smtpPassword: string;
}

/**
 * Client Submission Request (API request body)
 */
export interface ClientSubmissionRequest {
  companyInformation: {
    companyName: string;
    founderName: string;
    email: string;
    phone: string;
    fundingStage: string;
    revenue: string;
    investment: string;
    industry: string;
    city: string;
  };
  emailConfiguration: {
    platformName: string;
    senderEmail: string;
    smtpHost: string;
    smtpPort: number;
    smtpSecurity: "TLS" | "SSL" | "None";
    smtpUsername: string;
    smtpPassword: string;
    testRecipient: string;
  };
  pitchDeckData?: {
    fileName: string;
    fileUrl: string;
    fileSize: number;
  } | null;
  isDraft: boolean;
}

export interface ReviewClientRequest {
  status: "approved" | "rejected";
  reviewNotes?: string;
  rejectionReason?: string;
}

/**
 * Client Submission Response (API response)
 */
export interface ClientSubmissionResponse {
  success: boolean;
  message: string;
  data?: {
    submissionId: string;
    clientId: string;
    status: ClientStatus;
    resumeLink?: string | null;
  };
  error?: string;
  errors?: Record<string, string>;
}

/**
 * API Error Response
 */
export interface ApiError {
  code: string;
  message: string;
  details?: string;
}

/**
 * API Success Response - Generic
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
  count?: number;
  timestamp?: string;
}

/**
 * Error Codes
 */
export enum ErrorCode {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  ACCESS_DENIED = "ACCESS_DENIED",
  DUPLICATE_EMAIL = "DUPLICATE_EMAIL",
  CLIENT_NOT_FOUND = "CLIENT_NOT_FOUND",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  SERVER_ERROR = "SERVER_ERROR",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  INVALID_TOKEN = "INVALID_TOKEN",
  USER_NOT_FOUND = "USER_NOT_FOUND",
  ACCOUNT_DISABLED = "ACCOUNT_DISABLED",
  SMTP_TEST_REQUIRED = "SMTP_TEST_REQUIRED",
  SMTP_TEST_FAILED = "SMTP_TEST_FAILED",
  PITCH_DECK_REQUIRED = "PITCH_DECK_REQUIRED",
}
