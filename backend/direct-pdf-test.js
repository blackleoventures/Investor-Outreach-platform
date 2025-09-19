const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

// Clean text function
function cleanText(text) {
  if (!text) return "";
  
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n /g, '\n')
    .replace(/ \n/g, '\n')
    .trim();
}

async function directPDFTest() {
  console.log('🧪 Direct PDF Test (No Firebase)...');
  
  const pdfPath = path.join(__dirname, '../Cosmedream Deck (1).pdf');
  
  try {
    if (!fs.existsSync(pdfPath)) {
      console.log('❌ PDF not found:', pdfPath);
      return;
    }
    
    console.log('✅ PDF found');
    
    const buffer = fs.readFileSync(pdfPath);
    console.log('📄 PDF size:', buffer.length, 'bytes');
    
    // Extract text using pdf-parse
    const data = await pdfParse(buffer, {
      normalizeWhitespace: true,
      disableCombineTextItems: false
    });
    
    const rawText = data.text || "";
    const cleanedText = cleanText(rawText);
    
    console.log('📊 Raw text length:', rawText.length);
    console.log('📊 Cleaned text length:', cleanedText.length);
    
    // Save both versions
    const rawOutputPath = path.join(__dirname, '../cosmedream-raw-text.txt');
    const cleanOutputPath = path.join(__dirname, '../cosmedream-clean-text.txt');
    
    fs.writeFileSync(rawOutputPath, rawText);
    fs.writeFileSync(cleanOutputPath, cleanedText);
    
    console.log('✅ Raw text saved to:', rawOutputPath);
    console.log('✅ Clean text saved to:', cleanOutputPath);
    
    // Analyze content
    const lowerText = cleanedText.toLowerCase();
    console.log('\n🔍 Content Analysis:');
    console.log('Contains "cosmedream":', lowerText.includes('cosmedream'));
    console.log('Contains "skincare":', lowerText.includes('skincare'));
    console.log('Contains "ai":', lowerText.includes('ai') || lowerText.includes('artificial intelligence'));
    console.log('Contains "problem":', lowerText.includes('problem'));
    console.log('Contains "solution":', lowerText.includes('solution'));
    console.log('Contains "market":', lowerText.includes('market'));
    console.log('Contains "funding":', lowerText.includes('funding') || lowerText.includes('raising'));
    console.log('Contains "revenue":', lowerText.includes('revenue'));
    console.log('Contains "users":', lowerText.includes('users') || lowerText.includes('customers'));
    
    // Show preview
    console.log('\n📝 Text Preview (first 800 chars):');
    console.log('=' * 60);
    console.log(cleanedText.substring(0, 800));
    console.log('=' * 60);
    
    // Test email template generation
    console.log('\n📧 Testing Email Template Generation...');
    
    // Extract basic info for email
    const companyMatch = cleanedText.match(/cosmedream/i);
    const problemMatch = cleanedText.match(/problem[:\s-]+([^\n\r]{10,100})/i);
    const marketMatch = cleanedText.match(/market[:\s-]+([^\n\r]{10,60})/i);
    const fundingMatch = cleanedText.match(/raising[:\s-]+(\$[^\n\r]{5,30})/i);
    
    console.log('Company found:', !!companyMatch);
    console.log('Problem found:', !!problemMatch);
    console.log('Market found:', !!marketMatch);
    console.log('Funding found:', !!fundingMatch);
    
    if (problemMatch) console.log('Problem text:', problemMatch[1]);
    if (marketMatch) console.log('Market text:', marketMatch[1]);
    if (fundingMatch) console.log('Funding text:', fundingMatch[1]);
    
    // Generate sample email template
    const emailTemplate = {
      subject: `Investment Opportunity - ${companyMatch ? 'Cosmedream' : '[Company Name]'} | AI-Powered Skincare`,
      body: `Hi [Investor Name],

I hope you are well. I'm reaching out about Cosmedream, where we are solving ${problemMatch ? problemMatch[1].trim() : 'skincare personalization challenges'} in the ${marketMatch ? marketMatch[1].trim() : 'beauty tech'} space.

Key highlights:
• AI-powered personalized skincare recommendations
• Strong market opportunity in $180B+ skincare industry
• Growing user base with proven traction
• Experienced team with domain expertise

We're currently raising ${fundingMatch ? fundingMatch[1].trim() : '$2M seed round'} to accelerate growth and product development.

I'd appreciate the chance to share our deck and get your feedback.

Would you be open to a 15-minute call this week or next?

Best regards,
[Founder Name]
Cosmedream`
    };
    
    // Save email template
    const emailOutputPath = path.join(__dirname, '../generated-email-template.txt');
    const emailContent = `Subject: ${emailTemplate.subject}\n\nBody:\n${emailTemplate.body}`;
    fs.writeFileSync(emailOutputPath, emailContent);
    
    console.log('✅ Email template saved to:', emailOutputPath);
    console.log('\n📧 Generated Email Preview:');
    console.log('Subject:', emailTemplate.subject);
    console.log('Body preview:', emailTemplate.body.substring(0, 200) + '...');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

directPDFTest();