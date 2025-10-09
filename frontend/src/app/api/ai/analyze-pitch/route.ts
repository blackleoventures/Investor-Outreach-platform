import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, textContent } = body;

    // Validation
    if (!fileName || !textContent) {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide both file name and text content for analysis.",
        },
        { status: 400 }
      );
    }

    if (textContent.trim().length < 50) {
      return NextResponse.json(
        {
          success: false,
          message: "The provided text content is too short to analyze. Please provide a more detailed pitch deck.",
        },
        { status: 400 }
      );
    }

    console.log("[AI] Pitch Analysis Request:", {   
      fileName,
      textLength: textContent.length,
      timestamp: new Date().toISOString(),
    });

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite"  });

    // Craft the prompt for Gemini AI
    const prompt = `You are an expert venture capital analyst. Analyze the following pitch deck content and provide a comprehensive investment analysis.

PITCH DECK CONTENT:
${textContent}

ANALYSIS REQUIREMENTS:
Provide your analysis in the following JSON format. Make sure to return ONLY valid JSON without any markdown formatting, code blocks, or additional text:

{
  "summary": {
    "problem": "Clearly describe the problem the startup is solving (2-3 sentences)",
    "solution": "Describe the solution and product offering (2-3 sentences)",
    "market": "Describe the target market and industry sector (1-2 sentences)",
    "traction": "Summarize current traction, metrics, or validation (1-2 sentences)",
    "status": "GREEN or YELLOW or RED based on investment readiness",
    "total_score": "Overall score out of 100"
  },
  "scorecard": {
    "Problem & Solution Fit": "Score 1-10",
    "Market Size & Opportunity": "Score 1-10",
    "Business Model": "Score 1-10",
    "Traction & Metrics": "Score 1-10",
    "Team": "Score 1-10",
    "Competitive Advantage": "Score 1-10",
    "Go-To-Market Strategy": "Score 1-10",
    "Financials & Ask": "Score 1-10",
    "Exit Potential": "Score 1-10",
    "Alignment with Investor": "Score 1-10"
  },
  "suggested_questions": [
    "5 specific, insightful questions for the founders based on the pitch deck analysis"
  ],
  "highlights": [
    "5 key positive highlights or strengths from the pitch deck"
  ],
  "email_subject": "Professional email subject line for reaching out to an investor about this opportunity",
  "email_body": "Professional email body for an investor outreach. IMPORTANT: Use proper paragraph structure with double line breaks (\\n\\n) between paragraphs. Start with: Dear [Investor Name],\\n\\n Then add opening paragraph, key highlights as bullet points (• format), and closing. End with: \\n\\nWarm regards,\\n[Your Name]\\n[Your Title]\\n[Your Contact Information]\\n[Company Website]. No emojis, keep it professional and industry-standard."
}

IMPORTANT GUIDELINES:
1. Status should be GREEN (70-100), YELLOW (40-69), or RED (0-39) based on total_score
2. Total score should be realistic average of all scorecard items (multiply by 10)
3. Email body must be professional, NO EMOJIS, NO special characters
4. Email body should start with "Dear [Investor Name]," without any variation
5. Email body should end exactly with the closing format provided
6. Use bullet points in email as "•" for lists
7. Do NOT include scores or numbers in the email body
8. Keep email formal, concise, and investor-ready
9. Return ONLY the JSON object, no markdown formatting or code blocks`;

    console.log("[AI] Sending request to Gemini AI...");

    // Generate content using Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const generatedText = response.text();

    console.log("[AI] Received response from Gemini AI, length:", generatedText.length);

  // Clean the response - remove markdown code blocks if present
    let cleanedResponse = generatedText.trim();

    // Remove markdown code blocks
    cleanedResponse = cleanedResponse.replace(/```json\n?/g, "");
    cleanedResponse = cleanedResponse.replace(/```\n?/g, "");
    cleanedResponse = cleanedResponse.trim();

    // Remove any leading/trailing whitespace or newlines
    cleanedResponse = cleanedResponse.replace(/^\s+|\s+$/g, "");

    // Parse JSON response
    let analysisData;
    try {
      analysisData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error("[AI] JSON Parse Error:", parseError);
      console.error("[AI] Attempted to parse:", cleanedResponse.substring(0, 500));

      return NextResponse.json(
        {
          success: false,
          message: "We encountered an issue processing the AI analysis. Please try again in a moment.",
        },
        { status: 500 }
      );
    }

    // Validate and sanitize the response
    const sanitizedAnalysis = sanitizeAnalysisData(analysisData);

    console.log("[AI] Analysis completed successfully, score:", sanitizedAnalysis.summary.total_score);

    // Return successful response
    return NextResponse.json({
      success: true,
      message: "Pitch deck analysis completed successfully.",
      data: sanitizedAnalysis,
    });
  } catch (error: any) {
    console.error("[AI] Pitch Analysis Error:", {
      name: error.name,
      message: error.message,
      timestamp: new Date().toISOString(),
    });

    // Handle specific error types
    if (error.message && error.message.includes("API key")) {
      return NextResponse.json(
        {
          success: false,
          message: "AI service configuration error. Please contact support.",
        },
        { status: 500 }
      );
    }

    if (error.message && error.message.includes("quota")) {
      return NextResponse.json(
        {
          success: false,
          message: "Our AI analysis service is currently at capacity. Please try again in a few minutes.",
        },
        { status: 429 }
      );
    }

    if (error.message && error.message.includes("rate limit")) {
      return NextResponse.json(
        {
          success: false,
          message: "Too many requests. Please wait a moment before trying again.",
        },
        { status: 429 }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred while analyzing your pitch deck. Please try again or contact support if the issue persists.",
      },
      { status: 500 }
    );
  }
}

/**
 * Sanitize and validate the analysis data from Gemini AI
 */
function sanitizeAnalysisData(data: any) {
  // Helper function to remove emojis and special characters
  const cleanText = (text: string): string => {
    if (typeof text !== "string") return text;

    // Remove emojis
    let cleaned = text.replace(/[\u{1F600}-\u{1F64F}]/gu, "");
    cleaned = cleaned.replace(/[\u{1F300}-\u{1F5FF}]/gu, "");
    cleaned = cleaned.replace(/[\u{1F680}-\u{1F6FF}]/gu, "");
    cleaned = cleaned.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, "");
    cleaned = cleaned.replace(/[\u{2600}-\u{26FF}]/gu, "");
    cleaned = cleaned.replace(/[\u{2700}-\u{27BF}]/gu, "");

    // Remove excessive whitespace
    cleaned = cleaned.replace(/\s+/g, " ").trim();

    return cleaned;
  };

  // Sanitize summary
  const sanitizedSummary = {
    problem: cleanText(data.summary?.problem || "Problem statement not available"),
    solution: cleanText(data.summary?.solution || "Solution description not available"),
    market: cleanText(data.summary?.market || "Market information not available"),
    traction: cleanText(data.summary?.traction || "Traction information not available"),
    status: ["GREEN", "YELLOW", "RED"].includes(data.summary?.status) ? data.summary.status : "YELLOW",
    total_score: Math.min(100, Math.max(0, parseInt(data.summary?.total_score) || 50)),
  };

  // Sanitize scorecard
  const sanitizedScorecard: Record<string, number> = {};
  const expectedCriteria = [
    "Problem & Solution Fit",
    "Market Size & Opportunity",
    "Business Model",
    "Traction & Metrics",
    "Team",
    "Competitive Advantage",
    "Go-To-Market Strategy",
    "Financials & Ask",
    "Exit Potential",
    "Alignment with Investor",
  ];

  expectedCriteria.forEach((criteria) => {
    const score = parseInt(data.scorecard?.[criteria]) || 5;
    sanitizedScorecard[criteria] = Math.min(10, Math.max(1, score));
  });

  // Sanitize arrays
  const sanitizedQuestions = (data.suggested_questions || [])
    .slice(0, 5)
    .map((q: string) => cleanText(q))
    .filter((q: string) => q.length > 10);

  const sanitizedHighlights = (data.highlights || [])
    .slice(0, 5)
    .map((h: string) => cleanText(h))
    .filter((h: string) => h.length > 10);

  // Sanitize email
  let emailSubject = cleanText(data.email_subject || "Investment Opportunity");
  let emailBody = data.email_body || "";

  // Remove emojis from email body
  emailBody = emailBody.replace(/[\u{1F600}-\u{1F64F}]/gu, "");
  emailBody = emailBody.replace(/[\u{1F300}-\u{1F5FF}]/gu, "");
  emailBody = emailBody.replace(/[\u{1F680}-\u{1F6FF}]/gu, "");
  emailBody = emailBody.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, "");
  emailBody = emailBody.replace(/[\u{2600}-\u{26FF}]/gu, "");
  emailBody = emailBody.replace(/[\u{2700}-\u{27BF}]/gu, "");

  // Clean up excessive line breaks
  emailBody = emailBody.replace(/\n{3,}/g, "\n\n");
  emailBody = emailBody.trim();

  // Ensure proper email structure
  if (!emailBody.startsWith("Dear [Investor Name],")) {
    emailBody = "Dear [Investor Name],\n\n" + emailBody;
  }

  const closingFormat = "\n\nWarm regards,\n[Your Name]\n[Your Title]\n[Your Contact Information]\n[Company Website]";
  if (!emailBody.includes("Warm regards,")) {
    emailBody = emailBody + closingFormat;
  }

  return {
    summary: sanitizedSummary,
    scorecard: sanitizedScorecard,
    suggested_questions:
      sanitizedQuestions.length > 0
        ? sanitizedQuestions
        : [
            "What is your customer acquisition strategy?",
            "How do you plan to scale operations?",
            "What are your key competitive advantages?",
            "What are your unit economics?",
            "How will you use the funding?",
          ],
    highlights:
      sanitizedHighlights.length > 0
        ? sanitizedHighlights
        : [
            "Innovative approach to solving market problem",
            "Clear value proposition for target customers",
            "Experienced team with relevant expertise",
            "Scalable business model",
            "Strong market opportunity",
          ],
    email_subject: emailSubject,
    email_body: emailBody,
  };
}
