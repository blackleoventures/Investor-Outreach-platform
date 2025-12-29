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

export async function getClientImapConfig(
  clientId: string
): Promise<ImapConfig> {
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

  console.log("[IMAP Config] Client:", clientId);
  console.log("[IMAP Config] SMTP Host:", smtpSettings.smtpHost);
  console.log("[IMAP Config] IMAP Host:", imapHost);
  console.log("[IMAP Config] Username:", smtpSettings.smtpUsername);

  let decryptedPassword: string;
  try {
    decryptedPassword = decryptAES256(smtpSettings.smtpPassword);
    console.log(
      "[IMAP Config] Password decrypted successfully for client:",
      clientId
    );
  } catch (error: any) {
    console.error(
      "[IMAP Config] Failed to decrypt password for client:",
      clientId
    );
    throw new Error(
      `Failed to decrypt IMAP password for client ${clientId}: ${error.message}`
    );
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
  } else if (imapHost.startsWith("mail.")) {
    imapHost = imapHost.replace("mail.", "imap.");
  }

  return imapHost;
}

export async function getAllActiveClientsImapConfigs(): Promise<
  Map<string, ImapConfig>
> {
  const configs = new Map<string, ImapConfig>();

  try {
    const campaignsSnapshot = await adminDb
      .collection("campaigns")
      .where("status", "in", ["active", "completed", "paused"])
      .get();

    if (campaignsSnapshot.empty) {
      console.log("[IMAP Config] No active campaigns found");
      return configs;
    }

    // Collect unique client IDs
    const clientIds = new Set<string>();
    campaignsSnapshot.forEach((doc) => {
      const clientId = doc.data().clientId;
      if (clientId) clientIds.add(clientId);
    });

    console.log(
      "[IMAP Config] Loading IMAP configs for",
      clientIds.size,
      "clients"
    );

    // OPTIMIZATION: Batch fetch all clients instead of N+1 queries
    // Firestore 'in' query supports up to 30 items, so we batch if needed
    const clientIdsArray = [...clientIds];
    const clientDataMap = new Map<string, any>();

    // Batch fetch clients in chunks of 30 (Firestore limit for 'in' queries)
    for (let i = 0; i < clientIdsArray.length; i += 30) {
      const batch = clientIdsArray.slice(i, i + 30);

      // Use getAll for efficient batch fetching
      const clientRefs = batch.map((id) =>
        adminDb.collection("clients").doc(id)
      );
      const clientDocs = await adminDb.getAll(...clientRefs);

      clientDocs.forEach((doc) => {
        if (doc.exists) {
          clientDataMap.set(doc.id, doc.data());
        }
      });
    }

    console.log("[IMAP Config] Batch fetched", clientDataMap.size, "clients");

    // Now process each client using the cached data
    for (const clientId of clientIds) {
      try {
        const clientData = clientDataMap.get(clientId);

        if (!clientData) {
          console.warn("[IMAP Config] Skipping client (not found):", clientId);
          continue;
        }

        const clientInfo = clientData.clientInformation;
        const smtpSettings = clientInfo?.emailConfiguration;

        if (!smtpSettings) {
          console.warn(
            "[IMAP Config] Skipping client (no email config):",
            clientId
          );
          continue;
        }

        if (!smtpSettings.smtpHost || !smtpSettings.smtpHost.trim()) {
          console.warn(
            "[IMAP Config] Skipping client (no SMTP host):",
            clientId
          );
          continue;
        }

        if (!smtpSettings.smtpUsername || !smtpSettings.smtpUsername.trim()) {
          console.warn(
            "[IMAP Config] Skipping client (no SMTP username):",
            clientId
          );
          continue;
        }

        if (!smtpSettings.smtpPassword || !smtpSettings.smtpPassword.trim()) {
          console.warn(
            "[IMAP Config] Skipping client (no SMTP password):",
            clientId
          );
          continue;
        }

        const imapHost = convertSmtpToImapHost(smtpSettings.smtpHost);

        let decryptedPassword: string;
        try {
          decryptedPassword = decryptAES256(smtpSettings.smtpPassword);
        } catch (error: any) {
          console.warn(
            "[IMAP Config] Skipping client (password decrypt failed):",
            clientId
          );
          continue;
        }

        const config: ImapConfig = {
          user: smtpSettings.smtpUsername,
          password: decryptedPassword,
          host: imapHost,
          port: 993,
          tls: true,
          tlsOptions: {
            rejectUnauthorized: false,
          },
        };

        configs.set(clientId, config);
        console.log(
          "[IMAP Config] Loaded config for client:",
          clientId,
          "Host:",
          imapHost
        );
      } catch (error: any) {
        console.warn(
          "[IMAP Config] Skipping client:",
          clientId,
          "Reason:",
          error.message
        );
      }
    }

    console.log(
      "[IMAP Config] Successfully loaded",
      configs.size,
      "client configurations"
    );

    return configs;
  } catch (error: any) {
    console.error("[IMAP Config] Error loading client configs:", error.message);
    return configs;
  }
}
