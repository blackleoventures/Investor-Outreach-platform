// Error categories
export type ErrorCategory = 
  | 'AUTH_FAILED'
  | 'INVALID_EMAIL'
  | 'CONNECTION_TIMEOUT'
  | 'QUOTA_EXCEEDED'
  | 'SPAM_BLOCKED'
  | 'SMTP_ERROR'
  | 'UNKNOWN_ERROR';

// Single error record
export interface EmailError {
  timestamp: string;
  errorType: ErrorCategory;
  errorMessage: string;              // Technical message
  friendlyMessage: string;           // User-friendly message
  retryAttempt: number;
  canRetry: boolean;
  metadata?: {
    smtpCode?: string;
    recipientEmail: string;
    campaignId: string;
  };
}

// Failed recipient with full context
export interface FailedRecipient {
  id: string;
  campaignId: string;
  recipientEmail: string;
  recipientName: string;
  organization?: string;
  
  lastError: EmailError;
  errorHistory: EmailError[];
  totalRetries: number;
  canRetry: boolean;
  
  scheduledFor: string;
  firstAttemptAt: string;
  lastAttemptAt: string;
  
  status: 'failed';
  failureReason: ErrorCategory;
}
