// Simple test to verify investors endpoints return data used by the Select Investors modal
const fetch = global.fetch || require('node-fetch');

const BASE = (process.env.TEST_BASE || 'http://localhost:5001').replace(/\/$/, '');
const TOKEN = process.env.TEST_TOKEN || '';

async function getJson(url) {
  const res = await fetch(url, { headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

(async () => {
  try {
    console.log(`Testing investors endpoints against ${BASE}`);

    // Try ALL endpoint
    const allUrl = `${BASE}/api/investors/all?limit=100000&page=1`;
    const all = await getJson(allUrl);
    let list = [];
    if (all.ok && Array.isArray(all.data?.data)) {
      list = all.data.data;
      console.log(`GET /investors/all -> ${list.length} records`);
    } else {
      console.log(`ALL endpoint unavailable (status ${all.status}), falling back to paginated`);
      // Fallback: page through a few pages
      for (let p = 1; p <= 5; p++) {
        const url = `${BASE}/api/investors?page=${p}&limit=200`;
        const page = await getJson(url);
        if (!page.ok) {
          console.log(`Page ${p} failed with status ${page.status}`);
          break;
        }
        const docs = Array.isArray(page.data?.docs) ? page.data.docs : (Array.isArray(page.data?.data) ? page.data.data : []);
        if (!docs.length) break;
        list = list.concat(docs);
        if (docs.length < 200) break;
      }
      console.log(`Paginated fetch -> ${list.length} records`);
    }

    // Normalize like the modal
    const normalized = list.map(r => ({
      ...r,
      partner_name: r.partner_name || r.name || r.investor_name || `${r.first_name || ''} ${r.last_name || ''}`.trim(),
      partner_email: r.partner_email || r.email,
    })).filter(r => (r.partner_email || '').toString().trim() !== '');

    console.log('Sample normalized:', normalized.slice(0, 3));

    if (normalized.length === 0) {
      console.error('❌ No investors returned.');
      process.exit(2);
    }

    console.log(`✅ Investors available for selection: ${normalized.length}`);
    process.exit(0);
  } catch (e) {
    console.error('❌ Test failed:', e.message);
    process.exit(1);
  }
})();

