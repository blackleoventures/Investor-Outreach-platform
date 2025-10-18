// Campaign-related type definitions

export interface Campaign {
  id: string;
  campaignName: string;
  clientId: string;
  clientName: string;
  status: 'active' | 'paused' | 'completed' | 'failed';
  targetType: 'investors' | 'incubators' | 'both';
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
  
  stats: CampaignStats;
  
  // Follow-up tracking
  followUps?: {
    totalSent: number;
    openedNoReplyCandidates: number;
    deliveredNotOpenedCandidates: number;
  };
  
  publicToken: string;
  createdBy: string;
  createdAt: string;
  lastUpdated: string;
  lastSentAt?: string;
  completedAt?: string;
}

export interface CampaignStats {
  // Email counts
  totalEmailsSent: number;
  totalDelivered: number;
  totalFailed: number;
  pending: number;
  
  // Engagement metrics
  uniqueOpened: number;              // Unique people who opened
  totalOpens: number;                // Total open count
  averageOpensPerPerson: number;     // totalOpens / uniqueOpened
  openRate: number;                  // (uniqueOpened / totalDelivered) × 100
  
  // Follow-up metrics
  totalFollowUpsSent: number;
  followUpsByType?: {
    openedNoReply: number;
    notOpened: number;
  };
  
  // Response metrics
  uniqueResponded: number;           // Unique people who replied
  totalResponses: number;            // Total replies received
  responseRate: number;              // (uniqueResponded / totalDelivered) × 100
  averageResponseTime?: number;      // Hours from send to first reply
  
  // Conversion funnel
  conversionFunnel: {
    sent: number;
    delivered: number;
    opened: number;
    replied: number;
  };
  
  // Engagement quality
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
}
