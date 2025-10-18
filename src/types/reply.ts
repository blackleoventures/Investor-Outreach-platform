// Reply-related type 

export interface ReplyFrom {
  name: string;
  email: string;
  organization: string;
}

export interface ReplyTo {
  name: string;
  email: string;
}

export interface CampaignReply {
  id?: string;
  campaignId: string;
  recipientId: string;
  emailId: string;
  
  // Reply metadata
  replyFrom: ReplyFrom;
  replyTo: ReplyTo;
  
  replyReceivedAt: string;
  threadPosition: number;    // 1st reply, 2nd reply, etc.
  
  createdAt: string;
}

export interface EmailReplyDetected {
  from: {
    name: string;
    email: string;
  };
  to: string;
  date: Date;
  messageId: string;
  inReplyTo?: string;
}
