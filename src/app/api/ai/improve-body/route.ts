import { NextRequest, NextResponse } from "next/server";
import {
  verifyFirebaseToken,
  verifyAdminOrSubadmin,
} from "@/lib/auth-middleware";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: NextRequest) {
  try {
    const user = await verifyFirebaseToken(request);
    verifyAdminOrSubadmin(user);

    const body = await request.json();
    const {
      currentBody,
      companyContext,
      useOptimizedPrompt,
      customInstructions,
    } = body;

    if (!currentBody) {
      return NextResponse.json(
        { success: false, message: "Current email body is required" },
        { status: 400 },
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    let prompt: string;

    if (useOptimizedPrompt) {
      // Optimized prompt for body improvement
      prompt = `You are an expert email marketing copywriter specializing in investor outreach.

Current Email Body:
"${currentBody}"

Company Context:
- Company: ${companyContext.name}
- Industry: ${companyContext.industry}
- Key Metrics: ${JSON.stringify(companyContext.metrics)}
- Traction: ${companyContext.traction}

Task: Improve this cold email for investor outreach.

Requirements:
1. Keep it between 150-250 words (concise is better)
2. Strong opening line that creates interest
3. Clear problem-solution statement early
4. Include 3-4 specific metrics or traction points (use bullet points)
5. Clear value proposition for investors
6. Strong call-to-action (request for 15-minute call)
7. Professional but warm tone
8. Short paragraphs (2-3 sentences max)
9. Preserve personalization variables like {{investorName}}, {{organizationName}}, etc.

Structure:
- Greeting with personalization
- Hook line mentioning investor's focus area
- Problem & solution (2-3 sentences)
- Traction/metrics (bulleted list)
- The ask (funding round details)
- Call-to-action (specific meeting request)
- Professional signature

Return ONLY the improved email body, nothing else. Keep all {{variables}} intact.

CRITICAL: Do NOT include any subject line. Start directly with the greeting (e.g., "Dear {{investorName}}" or "Hi {{investorName}}"). The subject is handled separately.`;
    } else {
      // Custom prompt from admin
      prompt = `You are an expert email marketing copywriter.

Current Email Body:
"${currentBody}"

Company Context:
- Company: ${companyContext.name}
- Industry: ${companyContext.industry}
- Metrics: ${JSON.stringify(companyContext.metrics)}

Instructions: ${customInstructions}

Important: Preserve all personalization variables like {{investorName}}, {{organizationName}}, etc.

Return ONLY the improved email body, nothing else.

CRITICAL: Do NOT include any subject line. Start directly with the greeting. The subject is handled separately.`;
    }

    console.log("[AI] Generating improved email body...");

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const improvedBody = response.text().trim();

    // Safety: Strip any subject line the AI might have added
    let cleanedBody = improvedBody;

    // Remove "Subject:" line if present (case insensitive, including variations)
    cleanedBody = cleanedBody
      .replace(/^(Subject|Subject Line|Email Subject|RE|Re):\s*[^\n]*\n*/im, "")
      .trim();

    // Also remove if it's on a second line after empty first line
    cleanedBody = cleanedBody
      .replace(
        /^\n*(Subject|Subject Line|Email Subject|RE|Re):\s*[^\n]*\n*/im,
        "",
      )
      .trim();

    console.log("[AI] Email body improved successfully");

    return NextResponse.json({
      success: true,
      improvedBody: cleanedBody,
      originalBody: currentBody,
      wordCount: improvedBody.split(" ").length,
    });
  } catch (error: any) {
    console.error("[AI Body Error]:", error);

    if (error.name === "AuthenticationError") {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to improve email body",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
