// Follow-up reason
export type FollowupReason = 
  | 'not_opened'              // Delivered >48h, not opened
  | 'opened_not_replied';     // Opened >72h, not replied

// Follow-up candidate
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
  hoursSinceDelivery: number;
  
  openCount: number;
  hasReplied: boolean;
  
  followupSent: boolean;
  followupSentAt?: string;
  followupCount: number;
}

// Follow-up stats
export interface FollowupStats {
  deliveredNotOpened: number;
  openedNotReplied: number;
  total: number;
  
  followupsSent: number;
  followupsReplied: number;
  
  oldestCandidateDays: number;
  averageWaitTime: number;
}
