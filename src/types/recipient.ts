// types/recipient.ts

import { EmailError, ErrorCategory } from './error';
import { EmailHistoryItem, AggregatedTracking } from './tracking';

export interface RecipientContact {
  name: string;
  email: string;
  organization: string;
  title?: string;
}

export interface CampaignRecipient {
  id?: string;
  campaignId: string;
  
  originalContact: RecipientContact;
  
  recipientType: 'investor' | 'incubator';
  priority: 'high' | 'medium' | 'low';
  matchScore: number;
  matchedCriteria?: string[];
  
  // Main email tracking 
  emailHistory: EmailHistoryItem[];
  aggregatedTracking: AggregatedTracking;
  
  followUps: {
    totalSent: number;           // Total follow-ups sent to this recipient
    pendingCount: number;        // Number of pending follow-ups
    lastFollowUpSent: string | null; // Timestamp of last follow-up
  };
  
  
  status: 'pending' | 'delivered' | 'opened' | 'replied' | 'failed';
  currentStage: 'initial' | 'followup_1' | 'followup_2' | 'responded' | 'closed';
  
  scheduledFor: string;
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  repliedAt?: string;
  
  trackingId: string;

  // Error tracking 
  errorHistory?: EmailError[];
  lastError?: EmailError;
  retryCount: number;
  canRetry: boolean;
  failureReason?: ErrorCategory;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;  
}
