// Tracking-related type definitions

export interface OpenedBy {
  name: string;
  email: string;
  organization: string;
  openedAt: string;
}

export interface RepliedBy {
  name: string;
  email: string;
  organization: string;
  repliedAt: string;
}

export interface EmailTracking {
  totalOpens: number;
  uniqueOpenersCount: number;
  firstOpenAt: string | null;
  lastOpenAt: string | null;
  totalReplies: number;
  firstReplyAt: string | null;
  lastReplyAt: string | null;
}

export interface EmailHistoryItem {
  emailId: string;
  type: 'initial' | 'followup_opened_no_reply' | 'followup_not_opened';
  subject: string;
  sentAt: string;
  deliveredAt: string | null;
  status: 'delivered' | 'failed';
  failureReason?: string;
  
  // WHO opened this email
  openedBy: OpenedBy[];
  
  // WHO replied to this email
  repliedBy: RepliedBy[];
  
  // Tracking summary
  tracking: EmailTracking;
}

export interface OpenerInfo {
  name: string;
  email: string;
  organization: string;
  firstOpenedAt: string;
  lastOpenedAt: string;
  totalOpens: number;
  opensHistory: {
    emailId: string;
    emailType: 'initial' | 'followup';
    openedAt: string;
  }[];
}

export interface ReplierInfo {
  name: string;
  email: string;
  organization: string;
  firstRepliedAt: string;
  lastRepliedAt: string;
  totalReplies: number;
  repliesHistory: {
    emailId: string;
    repliedAt: string;
  }[];
}

export interface AggregatedTracking {
  // Open metrics
  everOpened: boolean;
  totalOpensAcrossAllEmails: number;
  uniqueOpeners: OpenerInfo[];
  
  // Reply metrics
  everReplied: boolean;
  uniqueRepliers: ReplierInfo[];
  
  // Engagement level
  engagementLevel: 'high' | 'medium' | 'low' | 'none';
}

export interface FollowUpTracking {
  totalSent: number;
  lastFollowUpSent: string | null;
}
