//types/corn.ts
// Cron job related types

export interface CronJobResult {
  success: boolean;
  jobName: string;
  duration: number;
  details?: any;
  error?: string;
  timestamp: string;
}

export interface CronLog {
  id?: string;
  jobName: string;
  success: boolean;
  duration: number;
  details: any;
  environment: 'development' | 'production';
  timestamp: string;
}

export interface SendEmailsResult {
  sent: number;
  failed: number;
  pending: number;
  campaignsProcessed: number;
}

export interface CheckRepliesResult {
  repliesFound: number;
  recipientsUpdated: number;
  errors: number;
}

export interface UpdateStatsResult {
  campaignsUpdated: number;
  totalRecipients: number;
  errors: number;
}

export interface SendRemindersResult {
  remindersSent: number;
  openedNoReply: number;
  notOpened: number;
  failed: number;
}
