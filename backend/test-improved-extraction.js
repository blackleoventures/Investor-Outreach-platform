const fs = require('fs');
const path = require('path');

// Mock the AI extraction with real Cosmedream data
function mockAIExtraction() {
  return {
    extractedData: {
      companyName: 'Cosmedream',
      founderName: 'Mr. Parikshit Sethi',
      founderTitle: 'Founder, PS Brands',
      problem: 'Building globally accepted FMCG brands',
      solution: 'House of brands with diverse cosmetics portfolio including perfumes, soaps, hair colors, essential oils, body mist, face wash, nail care',
      market: 'FMCG/Cosmetics market (₹8.1B in India, $378B globally)',
      traction: '20 countries presence, 80+ trademarks, own manufacturing facility',
      teamBackground: '40 years of expertise, patent holder, built brands from ground up',
      revenue: '₹20.24 crores (Year 1) to ₹167 crores (Year 5) projected',
      sector: 'FMCG/Cosmetics',
      email: 'hs@cosmedream.com',
      phone: '7748000004',
      website: 'www.cosmedream.com',
      address: 'A1 Namo Industrial Park, Sanwer Road Indore, 452015',
      globalPresence: '20 countries including Singapore, Malaysia, Russia, Saudi Arabia, France, Japan',
      patents: '80+ trademarks and patents across 40+ countries',
      businessModel: 'Omni-channel approach (online + offline), Performance marketing through Meta ads',
      partnerships: 'Nykaa, TIRA, Amazon, Reliance Retail, LULU, Flipkart'
    },
    highlights: [
      'Experienced leadership with 40 years expertise',
      'Global presence in 20 countries',
      'Strong IP portfolio with 80+ trademarks'
    ]
  };
}

function testImprovedEmailGeneration() {
  console.log('🧪 Testing Improved Email Generation...');
  
  const aiResult = mockAIExtraction();
  const data = aiResult.extractedData;
  
  // Generate subject line (same logic as in controller)
  let subject = `Investment Opportunity - ${data.companyName || '[Company Name]'}`;
  if (data.sector && data.globalPresence) {
    subject += ` | ${data.sector} with Global Presence`;
  } else if (data.problem && data.market) {
    subject += ` | ${data.problem} in ${data.market}`;
  }
  
  // Generate professional email body (same logic as in controller)
  let body = `Hi [Investor Name],

I hope you are well. I'm ${data.founderName || '[Your Name]'}${data.founderTitle ? `, ${data.founderTitle}` : ''}, reaching out about ${data.companyName || '[Company Name]'}${data.problem ? ` - ${data.problem}` : ''} in the ${data.market || '[market]'} space.

Key Highlights:`;
  
  if (data.teamBackground) body += `\n• Experienced Leadership: ${data.teamBackground}`;
  if (data.globalPresence) body += `\n• Global Presence: ${data.globalPresence}`;
  if (data.traction) body += `\n• Traction: ${data.traction}`;
  if (data.market) body += `\n• Market Opportunity: ${data.market}`;
  if (data.revenue) body += `\n• Revenue: ${data.revenue}`;
  if (data.patents) body += `\n• IP Portfolio: ${data.patents}`;
  
  if (data.solution) {
    body += `\n\n${data.solution}`;
  }
  
  if (data.businessModel) {
    body += `\n\nBusiness Model:\n${data.businessModel}`;
  }
  
  if (data.partnerships) {
    body += `\n\nKey Partnerships: ${data.partnerships}`;
  }
  
  body += `\n\nWe're currently seeking strategic investors to accelerate our growth and market expansion.

I'd appreciate the opportunity to share our detailed pitch deck and discuss how this aligns with your investment focus.

Would you be available for a 15-minute call this week to explore this opportunity?

Best regards,
${data.founderName || '[Your Name]'}${data.founderTitle ? `\n${data.founderTitle}` : ''}
${data.companyName || '[Company Name]'}`;
  
  // Add contact information
  if (data.email || data.phone || data.website || data.address) {
    body += '\n';
    if (data.email) body += `\nEmail: ${data.email}`;
    if (data.phone) body += `\nPhone: ${data.phone}`;
    if (data.website) body += `\nWebsite: ${data.website}`;
    if (data.address) body += `\nAddress: ${data.address}`;
  }
  
  const finalEmail = { subject, body, highlights: aiResult.highlights || [] };
  
  // Save the improved email
  const outputPath = path.join(__dirname, '../test-improved-email.txt');
  const emailContent = `Subject: ${finalEmail.subject}\n\nBody:\n${finalEmail.body}`;
  fs.writeFileSync(outputPath, emailContent);
  
  console.log('✅ Improved email generated successfully!');
  console.log('📄 Output file:', outputPath);
  console.log('\n📧 Email Preview:');
  console.log('Subject:', finalEmail.subject);
  console.log('Body length:', finalEmail.body.length, 'characters');
  console.log('\n📝 First 300 characters:');
  console.log(finalEmail.body.substring(0, 300) + '...');
  
  return finalEmail;
}

testImprovedEmailGeneration();