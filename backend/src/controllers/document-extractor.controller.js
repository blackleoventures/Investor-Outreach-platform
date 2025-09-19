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
  const prompt = `Extract structured company information from this document. Return ONLY valid JSON with these exact fields:

{
  "companyName": "actual company name from document",
  "founderName": "founder/CEO name",
  "founderTitle": "founder title/position", 
  "problem": "problem being solved",
  "solution": "solution description",
  "market": "target market/industry",
  "marketSize": "market size with numbers",
  "businessModel": "revenue model",
  "traction": "key metrics and traction",
  "fundingAmount": "funding amount being raised",
  "fundingStage": "funding stage (seed, series A, etc)",
  "useOfFunds": "how funds will be used",
  "teamBackground": "team experience and credentials",
  "competitiveAdvantage": "key differentiators",
  "revenue": "current revenue numbers",
  "customers": "customer count or key customers",
  "growth": "growth metrics",
  "location": "company location",
  "website": "company website",
  "email": "contact email",
  "phone": "contact phone",
  "sector": "industry sector",
  "stage": "company stage"
}

Extract REAL data from the document. If a field is not found, use null. Do not use placeholders.

Document content:
${text}`;

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

// Generate pre-filled email template
function generateEmailTemplate(structuredData, investorName = "[Investor Name]") {
  if (!structuredData) {
    return {
      subject: "Investment Opportunity - [Company Name]",
      body: `Hi ${investorName},

I hope you are well. I'm reaching out to share a brief overview of [Company Name], where we are solving [Core Problem] in the [Market] space.

In the past [timeframe], we've achieved:
• Traction: [key metrics — users, revenue, growth]
• Product: [brief product/tech edge]  
• Team: [notable credentials]

We're currently raising [Amount] to [use of funds], and we believe this aligns with your focus on [sector/stage]. I'd appreciate the chance to share our deck and get your feedback.

Would you be open to a 15-minute call this week or next?

Best regards,
[Your Name]
[Title], [Company Name]
[Contact Information]`
    };
  }

  const {
    companyName,
    founderName,
    founderTitle,
    problem,
    solution,
    market,
    marketSize,
    traction,
    fundingAmount,
    fundingStage,
    useOfFunds,
    teamBackground,
    competitiveAdvantage,
    revenue,
    customers,
    growth,
    sector,
    email,
    phone
  } = structuredData;

  const subject = `Investment Opportunity - ${companyName || '[Company Name]'} | ${problem || 'Innovative Solution'} in ${market || '[Market]'}`;

  const body = `Hi ${investorName},

I hope you are well. I'm ${founderName || '[Founder Name]'}, ${founderTitle || 'Founder'} of ${companyName || '[Company Name]'}, where we are solving ${problem || '[core problem]'} in the ${market || '[market]'} space.

${solution ? `Our solution: ${solution}` : ''}

${marketSize ? `Market Opportunity: ${marketSize}` : ''}

Key highlights:
${traction ? `• Traction: ${traction}` : '• Traction: [key metrics]'}
${revenue ? `• Revenue: ${revenue}` : ''}
${customers ? `• Customers: ${customers}` : ''}
${growth ? `• Growth: ${growth}` : ''}
${teamBackground ? `• Team: ${teamBackground}` : '• Team: [notable credentials]'}
${competitiveAdvantage ? `• Advantage: ${competitiveAdvantage}` : ''}

We're currently raising ${fundingAmount || '[Amount]'} ${fundingStage ? `(${fundingStage})` : ''} to ${useOfFunds || '[use of funds]'}, and we believe this aligns with your focus on ${sector || '[sector]'}.

I'd appreciate the chance to share our deck and get your feedback.

Would you be open to a 15-minute call this week or next?

Best regards,
${founderName || '[Your Name]'}
${founderTitle || '[Title]'}, ${companyName || '[Company Name]'}
${email || '[Email]'} | ${phone || '[Phone]'}`;

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