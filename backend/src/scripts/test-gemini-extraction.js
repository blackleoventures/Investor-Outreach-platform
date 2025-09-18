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

  // Test WITHOUT skipGemini to get real AI extraction
  const url = `${backend}/api/ai/analyze-deck`;
  console.log('🤖 Testing REAL AI extraction from Cosmedream PDF...');
  console.log('POST', url, 'with', path.basename(filePath));

  try {
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      }
    });

    const text = await res.text();
    console.log('Response status:', res.status);
    
    if (!res.ok) {
      console.error('❌ Request failed:', text);
      process.exit(1);
    }

    const json = JSON.parse(text);
    console.log('📄 Full API Response:');
    console.log(JSON.stringify(json, null, 2));
    
    // Check both schema and aiRaw for data
    const schema = json?.data?.schema || {};
    const aiRaw = json?.data?.aiRaw || {};
    const analysis = schema.summary ? schema : aiRaw;
    
    console.log('\n📊 Extracted Analysis:');
    console.log('Summary:', analysis.summary);
    console.log('Scorecard:', analysis.scorecard);
    console.log('Highlights:', analysis.highlights);
    
    const template = analysis?.email_template || '';
    
    if (!template) {
      console.log('❌ No email template found in response');
      return;
    }

    const lines = template.split('\n');
    const subject = lines[0].replace('Subject: ', '');
    const body = lines.slice(1).join('\n').trim();

    console.log('\n✅ COSMEDREAM DATA EXTRACTION TEST:\n');
    console.log('🏢 Company:', analysis.summary?.market || 'Not extracted');
    console.log('💡 Solution:', analysis.summary?.solution || 'Not extracted');  
    console.log('📈 Traction:', analysis.summary?.traction || 'Not extracted');
    console.log('🎯 Problem:', analysis.summary?.problem || 'Not extracted');
    console.log('\n📧 Generated Subject:', subject);
    console.log('\n📝 Generated Body:\n', body);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main().catch((e) => { 
  console.error('Script error:', e); 
  process.exit(1); 
});