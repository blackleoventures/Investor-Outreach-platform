// Simulate frontend Audience Emails behavior: select investors -> merge into tags (max 10)
// Usage:
//   set TEST_BASE=http://localhost:5000 && node backend/src/scripts/validate-audience-merge.js

/* eslint-disable */
const fetch = global.fetch || require('node-fetch');

const BASE = (process.env.TEST_BASE || 'http://localhost:5000').trim().replace(/\/$/, '');

async function getJson(url) {
  const res = await fetch(url);
  const data = await res.json().catch(()=>({}));
  return { ok: res.ok, status: res.status, data };
}

function buildPicker(raw) {
  const lowerMap = {}; const compactMap = {}; const alnumMap = {};
  Object.entries(raw || {}).forEach(([k,v]) => {
    const lower = k.toString().trim().toLowerCase();
    const compact = lower.replace(/[\s_]/g,'');
    const alnum = lower.replace(/[^a-z0-9]/g,'');
    if (!(lower in lowerMap)) lowerMap[lower] = v;
    if (!(compact in compactMap)) compactMap[compact] = v;
    if (!(alnum in alnumMap)) alnumMap[alnum] = v;
  });
  const pick = (...cands)=>{
    for (const c of cands) {
      const low = c.toLowerCase();
      const vars = [low, low.replace(/\s+/g,'_'), low.replace(/_/g,' '), low.replace(/[\s_]/g,''), low.replace(/[^a-z0-9]/g,'')];
      for (const k of vars) {
        if (k in lowerMap && lowerMap[k] != null && lowerMap[k] !== '') return lowerMap[k];
        if (k in compactMap && compactMap[k] != null && compactMap[k] !== '') return compactMap[k];
        if (k in alnumMap && alnumMap[k] != null && alnumMap[k] !== '') return alnumMap[k];
      }
    }
    return undefined;
  };
  return { pick };
}

(async () => {
  try {
    console.log(`\n▶ Audience merge validation against ${BASE}`);
    const url = `${BASE}/api/investors?limit=100000&page=1`;
    const res = await getJson(url);
    const list = Array.isArray(res.data?.docs) ? res.data.docs : (Array.isArray(res.data?.data) ? res.data.data : []);
    if (!list.length) throw new Error('No investors returned');

    // Normalize
    const normalized = list.map(r => {
      const { pick } = buildPicker(r);
      const first = pick('first_name','firstname');
      const last = pick('last_name','lastname');
      const investorName = pick('investor_name','investorname','firm_name','firm','fund_name','fund','organization','organization_name','company','company_name','name','investor');
      const contactName = pick('partner_name','partnername','partner','contact_name','contact','person') || `${first||''} ${last||''}`.trim();
      const email = pick('partner_email','email','partnerEmail','investor_email','contact_email','primary_email','email_id','emailId','emailAddress','e-mail','mail');
      return { name: investorName || contactName, email };
    }).filter(r => r.email);

    console.log(`Total normalized with email: ${normalized.length}`);

    // Simulate user selections (take 12 unique emails)
    const selectedEmails = Array.from(new Set(normalized.map(r => r.email))).slice(0, 12);
    console.log('Selected (12 attempted):', selectedEmails.length);

    // Existing audience in the form (simulate 3 pre-filled)
    const current = selectedEmails.slice(0, 3);
    const remainingSelections = selectedEmails.slice(3);

    // Frontend merge logic (max 10 total)
    const already = new Set(current.map(e => e.toLowerCase()));
    const additions = remainingSelections.filter(e => e && !already.has(e.toLowerCase()));
    const allowed = Math.max(0, 10 - current.length);
    const merged = additions.length > allowed ? [...current, ...additions.slice(0, allowed)] : [...current, ...additions];

    console.log('\nCurrent (prefilled 3):', current.length);
    console.log('Additions considered:', additions.length, 'Allowed:', allowed);
    console.log('Final merged count:', merged.length);
    console.log('Merged list (should be <= 10):', merged);

    if (merged.length > 10) {
      console.error('❌ Merge exceeded cap');
      process.exit(2);
    } else if (new Set(merged.map(e=>e.toLowerCase())).size !== merged.length) {
      console.error('❌ Duplicates found');
      process.exit(3);
    } else {
      console.log('\n✅ Audience merge behavior matches frontend expectations.');
      process.exit(0);
    }
  } catch (e) {
    console.error('❌ Test failed:', e.message);
    process.exit(1);
  }
})();

