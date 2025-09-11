/*
 Simple backend test: generate a CSV, upload to API, then read stats.
 Uses global fetch (Node 18+), and form-data for multipart.
*/

const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const os = require('os');
const FormData = require('form-data');

const BACKEND_URL = (process.env.BACKEND_URL && process.env.BACKEND_URL.trim())
  ? process.env.BACKEND_URL.trim().replace(/\/$/, '')
  : 'https://backend-api-sepia-chi.vercel.app';

async function main() {
  const tmpCsvPath = path.join(os.tmpdir(), `investors-test-${Date.now()}.csv`);
  const csv = [
    'firm_name,partner_name,partner_email,fund_type,fund_stage,sector_focus,country',
    'Alpha Ventures,Jane Doe,jane@alphavc.com,VC,"Seed;Series A","Fintech;SaaS",USA',
    'Beta Capital,John Smith,john@betacap.io,Angel,"Pre-Seed;Seed","Healthtech;AI",UK'
  ].join('\n');

  console.log('Writing temp CSV:', tmpCsvPath);
  await fsp.writeFile(tmpCsvPath, csv, 'utf8');

  // Build multipart form
  const form = new FormData();
  form.append('file', fs.createReadStream(tmpCsvPath), {
    filename: path.basename(tmpCsvPath),
    contentType: 'text/csv'
  });

  // Upload
  const uploadUrl = `${BACKEND_URL}/api/investors/upload-file`;
  console.log('Uploading to:', uploadUrl);
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    body: form,
    headers: form.getHeaders(),
  });

  const uploadText = await uploadRes.text();
  console.log('Upload status:', uploadRes.status);
  console.log('Upload response:', uploadText);

  // Fetch stats
  const statsUrl = `${BACKEND_URL}/api/investors/upload-stats`;
  const statsRes = await fetch(statsUrl);
  const statsText = await statsRes.text();
  console.log('Stats status:', statsRes.status);
  console.log('Stats response:', statsText);

  // Fetch first page
  const listUrl = `${BACKEND_URL}/api/investors?page=1&limit=5`;
  const listRes = await fetch(listUrl);
  const listText = await listRes.text();
  console.log('List status:', listRes.status);
  console.log('List response:', listText);

  // Cleanup temp file
  try {
    await fsp.unlink(tmpCsvPath);
  } catch {}
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exitCode = 1;
});

