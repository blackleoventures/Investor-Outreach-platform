const fs = require("fs");
const path = require("path");

// Enhanced document extraction with structured data output
async function extractStructuredData(filePath, originalName) {
  const ext = path.extname(originalName || filePath).toLowerCase();
  console.log('🔍 Extracting structured data from:', originalName, 'Extension:', ext);
  
  try {
    let text = "";
    
    // PDF extraction
    if (ext === ".pdf") {
      const pdfParse = require("pdf-parse");
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      text = data.text || "";
    }
    
    // PPTX extraction
    else if (ext === ".pptx") {
      const JSZip = require("jszip");
      const { XMLParser } = require("fast-xml-parser");
      
      const zipData = fs.readFileSync(filePath);
      const zip = await JSZip.loadAsync(zipData);
      const parser = new XMLParser({ ignoreAttributes: false });
      
      let textParts = [];
      const slideFiles = Object.keys(zip.files)
        .filter(f => f.startsWith("ppt/slides/slide") && f.endsWith(".xml"))
        .sort();
      
      for (const slideFile of slideFiles) {
        const xml = await zip.files[slideFile].async("string");
        const json = parser.parse(xml);
        
        const extractText = (obj) => {
          if (!obj || typeof obj !== "object") return;
          if (obj["a:t"]) {
            const text = typeof obj["a:t"] === "object" ? obj["a:t"]["#text"] || obj["a:t"] : obj["a:t"];
            if (text) textParts.push(String(text));
          }
          Object.values(obj).forEach(value => {
            if (Array.isArray(value)) {
              value.forEach(extractText);
            } else if (typeof value === "object") {
              extractText(value);
            }
          });
        };
        
        extractText(json);
      }
      text = textParts.join(" ");
    }
    
    // DOCX extraction
    else if (ext === ".docx") {
      const mammoth = require("mammoth");
      const result = await mammoth.extractRawText({ path: filePath });
      text = result.value;
    }
    
    // TXT/MD extraction
    else if (ext === ".txt" || ext === ".md") {
      text = fs.readFileSync(filePath, "utf8");
    }
    
    else {
      throw new Error(`Unsupported file format: ${ext}`);
    }
    
    // Clean and structure the text
    text = cleanText(text);
    
    // Extract structured data using AI
    const structuredData = await extractDataWithAI(text);
    
    return {
      rawText: text,
      structuredData,
      success: true
    };
    
  } catch (error) {
    console.error('❌ Document extraction error:', error.message);
    return {
      rawText: "",
      structuredData: null,
      success: false,
      error: error.message
    };
  }
}

// AI-powered data extraction
async function extractDataWithAI(text) {
  const prompt = `You are an expert investment research assistant. Analyze this pitch deck text and extract ONLY real data.

EXAMPLE OUTPUT (based on Digilanxer case):
{
  "companyName": "Digilanxer",
  "sector": "SaaS/AI/Digital Marketing Platform", 
  "problem": "Addressing pain points of transparency, freelancer vetting, and work tracking in digital marketing",
  "solution": "AI-driven digital marketing tools, certified freelancers, and transparent project tracking—a one-stop solution for SMEs, startups, and enterprises",
  "keyHighlights": [
    "Projected 20x growth in the next 5 years (CAGR of 168%)",
    "Targeting $7,32,285 revenue in Year 1 → $32,26,562 in Year 2 → $1,02,93,668 in Year 3",
    "Market opportunity: Global digital marketing software market to grow from $76.27 Bn (2023) → $253.49 Bn (2031), CAGR 16.21%",
    "Strong founding team with 20+ years of combined industry expertise"
  ],
  "productEdge": [
    "AI-powered marketing strategies and analytics",
    "Built-in video/audio freelancer interviews & work monitoring tools", 
    "Certified & verified digital marketers onboarded on platform",
    "Competitive subscription + commission-based revenue models"
  ],
  "fundraiseDetails": {
    "amount": "$5M",
    "valuation": "$79.4M pre-money valuation",
    "dilution": "13% dilution",
    "useOfFunds": [
      "Marketing & GTM execution (55%)",
      "Product enhancement & in-house tool development",
      "Cybersecurity, compliance & risk management", 
      "Expansion into global markets & strategic partnerships"
    ]
  },
  "founderName": "Not disclosed in deck",
  "phone": "+1 707 225 8072",
  "email": "info@digilanxer.com",
  "brandName": "Digilanxer",
  "brandType": "Digital marketing platform",
  "positioning": "Revolutionary digital marketing platform designed to transform the way businesses and freelancers collaborate",
  "existingInvestors": "Strong founding team with 20+ years of combined industry expertise",
  "uniqueSellingProposition": "AI-driven digital marketing tools with certified freelancers and transparent project tracking",
  "revenueGrowth": "Projected 20x growth in next 5 years (CAGR 168%)",
  "marketSize": "Global digital marketing software market: $76.27 Bn (2023) → $253.49 Bn (2031), CAGR 16.21%",
  "fundraiseAmount": "$5M",
  "sector": "SaaS/AI/Digital Marketing"
}

CRITICAL EXTRACTION RULES:
✅ Find the ACTUAL company name from document (not generic terms)
✅ Extract REAL numbers with currency symbols (₹/$) and units (Cr/Mn/K)  
✅ Copy exact revenue projections, growth rates, market size
✅ Find real contact details (phone, email, founder names)
✅ Extract actual problem/solution statements from deck
✅ Get real USPs and competitive advantages
✅ Find actual fundraise amount, valuation, dilution %
✅ Extract real use of funds breakdown
✅ If any field not found in document, write "Not disclosed in deck"
✅ NO generic placeholders like "Company Name" or "[Amount]"

NOW ANALYZE THIS DOCUMENT TEXT AND EXTRACT REAL DATA:
${text}

Return ONLY valid JSON with extracted real data:`;

  try {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      throw new Error("Gemini API key not configured");
    }

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
      throw new Error(`Gemini API error: ${response.status}`);
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
    
    throw new Error("No valid JSON found in AI response");
    
  } catch (error) {
    console.error("AI extraction failed:", error.message);
    return null;
  }
}

// Generate pre-filled email template based on extracted data
function generateEmailTemplate(structuredData, investorName = "[Investor's Name]") {
  console.log('🔄 Generating email template with data:', structuredData);
  if (!structuredData) {
    return {
      subject: "Investment Opportunity - [Company Name]",
      body: `Dear ${investorName},

Hope you're doing well.

I'm reaching out to share an exciting investment opportunity in [Company Name].

Key Highlights:
- [Key Highlight 1]
- [Key Highlight 2]
- [Key Highlight 3]

Fundraise Details:
Currently raising [Amount] to accelerate growth.

If this aligns with your investment thesis, we'd be glad to share our deck and set up a call.

Looking forward to hearing from you.

Best regards,
[Your Name]
[Your Title]
[Company Name]`
    };
  }

  const {
    brandName,
    brandType,
    positioning,
    tagline,
    existingInvestors,
    uniqueSellingProposition,
    revenueGrowth,
    marketSize,
    grossMargins,
    channels,
    repeatRate,
    ratings,
    retention,
    usp1,
    usp2,
    usp3,
    fundraiseAmount,
    keyPurpose,
    useOfFund1,
    useOfFund2,
    useOfFund3,
    sector,
    founderName,
    firmName,
    phone,
    email,
    companyName
  } = structuredData;

  const finalBrandName = brandName || companyName || '[Brand Name]';
  const finalTagline = tagline || positioning || '[Short Tagline]';
  
  // Use extracted data intelligently
  const finalCompanyName = structuredData.companyName || finalBrandName;
  const companySector = structuredData.sector || sector || brandType || 'Not disclosed in deck';
  const companyProblem = structuredData.problem || 'Not disclosed in deck';
  const companySolution = structuredData.solution || uniqueSellingProposition || 'Not disclosed in deck';
  
  const subject = `Investment Opportunity in ${finalCompanyName} – ${companySector}`;

  // Extract key highlights from structured data
  const keyHighlights = structuredData.keyHighlights || [];
  const productEdge = structuredData.productEdge || [];
  const fundraiseDetails = structuredData.fundraiseDetails || {};
  const useOfFunds = fundraiseDetails.useOfFunds || [];

  // Format key highlights - prioritize extracted data
  const highlightsBullets = keyHighlights.length > 0 
    ? keyHighlights.map(h => `• ${h}`).join('\n')
    : `• Growth: ${revenueGrowth || structuredData.revenueGrowth || 'Not disclosed in deck'}
• Market Size: ${structuredData.marketSize || marketSize || 'Not disclosed in deck'}  
• Revenue Projections: ${structuredData.revenue || 'Not disclosed in deck'}
• Traction: ${structuredData.traction || 'Not disclosed in deck'}`;

  // Format product edge - prioritize extracted data
  const productEdgeBullets = productEdge.length > 0
    ? productEdge.map(p => `• ${p}`).join('\n')
    : `• ${structuredData.uniqueSellingProposition || uniqueSellingProposition || 'Not disclosed in deck'}
• ${structuredData.competitiveAdvantage || 'Not disclosed in deck'}  
• ${structuredData.businessModel || 'Not disclosed in deck'}`;

  // Format use of funds - prioritize extracted data
  const useOfFundsBullets = useOfFunds.length > 0
    ? useOfFunds.map(u => `• ${u}`).join('\n')
    : `• ${useOfFund1 || 'Not disclosed in deck'}
• ${useOfFund2 || 'Not disclosed in deck'}
• ${useOfFund3 || 'Not disclosed in deck'}`;

  // Format fundraise details
  const finalFundraiseAmount = fundraiseDetails.amount || structuredData.fundraiseAmount || 'Not disclosed in deck';
  const valuation = fundraiseDetails.valuation || 'Not disclosed in deck';
  const dilution = fundraiseDetails.dilution || 'Not disclosed in deck';

  const body = `Dear ${investorName},

Hope you're doing well.

I'm reaching out to share an exciting investment opportunity in ${finalCompanyName}, a ${companySector} company.

${companyProblem !== 'Not disclosed in deck' ? `Problem: ${companyProblem}\n\nSolution: ${companySolution}\n\n` : ''}📈 Key Highlights:
${highlightsBullets}

🔧 Product Edge:
${productEdgeBullets}

💸 Fundraise Details:
Currently raising ${finalFundraiseAmount}${valuation !== 'Not disclosed in deck' ? ` at ${valuation}` : ''}${dilution !== 'Not disclosed in deck' ? ` (${dilution})` : ''}.

${useOfFunds.length > 0 ? `Funds will be used for:\n${useOfFundsBullets}` : ''}

If this aligns with your portfolio thesis in ${companySector}, we'd be glad to share the deck and set up a quick call with the founders.

Warm regards,
${founderName || structuredData.founderName || '[Founder/IR Name]'}
📞 ${phone || structuredData.phone || '[Contact Number]'} | ✉️ ${email || structuredData.email || '[Email]'}`;

  return { subject, body };
}

// Clean text helper
function cleanText(text) {
  if (!text) return "";
  
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n /g, '\n')
    .replace(/ \n/g, '\n')
    .trim();
}

// Main endpoint for document extraction and email pre-filling
exports.extractAndPrefill = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: "No file uploaded. Use field name 'document'" 
      });
    }

    console.log('📄 Processing file:', req.file.originalname);

    // Extract structured data from document
    const result = await extractStructuredData(req.file.path, req.file.originalname);

    if (!result.success) {
      return res.status(400).json({
        error: `Failed to extract data: ${result.error}`
      });
    }

    // Generate email template
    const investorName = req.body.investorName || "[Investor Name]";
    const emailTemplate = generateEmailTemplate(result.structuredData, investorName);

    // Save extraction result to database (optional)
    try {
      const { dbHelpers } = require("../config/firebase-db.config");
      await dbHelpers.create("document_extractions", {
        fileName: req.file.originalname,
        extractedData: result.structuredData,
        emailTemplate,
        createdAt: Date.now()
      });
    } catch (dbError) {
      console.warn("Failed to save to database:", dbError.message);
    }

    res.json({
      success: true,
      data: {
        extractedData: result.structuredData,
        emailTemplate,
        rawTextPreview: result.rawText.slice(0, 1000)
      }
    });

  } catch (error) {
    console.error("Extract and prefill error:", error);
    res.status(500).json({ 
      error: error.message || "Failed to process document" 
    });
  } finally {
    // Clean up uploaded file
    try {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (cleanupError) {
      console.warn("File cleanup failed:", cleanupError.message);
    }
  }
};

// Endpoint to generate email from existing data
exports.generateEmail = async (req, res) => {
  try {
    const { companyData, investorName, template } = req.body;

    if (!companyData) {
      return res.status(400).json({ 
        error: "Company data is required" 
      });
    }

    const emailTemplate = generateEmailTemplate(companyData, investorName);

    res.json({
      success: true,
      emailTemplate
    });

  } catch (error) {
    console.error("Generate email error:", error);
    res.status(500).json({ 
      error: error.message || "Failed to generate email" 
    });
  }
};

module.exports = exports;