import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken, verifyAdminOrSubadmin } from "@/lib/auth-middleware";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: NextRequest) {
  try {
    const user = await verifyFirebaseToken(request);
    verifyAdminOrSubadmin(user);

    const body = await request.json();
    const { 
      currentSubject, 
      companyContext, 
      useOptimizedPrompt, 
      customInstructions 
    } = body;

    if (!currentSubject) {
      return NextResponse.json(
        { success: false, message: "Current subject is required" },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    let prompt: string;

    if (useOptimizedPrompt) {
      // Optimized prompt for subject line improvement
      prompt = `You are an expert email marketing copywriter specializing in investor outreach.

Current Email Subject: "${currentSubject}"

Company Context:
- Company: ${companyContext.name}
- Industry: ${companyContext.industry}
- Funding Stage: ${companyContext.stage}
- Key Metrics: ${JSON.stringify(companyContext.metrics)}

Task: Improve this email subject line for cold investor outreach.

Requirements:
1. Keep it under 50 characters
2. Include a specific metric or value proposition
3. Create curiosity without being clickbait
4. Use active voice and strong verbs
5. Avoid spam trigger words (free, guaranteed, act now, etc.)
6. Be professional but engaging
7. Focus on the benefit to the investor, not just the ask

Return ONLY the improved subject line, nothing else. No quotes, no explanations.`;

    } else {
      // Custom prompt from admin
      prompt = `You are an expert email marketing copywriter.

Current Email Subject: "${currentSubject}"

Company Context:
- Company: ${companyContext.name}
- Industry: ${companyContext.industry}
- Funding Stage: ${companyContext.stage}

Instructions: ${customInstructions}

Return ONLY the improved subject line, nothing else. No quotes, no explanations.`;
    }

    console.log("[AI] Generating improved subject...");

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const improvedSubject = response.text().trim().replace(/^["']|["']$/g, "");

    console.log("[AI] Subject improved successfully");

    return NextResponse.json({
      success: true,
      improvedSubject,
      originalSubject: currentSubject,
    });

  } catch (error: any) {
    console.error("[AI Subject Error]:", error);
    
    if (error.name === "AuthenticationError") {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to improve subject line",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
