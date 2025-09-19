const fs = require('fs');
const path = require('path');

async function main() {
  const backend = process.env.BACKEND_URL || 'http://localhost:5000';
  const filePath = path.resolve(process.cwd(), 'Cosmedream Deck.pdf');
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    process.exit(1);
  }

  const form = new FormData();
  form.append('deck', fs.createReadStream(filePath));

  const url = `${backend}/api/ai/analyze-deck?skipGemini=1`; // use fast heuristic by default
  console.log('POST', url, 'with', path.basename(filePath));

  const res = await fetch(url, { method: 'POST', body: form });
  const json = await res.json();
  if (!res.ok) {
    console.error('Request failed:', json);
    process.exit(1);
  }

  const schema = json?.data?.schema || {};
  const template = schema?.email_template || '';
  const subject = template.split('\n')[0].replace('Subject: ', '');
  const body = template.split('\n').slice(1).join('\n').trim();

  console.log('\nSubject:', subject);
  console.log('\nBody:\n', body);
}

main().catch((e) => { console.error(e); process.exit(1); });

