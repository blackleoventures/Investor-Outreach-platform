// Recipient-related type definitions
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
  
  // Original contact (who we sent TO)
  originalContact: RecipientContact;
  
  recipientType: 'investor' | 'incubator';
  priority: 'high' | 'medium' | 'low';
  matchScore: number;
  matchedCriteria?: string[];
  
  // Email sending history
  emailHistory: EmailHistoryItem[];
  
  // AGGREGATED tracking across ALL emails
  aggregatedTracking: AggregatedTracking;
  
  // Follow-up tracking
  followUps: FollowUpTracking;
  
  // Current status
  status: 'pending' | 'delivered' | 'opened' | 'replied' | 'failed';
  currentStage: 'initial' | 'followup_1' | 'followup_2' | 'responded' | 'closed';
  
  // Scheduling
  scheduledFor: string;
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  repliedAt?: string;
  
  // Tracking ID for pixel
  trackingId: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
}
