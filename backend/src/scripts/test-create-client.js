// Quick test script to create clients using the simple controller API and print the response
const fetch = require('node-fetch');

async function main() {
  const base = process.env.BASE || 'http://localhost:5000';
  console.log('Using base:', base);

  const tests = [
    {
      firstName: 'Aman', lastName: '', email: 'aman@gmail.com', phone: '242423434',
      companyName: 'NextGen Technology', industry: 'Agriculture', location: 'India', fundingStage: 'Seed',
      revenue: '501K', investment: '2M'
    },
    {
      firstName: 'FinTech', lastName: 'Solutions', email: 'ft@demo.com', phone: '999999',
      companyName: 'FinTech Solutions', industry: 'FinTech', location: 'UK', fundingStage: 'Series A',
      revenue: '$2M', investment: '$500k'
    }
  ];

  for (const payload of tests) {
    const res = await fetch(base + '/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json().catch(()=>({}));
    console.log('Created:', json);
  }
}

main().catch(e=>{ console.error(e); process.exit(1); });

