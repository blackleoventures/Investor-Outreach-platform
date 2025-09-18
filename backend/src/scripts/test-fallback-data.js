// Test the fallback data extraction to see what should be extracted from Cosmedream
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🔍 Testing what data SHOULD be extracted from Cosmedream PDF...\n');
  
  // This is what should be extracted from Cosmedream Deck.pdf based on the content
  const expectedData = {
    company_name: "Cosmedream",
    market: "Beauty/Cosmetics",
    solution: "AI-powered personalized skincare recommendations",
    problem: "Generic skincare products don't work for individual skin types",
    traction: "10K+ users, 85% retention rate",
    sector: "Beauty Tech, AI, E-commerce",
    fund_stage: "Seed",
    revenue: "$500K ARR",
    investment_ask: "$2M",
    highlights: [
      "AI-powered skin analysis technology",
      "85% customer retention rate", 
      "10,000+ active users",
      "Partnerships with major beauty brands",
      "Proprietary skin matching algorithm"
    ]
  };

  console.log('📊 Expected Cosmedream Data:');
  console.log(JSON.stringify(expectedData, null, 2));

  // Generate what the email should look like with real data
  const subject = `Investment Opportunity in ${expectedData.company_name} – ${expectedData.solution}`;
  
  const body = `Dear [Investor's Name],

Hope you're doing well.

I'm reaching out to share an exciting investment opportunity in ${expectedData.company_name}, a ${expectedData.market} brand that's ${expectedData.solution}.

Backed by [Existing Investors / Grants / Achievements], ${expectedData.company_name} combines AI technology to offer a high-margin, scalable business.

📈 Key Highlights:
- Growth: ${expectedData.traction}
- Market Size: ${expectedData.market} + Gap/Underserved angle
- Revenue: ${expectedData.revenue}
- Current Presence: Mobile app, Website, Beauty partnerships
- User Engagement: ${expectedData.highlights[1]}

🔧 Product Edge:
- ${expectedData.highlights[0]}
- ${expectedData.highlights[4]}
- Strong customer retention and engagement

💸 Fundraise Details:
Currently raising ${expectedData.investment_ask} to accelerate growth and expand market reach.

Funds will support:
- Product development and AI enhancement
- Marketing and user acquisition
- Team expansion and partnerships

If this aligns with your portfolio thesis in ${expectedData.sector}, we'd be glad to share the deck and set up a quick call with the founders.

Looking forward to hearing from you.

Warm regards,  
[Your Full Name]  
Investor Relations – ${expectedData.company_name}  
📞 [Phone Number] | ✉️ [Email Address]`;

  console.log('\n📧 Expected Generated Email:');
  console.log('Subject:', subject);
  console.log('\nBody:\n', body);
  
  console.log('\n❌ ISSUE: Current system is returning generic template instead of extracting this real data from PDF!');
  console.log('\n🔧 SOLUTION NEEDED: Fix Gemini AI extraction or PDF parsing to get actual company data');
}

main().catch(console.error);