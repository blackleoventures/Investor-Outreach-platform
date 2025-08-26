const {
  SendRawEmailCommand,
} = require("@aws-sdk/client-ses");
const { simpleParser } = require("mailparser");
const { ConfirmSubscriptionCommand } = require("@aws-sdk/client-sns");
const { snsClient } = require("../config/aws.config");
const { sesClient } = require("../config/aws.config");
const { v4: uuidv4 } = require("uuid");
const EmailCampaign = require("../models/emailStatus.model");
const Campaign = require("../models/campaign.model");
const EmailReply = require("../models/emailReply.model");

// Send Emails
exports.sendEmail = async (req, res) => {
  const { campaignId, content, recipients, sender, subject, type } = req.body;

  if (!campaignId || !content || !recipients || !subject) {
    return res.status(400).json({
      error:
        "Missing required fields: campaignId, content, recipients, sender, subject",
    });
  }

  try {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign)
      return res.status(404).json({ message: "Campaign not found" });

    const baseUrl = process.env.BASE_URL;
    const throttleLimit = 10;
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const results = [];
    const recipientsData = recipients.map((email) => ({
      email,
      messageId: uuidv4(),
      status: "pending",
      delivered: false,
      opened: false,
    }));

    const emailCampaign = await EmailCampaign.create({
      campaignRef: campaignId,
      subject,
      sender,
      contentHtml: content,
      sentAt: new Date(),
      sentCount: 0,
      recipientEmails: recipientsData,
      type: type || "regular",
    });

    const sendEmailToRecipient = async ({ email, messageId }) => {
      try {
        const trackingPixel = `<img src="${baseUrl}/email/track?messageId=${messageId}&email=${encodeURIComponent(
          email
        )}" width="1" height="1" style="display:none;" />`;
        const htmlBody = `${content}${trackingPixel}`;

        const boundary = `----=_Part_${Date.now()}`;

        const rawMessage = [
          `From: ${sender}`,
          `To: ${email}`,
          `Subject: ${subject}`,
          `MIME-Version: 1.0`,
          `Content-Type: multipart/alternative; boundary="${boundary}"`,
          `Reply-To: replies@blackleoventure.com`,
          `In-Reply-To: <campaign-${messageId}@yourdomain.com>`,
          `References: <campaign-${messageId}@yourdomain.com>`,
          `Message-ID: <${messageId}@yourdomain.com>`,
          `X-Campaign-Message-ID: ${messageId}`,
          ``,
          `--${boundary}`,
          `Content-Type: text/plain; charset="UTF-8"`,
          `Content-Transfer-Encoding: 7bit`,
          ``,
          `This is a fallback plain-text version of the email.`,
          ``,
          `--${boundary}`,
          `Content-Type: text/html; charset="UTF-8"`,
          `Content-Transfer-Encoding: 7bit`,
          ``,
          `${htmlBody}`,
          ``,
          `--${boundary}--`,
        ].join("\r\n");

        const command = new SendRawEmailCommand({
          RawMessage: {
            Data: Buffer.from(rawMessage),
          },
          ConfigurationSetName: "MyCampaignConfigSet",
        });

        await sesClient.send(command);

        results.push({ recipient: email, status: "sent", messageId });
      } catch (error) {
        console.error(`❌ Failed to send to ${email}:`, error.message);
        results.push({
          recipient: email,
          status: "failed",
          error: error.message,
        });
      }
    };

    for (let i = 0; i < recipientsData.length; i += throttleLimit) {
      const batch = recipientsData.slice(i, i + throttleLimit);
      await Promise.all(batch.map(sendEmailToRecipient));
      await delay(1000);
    }

    res.status(200).json({
      message: "Emails processed. Some may have failed.",
      campaignId,
      totalRecipients: recipients.length,
      successCount: results.filter((r) => r.status === "sent").length,
      failureCount: results.filter((r) => r.status === "failed").length,
      results,
    });
  } catch (error) {
    console.error("Fatal error during sendEmail:", error.message);
    res.status(500).json({
      message: "Internal error",
      error: error.message || "Unexpected failure",
    });
  }
};

// Track Email Open
exports.trackOpen = async (req, res) => {
  try {
    const { messageId, email } = req.query;
    if (!messageId || !email) {
      return res.status(400).json({ message: "Missing messageId or email" });
    }

    // Find the email campaign and check if already opened
    const campaign = await EmailCampaign.findOne({
      "recipientEmails.messageId": messageId,
    });

    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    const recipient = campaign.recipientEmails.find(
      (r) => r.messageId === messageId
    );

    // If already opened, skip increment
    if (recipient?.opened) {
      const transparent1x1PNG = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=",
        "base64"
      );
      res.setHeader("Content-Type", "image/png");
      return res.send(transparent1x1PNG);
    }

    // Update the recipient opened status and campaign stats
    await EmailCampaign.updateOne(
      { "recipientEmails.messageId": messageId },
      {
        $set: {
          "recipientEmails.$.opened": true,
          "recipientEmails.$.openedAt": new Date(),
        },
        $inc: { openedCount: 1 },
      }
    );

    await Campaign.findByIdAndUpdate(campaign.campaignRef, {
      $inc: { totalEmailsOpened: 1 },
    });

    const transparent1x1PNG = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=",
      "base64"
    );
    res.setHeader("Content-Type", "image/png");
    res.send(transparent1x1PNG);
  } catch (err) {
    console.error("Error tracking open:", err);
    res.status(500).end();
  }
};

// Update Delivery/Bounce/Complaint Status
exports.updateDeliveryStatus = async (req, res) => {
  try {
    if (
      !req.body ||
      (Buffer.isBuffer(req.body) && req.body.length === 0) ||
      (typeof req.body === "string" && req.body.trim() === "") ||
      (typeof req.body === "object" && Object.keys(req.body).length === 0)
    ) {
      return res.status(400).json({ error: "Empty or invalid body" });
    }
    let body;
    try {
      if (Buffer.isBuffer(req.body)) {
        body = JSON.parse(req.body.toString());
      } else if (typeof req.body === "string") {
        body = JSON.parse(req.body);
      } else {
        body = req.body;
      }
    } catch (err) {
      return res.status(400).json({ error: "Invalid JSON in body" });
    }

    // 1. Handle SNS SubscriptionConfirmation
    if (
      body.Type === "SubscriptionConfirmation" &&
      body.Token &&
      body.TopicArn
    ) {
      try {
        const command = new ConfirmSubscriptionCommand({
          TopicArn: body.TopicArn,
          Token: body.Token,
        });
        await snsClient.send(command);
        return res.status(200).send("SNS subscription confirmed successfully");
      } catch (error) {
        return res.status(500).send("Failed to confirm SNS subscription");
      }
    }

    // 2. Parse SNS Message
    let message;
    try {
      message = JSON.parse(body.Message || "{}");
    } catch (error) {
      return res.status(400).json({ error: "Failed to parse SNS message" });
    }

    const eventType = message.eventType || req.body.status;
    const headers = message.mail?.headers || [];
    const messageId = headers.find(
      (h) => h.name.toLowerCase() === "x-campaign-message-id"
    )?.value;

    const fieldMap = {
      Send: "sentCount",
      Bounce: "bouncedCount",
      Complaint: "complainedCount",
      Delivery: "deliveredCount",
    };

    const statField = fieldMap[eventType];

    // Step 3: Validate presence of messageId and supported eventType
    if (!eventType || !messageId) {
      console.warn("⚠️ Missing messageId or eventType:", {
        messageId,
        eventType,
      });
      return res.status(400).json({ message: "Missing or unsupported status" });
    }

    if (!statField) {
      console.warn("⚠️ Ignored unsupported eventType:", eventType);
      return res.sendStatus(200);
    }

    // Step 4: Locate the EmailCampaign document
    const campaignDoc = await EmailCampaign.findOne({
      "recipientEmails.messageId": messageId,
    });

    if (!campaignDoc) {
      console.warn("⚠️ Campaign not found for messageId:", messageId);
      return res.status(404).json({ message: "Email campaign not found" });
    }

    // Step 5: Find the specific recipient index
    const index = campaignDoc.recipientEmails.findIndex(
      (r) => r.messageId === messageId
    );

    if (index === -1) {
      console.warn(
        "⚠️ Recipient not found in campaign for messageId:",
        messageId
      );
      return res.status(404).json({ message: "Recipient not found" });
    }

    // Step 6: Construct update object
    const update = {
      $inc: { [statField]: 1 },
      $set: {},
    };

    const statusPath = `recipientEmails.${index}.status`;
    const deliveredPath = `recipientEmails.${index}.delivered`;

    if (eventType === "Send") {
      update.$set[statusPath] = "sent";
    } else if (eventType === "Delivery") {
      update.$set[deliveredPath] = true;
      update.$set[statusPath] = "delivered";
    } else if (eventType === "Bounce") {
      update.$set[statusPath] = "bounced";
    } else if (eventType === "Complaint") {
      update.$set[statusPath] = "complained";
    }

    // Step 7: Update EmailCampaign
    await EmailCampaign.findByIdAndUpdate(campaignDoc._id, update);

    // Step 8: Update parent Campaign stats
    await Campaign.findByIdAndUpdate(campaignDoc.campaignRef, {
      $inc: {
        [`total${statField.charAt(0).toUpperCase() + statField.slice(1)}`]: 1,
      },
    });

    res.status(200).json({ message: `${eventType} status updated` });
  } catch (err) {
    console.error("Error in updateDeliveryStatus:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Store Email Reply
exports.storeReply = async (req, res) => {
  try {
    if (
      !req.body ||
      (Buffer.isBuffer(req.body) && req.body.length === 0) ||
      (typeof req.body === "string" && req.body.trim() === "") ||
      (typeof req.body === "object" && Object.keys(req.body).length === 0)
    ) {
      return res.status(400).json({ error: "Empty or invalid body" });
    }
    let body;
    try {
      if (Buffer.isBuffer(req.body)) {
        body = JSON.parse(req.body.toString());
      } else if (typeof req.body === "string") {
        body = JSON.parse(req.body);
      } else {
        body = req.body;
      }
    } catch (err) {
      return res.status(400).json({ error: "Invalid JSON in body" });
    }

    // 1. Handle SNS SubscriptionConfirmation
    if (
      body.Type === "SubscriptionConfirmation" &&
      body.Token &&
      body.TopicArn
    ) {
      try {
        const command = new ConfirmSubscriptionCommand({
          TopicArn: body.TopicArn,
          Token: body.Token,
        });
        await snsClient.send(command);
        return res.status(200).send("SNS subscription confirmed successfully");
      } catch (error) {
        return res.status(500).send("Failed to confirm SNS subscription");
      }
    }

    // 2. Parse SNS Message
    let message;
    try {
      message = JSON.parse(body.Message || "{}");
    } catch (error) {
      return res.status(400).json({ error: "Failed to parse SNS message" });
    }

    // 3. Only handle email "Received" events
    if (message.notificationType !== "Received") {
      return res.status(204).send();
    }

    const replyFrom = message.mail?.source;
    const subject = message.mail?.commonHeaders?.subject || "No Subject";
    const toAddress = message.mail?.destination?.[0];
    const timestamp = message.mail?.timestamp || new Date().toISOString();

    // 4. Try to find original messageId from headers
    const referencesHeader = message.mail.headers.find(
      (h) => h.name.toLowerCase() === "references"
    )?.value;

    const match = referencesHeader.match(/<campaign-(.+?)@yourdomain\.com>/);
    const originalMessageId = match[1];

    if (!replyFrom || !toAddress || !originalMessageId) {
      return res
        .status(400)
        .json({ error: "Missing replyFrom, toAddress or messageId" });
    }

    // 5. Find the matching EmailCampaign by original messageId
    const emailCampaign = await EmailCampaign.findOne({
      "recipientEmails.messageId": originalMessageId,
    });

    if (!emailCampaign) {
      return res.status(404).json({ error: "Matching campaign not found" });
    }

    // 6. Save reply in MongoDB
    let parsedEmail;
    try {
      const decodedContent = Buffer.from(message.content, "base64");
      parsedEmail = await simpleParser(decodedContent);
    } catch (parseError) {
      console.error("❌ Failed to parse email content:", parseError);
    }

    const emailBody = parsedEmail?.html || parsedEmail?.text || "No content";

    const reply = await EmailReply.create({
      emailCampaignRef: emailCampaign._id,
      campaignRef: emailCampaign.campaignRef,
      from: replyFrom,
      to: toAddress,
      subject,
      body: emailBody,
      messageId: originalMessageId,
      timestamp,
    });

    // 7. Update stats
    await Promise.all([
      EmailCampaign.findByIdAndUpdate(emailCampaign._id, {
        $inc: { repliedCount: 1 },
      }),
      Campaign.findByIdAndUpdate(emailCampaign.campaignRef, {
        $inc: { totalReplies: 1 },
      }),
    ]);
    return res.status(200).json({ message: "Reply stored successfully" });
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get Campaign Report
exports.getEmailCampaignReport = async (req, res) => {
  try {
    const { id } = req.params;
    const emailCampaign = await EmailCampaign.findById(id).lean();
    if (!emailCampaign)
      return res.status(404).json({ message: "Campaign not found" });

    res.json({
      emailCampaign,
    });
  } catch (err) {
    console.error("Error fetching report:", err);
    res.status(500).json({ message: "Failed to get campaign report" });
  }
};
