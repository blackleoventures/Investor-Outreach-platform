// Import FollowupStats from followup.ts
import { FollowupStats } from './followup';

export interface Campaign {
  id: string;
  campaignName: string;
  clientId: string;
  clientName: string;
  status: "creating" | "active" | "paused" | "completed" | "failed";
  targetType: "investors" | "incubators" | "both";
  totalRecipients: number;

  emailTemplate: {
    originalSubject: string;
    currentSubject: string;
    subjectImproved: boolean;
    originalBody: string;
    currentBody: string;
    bodyImproved: boolean;
  };

  schedule: {
    startDate: string;
    endDate: string;
    duration: number;
    dailyLimit: number;
    sendingWindow: {
      start: string;
      end: string;
      timezone: string;
    };
    pauseOnWeekends: boolean;
  };

  // Main email stats (initial campaign emails only)
  stats: CampaignStats;

  // NEW: Separate follow-up stats (tracked independently)
  followUpStats?: FollowupStats;

  publicToken: string;
  createdBy: string;
  createdAt: string;
  lastUpdated: string;
  lastSentAt?: string;
  completedAt?: string;
}

export interface CampaignStats {
  // ==========================================
  // MAIN EMAIL METRICS (Initial campaign emails only)
  // ==========================================
  
  // Email counts
  totalEmailsSent: number;     // Total initial emails sent
  totalDelivered: number;      // Total initial emails delivered
  totalFailed: number;         // Total initial emails failed
  pending: number;             // Pending initial emails

  // Engagement metrics (for initial emails)
  uniqueOpened: number;        // Unique people who opened initial email
  totalOpens: number;          // Total opens of initial email
  averageOpensPerPerson: number; // totalOpens / uniqueOpened
  openRate: number;            // (uniqueOpened / totalDelivered) × 100

  // Response metrics (for initial emails)
  uniqueResponded: number;     // Unique people who replied to initial email
  totalResponses: number;      // Total replies to initial email
  responseRate: number;        // (uniqueResponded / totalDelivered) × 100
  averageResponseTime?: number; // Hours from send to first reply

  // Engagement states
  openedNotReplied: number;    // Opened initial email but no reply
  deliveredNotOpened: number;  // Delivered initial email but not opened

  // Conversion funnel (for initial emails)
  conversionFunnel: {
    sent: number;
    delivered: number;
    opened: number;
    replied: number;
  };

  // Engagement quality (for initial emails)
  engagementQuality?: {
    openedOnce: number;
    openedMultiple: number;
    openedButNoReply: number;
    deliveredButNoOpen: number;
  };

  // Legacy fields (keep for backward compatibility)
  sent: number;
  delivered: number;
  opened: number;
  replied: number;
  failed: number;
  deliveryRate: number;
  replyRate: number;

  // Follow-up candidates (for UI)
  followupCandidates?: {
    notOpened48h: number;        // Delivered >48h, not opened
    openedNotReplied72h: number; // Opened >72h, not replied
    total: number;
    readyForFollowup: number;    // Exclude already followed up
  };

  // Error tracking (for initial emails)
  errorBreakdown?: {
    AUTH_FAILED: number;
    INVALID_EMAIL: number;
    CONNECTION_TIMEOUT: number;
    QUOTA_EXCEEDED: number;
    SPAM_BLOCKED: number;
    SMTP_ERROR: number;
    UNKNOWN_ERROR: number;
  };
}

