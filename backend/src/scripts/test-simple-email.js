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

  const url = `${backend}/api/ai/analyze-deck?skipGemini=1`;
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
      console.error('Request failed:', text);
      process.exit(1);
    }

    const json = JSON.parse(text);
    const schema = json?.data?.schema || {};
    const template = schema?.email_template || '';
    
    if (!template) {
      console.log('No email template found in response');
      console.log('Full response:', JSON.stringify(json, null, 2));
      return;
    }

    const lines = template.split('\n');
    const subject = lines[0].replace('Subject: ', '');
    const body = lines.slice(1).join('\n').trim();

    console.log('\n✅ EMAIL GENERATION TEST SUCCESSFUL!\n');
    console.log('📧 Subject:', subject);
    console.log('\n📝 Body:\n', body);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main().catch((e) => { 
  console.error('Script error:', e); 
  process.exit(1); 
});