import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  verifyFirebaseToken,
  verifyAdminOrSubadmin,
  createAuthErrorResponse,
} from "@/lib/auth-middleware";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 30;

interface FollowupContext {
  companyName: string;
  founderName: string;
  originalSubject: string;
  originalBody: string;
  recipientType: "investor" | "incubator";
  followupType: "not_opened" | "opened_not_replied";
  daysSince: number;
  totalRecipients: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication and authorization
    const user = await verifyFirebaseToken(request);
    verifyAdminOrSubadmin(user);

    const campaignId = params.id;

    // Verify campaign exists
    const campaignDoc = await adminDb
      .collection("campaigns")
      .doc(campaignId)
      .get();
    if (!campaignDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 }
      );
    }

    const campaignData = campaignDoc.data();

    // Parse and validate request body
    const body = await request.json();
    const { recipientIds, followupType } = body;

    if (
      !recipientIds ||
      !Array.isArray(recipientIds) ||
      recipientIds.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "recipientIds array is required and must not be empty",
        },
        { status: 400 }
      );
    }

    if (
      !followupType ||
      !["not_opened", "opened_not_replied"].includes(followupType)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'followupType must be either "not_opened" or "opened_not_replied"',
        },
        { status: 400 }
      );
    }

    console.log(
      `[Generate Followup] User ${user.email} generating for ${recipientIds.length} recipients`
    );

    // Get first recipient for context
    const firstRecipientDoc = await adminDb
      .collection("campaignRecipients")
      .doc(recipientIds[0])
      .get();

    if (!firstRecipientDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Recipient not found" },
        { status: 404 }
      );
    }

    const recipientData = firstRecipientDoc.data();

    // Verify recipient belongs to this campaign
    if (recipientData?.campaignId !== campaignId) {
      return NextResponse.json(
        { success: false, error: "Recipient does not belong to this campaign" },
        { status: 400 }
      );
    }

    // Build context for AI generation
    const context: FollowupContext = {
      companyName: campaignData?.clientName || "Our Company",
      founderName: user.displayName || user.email || "Founder",
      originalSubject: campaignData?.emailTemplate?.currentSubject || "",
      originalBody: campaignData?.emailTemplate?.currentBody || "",
      recipientType: recipientData?.recipientType || "investor",
      followupType,
      daysSince: calculateDaysSince(recipientData, followupType),
      totalRecipients: recipientIds.length,
    };

    // Generate follow-up email with AI
    const generated = await generateFollowupEmailWithAI(context);

    if (!generated.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to generate email with AI",
          details: generated.error,
        },
        { status: 500 }
      );
    }

    console.log("[Generate Followup] Email generated successfully");

    return NextResponse.json({
      success: true,
      subject: generated.subject,
      body: generated.body,
      recipientCount: recipientIds.length,
      followupType,
    });
  } catch (error: any) {
    console.error("[Generate Followup] Error:", error.message);
    return createAuthErrorResponse(error);
  }
}

// ============================================
// AI GENERATION LOGIC
// ============================================

async function generateFollowupEmailWithAI(
  context: FollowupContext
): Promise<{
  success: boolean;
  subject: string;
  body: string;
  error?: string;
}> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        subject: "",
        body: "",
        error: "GEMINI_API_KEY not configured in environment variables",
      };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = buildFollowupPrompt(context);

    console.log("[AI Followup] Calling Gemini API");

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const generatedText = response.text();

    if (!generatedText) {
      throw new Error("No content generated from Gemini API");
    }

    const parsed = parseGeneratedEmail(generatedText);

    console.log("[AI Followup] Email generated successfully");

    return {
      success: true,
      subject: parsed.subject,
      body: parsed.body,
    };
  } catch (error: any) {
    console.error("[AI Followup] Generation failed:", error.message);
    return {
      success: false,
      subject: "",
      body: "",
      error: error.message,
    };
  }
}

function buildFollowupPrompt(context: FollowupContext): string {
  const isNotOpened = context.followupType === "not_opened";
  const recipientTypeText =
    context.recipientType === "investor" ? "investors" : "incubators";

  return `You are a professional email writer for startup founders reaching out to ${recipientTypeText}.

Company: ${context.companyName}
Founder: ${context.founderName}
Original Subject: ${context.originalSubject}
Days since ${isNotOpened ? "sent" : "opened"}: ${context.daysSince}

Context:
${
  isNotOpened
    ? `The recipient hasn't opened the initial email sent ${context.daysSince} days ago.`
    : `The recipient opened the email ${context.daysSince} days ago but hasn't replied yet.`
}

Task: Generate a professional follow-up email.

Requirements:
1. ${
    isNotOpened
      ? "Mention you sent a previous email they may have missed"
      : "Acknowledge their interest (they opened the email) and gently follow up"
  }
2. Professional but warm tone
3. Brief and to the point (max 120 words for body)
4. Include a clear call-to-action
5. Use {{name}} and {{organization}} as placeholders for personalization
6. Don't be pushy or aggressive
7. Create subtle urgency without pressure

Original email context (for reference):
Subject: ${context.originalSubject}
Body excerpt: ${context.originalBody.substring(0, 200)}...

Generate ONLY:
SUBJECT: [write subject line here]
BODY: [write email body here]

Do not include any other text or explanations.`;
}

function parseGeneratedEmail(text: string): { subject: string; body: string } {
  const lines = text.split("\n");

  let subject = "";
  let body = "";
  let inBody = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("SUBJECT:")) {
      subject = trimmed.replace("SUBJECT:", "").trim();
    } else if (trimmed.startsWith("BODY:")) {
      body = trimmed.replace("BODY:", "").trim();
      inBody = true;
    } else if (inBody && trimmed) {
      body += "\n" + trimmed;
    }
  }

  // Fallback parsing if format doesn't match
  if (!subject || !body) {
    const parts = text.split("BODY:");
    if (parts.length >= 2) {
      const subjectPart = parts[0].replace("SUBJECT:", "").trim();
      subject = subjectPart || "Following up on our previous conversation";
      body = parts[1].trim();
    } else {
      subject = "Following up: " + text.substring(0, 50);
      body = text;
    }
  }

  // Clean up markdown formatting
  subject = subject.replace(/[*_`]/g, "").trim();
  body = body.replace(/```[\s\S]*?```/g, "").trim();

  // Ensure personalization tags are present
  if (!body.includes("{{name}}")) {
    body = "Hi {{name}},\n\n" + body;
  }

  return { subject, body };
}

function calculateDaysSince(recipientData: any, followupType: string): number {
  const now = new Date().getTime();

  if (followupType === "not_opened" && recipientData.deliveredAt) {
    const deliveredTime = new Date(recipientData.deliveredAt).getTime();
    return Math.floor((now - deliveredTime) / (1000 * 60 * 60 * 24));
  }

  if (followupType === "opened_not_replied" && recipientData.openedAt) {
    const openedTime = new Date(recipientData.openedAt).getTime();
    return Math.floor((now - openedTime) / (1000 * 60 * 60 * 24));
  }

  return 0;
}
