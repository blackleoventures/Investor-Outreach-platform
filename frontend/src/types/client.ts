/**
 * Client Information - nested object in client document
 */
export interface ClientInformation {
  founderName: string;
  email: string;
  phone: string;
  companyName: string;
  industry: string;
  fundingStage: string;
  revenue: string;
  investment: string;
  city: string;
  gmailAppPassword?: string;
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
  "Team": number;
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
 * Client Document (from Firestore) - with nested clientInformation
 */
export interface ClientDocument {
  id: string;
  userId: string;
  clientInformation: ClientInformation;
  pitchAnalyses: PitchAnalysis[];
  usageLimits: UsageLimits;
  emailVerified?: boolean;
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Transformed Client (flattened for API responses)
 */
export interface TransformedClient {
  id: string;
  userId: string;
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
  gmailAppPassword?: string;
  // Nested data
  pitchAnalyses: PitchAnalysis[];
  pitchAnalysisCount: number;
  usageLimits: UsageLimits;
  emailVerified: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create Client Request Body
 */
export interface CreateClientRequest {
  companyName: string;
  founderName: string;
  email: string;
  phone: string;
  fundingStage: string;
  revenue: string;
  investment: string;
  industry: string;
  city: string;
  gmailAppPassword?: string;
}

/**
 * Update Client Request Body
 */
export interface UpdateClientRequest {
  founderName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  industry?: string;
  fundingStage?: string;
  revenue?: string;
  investment?: string;
  city?: string;
  gmailAppPassword?: string;
  archived?: boolean;
  usageLimits?: Partial<UsageLimits>;
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
  DUPLICATE_EMAIL = "DUPLICATE_EMAIL",
  CLIENT_NOT_FOUND = "CLIENT_NOT_FOUND",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  SERVER_ERROR = "SERVER_ERROR",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  INVALID_TOKEN = "INVALID_TOKEN",
  USER_NOT_FOUND = "USER_NOT_FOUND",
  ACCOUNT_DISABLED = "ACCOUNT_DISABLED",
}
