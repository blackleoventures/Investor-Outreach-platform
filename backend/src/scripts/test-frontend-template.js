const fs = require('fs');
const path = require('path');

async function main() {
  const backend = process.env.BACKEND_URL || 'http://localhost:5000';
  const filePath = path.resolve(process.cwd(), 'Cosmedream Deck.pdf');
  
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    process.exit(1);
  }

  // Read file as buffer
  const fileBuffer = fs.readFileSync(filePath);
  const boundary = '----formdata-boundary-' + Math.random().toString(36);
  
  // Create multipart form data manually
  const formData = Buffer.concat([
    Buffer.from(`--${boundary}\r\n`),
    Buffer.from(`Content-Disposition: form-data; name="deck"; filename="Cosmedream Deck.pdf"\r\n`),
    Buffer.from(`Content-Type: application/pdf\r\n\r\n`),
    fileBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]);

  const url = `${backend}/api/ai/analyze-deck`;
  console.log('🔍 Testing what template data frontend receives...');

  try {
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      }
    });

    const json = await res.json();
    const analysis = json?.data?.schema || {};
    
    console.log('\n📊 AI Analysis Data:');
    console.log('Company:', analysis.summary?.solution || 'Not found');
    console.log('Market:', analysis.summary?.market || 'Not found');
    console.log('Problem:', analysis.summary?.problem || 'Not found');
    console.log('Traction:', analysis.summary?.traction || 'Not found');
    
    // Test buildTemplateFromAnalysis function like frontend does
    const fileName = 'Cosmedream Deck.pdf';
    
    // Simulate frontend template building
    const pick = (v) => (v && v.trim().length > 0 ? v.trim() : undefined);
    const rawName = pick(fileName?.replace(/\.[^.]+$/, "")) || "[Brand Name]";
    const brandName = rawName
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    
    const category = pick(analysis.summary?.market) || "[Brand Type / Category]";
    const positioning = pick(analysis.summary?.solution) || "[1-line positioning]";
    const traction = pick(analysis.summary?.traction) || "[Revenue/Users/Growth]";
    const problem = pick(analysis.summary?.problem) || "[Core Problem]";

    const subject = `Subject: Investment Opportunity in ${brandName} – ${positioning}`;
    
    console.log('\n📧 Frontend Template Generation:');
    console.log('Brand Name:', brandName);
    console.log('Category:', category);
    console.log('Positioning:', positioning);
    console.log('Traction:', traction);
    console.log('Problem:', problem);
    
    console.log('\n📧 Final Subject:', subject);
    
    // Check if real data is being used
    if (subject.includes('Cosmedream') && !subject.includes('[Brand Name]')) {
      console.log('\n✅ SUCCESS: Frontend is using real Cosmedream data!');
    } else {
      console.log('\n❌ ISSUE: Frontend still using placeholders instead of real data');
      console.log('Raw analysis data:', JSON.stringify(analysis.summary, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main().catch(console.error);