import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentSubject, companyName = "[Company Name]", context = "", tone = "professional" } = body;

    if (!currentSubject || currentSubject.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide a subject line to optimize.",
        },
        { status: 400 }
      );
    }

    console.log("[AI] Subject Optimization Request:", {
      currentSubject,
      companyName,
      tone,
      timestamp: new Date().toISOString(),
    });

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are an expert email marketing specialist. Create the single most effective subject line for investor outreach.

ORIGINAL SUBJECT LINE: ${currentSubject}
COMPANY NAME: ${companyName}
CONTEXT: ${context || "Investment opportunity outreach"}
TONE: ${tone}

Generate the most effective single subject line that:
1. Maximizes open rates
2. Creates interest and urgency
3. Is professional and concise (under 60 characters)
4. Appeals to investor motivations

Return ONLY valid JSON (no markdown):

{
  "success": true,
  "optimized_subject": "The single most effective optimized subject line"
}

GUIDELINES:
- NO emojis or special characters
- Professional tone for investors
- Concise but compelling
- Focus on value and opportunity`;

    console.log("[AI] Sending subject optimization request...");

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const generatedText = response.text();

  // Clean the response - remove markdown code blocks if present
    let cleanedResponse = generatedText.trim();

    // Remove markdown code blocks
    cleanedResponse = cleanedResponse.replace(/```json\n?/g, "");
    cleanedResponse = cleanedResponse.replace(/```\n?/g, "");
    cleanedResponse = cleanedResponse.trim();

    // Remove any leading/trailing whitespace or newlines
    cleanedResponse = cleanedResponse.replace(/^\s+|\s+$/g, "");

    // Parse JSON response
    let optimizedData;
    try {
      optimizedData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error("[AI] JSON Parse Error:", parseError);
      return NextResponse.json(
        {
          success: false,
          message: "We encountered an issue processing the subject optimization. Please try again.",
        },
        { status: 500 }
      );
    }

    // Sanitize
    const sanitizedData = sanitizeSubject(optimizedData, currentSubject, companyName);

    console.log("[AI] Subject optimization completed:", sanitizedData.optimized_subject);

    return NextResponse.json(sanitizedData);
  } catch (error: any) {
    console.error("[AI] Subject Optimization Error:", error);

    if (error.message && error.message.includes("quota")) {
      return NextResponse.json(
        {
          success: false,
          message: "AI service is at capacity. Please try again in a few minutes.",
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Unable to optimize subject line. Please try again.",
      },
      { status: 500 }
    );
  }
}

function sanitizeSubject(data: any, originalSubject: string, companyName: string) {
  const cleanText = (text: string): string => {
    if (typeof text !== "string") return text;

    // Remove emojis
    let cleaned = text.replace(/[\u{1F600}-\u{1F64F}]/gu, "");
    cleaned = cleaned.replace(/[\u{1F300}-\u{1F5FF}]/gu, "");
    cleaned = cleaned.replace(/\s+/g, " ").trim();

    // Limit length
    if (cleaned.length > 80) {
      cleaned = cleaned.substring(0, 77) + "...";
    }

    return cleaned;
  };

  try {
    let optimizedSubject = cleanText(data?.optimized_subject);

    if (!optimizedSubject || optimizedSubject.length < 5) {
      optimizedSubject = companyName ? `Investment Opportunity - ${companyName}` : originalSubject || "Investment Discussion";
    }

    return {
      success: true,
      optimized_subject: optimizedSubject,
    };
  } catch (error) {
    return {
      success: true,
      optimized_subject: originalSubject || "Investment Opportunity",
    };
  }
}
