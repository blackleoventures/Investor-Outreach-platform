/*
 Simple Gemini pipeline test: create a tiny TXT file, POST to /api/ai/analyze-deck,
 and print the first part of the JSON/text response.
 Requires backend running locally or a LIVE_URL provided.
*/

const fs = require('fs');
const path = require('path');
const os = require('os');

const BASE = (process.env.LIVE_URL && process.env.LIVE_URL.trim()) || 'http://localhost:5000';
const ENDPOINT = BASE.replace(/\/$/, '') + '/api/ai/analyze-deck';

async function main() {
  const tmpFile = path.join(os.tmpdir(), `deck-test-${Date.now()}.txt`);
  fs.writeFileSync(tmpFile, 'This is a minimal test pitch content about an AI SaaS with traction and TAM.');

  // Use Node 18+ global FormData/File
  const form = new FormData();
  const buffer = fs.readFileSync(tmpFile);
  const file = new File([buffer], 'test.txt', { type: 'text/plain' });
  form.append('deck', file);

  console.log('POST', ENDPOINT);
  const res = await fetch(ENDPOINT, { method: 'POST', body: form });
  const contentType = res.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await res.json() : await res.text();

  console.log('Status:', res.status);
  if (typeof body === 'string') {
    console.log('Body (text):', body.slice(0, 400));
  } else {
    console.log('Body (json):', JSON.stringify(body).slice(0, 400));
  }
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exitCode = 1;
});

