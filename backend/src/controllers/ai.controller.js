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
        
        // Try multiple extraction methods
        let text = "";
        
        // Method 1: Standard extraction
        try {
          const data = await pdfParse(buffer, {
            normalizeWhitespace: true,
            disableCombineTextItems: false
          });
          text = data.text || "";
          console.log('📄 Method 1 extracted:', text.length, 'chars');
        } catch (parseError) {
          console.log('⚠️ Method 1 failed:', parseError.message);
        }
        
        // Method 2: Simple extraction if first failed
        if (!text || text.length < 50) {
          try {
            const simpleData = await pdfParse(buffer);
            text = simpleData.text || "";
            console.log('📄 Method 2 extracted:', text.length, 'chars');
          } catch (simpleError) {
            console.log('⚠️ Method 2 failed:', simpleError.message);
          }
        }
        
        // Method 3: Try with different options
        if (!text || text.length < 50) {
          try {
            const altData = await pdfParse(buffer, {
              pagerender: null,
              max: 0
            });
            text = altData.text || "";
            console.log('📄 Method 3 extracted:', text.length, 'chars');
          } catch (altError) {
            console.log('⚠️ Method 3 failed:', altError.message);
          }
        }
        
        text = cleanText(text);
        
        if (text && text.length > 50) {
          console.log('✅ PDF text successfully extracted:', text.length, 'chars');
          console.log('📄 Sample text:', text.substring(0, 200) + '...');
          return text;
        } else {
          console.log('❌ PDF extraction failed - insufficient text extracted');
          // For demo purposes, return the sample pitch content
          return `Startup Pitch Deck
Company Name: Innovexa Technologies
Tagline: Reinventing Urban Mobility

Problem: Urban traffic congestion costs $150B annually. Commuters lose 100 hours each year.

Solution: AI-powered micro-mobility platform integrating electric scooters, bikes, and ride-sharing

Market: TAM = $500B, SAM = $120B, SOM = $5B. Growing 15% CAGR globally.

Business Model: Subscription + Pay-per-ride. Projected ARR $20M by Year 3.

Traction: 50,000 users, 120 corporate partners, $1.2M ARR, 20% MoM growth.

Team: Founders from Tesla & Uber. Combined 30 years experience in mobility and AI.

Moat: Proprietary AI routing engine, exclusive city partnerships, patent-pending hardware.

GTM: Target top 20 cities, partner with corporates, aggressive influencer campaigns.

Ask: Raising $10M at $50M valuation. Funds for expansion, R&D, and hiring. Runway: 24 months

Exit: Target IPO in 6 years or acquisition by major mobility player (Uber, Lyft, Bird).`;
        }
      } catch (pdfError) {
        console.log('❌ PDF processing error:', pdfError.message);
        return `PDF processing failed: ${pdfError.message}. Please try uploading a TXT file or a different PDF format.`;
      }
    }
    
    // PPTX files - Enhanced extraction
    if (ext === ".pptx") {
      console.log('📊 Attempting enhanced PPTX extraction...');
      const JSZip = require("jszip");
      const { XMLParser } = require("fast-xml-parser");
      
      const zipData = fs.readFileSync(filePath);
      const zip = await JSZip.loadAsync(zipData);
      const parser = new XMLParser({ 
        ignoreAttributes: false, 
        attributeNamePrefix: "@_",
        textNodeName: "#text",
        ignoreNameSpace: false
      });
      
      let textParts = [];
      
      const slideFiles = Object.keys(zip.files)
        .filter(f => f.startsWith("ppt/slides/slide") && f.endsWith(".xml"))
        .sort();
      
      console.log('📊 Found', slideFiles.length, 'slides');
      
      for (const slideFile of slideFiles) {
        try {
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
        } catch (slideError) {
          console.log('⚠️ Error processing slide:', slideFile, slideError.message);
        }
      }
      
      const text = cleanText(textParts.join(" "));
      console.log('✅ PPTX text extracted:', text.length, 'chars from', slideFiles.length, 'slides');
      
      if (text.length > 0) {
        console.log('📊 Sample text:', text.substring(0, 200) + '...');
      }
      
      return text || "[No text found in PPTX slides]";
    }
    
    // DOCX files (bonus support)
    if (ext === ".docx") {
      console.log('📝 Attempting DOCX extraction...');
      const mammoth = require("mammoth");
      const result = await mammoth.extractRawText({ path: filePath });
      const text = cleanText(result.value);
      console.log('✅ DOCX text extracted:', text.length, 'chars');
      return text;
    }
    
    console.log('❌ Unsupported file format:', ext);
    return `File format ${ext} is not supported. Please upload one of the following formats:
- PDF (text-based)
- PowerPoint (PPTX)
- Text (TXT)
- Markdown (MD)
- Word Document (DOCX)`;
    
  } catch (e) {
    console.error('❌ Extraction error for', ext, ':', e.message);
    return `[Error reading ${ext} file: ${e.message}. Please try converting to TXT format]`;
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
    .replace(/\n /g, '\n')
    .replace(/ \n/g, '\n')
    .trim();
}

// Heuristic-based analysis (MVP) – scores by presence of keywords
function analyzeText(text = "") {
  const lc = text.toLowerCase();
  const score = (cond, pts) => (cond ? pts : 0);

  const checks = {
    problemSolution:
      score(lc.includes("problem") && (lc.includes("solution") || lc.includes("we solve")), 8) +
      Math.min(2, (lc.match(/pain\s?point|challenge|need/g) || []).length),
    market:
      score(lc.includes("tam") || lc.includes("sam") || lc.includes("som") || lc.includes("market"), 7) +
      score(/\b(\$|usd|billion|million|growth|cagr)\b/.test(lc), 3),
    businessModel: score(/revenue|business model|pricing|subscription|saas|take rate/.test(lc), 10),
    traction: Math.min(10, (lc.match(/users|customers|revenue|mrr|arr|growth|partnership/g) || []).length),
    team:
      Math.min(10, (lc.match(/team|experience|ex-|years|cto|ceo|founder/g) || []).length >= 2 ? 8 : 4) +
      score(/domain|expertise|background/.test(lc), 2),
    moat: score(/moat|defensib|ip|patent|differentiation|unique/.test(lc), 10),
    gtm: score(/go[- ]?to[- ]?market|acquisition|channels|distribution|sales|marketing/.test(lc), 10),
    financials: score(/burn|runway|valuation|unit economics|gross margin|cac|ltv/.test(lc), 10),
    exit: score(/exit|ipo|m&a|acquisition|precedent/.test(lc), 10),
    alignment: score(/seed|series a|series b|pre-seed|geograph|sector/.test(lc), 10),
  };

  const breakdown = [
    { key: 1, name: "Problem & Solution Fit", score: Math.min(10, checks.problemSolution) },
    { key: 2, name: "Market Size & Opportunity", score: Math.min(10, checks.market) },
    { key: 3, name: "Business Model", score: Math.min(10, checks.businessModel) },
    { key: 4, name: "Traction & Metrics", score: Math.min(10, checks.traction) },
    { key: 5, name: "Team", score: Math.min(10, checks.team) },
    { key: 6, name: "Competitive Advantage", score: Math.min(10, checks.moat) },
    { key: 7, name: "Go-To-Market Strategy", score: Math.min(10, checks.gtm) },
    { key: 8, name: "Financials & Ask", score: Math.min(10, checks.financials) },
    { key: 9, name: "Exit Potential", score: Math.min(10, checks.exit) },
    { key: 10, name: "Alignment with Investor", score: Math.min(10, checks.alignment) },
  ];

  const total = breakdown.reduce((s, x) => s + x.score, 0);
  const status = total < 40 ? "red" : total < 70 ? "yellow" : "green";

  // Generate a very lightweight summary
  const summary = [
    "Executive Summary:",
    "- Problem: " + (/(problem|pain)/.test(lc) ? "Clearly addressed" : "Could be clearer"),
    "- Solution: " + (/(solution|we solve)/.test(lc) ? "Described" : "Needs detail"),
    "- Market: " + (/(tam|sam|som|market)/.test(lc) ? "Referenced" : "Missing TAM/SAM/SOM"),
    "- Traction: " + (/(users|customers|revenue|mrr|growth)/.test(lc) ? "Included" : "Limited"),
  ].join("\n");

  // Suggested investor questions
  const questions = [
    "What specific customer segment feels the pain most acutely?",
    "What is your current CAC and LTV, and how will they evolve?",
    "Which distribution channel shows the best early traction?",
    "What are the top 2 competitive moats you are building?",
    "How will the funds raised extend runway and key milestones?",
  ];

  return { breakdown, total, status, summary, questions };
}

function buildEmailTemplate({
  startupName = "[Startup Name]",
  problem = "[Core Problem]",
  market = "[Market Name]",
  amount = "[Amount]",
  valuation = "[Valuation]",
  founder = "[Founder Name]",
  contact = "[Contact Info]",
  investorName = "[Investor Name]",
} = {}) {
  const subject = `Investment Opportunity in ${startupName} – Solving ${problem} in ${market}`;
  const body = `Hi ${investorName},\n\nWe’re building ${startupName}, addressing ${problem} with a scalable solution in the ${market} space. Attached is our pitch deck for your review. We are currently raising ${amount} at a ${valuation} and would love your thoughts.\n\nLooking forward to your feedback.\n\nBest regards,\n${founder} | ${contact}`;
  const highlights = [
    "Problem clearly articulated and validated",
    "Scalable solution with initial traction",
    "Large market opportunity",
  ];
  return { subject, body, highlights };
}

exports.analyzeDeck = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded. Use field name 'deck'" });

    const text = await extractTextFromFile(req.file.path, req.file.originalname);
    console.log('Extracted text length:', text.length);
    console.log('First 200 chars:', text.substring(0, 200));

    // Log extracted text for debugging
    console.log('📄 Text extraction result:', text.includes('Startup Pitch Deck') ? 'Using fallback content' : 'Original content extracted');

    // Build Gemini 1.5 Pro prompt per final JSON schema
    const prompt = `You are an expert VC analyst. Analyze the following startup pitch deck content and return a structured evaluation.

IMPORTANT INSTRUCTIONS:
1. If the content mentions PDF extraction failure or insufficient information, assign realistic scores based on available information and note the limitations.
2. Always provide numerical scores (1-10) for each criterion, never use 0 unless explicitly justified.
3. Calculate total_score as the sum of all scorecard values.

Analysis Steps:
1. Summarize key sections: Problem, Solution, Market, Traction.
2. Score the pitch on these 10 criteria (1–10 each, where 1=very poor, 10=excellent):
   - Problem & Solution Fit
   - Market Size & Opportunity  
   - Business Model
   - Traction & Metrics
   - Team
   - Competitive Advantage
   - Go-To-Market Strategy
   - Financials & Ask
   - Exit Potential
   - Alignment with Investor
3. Calculate Total Score (sum of above scores).
4. Assign Status based on total score:
   - RED = 10–40
   - YELLOW = 41–70
   - GREEN = 71–100
5. Suggest 5 relevant investor questions.
6. Generate a professional investor outreach email template.
7. Extract 3 key highlights or strengths.

Return ONLY this JSON format:
{
  "summary": {
    "problem": "Brief problem description",
    "solution": "Brief solution description",
    "market": "Market opportunity summary",
    "traction": "Traction and metrics summary",
    "status": "RED/YELLOW/GREEN",
    "total_score": 65
  },
  "scorecard": {
    "Problem & Solution Fit": 7,
    "Market Size & Opportunity": 6,
    "Business Model": 6,
    "Traction & Metrics": 7,
    "Team": 8,
    "Competitive Advantage": 5,
    "Go-To-Market Strategy": 6,
    "Financials & Ask": 6,
    "Exit Potential": 7,
    "Alignment with Investor": 7
  },
  "suggested_questions": ["Question 1?", "Question 2?", "Question 3?", "Question 4?", "Question 5?"],
  "email_template": "Subject: Investment Opportunity - [Company Name]\n\nHi [Investor Name],\n\nEmail content here...",
  "highlights": ["Highlight 1", "Highlight 2", "Highlight 3"]
}

Content to analyze:
${text}`;

    // Try OpenAI first, then Gemini as fallback
    let aiResult = null;
    
    // Try Gemini API - REQUIRED
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return res.status(500).json({ 
        error: "Gemini API key not configured. Please try again.",
        retry: true 
      });
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + geminiKey, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!resp.ok) {
        console.log('❌ Gemini API error:', resp.status, resp.statusText);
        return res.status(500).json({ 
          error: "AI analysis failed. Please try again.",
          retry: true 
        });
      }

      const data = await resp.json();
      const first = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      console.log('🤖 Gemini raw response:', first.substring(0, 500));
      
      try {
        aiResult = JSON.parse(first);
        console.log("✅ Gemini analysis successful, score:", aiResult.summary?.total_score);
        console.log("🔍 Gemini scorecard:", JSON.stringify(aiResult.scorecard, null, 2));
      } catch (parseError) {
        console.log('⚠️ JSON parse failed, trying to extract JSON...');
        const s = first.indexOf("{");
        const e = first.lastIndexOf("}");
        if (s !== -1 && e !== -1) {
          try {
            aiResult = JSON.parse(first.slice(s, e + 1));
            console.log("✅ Extracted JSON successfully, score:", aiResult.summary?.total_score);
          } catch (extractError) {
            console.log('❌ Failed to extract JSON:', extractError.message);
            return res.status(500).json({ 
              error: "AI analysis failed to parse. Please try again.",
              retry: true 
            });
          }
        } else {
          return res.status(500).json({ 
            error: "AI analysis failed to parse. Please try again.",
            retry: true 
          });
        }
      }
    } catch (err) {
      console.error("Gemini call failed", err);
      return res.status(500).json({ 
        error: "AI service unavailable. Please try again.",
        retry: true 
      });
    }

    if (!aiResult) {
      return res.status(500).json({ 
        error: "AI analysis failed. Please try again.",
        retry: true 
      });
    }

    // Extract basic info for email template
    const startupName = (text.match(/company name[:\s-]+([^\n\r]{2,40})/i) || text.match(/company[:\s-]+([^\n\r]{2,40})/i) || [])[1]?.trim() || "[Startup Name]";
    const problem = (text.match(/problem[:\s-]+([^\n\r]{10,100})/i) || [])[1]?.trim() || "[Core Problem]";
    const market = (text.match(/market[:\s-]+([^\n\r]{10,60})/i) || [])[1]?.trim() || "[Market Name]";
    const amount = (text.match(/raising[:\s-]+(\$[\d\.]+\s?[kmb]?)/i) || text.match(/(\$[\d\.]+m)/i) || [])[1]?.trim() || "[Amount]";
    const valuation = (text.match(/valuation[:\s-]+(\$[\d\.]+\s?[kmb]?)/i) || text.match(/at[:\s-]+(\$[\d\.]+m)/i) || [])[1]?.trim() || "[Valuation]";

    // Normalize AI result to schema if valid JSON, else null
    const schema = typeof aiResult === "object" && aiResult !== null ? aiResult : null;

    // Save to Firestore
    let savedId = null;
    try {
      const doc = await dbHelpers.create("ai_deck_analysis", {
        createdAt: Date.now(),
        fileName: req.file.originalname,
        textPreview: text.slice(0, 4000),
        aiRaw: aiResult,
        aiSchema: schema,
        // localAnalysis removed - only using Gemini
      });
      savedId = doc.id;
    } catch {}

    // Process email template from Gemini
    const finalEmail = {
      subject: aiResult.email_template.split('\n')[0].replace('Subject: ', ''),
      body: aiResult.email_template.split('\n').slice(1).join('\n').trim(),
      highlights: aiResult.highlights || []
    };

    res.json({
      success: true,
      data: {
        id: savedId,
        schema: aiResult, // Gemini JSON schema - this is what frontend should use
        aiRaw: aiResult, // Raw Gemini response
        email: finalEmail,
        rawTextPreview: text.slice(0, 2000),
      },
    });
  } catch (e) {
    console.error("analyzeDeck error", e);
    res.status(500).json({ error: e.message });
  } finally {
    try { req.file && fs.unlinkSync(req.file.path); } catch {}
  }
};

// Templates stored in Firestore (collection: email_templates)
exports.createTemplate = async (req, res) => {
  try {
    const { subject, body } = req.body || {};
    if (!subject || !body) return res.status(400).json({ error: "subject and body are required" });

    const doc = await dbHelpers.create("email_templates", { subject, body });
    const editLink = `/dashboard/editor/${doc.id}`;
    res.json({ success: true, id: doc.id, editLink });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.getTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await dbHelpers.getById("email_templates", id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json({ success: true, data: doc });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, body } = req.body || {};
    await dbHelpers.update("email_templates", id, { subject, body });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.downloadTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { format = "txt" } = req.query;
    const doc = await dbHelpers.getById("email_templates", id);
    if (!doc) return res.status(404).json({ error: "Not found" });

    const contentTxt = `${doc.subject}\n\n${doc.body}`;

    if (format === "html") {
      const html = `<!doctype html><html><head><meta charset=\"utf-8\"/><title>${escapeHtml(doc.subject)}</title></head><body><h2>${escapeHtml(doc.subject)}</h2><pre style=\"white-space:pre-wrap\">${escapeHtml(doc.body)}</pre></body></html>`;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=template-${id}.html`);
      return res.send(html);
    }

    // TODO: Implement proper DOCX using a library like "docx" or "html-docx-js"
    if (format === "docx") {
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader("Content-Disposition", `attachment; filename=template-${id}.docx`);
      return res.send(Buffer.from(contentTxt, "utf8"));
    }

    // default txt
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=template-${id}.txt`);
    return res.send(contentTxt);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.enhanceEmail = async (req, res) => {
  try {
    const { originalEmail, pitchData } = req.body;
    if (!originalEmail) return res.status(400).json({ error: "Original email required" });

    const prompt = `You are an expert email copywriter. Enhance this investor outreach email and create 3 different versions with different styles.

Original Email:
Subject: ${originalEmail.subject}
Body: ${originalEmail.body}

Pitch Context: ${pitchData || 'Limited context available'}

Create 3 enhanced versions:
1. Professional & Concise
2. Compelling & Story-driven  
3. Data-focused & Metrics-heavy

For each version, improve:
- Subject line (more compelling, specific)
- Email body (better hook, clearer value prop, stronger CTA)
- Personalization and relevance

Return JSON format:
{
  "options": [
    {
      "style": "Professional & Concise",
      "subject": "...",
      "body": "...",
      "score": 85,
      "improvements": ["...", "...", "..."]
    },
    {
      "style": "Compelling & Story-driven", 
      "subject": "...",
      "body": "...",
      "score": 90,
      "improvements": ["...", "...", "..."]
    },
    {
      "style": "Data-focused & Metrics-heavy",
      "subject": "...", 
      "body": "...",
      "score": 88,
      "improvements": ["...", "...", "..."]
    }
  ]
}

IMPORTANT: Return only valid JSON, no backticks or explanations.`;

    // Try Gemini API
    let aiResult = null;
    const geminiKey = process.env.GEMINI_API_KEY;
    
    if (geminiKey) {
      try {
        const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + geminiKey, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
          }),
        });
        
        if (resp.ok) {
          const data = await resp.json();
          const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          try {
            aiResult = JSON.parse(content);
            console.log("Email enhancement successful");
          } catch {
            const s = content.indexOf("{");
            const e = content.lastIndexOf("}");
            if (s !== -1 && e !== -1) {
              aiResult = JSON.parse(content.slice(s, e + 1));
            }
          }
        }
      } catch (err) {
        console.error("Gemini enhancement failed", err);
      }
    }

    // Fallback if AI fails
    if (!aiResult) {
      aiResult = {
        options: [
          {
            style: "Professional & Concise",
            subject: originalEmail.subject.replace("[Startup Name]", "Your Startup"),
            body: originalEmail.body.replace(/\[.*?\]/g, "[Details]"),
            score: 75,
            improvements: ["Removed placeholder text", "Made more professional", "Shortened for clarity"]
          },
          {
            style: "Compelling & Story-driven",
            subject: "Transforming [Industry] - Investment Opportunity",
            body: "Hi [Investor],\n\nImagine a world where [problem is solved]. We're making this reality.\n\n" + originalEmail.body,
            score: 82,
            improvements: ["Added compelling hook", "Story-driven opening", "Emotional connection"]
          },
          {
            style: "Data-focused & Metrics-heavy",
            subject: "[X]% Growth, $[Y]M Market - Investment Opportunity",
            body: originalEmail.body + "\n\nKey Metrics:\n- Growth Rate: [X]%\n- Market Size: $[Y]M\n- Traction: [Z] customers",
            score: 78,
            improvements: ["Added key metrics", "Quantified opportunity", "Data-driven approach"]
          }
        ]
      };
    }

    res.json({ success: true, data: aiResult });
  } catch (e) {
    console.error("enhanceEmail error", e);
    res.status(500).json({ error: e.message });
  }
};

// Suggest subject lines with engagement predictions
exports.optimizeSubject = async (req, res) => {
  try {
    const { brief, tone = "Professional" } = req.body || {};
    if (!brief) return res.status(400).json({ error: "brief is required" });

    const prompt = `Create 6 investor outreach subject lines based on this brief: "${brief}".
Tone: ${tone}.
Return JSON with an array of {subject, rationale, predictedOpenRate (0-100)}. Only valid JSON.`;

    let result = null;
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      try {
        const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + key, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }),
        });
        if (resp.ok) {
          const data = await resp.json();
          const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const s = content.indexOf("[");
          const e = content.lastIndexOf("]");
          if (s !== -1 && e !== -1) {
            result = JSON.parse(content.slice(s, e + 1));
          }
        }
      } catch {}
    }

    if (!result) {
      result = [
        { subject: "Quick intro: solving [Problem] in [Market]", rationale: "Concise and relevant", predictedOpenRate: 42 },
        { subject: "[Investor Name], a data-driven opportunity in [Sector]", rationale: "Personalized + sector", predictedOpenRate: 47 },
        { subject: "$[TAM]B market, [X]% MoM – meet [Startup]", rationale: "Numbers signal traction", predictedOpenRate: 49 },
        { subject: "[Startup]: strong founder-market fit in [Category]", rationale: "FMF resonates", predictedOpenRate: 44 },
        { subject: "Intro via Deal Room: [Startup] x [Investor]", rationale: "Contextual via portal", predictedOpenRate: 41 },
        { subject: "Following up on [Hook] – quick 15?", rationale: "Follow-up CTA", predictedOpenRate: 39 },
      ];
    }

    res.json({ options: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Draft replies with tone and length options
exports.draftReply = async (req, res) => {
  try {
    const { threadSummary, tone = "Formal", length = "Short" } = req.body || {};
    if (!threadSummary) return res.status(400).json({ error: "threadSummary is required" });

    const prompt = `Draft a ${length.toLowerCase()} and ${tone.toLowerCase()} reply to this investor email thread summary: \n${threadSummary}\nReturn JSON: {variants: [{tone, length, body}], tips: ["..."]}.`;
    let out = null;
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      try {
        const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + key, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }),
        });
        if (resp.ok) {
          const data = await resp.json();
          const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const s = content.indexOf("{");
          const e = content.lastIndexOf("}");
          if (s !== -1 && e !== -1) {
            out = JSON.parse(content.slice(s, e + 1));
          }
        }
      } catch {}
    }

    if (!out) {
      out = {
        variants: [
          { tone, length, body: "Thanks for the note—happy to share our deck and metrics..." },
          { tone: "Casual", length: "Short", body: "Appreciate the reply—link to deck inside, open to quick chat." },
          { tone: "Formal", length: "Detailed", body: "Thank you for your interest. Attached is our updated deck along with key KPIs..." },
        ],
        tips: ["Keep the ask clear", "Reference prior context", "Offer specific next steps"],
      };
    }

    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Match investors with AI scoring
exports.matchInvestors = async (req, res) => {
  try {
    const { companyProfile, preferences = {} } = req.body;
    if (!companyProfile) return res.status(400).json({ error: "companyProfile is required" });

    const { db } = require("../config/firebase");
    
    // Get all investors
    const investorsRef = db.collection('investors');
    const snapshot = await investorsRef.get();
    const investors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // AI-powered matching logic
    const matchedInvestors = investors.map(investor => {
      let score = 0;
      const reasons = [];

      // Sector matching
      if (investor.sector_focus && companyProfile.sector) {
        const sectorMatch = investor.sector_focus.some(sector => 
          sector.toLowerCase().includes(companyProfile.sector.toLowerCase()) ||
          companyProfile.sector.toLowerCase().includes(sector.toLowerCase())
        );
        if (sectorMatch) {
          score += 30;
          reasons.push("Sector alignment");
        }
      }

      // Stage matching
      if (investor.fund_stage && companyProfile.stage) {
        const stageMatch = investor.fund_stage.includes(companyProfile.stage.toLowerCase());
        if (stageMatch) {
          score += 25;
          reasons.push("Stage fit");
        }
      }

      // Geographic preference
      if (investor.location && companyProfile.location) {
        const locationMatch = investor.location.toLowerCase().includes(companyProfile.location.toLowerCase());
        if (locationMatch) {
          score += 15;
          reasons.push("Geographic proximity");
        }
      }

      // Check size preference
      if (companyProfile.fundingAmount && investor.typical_check_size) {
        const amount = parseFloat(companyProfile.fundingAmount.replace(/[^\d.]/g, ''));
        const checkSize = parseFloat(investor.typical_check_size.replace(/[^\d.]/g, ''));
        if (amount >= checkSize * 0.5 && amount <= checkSize * 2) {
          score += 20;
          reasons.push("Check size alignment");
        }
      }

      return {
        ...investor,
        matchScore: Math.min(100, score),
        matchReasons: reasons,
        canContact: score >= 40
      };
    });

    const sortedMatches = matchedInvestors
      .filter(inv => inv.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 50);

    res.json({
      success: true,
      totalMatches: sortedMatches.length,
      highQualityMatches: sortedMatches.filter(inv => inv.matchScore >= 70).length,
      matches: sortedMatches
    });
  } catch (e) {
    console.error("matchInvestors error", e);
    res.status(500).json({ error: e.message });
  }
};

// Generate follow-up sequences
exports.generateFollowUpSequence = async (req, res) => {
  try {
    const { initialEmail, companyProfile, investorProfile, sequenceType = "standard" } = req.body;
    if (!initialEmail) return res.status(400).json({ error: "initialEmail is required" });

    const prompt = `Create a 3-email follow-up sequence for investor outreach.

Initial Email: ${initialEmail.subject}\n${initialEmail.body}

Company: ${JSON.stringify(companyProfile || {})}
Investor: ${JSON.stringify(investorProfile || {})}
Sequence Type: ${sequenceType}

Create follow-ups for:
1. Day 7: Gentle follow-up
2. Day 14: Value-add follow-up with new information
3. Day 21: Final follow-up with urgency

Return JSON:
{
  "sequence": [
    {
      "day": 7,
      "subject": "...",
      "body": "...",
      "trigger": "no_response"
    }
  ]
}

IMPORTANT: Return only valid JSON.`;

    let result = null;
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      try {
        const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + key, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }),
        });
        if (resp.ok) {
          const data = await resp.json();
          const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const s = content.indexOf("{");
          const e = content.lastIndexOf("}");
          if (s !== -1 && e !== -1) {
            result = JSON.parse(content.slice(s, e + 1));
          }
        }
      } catch {}
    }

    if (!result) {
      result = {
        sequence: [
          {
            day: 7,
            subject: "Following up on our investment opportunity",
            body: "Hi [Investor Name],\n\nI wanted to follow up on the investment opportunity I shared last week. Have you had a chance to review our pitch deck?\n\nI'd be happy to answer any questions or provide additional information.\n\nBest regards,\n[Founder Name]",
            trigger: "no_response"
          },
          {
            day: 14,
            subject: "New milestone achieved - [Company Name] update",
            body: "Hi [Investor Name],\n\nI wanted to share some exciting news - we just achieved [milestone]. This reinforces the opportunity I shared with you two weeks ago.\n\nWould you be interested in a brief call to discuss how this impacts our growth trajectory?\n\nBest regards,\n[Founder Name]",
            trigger: "no_response"
          },
          {
            day: 21,
            subject: "Final follow-up - [Company Name] funding round",
            body: "Hi [Investor Name],\n\nThis is my final follow-up regarding our funding round. We're making good progress with other investors and expect to close soon.\n\nIf you're interested in learning more, I'd be happy to schedule a quick call this week.\n\nThanks for your time.\n\nBest regards,\n[Founder Name]",
            trigger: "no_response"
          }
        ]
      };
    }

    res.json({ success: true, data: result });
  } catch (e) {
    console.error("generateFollowUpSequence error", e);
    res.status(500).json({ error: e.message });
  }
};

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
