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
          message:
            "Please provide both file name and text content for analysis.",
        },
        { status: 400 }
      );
    }

    if (textContent.trim().length < 50) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The provided text content is too short to analyze. Please provide a more detailed pitch deck.",
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
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    // Craft the prompt for Gemini AI
    const prompt = `You are an expert venture capital analyst. Analyze the following pitch deck content and provide a comprehensive investment analysis.


PITCH DECK CONTENT:
${textContent}


SCORING CRITERIA (Each criterion scored 0-10):

1. Problem & Solution Fit (0-10)
   - Evaluate clarity of problem statement
   - Assess originality and innovation of solution
   - Check if solution directly addresses the problem

2. Market Size & Opportunity (0-10)
   - Look for TAM/SAM/SOM data
   - Assess market growth potential
   - Evaluate addressable market size

3. Business Model (0-10)
   - Analyze revenue model clarity
   - Assess scalability of the model
   - Evaluate pricing strategy
   - Check for recurring revenue potential

4. Traction & Metrics (0-10)
   - Review revenue data (if available)
   - Check user/customer metrics
   - Look for partnerships or validation
   - Assess MoM (Month-over-Month) growth

5. Team (0-10)
   - Evaluate founder/team experience
   - Check domain expertise
   - Assess execution ability and track record

6. Competitive Advantage (0-10)
   - Identify moat or defensibility
   - Look for intellectual property (IP)
   - Assess market differentiation

7. Go-To-Market Strategy (0-10)
   - Evaluate customer acquisition plan
   - Check distribution channels
   - Assess sales and marketing strategy

8. Financials & Ask (0-10)
   - Review burn rate and runway
   - Check valuation reasonableness
   - Assess fund utilization plan
   - Evaluate financial projections

9. Exit Potential (0-10)
   - Look for M&A or IPO roadmap
   - Check comparable exits
   - Assess precedent transactions in sector

10. Alignment with Investor (0-10)
    - Evaluate stage appropriateness
    - Check geography fit
    - Assess sector alignment
    - Review investment thesis fit


ANALYSIS REQUIREMENTS:
Provide your analysis in the following JSON format. Make sure to return ONLY valid JSON without any markdown formatting, code blocks, or additional text:


{
  "summary": {
    "problem": "Clearly describe the problem the startup is solving (2-3 sentences)",
    "solution": "Describe the solution and product offering (2-3 sentences)",
    "market": "Describe the target market and industry sector (1-2 sentences)",
    "traction": "Summarize current traction, metrics, or validation (1-2 sentences)",
    "status": "GREEN or YELLOW or RED based on investment readiness",
    "total_score": "Overall score out of 100 (average of all 10 criteria × 10)"
  },
  "scorecard": {
    "Problem & Solution Fit": "Score 0-10 based on clarity of problem and originality of solution",
    "Market Size & Opportunity": "Score 0-10 based on TAM/SAM/SOM data and growth potential",
    "Business Model": "Score 0-10 based on revenue model, scalability, pricing, recurring revenue",
    "Traction & Metrics": "Score 0-10 based on revenue, users, partnerships, MoM growth",
    "Team": "Score 0-10 based on experience, domain expertise, execution ability",
    "Competitive Advantage": "Score 0-10 based on moat, IP, market differentiation",
    "Go-To-Market Strategy": "Score 0-10 based on customer acquisition plan and distribution channels",
    "Financials & Ask": "Score 0-10 based on burn rate, runway, valuation, fund utilization",
    "Exit Potential": "Score 0-10 based on M&A or IPO roadmap, comps, precedent exits",
    "Alignment with Investor": "Score 0-10 based on stage, geography, sector alignment"
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


IMPORTANT SCORING GUIDELINES:
1. Score each criterion independently from 0-10 based on the specific checks listed above
2. If information is missing for a criterion, score it lower (3-5 range)
3. If information is present but weak, score 5-7
4. Only score 8-10 if the criterion shows strong evidence and quality
5. Total score = (sum of all 10 scores) / 10 × 10 to get score out of 100
6. Status should be: GREEN (70-100), YELLOW (40-69), RED (0-39)


EMAIL FORMATTING RULES:
1. Email body must be professional, NO EMOJIS, NO special characters
2. Email body should start with "Dear [Investor Name]," without any variation
3. Email body should end exactly with the closing format provided
4. Use bullet points in email as "•" for lists
5. Do NOT include scores or numbers in the email body
6. Keep email formal, concise, and investor-ready (max 250 words)
7. Focus on business opportunity, not technical details


Return ONLY the JSON object, no markdown formatting or code blocks.`;

    console.log("[AI] Sending request to Gemini AI...");

    // Generate content using Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const generatedText = response.text();

    console.log(
      "[AI] Received response from Gemini AI, length:",
      generatedText.length
    );

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
      console.error(
        "[AI] Attempted to parse:",
        cleanedResponse.substring(0, 500)
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "We encountered an issue processing the AI analysis. Please try again in a moment.",
        },
        { status: 500 }
      );
    }

    // Validate and sanitize the response
    const sanitizedAnalysis = sanitizeAnalysisData(analysisData);

    console.log(
      "[AI] Analysis completed successfully, score:",
      sanitizedAnalysis.summary.total_score
    );

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
          message:
            "Our AI analysis service is currently at capacity. Please try again in a few minutes.",
        },
        { status: 429 }
      );
    }

    if (error.message && error.message.includes("rate limit")) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Too many requests. Please wait a moment before trying again.",
        },
        { status: 429 }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        success: false,
        message:
          "An unexpected error occurred while analyzing your pitch deck. Please try again or contact support if the issue persists.",
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
    problem: cleanText(
      data.summary?.problem || "Problem statement not available"
    ),
    solution: cleanText(
      data.summary?.solution || "Solution description not available"
    ),
    market: cleanText(
      data.summary?.market || "Market information not available"
    ),
    traction: cleanText(
      data.summary?.traction || "Traction information not available"
    ),
    status: ["GREEN", "YELLOW", "RED"].includes(data.summary?.status)
      ? data.summary.status
      : "YELLOW",
    total_score: Math.min(
      100,
      Math.max(0, parseInt(data.summary?.total_score) || 50)
    ),
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
    sanitizedScorecard[criteria] = Math.min(10, Math.max(0, score));
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

  const closingFormat =
    "\n\nWarm regards,\n[Your Name]\n[Your Title]\n[Your Contact Information]\n[Company Website]";
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
