// IMAP Configuration using CLIENT's credentials from Firestore

import { adminDb } from '@/lib/firebase-admin';

export interface ImapConfig {
  user: string;
  password: string;
  host: string;
  port: number;
  tls: boolean;
  tlsOptions?: {
    rejectUnauthorized: boolean;
  };
}

/**
 * Get IMAP config for a specific client from their SMTP settings
 */
export async function getClientImapConfig(clientId: string): Promise<ImapConfig> {
  const clientDoc = await adminDb.collection('clients').doc(clientId).get();
  
  if (!clientDoc.exists) {
    throw new Error(`Client ${clientId} not found`);
  }

  const clientData = clientDoc.data();
  const smtpSettings = clientData?.smtpSettings;

  if (!smtpSettings || !smtpSettings.smtpUser || !smtpSettings.smtpPassword) {
    throw new Error(`Client ${clientId} has incomplete SMTP settings`);
  }

  // Convert SMTP host to IMAP host automatically
  const imapHost = convertSmtpToImapHost(smtpSettings.smtpHost);

  return {
    user: smtpSettings.smtpUser || smtpSettings.senderEmail,
    password: smtpSettings.smtpPassword,
    host: imapHost,
    port: 993, // Standard IMAP SSL port for all providers
    tls: true,
    tlsOptions: {
      rejectUnauthorized: false
    }
  };
}

/**
 * Convert SMTP host to IMAP host dynamically
 * Works for ANY email provider, not just specific ones
 */
function convertSmtpToImapHost(smtpHost: string): string {
  // Common patterns that work for most providers:
  // smtp.example.com → imap.example.com
  // smtp-mail.example.com → imap.example.com
  // mail.example.com → imap.example.com
  
  let imapHost = smtpHost;
  
  // Replace smtp with imap
  if (imapHost.includes('smtp')) {
    imapHost = imapHost.replace('smtp-mail', 'imap').replace('smtp', 'imap');
  }
  // If host starts with 'mail.', try 'imap.'
  else if (imapHost.startsWith('mail.')) {
    imapHost = imapHost.replace('mail.', 'imap.');
  }
  
  console.log(`[IMAP Config] Converted SMTP host ${smtpHost} to IMAP host ${imapHost}`);
  
  return imapHost;
}

/**
 * Get IMAP configs for ALL active clients
 */
export async function getAllActiveClientsImapConfigs(): Promise<Map<string, ImapConfig>> {
  const configs = new Map<string, ImapConfig>();

  // Get all active campaigns
  const campaignsSnapshot = await adminDb
    .collection('campaigns')
    .where('status', 'in', ['active', 'paused'])
    .get();

  // Get unique client IDs
  const clientIds = new Set<string>();
  campaignsSnapshot.forEach(doc => {
    const clientId = doc.data().clientId;
    if (clientId) clientIds.add(clientId);
  });

  console.log(`[IMAP Config] Loading IMAP configs for ${clientIds.size} clients`);

  // Fetch IMAP config for each client
  for (const clientId of clientIds) {
    try {
      const config = await getClientImapConfig(clientId);
      configs.set(clientId, config);
      console.log(`[IMAP Config] Loaded config for client ${clientId} (${config.host})`);
    } catch (error) {
      console.error(`[IMAP Config] Failed to load config for client ${clientId}:`, error);
    }
  }

  return configs;
}
