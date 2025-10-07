const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Controller to analyze pitch deck content using Gemini AI
 * @route POST /ai/analyze-pitch
 * @body { fileName: string, textContent: string }
 */
exports.analyzePitchDeck = async (req, res) => {
  try {
    const { fileName, textContent } = req.body;

    // Validation
    if (!fileName || !textContent) {
      return res.status(400).json({
        success: false,
        message: "Please provide both file name and text content for analysis.",
      });
    }

    if (textContent.trim().length < 50) {
      return res.status(400).json({
        success: false,
        message:
          "The provided text content is too short to analyze. Please provide a more detailed pitch deck.",
      });
    }

    // console.log("=== PITCH ANALYSIS REQUEST ===");
    // console.log("File Name:", fileName);
    // console.log("Text Length:", textContent.length, "characters");
    // console.log("Timestamp:", new Date().toISOString());

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

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

    // console.log("Sending request to Gemini AI...");

    // Generate content using Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const generatedText = response.text();

    console.log("Received response from Gemini AI");
    console.log("Raw response length:", generatedText.length);

    // Clean the response - remove markdown code blocks if present
    let cleanedResponse = generatedText.trim();

    // Remove markdown code blocks
    cleanedResponse = cleanedResponse.replace(/```json\n?/g, "");
    cleanedResponse = cleanedResponse.replace(/```\n?/g, "");
    cleanedResponse = cleanedResponse.trim();

    // Remove any leading/trailing whitespace or newlines
    cleanedResponse = cleanedResponse.replace(/^\s+|\s+$/g, "");

    console.log(
      "Cleaned response (first 200 chars):",
      cleanedResponse.substring(0, 200)
    );

    // Parse JSON response
    let analysisData;
    try {
      analysisData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      console.error("Attempted to parse:", cleanedResponse.substring(0, 500));

      return res.status(500).json({
        success: false,
        message:
          "We encountered an issue processing the AI analysis. Please try again in a moment.",
      });
    }

    // Validate and sanitize the response
    const sanitizedAnalysis = sanitizeAnalysisData(analysisData);

    // console.log("Analysis completed successfully");
    // console.log("Total Score:", sanitizedAnalysis.summary.total_score);
    // console.log("Status:", sanitizedAnalysis.summary.status);
    // console.log("=== END ANALYSIS ===\n");

    // Return successful response
    return res.status(200).json({
      success: true,
      message: "Pitch deck analysis completed successfully.",
      data: sanitizedAnalysis,
    });
  } catch (error) {
    console.error("=== PITCH ANALYSIS ERROR ===");
    console.error("Error Type:", error.name);
    console.error("Error Message:", error.message);
    console.error("Full Error:", error);
    console.error("Stack Trace:", error.stack);
    console.error("=== END ERROR ===\n");

    // Handle specific error types
    if (error.message && error.message.includes("API key")) {
      return res.status(500).json({
        success: false,
        message: "AI service configuration error. Please contact support.",
      });
    }

    if (error.message && error.message.includes("quota")) {
      return res.status(429).json({
        success: false,
        message:
          "Our AI analysis service is currently at capacity. Please try again in a few minutes.",
      });
    }

    if (error.message && error.message.includes("rate limit")) {
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please wait a moment before trying again.",
      });
    }

    if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
      return res.status(503).json({
        success: false,
        message:
          "Unable to connect to AI analysis service. Please check your internet connection and try again.",
      });
    }

    // Generic error response
    return res.status(500).json({
      success: false,
      message:
        "An unexpected error occurred while analyzing your pitch deck. Please try again or contact support if the issue persists.",
    });
  }
};

/**
 * Sanitize and validate the analysis data from Gemini AI
 * Removes any unwanted characters, emojis, and ensures proper formatting
 */
const sanitizeAnalysisData = (data) => {
  // Helper function to remove emojis and special characters
  const cleanText = (text) => {
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
  const sanitizedScorecard = {};
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
    .map((q) => cleanText(q))
    .filter((q) => q.length > 10);

  const sanitizedHighlights = (data.highlights || [])
    .slice(0, 5)
    .map((h) => cleanText(h))
    .filter((h) => h.length > 10);

  // Sanitize email - preserve line breaks
  let emailSubject = cleanText(data.email_subject || "Investment Opportunity");

  // For email body, preserve intentional line breaks but clean excess
  let emailBody = data.email_body || "";

  // Remove emojis from email body
  emailBody = emailBody.replace(/[\u{1F600}-\u{1F64F}]/gu, "");
  emailBody = emailBody.replace(/[\u{1F300}-\u{1F5FF}]/gu, "");
  emailBody = emailBody.replace(/[\u{1F680}-\u{1F6FF}]/gu, "");
  emailBody = emailBody.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, "");
  emailBody = emailBody.replace(/[\u{2600}-\u{26FF}]/gu, "");
  emailBody = emailBody.replace(/[\u{2700}-\u{27BF}]/gu, "");

  // Clean up excessive line breaks (more than 2 consecutive)
  emailBody = emailBody.replace(/\n{3,}/g, "\n\n");

  // Trim whitespace from start and end
  emailBody = emailBody.trim();

  // Ensure email body starts with "Dear [Investor Name],"
  if (!emailBody.startsWith("Dear [Investor Name],")) {
    emailBody = "Dear [Investor Name],\n\n" + emailBody;
  }

  // Ensure email body ends with proper closing
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
};

exports.enhanceEmailBody = async (req, res) => {
  try {
    const { emailBody, tone = "professional", context = "" } = req.body;

    if (!emailBody || emailBody.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide email content to enhance.",
      });
    }

    if (emailBody.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message:
          "Email content is too short to enhance effectively. Please provide more detailed content.",
      });
    }

    // console.log("=== EMAIL ENHANCEMENT REQUEST ===");
    // console.log("Original Email Length:", emailBody.length, "characters");
    // console.log("Tone:", tone);
    // console.log("Context:", context);
    // console.log("Timestamp:", new Date().toISOString());

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Craft the prompt for email enhancement - Fixed template literal syntax
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
- Use \\n\\n (double line breaks) between paragraphs to maintain proper email structure
- DO NOT use markdown formatting (NO **, *, __, _, #, >, etc.)
- DO NOT use HTML tags or special characters
- Use plain text only with bullet points as "• " (bullet space)
- Start with professional greeting like "Dear [Investor Name],"
- End EXACTLY with this signature format: "Best regards,\\n\\n[Your Name]\\n[Your Title]\\n[Your Contact Information]\\n[Company Website]"
- Ensure proper spacing between sections
- Keep natural email structure with clear paragraph separation
- NO emojis, special characters, or formatting symbols
- Use only plain text with proper punctuation

MANDATORY SIGNATURE FORMAT:
The email MUST end with this exact format:
"Best regards,\\n\\n[Your Name]\\n[Your Title]\\n[Your Contact Information]\\n[Company Website]"

IMPORTANT GUIDELINES:
- Keep emails professional and investor-focused
- Use PLAIN TEXT ONLY - no formatting symbols
- Use simple bullet points with "• " for lists
- Enhance clarity and impact while preserving original intent
- Use compelling language that drives action
- Include clear value propositions
- Maintain appropriate email length (not too verbose)
- Focus on investor interests: ROI, growth, innovation, market opportunity
- NEVER use markdown, HTML, or any formatting symbols`;

    console.log("Sending email enhancement request to Gemini AI...");

    // Generate content using Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const generatedText = response.text();

    // console.log("Received response from Gemini AI");
    // console.log("Raw response length:", generatedText.length);

    // Clean the response
    let cleanedResponse = generatedText.trim();
    cleanedResponse = cleanedResponse.replace(/```json\n?/g, "");
    cleanedResponse = cleanedResponse.replace(/```\n?/g, "");
    cleanedResponse = cleanedResponse.trim();

    // console.log(
    //   "Cleaned response (first 200 chars):",
    //   cleanedResponse.substring(0, 200)
    // );

    // Parse JSON response
    let enhancedData;
    try {
      enhancedData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      console.error("Attempted to parse:", cleanedResponse.substring(0, 500));

      return res.status(500).json({
        success: false,
        message:
          "We encountered an issue processing the email enhancement. Please try again in a moment.",
      });
    }

    // Sanitize the response while preserving formatting
    const sanitizedData = sanitizeEmailBodyWithSignature(
      enhancedData,
      emailBody
    );

    // console.log("Email enhancement completed successfully");
    // console.log("Enhanced email length:", sanitizedData.enhanced_body.length);
    // console.log("=== END EMAIL ENHANCEMENT ===\n");

    return res.status(200).json(sanitizedData);
  } catch (error) {
    console.error("=== EMAIL ENHANCEMENT ERROR ===");
    console.error("Error Type:", error.name);
    console.error("Error Message:", error.message);
    console.error("Full Error:", error);
    console.error("Stack Trace:", error.stack);
    console.error("=== END ERROR ===\n");

    // Handle specific error types
    if (error.message && error.message.includes("API key")) {
      return res.status(500).json({
        success: false,
        message: "AI service configuration issue. Please contact support.",
      });
    }

    if (error.message && error.message.includes("quota")) {
      return res.status(500).json({
        success: false,
        message:
          "AI enhancement service is currently at capacity. Please try again in a few minutes.",
      });
    }

    if (error.message && error.message.includes("rate limit")) {
      return res.status(500).json({
        success: false,
        message: "Please wait a moment before trying to enhance again.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to enhance email at the moment. Please try again or contact support if the issue persists.",
    });
  }
};

/**
 * Sanitize email body while preserving proper email formatting and ensuring correct signature
 */
const sanitizeEmailBodyWithSignature = (data, originalEmail) => {
  const cleanTextPreserveFormatting = (text) => {
    if (typeof text !== "string") return text;

    // Remove emojis but preserve all whitespace and line breaks
    let cleaned = text.replace(/[\u{1F600}-\u{1F64F}]/gu, "");
    cleaned = cleaned.replace(/[\u{1F300}-\u{1F5FF}]/gu, "");
    cleaned = cleaned.replace(/[\u{1F680}-\u{1F6FF}]/gu, "");
    cleaned = cleaned.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, "");
    cleaned = cleaned.replace(/[\u{2600}-\u{26FF}]/gu, "");
    cleaned = cleaned.replace(/[\u{2700}-\u{27BF}]/gu, "");

    // Remove markdown formatting symbols
    cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, "$1"); // Remove **bold**
    cleaned = cleaned.replace(/\*(.*?)\*/g, "$1"); // Remove *italic*
    cleaned = cleaned.replace(/__(.*?)__/g, "$1"); // Remove __underline__
    cleaned = cleaned.replace(/_(.*?)_/g, "$1"); // Remove _italic_
    cleaned = cleaned.replace(/`(.*?)`/g, "$1"); // Remove `code`
    cleaned = cleaned.replace(/``````/g, ""); // Remove code blocks - Fixed regex
    cleaned = cleaned.replace(/#{1,6}\s/g, ""); // Remove # headers
    cleaned = cleaned.replace(/>\s/g, ""); // Remove > blockquotes
    cleaned = cleaned.replace(/^\s*[-+*]\s/gm, "• "); // Convert markdown lists to bullet points
    cleaned = cleaned.replace(/^\s*\d+\.\s/gm, "• "); // Convert numbered lists to bullet points

    // Remove HTML tags if any
    cleaned = cleaned.replace(/<[^>]*>/g, "");

    // Remove excessive special characters and symbols - Fixed regex
    cleaned = cleaned.replace(/[#$%&*+=<>{}[\]\\|~`]/g, "");
    cleaned = cleaned.replace(/[^\w\s.,!?;:()\n\u2022\-]/g, ""); // Keep only letters, numbers, basic punctuation, line breaks, and bullet points

    // Only clean up excessive horizontal spacing, preserve line breaks
    cleaned = cleaned.replace(/[ \t]+/g, " ");

    // Preserve intentional line breaks but limit to max 3 consecutive
    cleaned = cleaned.replace(/\n{4,}/g, "\n\n\n");

    // Clean up bullet points - ensure proper spacing
    cleaned = cleaned.replace(/•\s*/g, "• ");
    cleaned = cleaned.replace(/\n\s*•/g, "\n• ");

    // Trim only start and end, preserve internal structure
    cleaned = cleaned.trim();

    return cleaned;
  };

  const ensureProperSignature = (emailBody) => {
    // Standard signature formats to check for and replace
    const signaturePatterns = [
      /\n\n?Best regards,?\n\n?.*$/s,
      /\n\n?Warm regards,?\n\n?.*$/s,
      /\n\n?Sincerely,?\n\n?.*$/s,
      /\n\n?Kind regards,?\n\n?.*$/s,
      /\n\n?Regards,?\n\n?.*$/s,
    ];

    let bodyWithoutSignature = emailBody;

    // Remove any existing signature
    signaturePatterns.forEach((pattern) => {
      bodyWithoutSignature = bodyWithoutSignature.replace(pattern, "");
    });

    // Ensure body doesn't end with excessive line breaks
    bodyWithoutSignature = bodyWithoutSignature.replace(/\n+$/, "");

    // Add the standardized signature
    const standardSignature =
      "\n\nBest regards,\n\n[Your Name]\n[Your Title]\n[Your Contact Information]\n[Company Website]";

    return bodyWithoutSignature + standardSignature;
  };

  try {
    let enhancedBody = cleanTextPreserveFormatting(
      data?.enhanced_body || originalEmail
    );

    // Ensure proper signature format
    enhancedBody = ensureProperSignature(enhancedBody);

    const improvements = Array.isArray(data?.improvements)
      ? data.improvements
          .slice(0, 5)
          .map((imp) => cleanTextPreserveFormatting(imp))
          .filter((imp) => imp.length > 0)
      : ["Enhanced email structure and professional language"];

    return {
      success: true,
      enhanced_body: enhancedBody,
      improvements: improvements,
    };
  } catch (error) {
    // Fallback with proper signature
    const fallbackBody = ensureProperSignature(originalEmail);

    return {
      success: true,
      enhanced_body: fallbackBody,
      improvements: [
        "Original email returned with standardized signature format",
      ],
    };
  }
};

exports.optimizeSubject = async (req, res) => {
  try {
    const {
      currentSubject,
      companyName = "[Company Name]",
      context = "",
      tone = "professional",
    } = req.body;

    if (!currentSubject || currentSubject.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a subject line to optimize.",
      });
    }

    // console.log("=== SUBJECT OPTIMIZATION REQUEST ===");
    // console.log("Original Subject:", currentSubject);
    // console.log("Company Name:", companyName);
    // console.log("Context:", context);
    // console.log("Tone:", tone);
    // console.log("Timestamp:", new Date().toISOString());

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    // Craft the prompt for subject line optimization
    const prompt = `You are an expert email marketing specialist focusing on investor communication and outreach. Create the single most effective subject line optimization for the following email subject.

ORIGINAL SUBJECT LINE: ${currentSubject}
COMPANY NAME: ${"[Company Name]"}
CONTEXT: ${context || "Investment opportunity outreach"}
TONE: ${tone}

OPTIMIZATION REQUIREMENTS:
Generate the most effective single subject line that:
1. Maximizes open rates for investor emails
2. Creates interest and urgency without being spammy
3. Is professional and industry-appropriate
4. Includes company name strategically when valuable
5. Is concise (ideally under 60 characters)
6. Appeals to investor motivations (growth, returns, opportunity)

Return your response in the following JSON format ONLY (no markdown, no code blocks):

{
  "success": true,
  "optimized_subject": "The single most effective optimized subject line"
}

IMPORTANT GUIDELINES:
- NO emojis or special characters
- Professional tone appropriate for investors
- Avoid spam trigger words
- Create sense of value and opportunity
- Keep concise but compelling
- Focus on investor interests: ROI, growth, innovation, market opportunity
- Include company name only if it adds strategic value
- Make it actionable and intriguing`;

    console.log("Sending subject optimization request to Gemini AI...");

    // Generate content using Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const generatedText = response.text();

    // console.log("Received response from Gemini AI");
    // console.log("Raw response length:", generatedText.length);

    // Clean the response
    let cleanedResponse = generatedText.trim();
    cleanedResponse = cleanedResponse.replace(/```json\n?/g, "");
    cleanedResponse = cleanedResponse.replace(/```\n?/g, "");
    cleanedResponse = cleanedResponse.trim();

    // console.log(
    //   "Cleaned response (first 200 chars):",
    //   cleanedResponse.substring(0, 200)
    // );

    // Parse JSON response
    let optimizedData;
    try {
      optimizedData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      console.error("Attempted to parse:", cleanedResponse.substring(0, 500));

      return res.status(500).json({
        success: false,
        message:
          "We encountered an issue processing the subject line optimization. Please try again in a moment.",
      });
    }

    // Sanitize the response
    const sanitizedData = sanitizeSubjectLine(
      optimizedData,
      currentSubject,
      companyName
    );

    // console.log("Subject optimization completed successfully");
    // console.log("Optimized subject:", sanitizedData.optimized_subject);
    // console.log("=== END SUBJECT OPTIMIZATION ===\n");

    return res.status(200).json(sanitizedData);
  } catch (error) {
    console.error("=== SUBJECT OPTIMIZATION ERROR ===");
    console.error("Error Type:", error.name);
    console.error("Error Message:", error.message);
    console.error("Full Error:", error);
    console.error("=== END ERROR ===\n");

    // Handle specific error types
    if (error.message && error.message.includes("API key")) {
      return res.status(500).json({
        success: false,
        message: "AI service configuration issue. Please contact support.",
      });
    }

    if (error.message && error.message.includes("quota")) {
      return res.status(500).json({
        success: false,
        message:
          "AI optimization service is currently at capacity. Please try again in a few minutes.",
      });
    }

    if (error.message && error.message.includes("rate limit")) {
      return res.status(500).json({
        success: false,
        message: "Please wait a moment before trying to optimize again.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to optimize subject line at the moment. Please try again or contact support if the issue persists.",
    });
  }
};

/**
 * Sanitize single subject line optimization
 */
const sanitizeSubjectLine = (data, originalSubject, companyName) => {
  const cleanText = (text) => {
    if (typeof text !== "string") return text;

    // Remove emojis and special characters
    let cleaned = text.replace(/[\u{1F600}-\u{1F64F}]/gu, "");
    cleaned = cleaned.replace(/[\u{1F300}-\u{1F5FF}]/gu, "");
    cleaned = cleaned.replace(/[\u{1F680}-\u{1F6FF}]/gu, "");
    cleaned = cleaned.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, "");
    cleaned = cleaned.replace(/[\u{2600}-\u{26FF}]/gu, "");
    cleaned = cleaned.replace(/[\u{2700}-\u{27BF}]/gu, "");

    // Remove excessive whitespace
    cleaned = cleaned.replace(/\s+/g, " ").trim();

    // Ensure reasonable length (under 80 characters)
    if (cleaned.length > 80) {
      cleaned = cleaned.substring(0, 77) + "...";
    }

    return cleaned;
  };

  try {
    let optimizedSubject = cleanText(data?.optimized_subject);

    // Fallback if no valid subject returned
    if (!optimizedSubject || optimizedSubject.length < 5) {
      optimizedSubject = companyName
        ? `Investment Opportunity - ${companyName}`
        : originalSubject || "Investment Discussion";
    }

    return {
      success: true,
      optimized_subject: optimizedSubject,
    };
  } catch (error) {
    return {
      success: true,
      optimized_subject: companyName
        ? `Investment Opportunity - ${companyName}`
        : originalSubject || "Investment Discussion",
    };
  }
};

exports.analyzeDeck = async (req, res) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ error: "No file uploaded. Use field name 'deck'" });

    const text = await extractTextFromFile(
      req.file.path,
      req.file.originalname
    );
    console.log("Extracted text length:", text.length);

    if (!text || text.length < 50) {
      return res
        .status(400)
        .json({ error: "Could not extract sufficient text from the document" });
    }

    // Use AI analysis with Gemini
    const aiAnalysis = await analyzeWithAI(text);

    if (aiAnalysis) {
      return res.status(200).json({
        success: true,
        data: {
          schema: aiAnalysis,
          aiRaw: aiAnalysis,
          email: {
            subject:
              aiAnalysis.email_template
                ?.split("\n")[0]
                ?.replace("Subject: ", "") || "",
            body: aiAnalysis.email_template || "",
            highlights: [],
          },
          rawTextPreview: text.slice(0, 2000),
        },
      });
    }

    // Fallback to heuristic analysis if AI fails
    const local = analyzeText(text);
    const companyName = extractCompanyName(text);
    const founderName = extractFounderName(text);
    const sector = extractSector(text);
    const fundingAmount = extractFundingAmount(text);

    return res.status(200).json({
      success: true,
      data: {
        schema: {
          summary: {
            problem: extractProblem(text),
            solution: extractSolution(text),
            market: extractMarket(text),
            traction: extractTraction(text),
            status: (local.status || "yellow").toUpperCase(),
            total_score: Math.round(
              (local.total / local.breakdown.length) * 10
            ),
          },
          scorecard: Object.fromEntries(
            local.breakdown.map((b) => [b.name, b.score])
          ),
          suggested_questions: local.questions,
          email_template: generateEmailFromText(
            text,
            companyName,
            founderName,
            sector,
            fundingAmount
          ),
          highlights: [
            `Analysis of ${companyName}`,
            "Document-based scoring",
            "Heuristic evaluation",
          ],
        },
        aiRaw: null,
        email: { subject: "", body: "", highlights: [] },
        rawTextPreview: text.slice(0, 2000),
      },
    });
  } catch (e) {
    console.error("analyzeDeck error", e);
    res.status(500).json({ error: e.message });
  } finally {
    try {
      req.file && fs.unlinkSync(req.file.path);
    } catch {}
  }
};

// New endpoint for document-based email pre-filling
exports.extractAndPrefill = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ error: "No file uploaded. Use field name 'document'" });
    }

    const text = await extractTextFromFile(
      req.file.path,
      req.file.originalname
    );
    console.log("Extracted text for prefill:", text.length, "chars");

    if (!text || text.length < 50) {
      return res
        .status(400)
        .json({ error: "Could not extract sufficient text from the document" });
    }

    // Extract data from the actual document
    const templateData = {
      companyName: extractCompanyName(text),
      founderName: extractFounderName(text),
      sector: extractSector(text),
      fundingAmount: extractFundingAmount(text),
      teamBackground: extractTeamBackground(text),
      globalPresence: extractGlobalPresence(text),
      patents: extractPatents(text),
      channels: extractChannels(text),
      phone: extractPhone(text),
      email: extractEmail(text),
    };

    const investorName = req.body.investorName || "[Investor Name]";

    const subject = `Investment – ${templateData.companyName}`;
    const body = generateEmailFromText(
      text,
      templateData.companyName,
      templateData.founderName,
      templateData.sector,
      templateData.fundingAmount
    );

    const emailTemplate = { subject, body };

    // Return successful response with template
    res.json({
      success: true,
      data: {
        extractedData: templateData,
        emailTemplate,
        rawTextPreview: text.slice(0, 1000),
        aiProcessed: true,
        fallbackUsed: false,
      },
    });
  } catch (error) {
    console.error("Extract and prefill error:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to process document" });
  } finally {
    try {
      req.file && fs.unlinkSync(req.file.path);
    } catch {}
  }
};

// Enhanced exports with proper functionality
exports.testUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileInfo = {
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: req.file.path,
    };

    // Clean up test file
    try {
      fs.unlinkSync(req.file.path);
    } catch {}

    res.json({
      success: true,
      message: "File upload test successful",
      fileInfo,
    });
  } catch (error) {
    console.error("Test upload error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.draftReply = async (req, res) => {
  try {
    const { originalEmail, replyType } = req.body;

    const variants = [
      "Thank you for your interest. I'd be happy to schedule a call to discuss further.",
      "I appreciate you taking the time to review our opportunity. When would be a good time to connect?",
      "Thanks for your response. I'll send over our deck and we can set up a meeting.",
    ];

    const tips = [
      "Keep the response concise and professional",
      "Suggest specific next steps",
      "Include relevant attachments if mentioned",
    ];

    res.json({ variants, tips });
  } catch (error) {
    console.error("Draft reply error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.matchInvestors = async (req, res) => {
  try {
    const { sector, fundingStage, location } = req.body;

    // This would typically query a database of investors
    // For now, return empty matches
    res.json({
      success: true,
      totalMatches: 0,
      matches: [],
      message: "Investor matching feature coming soon",
    });
  } catch (error) {
    console.error("Match investors error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.regenerateTemplate = async (req, res) => {
  try {
    const { companyData, investorName } = req.body;

    if (!companyData) {
      return res.status(400).json({ error: "Company data is required" });
    }

    const subject = `Investment Opportunity - ${
      companyData.companyName || "[Company Name]"
    }`;
    const body = generateEmailFromText(
      companyData.rawText || "",
      companyData.companyName || "[Company Name]",
      companyData.founderName || "[Founder Name]",
      companyData.sector || "[Sector]",
      companyData.fundingAmount || "[Funding Amount]"
    );

    res.json({
      success: true,
      data: {
        emailTemplate: { subject, body },
      },
    });
  } catch (error) {
    console.error("Regenerate template error:", error);
    res.status(500).json({ error: error.message });
  }
};
