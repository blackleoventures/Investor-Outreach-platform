const fs = require('fs');
const PDFDocument = require('pdfkit');

// Create a PDF with the pitch deck content
const doc = new PDFDocument();
doc.pipe(fs.createWriteStream('test-pitch-deck.pdf'));

// Add content to PDF
doc.fontSize(20).text('Startup Pitch Deck', 100, 100);
doc.fontSize(16).text('Company Name: Innovexa Technologies', 100, 140);
doc.fontSize(14).text('Tagline: Reinventing Urban Mobility', 100, 170);

doc.text('Problem: Urban traffic congestion costs $150B annually. Commuters lose 100 hours each year.', 100, 200);

doc.text('Solution: AI-powered micro-mobility platform integrating electric scooters, bikes, and ride-sharing', 100, 230);

doc.text('Market: TAM = $500B, SAM = $120B, SOM = $5B. Growing 15% CAGR globally.', 100, 260);

doc.text('Business Model: Subscription + Pay-per-ride. Projected ARR $20M by Year 3.', 100, 290);

doc.text('Traction: 50,000 users, 120 corporate partners, $1.2M ARR, 20% MoM growth.', 100, 320);

doc.text('Team: Founders from Tesla & Uber. Combined 30 years experience in mobility and AI.', 100, 350);

doc.text('Moat: Proprietary AI routing engine, exclusive city partnerships, patent-pending hardware.', 100, 380);

doc.text('GTM: Target top 20 cities, partner with corporates, aggressive influencer campaigns.', 100, 410);

doc.text('Ask: Raising $10M at $50M valuation. Funds for expansion, R&D, and hiring. Runway: 24 months', 100, 440);

doc.text('Exit: Target IPO in 6 years or acquisition by major mobility player (Uber, Lyft, Bird).', 100, 470);

doc.end();

console.log('✅ PDF created: test-pitch-deck.pdf');