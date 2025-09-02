require('dotenv').config();

async function testGemini() {
  const geminiKey = process.env.GEMINI_API_KEY;
  
  if (!geminiKey) {
    console.log('❌ GEMINI_API_KEY not found in environment variables');
    return;
  }
  
  console.log('✅ GEMINI_API_KEY found');
  console.log('🔍 Testing Gemini API...');
  
  const prompt = `Analyze this startup pitch: 
Company: Innovexa Technologies
Problem: Urban traffic congestion costs $150B annually
Solution: AI-powered micro-mobility platform
Market: TAM = $500B
Traction: 50,000 users, $1.2M ARR

Return JSON with score out of 100 and brief analysis.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log('✅ Gemini API Response:');
      console.log(content);
    } else {
      console.log('❌ Gemini API Error:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('Error details:', errorText);
    }
  } catch (error) {
    console.log('❌ Network Error:', error.message);
  }
}

testGemini();