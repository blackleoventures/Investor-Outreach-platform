// Central export file for all types

export * from './campaign';
export * from './tracking';
export * from './recipient';
export * from './reply';
export * from './cron';

// Re-export commonly used types 
export type {
  Campaign,
  CampaignStats,
} from './campaign';

export type {
  CampaignRecipient,
} from './recipient';

export type {
  CampaignReply,
  ReplyFrom,
  ReplyTo,
  EmailReplyDetected,
} from './reply';

export type {
  AggregatedTracking,
  EmailHistoryItem,
  OpenedBy,
  RepliedBy,
  OpenerInfo,
  ReplierInfo,
  EmailTracking,
  FollowUpTracking,
} from './tracking';

export type {
  CronJobResult,
  CronLog,
  SendEmailsResult,
  CheckRepliesResult,
  UpdateStatsResult,
  SendRemindersResult,
} from './cron';
