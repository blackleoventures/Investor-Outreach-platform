// lib/utils/error-helper.ts

import type { ErrorCategory, EmailError } from '@/types';
import { isDevelopment } from '@/lib/config/environment';

/**
 * Categorize email sending error
 */
export function categorizeEmailError(error: any): ErrorCategory {
  const message = error.message?.toLowerCase() || '';
  const code = error.code?.toLowerCase() || '';

  // Authentication errors
  if (
    message.includes('authentication') ||
    message.includes('auth') ||
    message.includes('login') ||
    message.includes('credentials') ||
    code.includes('auth')
  ) {
    return 'AUTH_FAILED';
  }

  // Invalid email errors
  if (
    message.includes('invalid') ||
    message.includes('mailbox') ||
    message.includes('recipient') ||
    message.includes('address') ||
    message.includes('does not exist') ||
    code.includes('recipient')
  ) {
    return 'INVALID_EMAIL';
  }

  // Connection timeout errors
  if (
    message.includes('timeout') ||
    message.includes('connect') ||
    message.includes('timed out') ||
    message.includes('etimedout') ||
    code.includes('timeout')
  ) {
    return 'CONNECTION_TIMEOUT';
  }

  // Quota exceeded errors
  if (
    message.includes('quota') ||
    message.includes('limit') ||
    message.includes('exceeded') ||
    message.includes('too many') ||
    message.includes('rate limit')
  ) {
    return 'QUOTA_EXCEEDED';
  }

  // Spam/blocked errors
  if (
    message.includes('spam') ||
    message.includes('blocked') ||
    message.includes('blacklist') ||
    message.includes('rejected')
  ) {
    return 'SPAM_BLOCKED';
  }

  // SMTP protocol errors
  if (
    message.includes('smtp') ||
    code.includes('smtp') ||
    message.includes('protocol')
  ) {
    return 'SMTP_ERROR';
  }

  return 'UNKNOWN_ERROR';
}

/**
 * Get user-friendly error message
 */
export function getFriendlyErrorMessage(errorType: ErrorCategory): string {
  const messages: Record<ErrorCategory, string> = {
    AUTH_FAILED: 'Email authentication failed. Please check your email credentials in settings.',
    INVALID_EMAIL: 'The recipient email address is invalid or does not exist.',
    CONNECTION_TIMEOUT: 'Connection to email server timed out. Please try again later.',
    QUOTA_EXCEEDED: 'Daily email sending limit reached. Please try again tomorrow.',
    SPAM_BLOCKED: 'Email was blocked by spam filters. Please review your email content.',
    SMTP_ERROR: 'Email server error occurred. Please contact support if this persists.',
    UNKNOWN_ERROR: 'An unexpected error occurred while sending the email.',
  };

  return messages[errorType];
}

/**
 * Determine if error is retryable
 */
export function canRetryError(errorType: ErrorCategory): boolean {
  const retryableErrors: ErrorCategory[] = [
    'CONNECTION_TIMEOUT',
    'SMTP_ERROR',
    'QUOTA_EXCEEDED', // Can retry after quota resets
  ];

  return retryableErrors.includes(errorType);
}

/**
 * Get detailed technical error message
 */
export function getDetailedErrorMessage(error: any): string {
  if (!error) return 'Unknown error';

  // Build detailed message
  const parts: string[] = [];

  if (error.message) {
    parts.push(`Message: ${error.message}`);
  }

  if (error.code) {
    parts.push(`Code: ${error.code}`);
  }

  if (error.command) {
    parts.push(`Command: ${error.command}`);
  }

  if (error.response) {
    parts.push(`Response: ${error.response}`);
  }

  if (error.responseCode) {
    parts.push(`Response Code: ${error.responseCode}`);
  }

  return parts.join(' | ') || 'No error details available';
}

/**
 * Create EmailError object from exception
 */
export function createEmailError(
  error: any,
  recipientEmail: string,
  campaignId: string,
  retryAttempt: number = 0
): EmailError {
  const errorType = categorizeEmailError(error);

  return {
    timestamp: new Date().toISOString(),
    errorType,
    errorMessage: getDetailedErrorMessage(error),
    friendlyMessage: getFriendlyErrorMessage(errorType),
    retryAttempt,
    canRetry: canRetryError(errorType),
    metadata: {
      smtpCode: error.code || error.responseCode,
      recipientEmail,
      campaignId,
    },
  };
}

/**
 * Log error based on environment
 */
export function logError(
  context: string,
  error: any,
  additionalData?: Record<string, any>
): void {
  const isDev = isDevelopment();

  if (isDev) {
    // Development: Full error with stack trace
    console.error(`[${context}] Error occurred:`, {
      message: error.message,
      code: error.code,
      stack: error.stack,
      ...additionalData,
    });
  } else {
    // Production: Minimal logging
    console.error(`[${context}] Error:`, {
      message: error.message,
      code: error.code,
      timestamp: new Date().toISOString(),
      ...additionalData,
    });
  }
}

/**
 * Format error for API response
 */
export function formatErrorResponse(error: any): {
  error: string;
  details?: string;
  code?: string;
} {
  const isDev = isDevelopment();

  const response: any = {
    error: error.message || 'An error occurred',
  };

  if (isDev) {
    // Show full details in development
    response.details = getDetailedErrorMessage(error);
    response.code = error.code;
    response.stack = error.stack;
  } else {
    // Show minimal info in production
    if (error.code) {
      response.code = error.code;
    }
  }

  return response;
}

/**
 * Extract SMTP error code from error object
 */
export function extractSmtpCode(error: any): string | undefined {
  return error.code || error.responseCode || error.smtpCode;
}

/**
 * Check if error is temporary (should retry)
 */
export function isTemporaryError(error: any): boolean {
  const errorType = categorizeEmailError(error);
  return canRetryError(errorType);
}

/**
 * Check if error is permanent (should not retry)
 */
export function isPermanentError(error: any): boolean {
  return !isTemporaryError(error);
}

/**
 * Get retry delay based on attempt number (exponential backoff)
 */
export function getRetryDelay(attemptNumber: number): number {
  // Exponential backoff: 30min, 1h, 2h
  const baseDelay = 30; // minutes
  const delay = baseDelay * Math.pow(2, attemptNumber - 1);
  return Math.min(delay, 120); // Max 2 hours
}

/**
 * Calculate next retry time
 */
export function calculateNextRetryTime(attemptNumber: number): Date {
  const delayMinutes = getRetryDelay(attemptNumber);
  const nextRetry = new Date();
  nextRetry.setMinutes(nextRetry.getMinutes() + delayMinutes);
  return nextRetry;
}
