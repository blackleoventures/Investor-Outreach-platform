// Parse email replies and extract identity information

import { extractDomain, normalizeEmail } from '@/lib/utils/email-helper';
import type { EmailReplyDetected } from '@/types';

export interface ParsedReply {
  from: {
    name: string;
    email: string;
    organization: string;
  };
  to: string;
  receivedAt: string;
  messageId: string;
  inReplyTo: string | null;
}

export function parseReplyIdentity(reply: EmailReplyDetected): ParsedReply {
  const fromEmail = normalizeEmail(reply.from.email);
  const fromName = extractNameFromReply(reply.from.name, fromEmail);
  const organization = extractOrganizationFromEmail(fromEmail);

  return {
    from: {
      name: fromName,
      email: fromEmail,
      organization
    },
    to: normalizeEmail(reply.to),
    receivedAt: reply.date.toISOString(),
    messageId: reply.messageId,
    inReplyTo: reply.inReplyTo || null
  };
}

function extractNameFromReply(name: string | undefined, email: string): string {
  if (name && name.trim()) {
    return cleanName(name);
  }
  
  // Fallback: extract from email
  const localPart = email.split('@')[0];
  return localPart
    .split('.')
    .map(word => capitalizeFirst(word))
    .join(' ');
}

function cleanName(name: string): string {
  // Remove quotes and extra spaces
  return name
    .replace(/["']/g, '')
    .trim()
    .split(/\s+/)
    .map(word => capitalizeFirst(word))
    .join(' ');
}

function capitalizeFirst(word: string): string {
  if (!word) return '';
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function extractOrganizationFromEmail(email: string): string {
  const domain = extractDomain(email);
  
  // Remove common TLDs and get company name
  const orgName = domain
    .replace(/\.(com|org|net|io|co|ai|tech)$/i, '')
    .split('.')
    .map(part => capitalizeFirst(part))
    .join(' ');
  
  return orgName || 'Unknown Organization';
}

export function isAutoReply(reply: EmailReplyDetected): boolean {
  const subject = reply.messageId.toLowerCase();
  
  // Check for auto-reply patterns
  const autoReplyPatterns = [
    'auto-reply',
    'automatic reply',
    'out of office',
    'ooo',
    'vacation',
    'away',
    'autoreply'
  ];
  
  return autoReplyPatterns.some(pattern => subject.includes(pattern));
}

export function extractReplyMetadata(reply: EmailReplyDetected) {
  return {
    hasInReplyTo: !!reply.inReplyTo,
    messageId: reply.messageId,
    timestamp: reply.date,
    isLikelyAutoReply: isAutoReply(reply)
  };
}
