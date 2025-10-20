// Recipient-related type definitions
import { EmailError, ErrorCategory } from './error';
import { EmailHistoryItem, AggregatedTracking, FollowUpTracking } from './tracking';

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
  
  emailHistory: EmailHistoryItem[];
  aggregatedTracking: AggregatedTracking;
  
  // followUps: FollowUpTracking; 
  
  followupSent: boolean;             
  followupSentAt?: string;           
  followupCount: number;             
  
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

