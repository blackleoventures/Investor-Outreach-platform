// src/types/smtp.ts

export type SmtpSecurityType = "TLS" | "SSL" | "None";
export type SmtpTestStatus = "pending" | "passed" | "failed";

export interface SmtpConfiguration {
  platformName: string;
  senderEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecurity: SmtpSecurityType;
  smtpUsername: string;
  smtpPassword: string;
}

export interface SmtpTestConfig extends SmtpConfiguration {
  testRecipientEmail: string;
}

export interface SmtpTestRequest {
  smtpConfig: SmtpConfiguration;
  testRecipientEmail: string;
}

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


export interface SmtpConfigurationWithStatus {
  platformName: string;
  senderEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecurity: SmtpSecurityType;
  smtpUsername: string;
  smtpPassword: string;

  dailyEmailLimit: number; 

  testStatus: SmtpTestStatus;
  testDate: string | null; 
  testRecipient: string | null;
  testError?: string | null;

  sendingHours?: {
    start: string;
    end: string;
    timezone: string;
  };
}

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

export enum SmtpErrorType {
  AUTH_FAILED = "authentication_failed",
  CONNECTION_FAILED = "connection_failed",
  TIMEOUT = "connection_timeout",
  INVALID_CREDENTIALS = "invalid_credentials",
  NETWORK_ERROR = "network_error",
  UNKNOWN = "unknown_error",
}
