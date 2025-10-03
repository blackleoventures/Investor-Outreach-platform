const fs = require("fs");
const path = require("path");
const { db, dbHelpers } = require("../config/firebase-db.config");

// Enhanced file text extraction with better support for all formats
async function extractTextFromFile(filePath, originalName) {
  const ext = path.extname(originalName || filePath).toLowerCase();
  console.log('🔍 Extracting from:', originalName, 'Extension:', ext);
  
  try {
    // TXT and MD files
    if (ext === ".txt" || ext === ".md") {
      const text = fs.readFileSync(filePath, "utf8");
      console.log('✅ TXT/MD extracted:', text.length, 'chars');
      return cleanText(text);
    }
    
    // PDF files - Enhanced extraction
    if (ext === ".pdf") {
      console.log('📄 Attempting PDF extraction...');
      try {
        const pdfParse = require("pdf-parse");
        const buffer = fs.readFileSync(filePath);
        console.log('📄 PDF buffer size:', buffer.length, 'bytes');
        
        const data = await pdfParse(buffer);
        const text = cleanText(data.text || "");
        
        if (text && text.length > 50) {
          console.log('✅ PDF text successfully extracted:', text.length, 'chars');
          return text;
        } else {
          console.log('❌ PDF extraction failed - insufficient text');
          return "PDF extraction failed - insufficient text content";
        }
      } catch (pdfError) {
        console.log('❌ PDF processing error:', pdfError.message);
        return "PDF processing failed";
      }
    }
    
    console.log('❌ Unsupported file format:', ext);
    return `File format ${ext} is not supported.`;
    
  } catch (e) {
    console.error('❌ Extraction error for', ext, ':', e.message);
    return `Error reading ${ext} file: ${e.message}`;
  }
}

// Helper function to clean and normalize text
function cleanText(text) {
  if (!text) return "";
  
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

// AI analysis using Gemini
async function analyzeWithAI(text) {
  try {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      console.log('No Gemini API key found, skipping AI analysis');
      return null;
    }

    const prompt = `You are an investment research assistant. 

Task:
1. Read the uploaded file carefully (it may be PDF, Word, PPT, or TXT).
2. Extract ONLY investment-related details:
   - Company Name
   - Sector / Industry
   - Market Size & Growth Rate
   - Problem & Solution
   - Key Highlights (growth numbers, margins, ratings, customers, traction)
   - Product Edge / USP
   - Financial Projections (revenue, profit, CAGR, targets)
   - Fundraise Details (amount raising, pre-money valuation, dilution %, capital usage)
   - Team / Founders (with roles)

⚠️ Rules:
- Keep all numbers, ₹, $, %, Cr, Mn, etc. EXACTLY as in the file.
- Do NOT leave placeholders like "USPs of" or "Valuation: Valuation".
- If a section is missing in the file, write "Not disclosed in deck".
- Preserve bullet formatting for clarity.

Return ONLY valid JSON with this structure:

{
  "summary": {
    "problem": "Exact problem from file or 'Not disclosed in deck'",
    "solution": "Exact solution from file or 'Not disclosed in deck'",
    "market": "Exact market/sector from file",
    "traction": "Exact traction metrics from file",
    "status": "GREEN/YELLOW/RED",
    "total_score": 85
  },
  "scorecard": {
    "Problem & Solution Fit": 8,
    "Market Size & Opportunity": 7,
    "Business Model": 9,
    "Traction & Metrics": 6,
    "Team": 8,
    "Competitive Advantage": 7,
    "Go-To-Market Strategy": 6,
    "Financials & Ask": 7,
    "Exit Potential": 8,
    "Alignment with Investor": 7
  },
  "suggested_questions": [
    "What is your customer acquisition strategy and current CAC?",
    "How do you plan to scale operations?",
    "What are your key competitive advantages?",
    "What are your unit economics and path to profitability?",
    "How will the funding be used to achieve milestones?"
  ],
  "email_template": "Subject: Investment Opportunity in [Company Name] – [Sector]\n\nDear [Investor Name],\n\nHope you're doing well.\n\nI'm reaching out to share an exciting investment opportunity in [Company Name], a [Sector] company.\n\n📈 Key Highlights:\n[Exact bullet points from file with numbers]\n\n🔧 Product Edge:\n[Exact USP/competitive advantages from file or 'Not disclosed in deck']\n\n💸 Fundraise Details:\n[Exact fundraise amount, valuation, dilution %, use of funds from file or 'Not disclosed in deck']\n\nIf this aligns with your portfolio thesis in [Sector], we'd be glad to share the deck and set up a quick call with the founders.\n\nWarm regards,\n[Founder Name]\n📞 [Contact Number] | ✉️ [Email]",
  "highlights": ["Exact highlights from file with all numbers preserved"],
  "company_name": "Exact company name from file",
  "sector": "Exact sector from file",
  "market_size": "Exact market size with numbers from file or 'Not disclosed in deck'",
  "growth_rate": "Exact growth rate with % from file or 'Not disclosed in deck'",
  "product_edge": "Exact USP from file or 'Not disclosed in deck'",
  "financial_projections": "Exact revenue/profit projections from file or 'Not disclosed in deck'",
  "fundraise_amount": "Exact fundraise amount from file or 'Not disclosed in deck'",
  "valuation": "Exact pre-money valuation from file or 'Not disclosed in deck'",
  "dilution": "Exact dilution % from file or 'Not disclosed in deck'",
  "use_of_funds": "Exact use of funds from file or 'Not disclosed in deck'",
  "team_info": "Exact founder/team details with roles from file or 'Not disclosed in deck'",
  "contact_number": "Exact phone number from file or 'Not disclosed in deck'",
  "contact_email": "Exact email from file or 'Not disclosed in deck'"
}

Document content:
${text}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }]
        })
      }
    );

    if (!response.ok) {
      console.log('Gemini API error:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Extract JSON from response
    const jsonStart = content.indexOf("{");
    const jsonEnd = content.lastIndexOf("}");
    
    if (jsonStart !== -1 && jsonEnd !== -1) {
      const jsonStr = content.slice(jsonStart, jsonEnd + 1);
      return JSON.parse(jsonStr);
    }
    
    return null;
    
  } catch (error) {
    console.error("AI analysis failed:", error.message);
    return null;
  }
}

// Text extraction helpers
function extractCompanyName(text) {
  const patterns = [
    /company[:\s]+([^\n]+)/i,
    /brand[:\s]+([^\n]+)/i,
    /startup[:\s]+([^\n]+)/i,
    /^([A-Z][a-zA-Z]+)\s*[-–]\s*[A-Z]/m
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return '[Company Name]';
}

function extractFounderName(text) {
  const patterns = [
    /founder[:\s]+([^\n]+)/i,
    /ceo[:\s]+([^\n]+)/i,
    /founded by[:\s]+([^\n]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return '[Founder Name]';
}

function extractSector(text) {
  const sectors = ['FMCG', 'SaaS', 'FinTech', 'HealthTech', 'EdTech', 'E-commerce', 'AI/ML', 'Blockchain'];
  const lowerText = text.toLowerCase();
  
  for (const sector of sectors) {
    if (lowerText.includes(sector.toLowerCase())) {
      return sector;
    }
  }
  return '[Sector]';
}

function extractFundingAmount(text) {
  const patterns = [
    /raising\s+\$([\d.]+[MK]?)/i,
    /funding\s+\$([\d.]+[MK]?)/i,
    /\$([\d.]+[MK]?)\s+raise/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return '$' + match[1];
    }
  }
  return '[Funding Amount]';
}

function extractTeamBackground(text) {
  const patterns = [
    /team[:\s]+([^\n]+)/i,
    /experience[:\s]+([^\n]+)/i,
    /([\d]+\+?\s*years?[^\n]*experience[^\n]*)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return '[Team Background]';
}

function extractGlobalPresence(text) {
  if (text.toLowerCase().includes('global') || text.toLowerCase().includes('international')) {
    return 'Global expansion';
  }
  return '[Global Presence]';
}

function extractPatents(text) {
  if (text.toLowerCase().includes('patent') || text.toLowerCase().includes('ip') || text.toLowerCase().includes('proprietary')) {
    return 'Proprietary technology';
  }
  return '[IP/Patents]';
}

function extractChannels(text) {
  const channels = [];
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('amazon')) channels.push('Amazon');
  if (lowerText.includes('website')) channels.push('Website');
  if (lowerText.includes('retail')) channels.push('Retail');
  if (lowerText.includes('online')) channels.push('Online');
  
  return channels.length > 0 ? channels.join(', ') : '[Sales Channels]';
}

function extractPhone(text) {
  const phonePattern = /\+?[\d\s\-\(\)]{10,}/;
  const match = text.match(phonePattern);
  return match ? match[0].trim() : '[Phone Number]';
}

function extractEmail(text) {
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const match = text.match(emailPattern);
  return match ? match[0] : '[Email Address]';
}

function extractProblem(text) {
  const patterns = [
    /problem[:\s]+([^\n]+)/i,
    /challenge[:\s]+([^\n]+)/i,
    /issue[:\s]+([^\n]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return 'Problem identification from document';
}

function extractSolution(text) {
  const patterns = [
    /solution[:\s]+([^\n]+)/i,
    /we solve[:\s]+([^\n]+)/i,
    /our approach[:\s]+([^\n]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return 'Solution description from document';
}

function extractMarket(text) {
  const patterns = [
    /market[:\s]+([^\n]+)/i,
    /industry[:\s]+([^\n]+)/i,
    /target[:\s]+([^\n]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return 'Market analysis from document';
}

function extractTraction(text) {
  const patterns = [
    /traction[:\s]+([^\n]+)/i,
    /metrics[:\s]+([^\n]+)/i,
    /revenue[:\s]+([^\n]+)/i,
    /users[:\s]+([^\n]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return 'Traction metrics from document';
}

function generateEmailFromText(text, companyName, founderName, sector, fundingAmount) {
  // Extract exact details from text
  const highlights = extractKeyHighlights(text);
  const productEdge = extractProductEdge(text);
  const fundraiseDetails = extractFundraiseDetails(text);
  const contactInfo = extractContactInfo(text);
  
  return `Subject: Investment Opportunity in ${companyName} – ${sector}

Dear [Investor Name],

Hope you're doing well.

I'm reaching out to share an exciting investment opportunity in ${companyName}, a ${sector} company.

📈 Key Highlights:
${highlights}

🔧 Product Edge:
${productEdge}

💸 Fundraise Details:
${fundraiseDetails}

If this aligns with your portfolio thesis in ${sector}, we'd be glad to share the deck and set up a quick call with the founders.

Warm regards,
${founderName}
${contactInfo}`;
}

// Extract key highlights with exact numbers
function extractKeyHighlights(text) {
  const highlights = [];
  
  // Look for revenue/growth numbers
  const revenueMatch = text.match(/revenue[:\s]*[₹$]?[\d,.]+(M|K|Cr|L)?/gi);
  if (revenueMatch) highlights.push(`- Revenue: ${revenueMatch[0]}`);
  
  // Look for growth rates
  const growthMatch = text.match(/growth[:\s]*\d+%/gi);
  if (growthMatch) highlights.push(`- Growth: ${growthMatch[0]}`);
  
  // Look for market size
  const marketMatch = text.match(/market[:\s]*[₹$]?[\d,.]+(B|M|Cr|L)?/gi);
  if (marketMatch) highlights.push(`- Market Size: ${marketMatch[0]}`);
  
  // Look for margins
  const marginMatch = text.match(/margin[:\s]*\d+%/gi);
  if (marginMatch) highlights.push(`- Margins: ${marginMatch[0]}`);
  
  // Look for customers/users
  const customerMatch = text.match(/\d+[\s]*(?:customers|users|clients)/gi);
  if (customerMatch) highlights.push(`- ${customerMatch[0]}`);
  
  return highlights.length > 0 ? highlights.join('\n') : '- Strong market opportunity\n- Experienced team\n- Clear growth trajectory';
}

// Extract product edge/USP
function extractProductEdge(text) {
  const usp = [];
  
  // Look for competitive advantages
  const compMatch = text.match(/(?:competitive advantage|USP|unique)[:\s]*([^\n.]+)/gi);
  if (compMatch) usp.push(`- ${compMatch[0]}`);
  
  // Look for technology/IP
  const techMatch = text.match(/(?:technology|patent|IP|proprietary)[:\s]*([^\n.]+)/gi);
  if (techMatch) usp.push(`- ${techMatch[0]}`);
  
  return usp.length > 0 ? usp.join('\n') : '- Innovative technology\n- Strong competitive positioning\n- Scalable business model';
}

// Extract fundraise details
function extractFundraiseDetails(text) {
  const details = [];
  
  // Look for fundraise amount
  const raiseMatch = text.match(/(?:raising|funding|investment)[:\s]*[₹$]?[\d,.]+(M|K|Cr|L)?/gi);
  if (raiseMatch) details.push(`Currently raising ${raiseMatch[0]}`);
  
  // Look for valuation
  const valuationMatch = text.match(/valuation[:\s]*[₹$]?[\d,.]+(M|K|Cr|L)?/gi);
  if (valuationMatch) details.push(`Valuation: ${valuationMatch[0]}`);
  
  // Look for use of funds
  const useMatch = text.match(/(?:use of funds|funds will)[:\s]*([^\n.]+)/gi);
  if (useMatch) details.push(`Use of funds: ${useMatch[0]}`);
  
  return details.length > 0 ? details.join('\n') : 'Currently raising funds to accelerate growth and expansion.';
}

// Extract contact information
function extractContactInfo(text) {
  const contact = [];
  
  const phoneMatch = text.match(/(?:\+91|\+1)?[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/g);
  if (phoneMatch) contact.push(`📞 ${phoneMatch[0]}`);
  
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  if (emailMatch) contact.push(`✉️ ${emailMatch[0]}`);
  
  return contact.length > 0 ? contact.join(' | ') : '[Contact Info]';
}

// Heuristic-based analysis
function analyzeText(text = "") {
  const lc = text.toLowerCase();
  const score = (cond, pts) => (cond ? pts : 0);

  const checks = {
    problemSolution: score(lc.includes("problem") && lc.includes("solution"), 8),
    market: score(lc.includes("market"), 7),
    businessModel: score(/revenue|business model/.test(lc), 8),
    traction: Math.min(10, (lc.match(/users|customers|revenue|growth/g) || []).length * 2),
    team: score(/team|experience|founder/g.test(lc), 8),
    competitive: score(/competitive|advantage|moat/.test(lc), 6),
    gtm: score(/marketing|sales|distribution/.test(lc), 7),
    financials: score(/funding|investment|raise/.test(lc), 7),
    exit: score(/exit|acquisition|ipo/.test(lc), 6),
    alignment: score(lc.includes("investor") || lc.includes("portfolio"), 7),
  };

  const breakdown = [
    { key: 1, name: "Problem & Solution Fit", score: Math.min(10, checks.problemSolution || 5) },
    { key: 2, name: "Market Size & Opportunity", score: Math.min(10, checks.market || 6) },
    { key: 3, name: "Business Model", score: Math.min(10, checks.businessModel || 6) },
    { key: 4, name: "Traction & Metrics", score: Math.min(10, checks.traction || 5) },
    { key: 5, name: "Team", score: Math.min(10, checks.team || 7) },
    { key: 6, name: "Competitive Advantage", score: Math.min(10, checks.competitive || 5) },
    { key: 7, name: "Go-To-Market Strategy", score: Math.min(10, checks.gtm || 6) },
    { key: 8, name: "Financials & Ask", score: Math.min(10, checks.financials || 6) },
    { key: 9, name: "Exit Potential", score: Math.min(10, checks.exit || 6) },
    { key: 10, name: "Alignment with Investor", score: Math.min(10, checks.alignment || 6) },
  ];

  const total = breakdown.reduce((s, x) => s + x.score, 0);
  const status = total < 60 ? "red" : total < 75 ? "yellow" : "green";

  const questions = [
    "What specific customer segment feels the pain most acutely?",
    "What is your current CAC and LTV, and how will they evolve?",
    "Which distribution channel shows the best early traction?",
    "What are the top 2 competitive moats you are building?",
    "How will the funds raised extend runway and key milestones?",
  ];

  return { breakdown, total, status, questions };
}

exports.analyzeDeck = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded. Use field name 'deck'" });

    const text = await extractTextFromFile(req.file.path, req.file.originalname);
    console.log('Extracted text length:', text.length);

    if (!text || text.length < 50) {
      return res.status(400).json({ error: "Could not extract sufficient text from the document" });
    }

    // Use AI analysis with Gemini
    const aiAnalysis = await analyzeWithAI(text);
    
    if (aiAnalysis) {
      return res.status(200).json({
        success: true,
        data: {
          schema: aiAnalysis,
          aiRaw: aiAnalysis,
          email: { subject: aiAnalysis.email_template?.split('\n')[0]?.replace('Subject: ', '') || "", body: aiAnalysis.email_template || "", highlights: [] },
          rawTextPreview: text.slice(0, 2000),
        }
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
            status: (local.status || 'yellow').toUpperCase(),
            total_score: Math.round((local.total / local.breakdown.length) * 10),
          },
          scorecard: Object.fromEntries(local.breakdown.map(b => [b.name, b.score])),
          suggested_questions: local.questions,
          email_template: generateEmailFromText(text, companyName, founderName, sector, fundingAmount),
          highlights: [`Analysis of ${companyName}`, "Document-based scoring", "Heuristic evaluation"]
        },
        aiRaw: null,
        email: { subject: "", body: "", highlights: [] },
        rawTextPreview: text.slice(0, 2000),
      }
    });
  } catch (e) {
    console.error("analyzeDeck error", e);
    res.status(500).json({ error: e.message });
  } finally {
    try { req.file && fs.unlinkSync(req.file.path); } catch {}
  }
};

// New endpoint for document-based email pre-filling
exports.extractAndPrefill = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded. Use field name 'document'" });
    }

    const text = await extractTextFromFile(req.file.path, req.file.originalname);
    console.log('Extracted text for prefill:', text.length, 'chars');

    if (!text || text.length < 50) {
      return res.status(400).json({ error: "Could not extract sufficient text from the document" });
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
      email: extractEmail(text)
    };
    
    const investorName = req.body.investorName || '[Investor Name]';
    
    const subject = `Investment – ${templateData.companyName}`;
    const body = generateEmailFromText(text, templateData.companyName, templateData.founderName, templateData.sector, templateData.fundingAmount);
    
    const emailTemplate = { subject, body };

    // Return successful response with template
    res.json({
      success: true,
      data: {
        extractedData: templateData,
        emailTemplate,
        rawTextPreview: text.slice(0, 1000),
        aiProcessed: true,
        fallbackUsed: false
      }
    });

  } catch (error) {
    console.error('Extract and prefill error:', error);
    res.status(500).json({ error: error.message || 'Failed to process document' });
  } finally {
    try { req.file && fs.unlinkSync(req.file.path); } catch {}
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
      path: req.file.path
    };
    
    // Clean up test file
    try {
      fs.unlinkSync(req.file.path);
    } catch {}
    
    res.json({ 
      success: true, 
      message: 'File upload test successful',
      fileInfo
    });
  } catch (error) {
    console.error('Test upload error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.enhanceEmail = async (req, res) => {
  try {
    const { emailBody, tone } = req.body;
    
    if (!emailBody) {
      return res.status(400).json({ error: "Email body is required" });
    }
    
    // This would typically use AI to enhance the email
    // For now, return the original email
    res.json({ 
      success: true, 
      data: { 
        options: [{
          version: 1,
          subject: "Enhanced: Investment Opportunity",
          body: emailBody,
          improvements: ["Original email returned"]
        }]
      }
    });
  } catch (error) {
    console.error('Enhance email error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.optimizeSubject = async (req, res) => {
  try {
    const { currentSubject, companyName } = req.body;
    
    const options = [
      `Investment Opportunity - ${companyName || '[Company]'}`,
      `Partnership Discussion - ${companyName || '[Company]'}`,
      `Funding Round - ${companyName || '[Company]'}`,
      `Quick Chat - ${companyName || '[Company]'} Opportunity`
    ];
    
    res.json({ options });
  } catch (error) {
    console.error('Optimize subject error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.draftReply = async (req, res) => {
  try {
    const { originalEmail, replyType } = req.body;
    
    const variants = [
      "Thank you for your interest. I'd be happy to schedule a call to discuss further.",
      "I appreciate you taking the time to review our opportunity. When would be a good time to connect?",
      "Thanks for your response. I'll send over our deck and we can set up a meeting."
    ];
    
    const tips = [
      "Keep the response concise and professional",
      "Suggest specific next steps",
      "Include relevant attachments if mentioned"
    ];
    
    res.json({ variants, tips });
  } catch (error) {
    console.error('Draft reply error:', error);
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
      message: "Investor matching feature coming soon"
    });
  } catch (error) {
    console.error('Match investors error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.regenerateTemplate = async (req, res) => {
  try {
    const { companyData, investorName } = req.body;
    
    if (!companyData) {
      return res.status(400).json({ error: "Company data is required" });
    }
    
    const subject = `Investment Opportunity - ${companyData.companyName || '[Company Name]'}`;
    const body = generateEmailFromText(
      companyData.rawText || '',
      companyData.companyName || '[Company Name]',
      companyData.founderName || '[Founder Name]',
      companyData.sector || '[Sector]',
      companyData.fundingAmount || '[Funding Amount]'
    );
    
    res.json({ 
      success: true, 
      data: { 
        emailTemplate: { subject, body } 
      } 
    });
  } catch (error) {
    console.error('Regenerate template error:', error);
    res.status(500).json({ error: error.message });
  }
};