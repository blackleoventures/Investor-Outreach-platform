// lib/imap/config.ts
import { adminDb } from "@/lib/firebase-admin";
import { decryptAES256 } from "@/lib/encryption";

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

export async function getClientImapConfig(clientId: string): Promise<ImapConfig> {
  const clientDoc = await adminDb.collection("clients").doc(clientId).get();
  
  if (!clientDoc.exists) {
    throw new Error(`Client ${clientId} not found`);
  }

  const clientData = clientDoc.data();
  const clientInfo = clientData?.clientInformation;
  const smtpSettings = clientInfo?.emailConfiguration;

  if (!smtpSettings) {
    throw new Error(`Client ${clientId} has no email configuration`);
  }

  if (!smtpSettings.smtpHost || !smtpSettings.smtpHost.trim()) {
    throw new Error(`Client ${clientId} has no SMTP host configured`);
  }

  if (!smtpSettings.smtpUsername || !smtpSettings.smtpUsername.trim()) {
    throw new Error(`Client ${clientId} has no SMTP username configured`);
  }

  if (!smtpSettings.smtpPassword || !smtpSettings.smtpPassword.trim()) {
    throw new Error(`Client ${clientId} has no SMTP password configured`);
  }

  const imapHost = convertSmtpToImapHost(smtpSettings.smtpHost);

  console.log('[IMAP Config] Client:', clientId);
  console.log('[IMAP Config] SMTP Host:', smtpSettings.smtpHost);
  console.log('[IMAP Config] IMAP Host:', imapHost);
  console.log('[IMAP Config] Username:', smtpSettings.smtpUsername);

  let decryptedPassword: string;
  try {
    decryptedPassword = decryptAES256(smtpSettings.smtpPassword);
    console.log('[IMAP Config] Password decrypted successfully for client:', clientId);
  } catch (error: any) {
    console.error('[IMAP Config] Failed to decrypt password for client:', clientId);
    throw new Error(`Failed to decrypt IMAP password for client ${clientId}: ${error.message}`);
  }

  return {
    user: smtpSettings.smtpUsername,
    password: decryptedPassword,
    host: imapHost,
    port: 993,
    tls: true,
    tlsOptions: {
      rejectUnauthorized: false,
    },
  };
}

function convertSmtpToImapHost(smtpHost: string): string {
  let imapHost = smtpHost.trim();

  if (imapHost.includes("smtp")) {
    imapHost = imapHost.replace("smtp-mail", "imap").replace("smtp", "imap");
  }
  else if (imapHost.startsWith("mail.")) {
    imapHost = imapHost.replace("mail.", "imap.");
  }

  return imapHost;
}

export async function getAllActiveClientsImapConfigs(): Promise<Map<string, ImapConfig>> {
  const configs = new Map<string, ImapConfig>();

  try {
    const campaignsSnapshot = await adminDb
      .collection("campaigns")
      .where("status", "in", ["active", "completed", "paused"])
      .get();

    if (campaignsSnapshot.empty) {
      console.log('[IMAP Config] No active campaigns found');
      return configs;
    }

    const clientIds = new Set<string>();
    campaignsSnapshot.forEach((doc) => {
      const clientId = doc.data().clientId;
      if (clientId) clientIds.add(clientId);
    });

    console.log('[IMAP Config] Loading IMAP configs for', clientIds.size, 'clients');

    for (const clientId of clientIds) {
      try {
        const config = await getClientImapConfig(clientId);
        configs.set(clientId, config);
        console.log('[IMAP Config] Loaded config for client:', clientId);
        console.log('[IMAP Config] IMAP Host:', config.host);
      } catch (error: any) {
        console.warn('[IMAP Config] Skipping client:', clientId);
        console.warn('[IMAP Config] Reason:', error.message);
      }
    }

    console.log('[IMAP Config] Successfully loaded', configs.size, 'client configurations');

    return configs;
  } catch (error: any) {
    console.error('[IMAP Config] Error loading client configs:', error.message);
    return configs;
  }
}
