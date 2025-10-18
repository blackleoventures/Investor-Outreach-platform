// Main IMAP reply checker - professional logging

import Imap from "node-imap";
import { simpleParser, ParsedMail } from "mailparser";
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

    console.log(`[IMAP] Client ${clientId}: Connecting to ${config.host}`);

    imap.once("ready", () => {
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

        const searchCriteria = [["SINCE", searchDate], ["UNSEEN"]];

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
              `[IMAP] Client ${clientId}: No new unread emails found`
            );
            imap.end();
            return resolve([]);
          }

          console.log(
            `[IMAP] Client ${clientId}: Found ${results.length} unread emails`
          );

          const fetch = imap.fetch(results, {
            bodies: "",
            markSeen: false,
          });

          let processed = 0;

          fetch.on("message", (msg) => {
            msg.on("body", (stream) => {
              simpleParser(stream, (err, parsed) => {
                if (err) {
                  console.error(
                    `[IMAP] Client ${clientId}: Email parse error -`,
                    err.message
                  );
                  return;
                }

                const reply = parseEmailToReply(parsed);

                if (reply) {
                  replies.push(reply);
                  console.log(
                    `[IMAP] Client ${clientId}: Parsed reply from ${reply.from.email}`
                  );
                }

                processed++;
              });
            });
          });

          fetch.once("error", (err) => {
            console.error(
              `[IMAP] Client ${clientId}: Fetch error -`,
              err.message
            );
            reject(err);
          });

          fetch.once("end", () => {
            console.log(
              `[IMAP] Client ${clientId}: Fetch completed - Processed ${processed} emails, found ${replies.length} replies`
            );

            setTimeout(() => {
              imap.end();
            }, 1000);
          });
        });
      });
    });

    imap.once("error", (err) => {
      console.error(
        `[IMAP] Client ${clientId}: Connection error -`,
        err.message
      );
      reject(err);
    });

    imap.once("end", () => {
      console.log(`[IMAP] Client ${clientId}: Connection closed`);
      resolve(replies);
    });

    try {
      imap.connect();
    } catch (err: any) {
      console.error(
        `[IMAP] Client ${clientId}: Failed to initialize connection -`,
        err.message
      );
      reject(err);
    }
  });
}

function parseEmailToReply(parsed: ParsedMail): EmailReplyDetected | null {
  try {
    const fromAddress = parsed.from?.value[0];

    if (!fromAddress?.address) {
      return null;
    }

    const toAddress = parsed.to?.value[0]?.address;

    if (!toAddress) {
      return null;
    }

    return {
      from: {
        name: fromAddress.name || "",
        email: fromAddress.address,
      },
      to: toAddress,
      date: parsed.date || new Date(),
      messageId: parsed.messageId || "",
      inReplyTo: parsed.inReplyTo || undefined,
    };
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

      imap.once("ready", () => {
        console.log(
          `[IMAP Test] Client ${clientId}: Connection test successful`
        );
        imap.end();
        resolve(true);
      });

      imap.once("error", (err) => {
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
