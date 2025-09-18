// Test to show what the updated Gemini prompt should generate
console.log('🎯 EXPECTED OUTPUT from Updated Gemini Prompt:\n');

const expectedGeminiOutput = {
  summary: {
    problem: "The beauty care market, particularly in India, is underserved with significant untapped potential",
    solution: "House of Brands strategy offering diverse cosmetics with innovative formulations and French fragrances",
    market: "FMCG Beauty & Cosmetics - India and Global markets",
    traction: "Presence in 20 countries, projected revenue growth ₹20 Cr → ₹167 Cr",
    status: "GREEN",
    total_score: 78
  },
  email_template: `Subject: Investment Opportunity in Cosmedream – House of Brands in Beauty & Cosmetics

Dear [Investor's Name],

Hope you're doing well.

I'm reaching out to share an exciting investment opportunity in Cosmedream, a House of Brands in the rapidly growing Beauty & Cosmetics sector. Cosmedream offers a wide range of products across skincare, fragrances, hair care, nail care, and personal care — combining innovative, science-backed formulations with IFRA-approved French fragrances.

Backed by the expertise of Mr. Parikshit Sethi (40+ years, 80+ patents & trademarks, presence in 20 countries), Cosmedream is building a high-margin, scalable business with global appeal.

📈 Key Highlights:

Diverse House of Brands strategy

Established presence in 20 international markets

Projected revenue growth: ₹20 Cr → ₹167 Cr

Patent-backed innovations with herbal & dermatologically tested formulations

Leadership team with proven FMCG track record

🔧 Product Edge:

Innovative, science-driven formulations with herbal ingredients

French fragrances and IFRA-certified quality

Category differentiation and global positioning vs MamaEarth, Nykaa, Plum, Bath & Body Works

💸 Fundraise Details:
Currently raising funds to accelerate expansion, with allocations planned as:

50% Marketing & GTM initiatives

25% R&D and new product development

15% Operations

10% Technology investments

If this aligns with your portfolio thesis in FMCG / Beauty / Consumer Brands, we'd be glad to share the full pitch deck and schedule a quick call with the founders.

Looking forward to your thoughts.

Warm regards,
[Your Full Name]
Investor Relations – Cosmedream
📞 [Phone Number] | ✉️ [Email Address]`
};

console.log('📧 Expected Subject:');
console.log(expectedGeminiOutput.email_template.split('\n')[0].replace('Subject: ', ''));

console.log('\n📝 Expected Email Body:');
console.log(expectedGeminiOutput.email_template.split('\n').slice(1).join('\n').trim());

console.log('\n✅ This is what should appear in frontend after Gemini prompt update!');
console.log('✅ Specific metrics: ₹20 Cr → ₹167 Cr, 40+ years, 80+ patents, 20 countries');
console.log('✅ Detailed funding allocation: 50% Marketing, 25% R&D, 15% Operations, 10% Technology');
console.log('✅ Competitive positioning vs MamaEarth, Nykaa, Plum, Bath & Body Works');
console.log('✅ Real founder credentials: Mr. Parikshit Sethi');

console.log('\n🔧 NEXT STEPS:');
console.log('1. Restart backend server');
console.log('2. Test with real Cosmedream PDF');
console.log('3. Verify frontend shows this detailed template');
console.log('4. Confirm copy button copies same detailed content');