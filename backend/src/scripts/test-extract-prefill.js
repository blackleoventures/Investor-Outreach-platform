const fs = require('fs');
const path = require('path');

async function main() {
  const backend = process.env.BACKEND_URL || 'http://localhost:5000';
  // Use the exact filename present in repo root
  const filePath = path.resolve(process.cwd(), 'Cosmedream Deck (1).pdf');

  if (!fs.existsSync(filePath)) {
    console.error('❌ File not found:', filePath);
    process.exit(1);
  }

  // Build multipart form-data using native Web APIs (Node 18+)
  const buf = fs.readFileSync(filePath);
  const blob = new Blob([buf], { type: 'application/pdf' });
  const form = new FormData();
  form.append('document', blob, 'Cosmedream Deck (1).pdf');
  form.append('investorName', 'Investor');

  const url = `${backend}/api/ai/extract-and-prefill`;
  console.log('🔎 Testing extract-and-prefill with:', path.basename(filePath));
  console.log('POST', url);

  try {
    const res = await fetch(url, { method: 'POST', body: form });
    const text = await res.text();
    console.log('HTTP', res.status);
    if (!res.ok) {
      console.error('❌ Request failed:', text.slice(0, 800));
      process.exit(1);
    }

    const json = JSON.parse(text);
    const tpl = json?.data?.emailTemplate || json?.data?.template || {};
    const subject = tpl.subject || 'NO_SUBJECT';
    const body = tpl.body || 'NO_BODY';

    console.log('\n✅ Prefilled Subject:\n', subject);
    console.log('\n📝 Prefilled Body (first 800 chars):\n', String(body).slice(0, 800));

    // Simple assertion to catch placeholder-only responses
    if (subject.includes('[Brand Name]') || body.includes('[Brand Name]')) {
      console.warn('\n⚠️ Placeholders detected. The extraction may not have found brand data.');
    } else {
      console.log('\n🎉 Looks good: Real data appears in the email template.');
    }
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });


