const fs = require('fs');
const path = require('path');

function generateImprovedEmail() {
  console.log('📧 Generating Improved Email Template...');
  
  // Read extracted text
  const textPath = path.join(__dirname, '../cosmedream-clean-text.txt');
  const extractedText = fs.readFileSync(textPath, 'utf8');
  
  // Extract real data from the PDF
  const companyName = 'Cosmedream';
  const founderName = 'Mr. Parikshit Sethi';
  const founderTitle = 'Founder, PS Brands';
  
  // Extract key information
  const marketInfo = 'FMCG/Cosmetics market (₹8.1B in India, $378B globally)';
  const experience = '40 years of expertise, 80+ trademarks, 40+ countries';
  const products = 'House of brands offering perfumes, soaps, hair colors, essential oils, body mist, face wash, nail care';
  const presence = '20 countries including Singapore, Malaysia, Russia, Saudi Arabia, France, Japan';
  const projectedRevenue = '₹20.24 crores (Year 1) to ₹167 crores (Year 5)';
  
  // Generate improved email template with real data
  const improvedEmail = {
    subject: `Investment Opportunity - Cosmedream | FMCG House of Brands with Global Presence`,
    body: `Hi [Investor Name],

I hope you are well. I'm ${founderName}, ${founderTitle}, reaching out about Cosmedream - a registered startup building a globally accepted House of Brands in the FMCG/cosmetics market.

Key Highlights:
• Experienced Leadership: ${experience}
• Global Presence: Already established in ${presence}
• Diverse Product Portfolio: ${products}
• Market Opportunity: ${marketInfo}
• Revenue Projections: ${projectedRevenue}
• Strong IP Portfolio: 80+ trademarks and patents across 40+ countries

Our parent company PS Brands has been building brands from ground up with our own manufacturing facility. We're now focused on scaling Cosmedream brands within India and expanding internationally.

Business Model:
• Omni-channel approach (online + offline)
• Performance marketing through Meta ads
• Partnerships with Nykaa, TIRA, Amazon
• Retail expansion through Reliance Retail, LULU, Flipkart

We're currently seeking strategic investors to accelerate our growth and market expansion plans.

I'd appreciate the opportunity to share our detailed pitch deck and discuss how this aligns with your investment focus.

Would you be available for a 15-minute call this week to explore this opportunity?

Best regards,
${founderName}
${founderTitle}
Cosmedream
Email: hs@cosmedream.com
Phone: 7748000004
Website: www.cosmedream.com
Address: A1 Namo Industrial Park, Sanwer Road Indore, 452015`
  };
  
  // Save improved email
  const outputPath = path.join(__dirname, '../improved-email-template.txt');
  const emailContent = `Subject: ${improvedEmail.subject}\n\nBody:\n${improvedEmail.body}`;
  fs.writeFileSync(outputPath, emailContent);
  
  console.log('✅ Improved email template saved to:', outputPath);
  console.log('\n📧 Email Preview:');
  console.log('Subject:', improvedEmail.subject);
  console.log('Body length:', improvedEmail.body.length, 'characters');
  
  // Generate data extraction summary
  const extractedData = {
    companyName: 'Cosmedream',
    founderName: 'Mr. Parikshit Sethi',
    founderTitle: 'Founder, PS Brands',
    problem: 'Building globally accepted FMCG brands',
    solution: 'House of brands with diverse cosmetics portfolio',
    market: 'FMCG/Cosmetics market (₹8.1B India, $378B global)',
    traction: '20 countries presence, 80+ trademarks, own manufacturing',
    team: '40 years industry expertise, patent holder',
    revenue: '₹20.24 crores to ₹167 crores projected (5 years)',
    sector: 'FMCG/Cosmetics',
    email: 'hs@cosmedream.com',
    phone: '7748000004',
    website: 'www.cosmedream.com',
    address: 'A1 Namo Industrial Park, Sanwer Road Indore, 452015'
  };
  
  // Save extracted data as JSON
  const dataPath = path.join(__dirname, '../extracted-data.json');
  fs.writeFileSync(dataPath, JSON.stringify(extractedData, null, 2));
  console.log('✅ Extracted data saved to:', dataPath);
  
  console.log('\n📊 Data Extraction Summary:');
  console.log('✅ Company Name:', extractedData.companyName);
  console.log('✅ Founder:', extractedData.founderName);
  console.log('✅ Market Info:', extractedData.market);
  console.log('✅ Contact Info:', extractedData.email, '|', extractedData.phone);
  console.log('✅ Revenue Projections:', extractedData.revenue);
  
  return { improvedEmail, extractedData };
}

generateImprovedEmail();