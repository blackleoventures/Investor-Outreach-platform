// Test creating a campaign via backend API
/* eslint-disable */
const fetch = global.fetch || require('node-fetch');

const BASE = (process.env.TEST_BASE || 'http://localhost:5000').trim().replace(/\/$/, '');
const TOKEN = process.env.TEST_TOKEN || '';

async function postJson(url, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  let data = {};
  try { data = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, data };
}

(async () => {
  try {
    const payload = {
      name: 'Test Campaign ' + new Date().toISOString(),
      clientName: 'Acme Inc.',
      type: 'Email',
      status: 'draft',
      subject: 'Intro: Seed round',
      body: 'This is a test body',
      schedule: 'Immediate',
      audience: [ { email: 'investor3@example.com' }, { email: 'investor5@example.com' } ],
      recipients: 2,
    };
    const url = `${BASE}/api/campaign`;
    console.log('POST', url);
    console.log('Payload:', JSON.stringify(payload, null, 2));
    const res = await postJson(url, payload);
    console.log('Response status:', res.status);
    console.log('Response body:', res.data);
    if (!res.ok) process.exit(2);
    process.exit(0);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
})();

 