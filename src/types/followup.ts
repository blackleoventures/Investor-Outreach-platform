import { OpenerInfo, ReplierInfo } from './tracking';

// Follow-up Email (NEW - separate collection)
export interface FollowupEmail {
  followupId: string;
  campaignId: string;
  recipientId: string;

  // Quick recipient access
  recipientName: string;
  recipientEmail: string;
  recipientOrganization: string;

  // Email content
  subject: string;
  body: string;

  // Scheduling
  scheduledFor: string;
  status: 'queued' | 'scheduled' | 'sent' | 'delivered' | 'opened' | 'replied' | 'failed';

  // Tracking
  sentAt: string | null;
  deliveredAt: string | null;
  openedAt: string | null;
  repliedAt: string | null;

  tracking: {
    totalOpens: number;
    totalReplies: number;
    opened: boolean;
    replied: boolean;
    uniqueOpeners: OpenerInfo[];
    uniqueRepliers: ReplierInfo[];
  };

  // Error tracking
  errorMessage?: string;
  retryCount: number;
  lastError?: string;

  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Follow-up reason types
export type FollowupReason = 
  | 'not_opened'              // Delivered >48h, not opened
  | 'opened_not_replied';     // Opened >72h, not replied

// Follow-up candidate (for UI display)
export interface FollowupCandidate {
  id: string;
  campaignId: string;
  
  recipientEmail: string;
  recipientName: string;
  organization?: string;
  
  followupReason: FollowupReason;
  
  emailSentAt: string;
  lastOpenedAt?: string;
  daysSinceDelivery: number;
  minutesSinceDelivery: number; // Added for development mode
  
  openCount: number;
  hasReplied: boolean;
  
  followupCount: number; // How many follow-ups already sent
}

// Follow-up stats (separate from main campaign stats)
export interface FollowupStats {
  totalFollowUpsSent: number;  // Total follow-ups sent
  pending: number;             // Queued to send immediately
  scheduled: number;           // Scheduled for future
  sent: number;                // Successfully sent
  delivered: number;           // Successfully delivered
  opened: number;              // Opened
  replied: number;             // Replied
  failed: number;              // Failed to send
}
