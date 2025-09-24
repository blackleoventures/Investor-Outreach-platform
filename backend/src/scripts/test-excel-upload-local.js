// Quick local test: create a tiny CSV and upload to /api/excel/upload
// Usage: node src/scripts/test-excel-upload-local.js [BASE_URL]
// Default BASE_URL = http://localhost:5000

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function main() {
  const base = process.argv[2] || 'http://localhost:5000';
  const url = `${base.replace(/\/$/, '')}/api/excel/upload`;

  // Prepare a tiny CSV in temp dir
  const tempDir = require('os').tmpdir();
  const csvPath = path.join(tempDir, `test-investors-${Date.now()}.csv`);
  const csv = [
    'Partner Email,Investor Name,Partner Name,Phone number,Fund Type,Fund Stage,Fund Focus (Sectors),Location,Ticket Size,Website',
    'alice@example.com,Alpha Capital,Alice Brown,+1 555 000 0000,Venture Fund,Seed,FinTech; SaaS,New York,50k-250k,https://alpha.example',
    'bob@example.com,Beta Ventures,Bob Green,+1 555 000 0001,Angel,Pre-Seed,AI; Healthcare,Boston,10k-50k,https://beta.example'
  ].join('\n');
  fs.writeFileSync(csvPath, csv, 'utf8');

  const form = new FormData();
  form.append('excel', fs.createReadStream(csvPath), {
    filename: 'test-investors.csv',
    contentType: 'text/csv'
  });

  console.log('POST', url);
  const res = await fetch(url, { method: 'POST', body: form, headers: form.getHeaders() });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Body  :', text);
}

main().catch((e) => {
  console.error('Test upload failed:', e);
  process.exit(1);
});

 