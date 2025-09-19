const fs = require('fs');
const path = require('path');
const { extractTextFromFile } = require('./src/controllers/ai.controller');

async function testPDFAPI() {
  console.log('🧪 Testing PDF API directly...');
  
  const pdfPath = path.join(__dirname, '../Cosmedream Deck (1).pdf');
  
  try {
    if (!fs.existsSync(pdfPath)) {
      console.log('❌ PDF not found');
      return;
    }
    
    console.log('✅ PDF found, extracting text...');
    
    // Direct function call
    const extractedText = await extractTextFromFile(pdfPath, 'Cosmedream Deck (1).pdf');
    
    console.log('📊 Extraction result:');
    console.log('Length:', extractedText.length, 'characters');
    console.log('\n📝 First 500 characters:');
    console.log('=' * 50);
    console.log(extractedText.substring(0, 500));
    console.log('=' * 50);
    
    // Save extracted text
    const outputPath = path.join(__dirname, '../extracted-text-output.txt');
    fs.writeFileSync(outputPath, extractedText);
    console.log('✅ Text saved to:', outputPath);
    
    // Check if it contains expected data
    const lowerText = extractedText.toLowerCase();
    console.log('\n🔍 Data Analysis:');
    console.log('Contains "cosmedream":', lowerText.includes('cosmedream'));
    console.log('Contains "problem":', lowerText.includes('problem'));
    console.log('Contains "solution":', lowerText.includes('solution'));
    console.log('Contains "market":', lowerText.includes('market'));
    console.log('Contains "funding":', lowerText.includes('funding') || lowerText.includes('raising'));
    console.log('Contains "team":', lowerText.includes('team'));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testPDFAPI();