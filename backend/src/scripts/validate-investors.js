// Validate that all investors have usable Name and Email for Select Investors modal
// Usage:
//   TEST_BASE=http://localhost:5001 TEST_TOKEN=your_jwt node backend/src/scripts/validate-investors.js

/* eslint-disable */
const fetch = global.fetch || require('node-fetch');

const BASE = (process.env.TEST_BASE || 'http://localhost:5001').trim().replace(/\/$/, '');
const TOKEN = process.env.TEST_TOKEN || '';

async function getJson(url) {
  const headers = TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined;
  const res = await fetch(url, { headers });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function buildPicker(raw) {
  const lowerMap = {};
  const compactMap = {};
  const alnumMap = {};
  Object.entries(raw || {}).forEach(([k, v]) => {
    const lower = k.toString().trim().toLowerCase();
    const compact = lower.replace(/[\s_]/g, '');
    const alnum = lower.replace(/[^a-z0-9]/g, '');
    if (!(lower in lowerMap)) lowerMap[lower] = v;
    if (!(compact in compactMap)) compactMap[compact] = v;
    if (!(alnum in alnumMap)) alnumMap[alnum] = v;
  });
  const pick = (...candidates) => {
    for (const cand of candidates) {
      const lower = cand.toLowerCase();
      const variants = [
        lower,
        lower.replace(/\s+/g, '_'),
        lower.replace(/_/g, ' '),
        lower.replace(/[\s_]/g, ''),
        lower.replace(/[^a-z0-9]/g, ''),
      ];
      for (const key of variants) {
        if (key in lowerMap && lowerMap[key] != null && lowerMap[key] !== '') return lowerMap[key];
        if (key in compactMap && compactMap[key] != null && compactMap[key] !== '') return compactMap[key];
        if (key in alnumMap && alnumMap[key] != null && alnumMap[key] !== '') return alnumMap[key];
      }
    }
    return undefined;
  };
  return { pick };
}

(async () => {
  try {
    console.log(`\n▶ Validating investors from ${BASE}`);

    // Try single big page
    const url = `${BASE}/api/investors?limit=100000&page=1`;
    console.log('GET', url);
    const res = await getJson(url);
    const list = Array.isArray(res.data?.docs) ? res.data.docs : (Array.isArray(res.data?.data) ? res.data.data : []);
    if (!list.length) {
      console.error('❌ No data received from /api/investors', res.status);
      process.exit(2);
    }

    // De-duplicate by id + any detected email
    const seen = new Set();
    const uniq = [];
    for (const item of list) {
      const { pick } = buildPicker(item);
      const anyEmail = (pick('partner_email','email','partnerEmail','investor_email','contact_email','primary_email','email_id','emailId','emailAddress','e-mail','mail') || '').toString().toLowerCase();
      const key = `${item.id ?? item._id ?? ''}-${anyEmail}`;
      if (!seen.has(key)) { seen.add(key); uniq.push(item); }
    }

    // Normalize like frontend modal
    const normalized = uniq.map(r => {
      const { pick } = buildPicker(r);
      const first = pick('first_name','firstname');
      const last = pick('last_name','lastname');
      const investorName = pick('investor_name','investorname','firm_name','firm','fund_name','fund','organization','organization_name','company','company_name','name','investor');
      const contactName = pick('partner_name','partnername','partner','contact_name','contact','person') || `${first||''} ${last||''}`.trim();
      const email = pick('partner_email','email','partnerEmail','investor_email','contact_email','primary_email','email_id','emailId','emailAddress','e-mail','mail');
      return {
        id: r.id ?? r._id,
        investorName: investorName || undefined,
        contactName: contactName || undefined,
        email: email || undefined,
        _raw: r,
      };
    });

    // Stats
    const total = normalized.length;
    const withName = normalized.filter(r => !!(r.investorName || r.contactName)).length;
    const withEmail = normalized.filter(r => !!r.email).length;
    const missingName = total - withName;
    const missingEmail = total - withEmail;

    console.log(`\n✔ Total unique records: ${total}`);
    console.log(`✔ Have Name (investor or contact): ${withName}`);
    console.log(`✔ Have Email: ${withEmail}`);
    console.log(`⚠ Missing Name: ${missingName}`);
    console.log(`⚠ Missing Email: ${missingEmail}`);

    if (missingName || missingEmail) {
      const sampleMissing = normalized.filter(r => !r.email || !(r.investorName || r.contactName)).slice(0, 5).map(r => ({ id: r.id, investorName: r.investorName, contactName: r.contactName, email: r.email }));
      console.log('\nSamples with issues:', sampleMissing);
    }

    console.log('\nSample normalized rows:', normalized.slice(0, 3).map(r => ({ id: r.id, name: r.investorName || r.contactName, email: r.email })));

    if (withEmail === 0) {
      console.error('\n❌ No usable emails found.');
      process.exit(3);
    }

    console.log('\n✅ Validation complete.');
    process.exit(0);
  } catch (e) {
    console.error('❌ Validation failed:', e.message);
    process.exit(1);
  }
})();

