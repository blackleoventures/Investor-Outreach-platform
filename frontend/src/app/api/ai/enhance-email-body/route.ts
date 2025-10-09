import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { emailBody, tone = "professional", context = "" } = body;

    if (!emailBody || emailBody.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide email content to enhance.",
        },
        { status: 400 }
      );
    }

    if (emailBody.trim().length < 10) {
      return NextResponse.json(
        {
          success: false,
          message: "Email content is too short to enhance effectively. Please provide more detailed content.",
        },
        { status: 400 }
      );
    }

    console.log("[AI] Email Enhancement Request:", {
      emailLength: emailBody.length,
      tone,
      context,
      timestamp: new Date().toISOString(),
    });

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are an expert email marketing and investor communication specialist. Enhance the following email content to create the single most effective, compelling, and professional version for investor outreach.

ORIGINAL EMAIL:
${emailBody}

TONE PREFERENCE: ${tone}
CONTEXT: ${context || "Investment opportunity outreach"}

ENHANCEMENT REQUIREMENTS:
Create the most effective enhanced version of this email with the following improvements:
1. More compelling and professional language
2. Clearer value proposition and key benefits
3. Better structure and flow
4. Stronger call-to-action
5. Industry-appropriate terminology
6. Proper email formatting with clear paragraphs

Return your response in the following JSON format ONLY (no markdown, no code blocks):

{
  "success": true,
  "enhanced_body": "The single most effective enhanced email body with proper paragraph structure using \\n\\n between paragraphs. Maintain proper email formatting with clear line breaks between sections.",
  "improvements": ["List of specific improvements made to enhance this email"]
}

CRITICAL FORMATTING REQUIREMENTS:
- Use \\n\\n (double line breaks) between paragraphs
- DO NOT use markdown formatting
- Use plain text only with bullet points as "• "
- Start with professional greeting
- End with: "Best regards,\\n\\n[Your Name]\\n[Your Title]\\n[Your Contact Information]\\n[Company Website]"
- NO emojis or special characters`;

    console.log("[AI] Sending enhancement request to Gemini AI...");

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
    let enhancedData;
    try {
      enhancedData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error("[AI] JSON Parse Error:", parseError);
      return NextResponse.json(
        {
          success: false,
          message: "We encountered an issue processing the email enhancement. Please try again.",
        },
        { status: 500 }
      );
    }

    // Sanitize the response
    const sanitizedData = sanitizeEmailBody(enhancedData, emailBody);

    console.log("[AI] Email enhancement completed successfully");

    return NextResponse.json(sanitizedData);
  } catch (error: any) {
    console.error("[AI] Email Enhancement Error:", error);

    if (error.message && error.message.includes("API key")) {
      return NextResponse.json(
        {
          success: false,
          message: "AI service configuration issue. Please contact support.",
        },
        { status: 500 }
      );
    }

    if (error.message && error.message.includes("quota")) {
      return NextResponse.json(
        {
          success: false,
          message: "AI enhancement service is currently at capacity. Please try again in a few minutes.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Unable to enhance email at the moment. Please try again.",
      },
      { status: 500 }
    );
  }
}

function sanitizeEmailBody(data: any, originalEmail: string) {
  const cleanText = (text: string): string => {
    if (typeof text !== "string") return text;

    // Remove emojis
    let cleaned = text.replace(/[\u{1F600}-\u{1F64F}]/gu, "");
    cleaned = cleaned.replace(/[\u{1F300}-\u{1F5FF}]/gu, "");
    cleaned = cleaned.replace(/[\u{1F680}-\u{1F6FF}]/gu, "");

    // Remove markdown
    cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, "$1");
    cleaned = cleaned.replace(/\*(.*?)\*/g, "$1");
    cleaned = cleaned.replace(/__(.*?)__/g, "$1");
    cleaned = cleaned.replace(/_(.*?)_/g, "$1");

    // Clean spacing
    cleaned = cleaned.replace(/[ \t]+/g, " ");
    cleaned = cleaned.replace(/\n{4,}/g, "\n\n\n");

    return cleaned.trim();
  };

  try {
    let enhancedBody = cleanText(data?.enhanced_body || originalEmail);

    // Ensure proper signature
    if (!enhancedBody.includes("Best regards,")) {
      enhancedBody += "\n\nBest regards,\n\n[Your Name]\n[Your Title]\n[Your Contact Information]\n[Company Website]";
    }

    const improvements = Array.isArray(data?.improvements)
      ? data.improvements.slice(0, 5).map((imp: string) => cleanText(imp))
      : ["Enhanced email structure and professional language"];

    return {
      success: true,
      enhanced_body: enhancedBody,
      improvements,
    };
  } catch (error) {
    return {
      success: true,
      enhanced_body: originalEmail,
      improvements: ["Original email returned with formatting"],
    };
  }
}
