// lib/imap/reply-checker.ts
import Imap from "node-imap";
import { simpleParser, ParsedMail, AddressObject } from "mailparser";
import { Readable } from "stream";
import {
  getClientImapConfig,
  getAllActiveClientsImapConfigs,
  type ImapConfig,
} from "./config";
import type { EmailReplyDetected } from "@/types";

export async function checkClientReplies(
  clientId: string,
  searchDays: number = 7
): Promise<EmailReplyDetected[]> {
  const config = await getClientImapConfig(clientId);
  return checkRepliesWithConfig(config, searchDays, clientId);
}

export async function checkAllClientsReplies(
  searchDays: number = 7
): Promise<Map<string, EmailReplyDetected[]>> {
  const results = new Map<string, EmailReplyDetected[]>();
  const clientConfigs = await getAllActiveClientsImapConfigs();

  console.log(
    `[IMAP] Checking replies for ${clientConfigs.size} active clients`
  );

  for (const [clientId, config] of clientConfigs) {
    try {
      const replies = await checkRepliesWithConfig(
        config,
        searchDays,
        clientId
      );
      results.set(clientId, replies);

      if (replies.length > 0) {
        console.log(
          `[IMAP] Client ${clientId}: Found ${replies.length} new replies`
        );
      }
    } catch (error) {
      console.error(
        `[IMAP] Client ${clientId}: Error checking replies -`,
        error
      );
      results.set(clientId, []);
    }
  }

  return results;
}

function checkRepliesWithConfig(
  config: ImapConfig,
  searchDays: number,
  clientId: string
): Promise<EmailReplyDetected[]> {
  return new Promise((resolve, reject) => {
    const imap = new Imap(config);
    const replies: EmailReplyDetected[] = [];
    let isConnectionClosed = false;

    console.log(`[IMAP] Client ${clientId}: Connecting to ${config.host}`);

    // Add connection timeout
    const connectionTimeout = setTimeout(() => {
      if (!isConnectionClosed) {
        console.error(`[IMAP] Client ${clientId}: Connection timeout after 30s`);
        try {
          imap.end();
        } catch (e) {
          // Ignore
        }
        isConnectionClosed = true;
        reject(new Error('IMAP connection timeout'));
      }
    }, 30000);

    imap.once("ready", () => {
      clearTimeout(connectionTimeout);
      console.log(`[IMAP] Client ${clientId}: Connection established`);

      imap.openBox("INBOX", true, (err, box) => {
        if (err) {
          console.error(
            `[IMAP] Client ${clientId}: Failed to open inbox -`,
            err.message
          );
          imap.end();
          return reject(err);
        }

        console.log(
          `[IMAP] Client ${clientId}: Inbox opened - Total messages: ${box.messages.total}`
        );

        const searchDate = new Date();
        searchDate.setDate(searchDate.getDate() - searchDays);

        // FIXED: Search for ALL emails (not just UNSEEN) since last 7 days
        // We'll track which ones we've processed in the database
        const searchCriteria = [["SINCE", searchDate]];

        console.log(
          `[IMAP] Client ${clientId}: Searching emails since ${searchDate.toISOString()}`
        );

        imap.search(searchCriteria, (err, results) => {
          if (err) {
            console.error(
              `[IMAP] Client ${clientId}: Search failed -`,
              err.message
            );
            imap.end();
            return reject(err);
          }

          if (!results || results.length === 0) {
            console.log(
              `[IMAP] Client ${clientId}: No emails found in the last ${searchDays} days`
            );
            imap.end();
            return resolve([]);
          }

          console.log(
            `[IMAP] Client ${clientId}: Found ${results.length} emails to check`
          );

          const fetch = imap.fetch(results, {
            bodies: "",
            markSeen: false, // Don't mark as seen
          });

          let parseCompleted = 0;
          const totalEmails = results.length;

          fetch.on("message", (msg, seqno) => {
            msg.on("body", (stream, info) => {
              const chunks: Buffer[] = [];

              stream.on("data", (chunk: Buffer) => {
                chunks.push(chunk);
              });

              stream.once("end", () => {
                const buffer = Buffer.concat(chunks);
                const readableStream = Readable.from(buffer);

                simpleParser(readableStream)
                  .then((parsed: ParsedMail) => {
                    const reply = parseEmailToReply(parsed);

                    if (reply) {
                      replies.push(reply);
                      console.log(
                        `[IMAP] Client ${clientId}: Parsed reply from ${reply.from.email}`
                      );
                    }

                    parseCompleted++;

                    if (parseCompleted === totalEmails) {
                      console.log(
                        `[IMAP] Client ${clientId}: All emails parsed - Found ${replies.length} replies`
                      );
                      setTimeout(() => {
                        if (!isConnectionClosed) {
                          imap.end();
                        }
                      }, 500);
                    }
                  })
                  .catch((err) => {
                    console.error(
                      `[IMAP] Client ${clientId}: Email parse error -`,
                      err.message
                    );
                    parseCompleted++;

                    if (parseCompleted === totalEmails) {
                      setTimeout(() => {
                        if (!isConnectionClosed) {
                          imap.end();
                        }
                      }, 500);
                    }
                  });
              });
            });
          });

          fetch.once("error", (err) => {
            console.error(
              `[IMAP] Client ${clientId}: Fetch error -`,
              err.message
            );
            if (!isConnectionClosed) {
              imap.end();
            }
            reject(err);
          });

          fetch.once("end", () => {
            console.log(
              `[IMAP] Client ${clientId}: Fetch completed - Processed ${parseCompleted} messages`
            );
          });
        });
      });
    });

    imap.once("error", (err) => {
      clearTimeout(connectionTimeout);
      console.error(
        `[IMAP] Client ${clientId}: Connection error -`,
        err.message
      );
      isConnectionClosed = true;
      reject(err);
    });

    imap.once("end", () => {
      clearTimeout(connectionTimeout);
      console.log(`[IMAP] Client ${clientId}: Connection closed`);
      isConnectionClosed = true;
      resolve(replies);
    });

    try {
      imap.connect();
    } catch (err: any) {
      clearTimeout(connectionTimeout);
      console.error(
        `[IMAP] Client ${clientId}: Failed to initialize connection -`,
        err.message
      );
      reject(err);
    }
  });
}

function extractEmailAddress(
  addressObj: AddressObject | AddressObject[] | undefined
): string | null {
  if (!addressObj) return null;

  if (Array.isArray(addressObj)) {
    if (addressObj.length === 0) return null;
    const firstAddress = addressObj[0];
    return firstAddress.value?.[0]?.address || null;
  }

  return addressObj.value?.[0]?.address || null;
}

function extractEmailInfo(
  addressObj: AddressObject | AddressObject[] | undefined
): { name: string; email: string } | null {
  if (!addressObj) return null;

  if (Array.isArray(addressObj)) {
    if (addressObj.length === 0) return null;
    const firstAddress = addressObj[0];
    const addressValue = firstAddress.value?.[0];
    if (!addressValue?.address) return null;

    return {
      name: addressValue.name || "",
      email: addressValue.address,
    };
  }

  const addressValue = addressObj.value?.[0];
  if (!addressValue?.address) return null;

  return {
    name: addressValue.name || "",
    email: addressValue.address,
  };
}

function parseEmailToReply(parsed: ParsedMail): EmailReplyDetected | null {
  try {
    const fromInfo = extractEmailInfo(parsed.from);
    if (!fromInfo) {
      console.warn("[IMAP] Email missing 'from' address, skipping");
      return null;
    }

    const toAddress = extractEmailAddress(parsed.to);
    if (!toAddress) {
      console.warn("[IMAP] Email missing 'to' address, skipping");
      return null;
    }

    const reply: EmailReplyDetected = {
      from: {
        name: fromInfo.name,
        email: fromInfo.email,
      },
      to: toAddress,
      date: parsed.date || new Date(),
      messageId: parsed.messageId || "",
      inReplyTo: parsed.inReplyTo || undefined,
    };

    return reply;
  } catch (error: any) {
    console.error("[IMAP] Error parsing email to reply format:", error.message);
    return null;
  }
}

export async function testClientImapConnection(
  clientId: string
): Promise<boolean> {
  try {
    const config = await getClientImapConfig(clientId);

    return new Promise((resolve) => {
      const imap = new Imap(config);

      const timeout = setTimeout(() => {
        console.error(
          `[IMAP Test] Client ${clientId}: Connection timeout after 10s`
        );
        try {
          imap.end();
        } catch (e) {
          // Ignore
        }
        resolve(false);
      }, 10000);

      imap.once("ready", () => {
        clearTimeout(timeout);
        console.log(
          `[IMAP Test] Client ${clientId}: Connection test successful`
        );
        imap.end();
        resolve(true);
      });

      imap.once("error", (err) => {
        clearTimeout(timeout);
        console.error(
          `[IMAP Test] Client ${clientId}: Connection test failed -`,
          err.message
        );
        resolve(false);
      });

      imap.connect();
    });
  } catch (error: any) {
    console.error(
      `[IMAP Test] Client ${clientId}: Configuration error -`,
      error.message
    );
    return false;
  }
}