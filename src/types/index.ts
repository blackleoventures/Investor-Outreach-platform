// Central export file for all types

export * from './campaign';
export * from './tracking';
export * from './recipient';
export * from './reply';
export * from './cron';
export * from './error';        // NEW
export * from './followup';     // NEW
export * from './environment';  // NEW


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

export type {
  ErrorCategory,
  EmailError,
  FailedRecipient,
} from './error';

export type {
  FollowupReason,
  FollowupCandidate,
  FollowupStats,
} from './followup';

export type {
  Environment,
  EnvironmentConfig,
} from './environment';


