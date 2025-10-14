// src/types/smtp.ts

/**
 * SMTP Security Types
 */
export type SmtpSecurityType = "TLS" | "SSL" | "None";

/**
 * SMTP Test Status
 */
export type SmtpTestStatus = "pending" | "passed" | "failed";

/**
 * SMTP Configuration Interface
 */
export interface SmtpConfiguration {
  platformName: string; // e.g., "Google Workspace", "Zoho", etc.
  senderEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecurity: SmtpSecurityType;
  smtpUsername: string;
  smtpPassword: string; // Will be encrypted before storage
}

/**
 * SMTP Test Configuration (includes test recipient)
 */
export interface SmtpTestConfig extends SmtpConfiguration {
  testRecipientEmail: string;
}

/**
 * SMTP Test Request (API request body)
 */
export interface SmtpTestRequest {
  smtpConfig: SmtpConfiguration;
  testRecipientEmail: string;
}

/**
 * SMTP Test Response (API response)
 */
export interface SmtpTestResponse {
  success: boolean;
  message: string;
  data?: {
    messageId?: string;
    testEmailSentTo?: string;
    timestamp?: string;
  };
  error?: string;
  errorCode?: string;
  details?: string;
}

/**
 * SMTP Configuration with Test Status (stored in DB)
 */
export interface SmtpConfigurationWithStatus {
  platformName: string;
  senderEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecurity: SmtpSecurityType;
  smtpUsername: string;
  smtpPassword: string; // ENCRYPTED in database
  
  // System-wide fixed limit
  dailyEmailLimit: 50; // Fixed for MVP
  
  // Test status
  testStatus: SmtpTestStatus;
  testDate: Date | null;
  testRecipient: string | null;
  testError: string | null;
  
  // Sending schedule (system default)
  sendingHours: {
    start: string; // "09:00"
    end: string; // "18:00"
    timezone: string; // "Asia/Kolkata"
  };
}

/**
 * Common SMTP providers and their default settings
 */
export const SMTP_PROVIDERS = {
  GOOGLE: {
    name: "Google Workspace / Gmail",
    host: "smtp.gmail.com",
    port: 587,
    security: "TLS" as SmtpSecurityType,
  },
  ZOHO: {
    name: "Zoho Mail / Workplace",
    host: "smtp.zoho.com",
    port: 587,
    security: "TLS" as SmtpSecurityType,
  },
  OUTLOOK: {
    name: "Microsoft 365 / Outlook",
    host: "smtp.office365.com",
    port: 587,
    security: "TLS" as SmtpSecurityType,
  },
  YAHOO: {
    name: "Yahoo Mail",
    host: "smtp.mail.yahoo.com",
    port: 587,
    security: "TLS" as SmtpSecurityType,
  },
} as const;

/**
 * SMTP Error Types
 */
export enum SmtpErrorType {
  AUTH_FAILED = "authentication_failed",
  CONNECTION_FAILED = "connection_failed",
  TIMEOUT = "connection_timeout",
  INVALID_CREDENTIALS = "invalid_credentials",
  NETWORK_ERROR = "network_error",
  UNKNOWN = "unknown_error",
}
