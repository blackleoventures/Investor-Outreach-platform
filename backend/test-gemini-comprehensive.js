require('dotenv').config();

async function testGeminiComprehensive() {
  const geminiKey = process.env.GEMINI_API_KEY;
  
  if (!geminiKey) {
    console.log('❌ GEMINI_API_KEY not found in environment variables');
    return;
  }
  
  console.log('✅ GEMINI_API_KEY found');
  console.log('🔍 Running comprehensive Gemini API tests...\n');
  
  // Test 1: Simple request
  console.log('📝 Test 1: Simple request');
  await testSimpleRequest(geminiKey);
  
  // Test 2: Complex JSON request (like the actual app)
  console.log('\n📝 Test 2: Complex JSON request (like actual app)');
  await testComplexJsonRequest(geminiKey);
  
  // Test 3: Large content request
  console.log('\n📝 Test 3: Large content request');
  await testLargeContentRequest(geminiKey);
  
  // Test 4: Multiple rapid requests (rate limit test)
  console.log('\n📝 Test 4: Multiple rapid requests (rate limit test)');
  await testRapidRequests(geminiKey);
  
  console.log('\n✅ All tests completed!');
}

async function testSimpleRequest(apiKey) {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Hello, respond with "API Working"' }] }],
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log('✅ Simple request successful:', content.trim());
    } else {
      console.log('❌ Simple request failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('Error details:', errorText);
    }
  } catch (error) {
    console.log('❌ Simple request error:', error.message);
  }
}

async function testComplexJsonRequest(apiKey) {
  const prompt = `You are an expert VC analyst. Analyze the following startup pitch deck content and return a structured evaluation.

IMPORTANT INSTRUCTIONS:
1. Always provide numerical scores (1-10) for each criterion, never use 0 unless explicitly justified.
2. Calculate total_score as the sum of all scorecard values.

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
  "email_template": "Subject: Investment Opportunity - [Company Name]\\n\\nHi [Investor Name],\\n\\nEmail content here...",
  "highlights": ["Highlight 1", "Highlight 2", "Highlight 3"]
}

Content to analyze:
Startup Pitch Deck
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

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log('✅ Complex JSON request successful');
      
      // Try to parse JSON
      try {
        const jsonStart = content.indexOf('{');
        const jsonEnd = content.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonStr = content.slice(jsonStart, jsonEnd + 1);
          const parsed = JSON.parse(jsonStr);
          console.log('✅ JSON parsing successful');
          console.log('📊 Total Score:', parsed.summary?.total_score);
          console.log('📈 Status:', parsed.summary?.status);
        } else {
          console.log('⚠️ No JSON found in response');
          console.log('Response preview:', content.substring(0, 200));
        }
      } catch (parseError) {
        console.log('⚠️ JSON parsing failed:', parseError.message);
        console.log('Response preview:', content.substring(0, 200));
      }
    } else {
      console.log('❌ Complex JSON request failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('Error details:', errorText);
    }
  } catch (error) {
    console.log('❌ Complex JSON request error:', error.message);
  }
}

async function testLargeContentRequest(apiKey) {
  // Create a large content string
  const largeContent = `
    Startup Pitch Deck - Extended Version
    Company Name: Innovexa Technologies
    Tagline: Reinventing Urban Mobility Through AI
    
    ${'Executive Summary: '.repeat(100)}
    ${'Problem Statement: Urban traffic congestion is a massive global issue affecting billions of people daily. '.repeat(50)}
    ${'Solution Overview: Our AI-powered micro-mobility platform revolutionizes urban transportation. '.repeat(50)}
    ${'Market Analysis: The global mobility market represents a trillion-dollar opportunity. '.repeat(50)}
    ${'Business Model: We operate on a dual revenue model combining subscriptions and pay-per-ride. '.repeat(50)}
    ${'Traction Metrics: We have achieved significant milestones in user acquisition and revenue growth. '.repeat(50)}
  `;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `Analyze this content and return a brief summary: ${largeContent}` }] }],
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log('✅ Large content request successful');
      console.log('📏 Response length:', content.length, 'characters');
    } else {
      console.log('❌ Large content request failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('Error details:', errorText);
    }
  } catch (error) {
    console.log('❌ Large content request error:', error.message);
  }
}

async function testRapidRequests(apiKey) {
  const requests = [];
  const startTime = Date.now();
  
  // Send 5 rapid requests
  for (let i = 1; i <= 5; i++) {
    requests.push(
      fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `Request ${i}: What is 2+2?` }] }],
        }),
      })
    );
  }
  
  try {
    const responses = await Promise.all(requests);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    let successCount = 0;
    let rateLimitCount = 0;
    
    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      if (response.ok) {
        successCount++;
      } else if (response.status === 429) {
        rateLimitCount++;
      }
      console.log(`Request ${i + 1}: ${response.status} ${response.statusText}`);
    }
    
    console.log(`✅ Rapid requests completed in ${duration}ms`);
    console.log(`📊 Success: ${successCount}/5, Rate Limited: ${rateLimitCount}/5`);
    
    if (rateLimitCount > 0) {
      console.log('⚠️ Rate limiting detected!');
    } else {
      console.log('✅ No rate limiting issues');
    }
  } catch (error) {
    console.log('❌ Rapid requests error:', error.message);
  }
}

// Run the comprehensive test
testGeminiComprehensive();