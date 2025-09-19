const fs = require('fs');
const path = require('path');

async function testPDFExtraction() {
  console.log('🧪 Testing PDF Extraction...');
  
  const pdfPath = path.join(__dirname, '../Cosmedream Deck (1).pdf');
  
  try {
    if (!fs.existsSync(pdfPath)) {
      console.log('❌ PDF not found:', pdfPath);
      return;
    }
    
    console.log('✅ PDF found:', pdfPath);
    
    const { extractTextFromFile } = require('./src/controllers/ai.controller');
    const extractedText = await extractTextFromFile(pdfPath, 'Cosmedream Deck (1).pdf');
    
    const outputPath = path.join(__dirname, '../extracted-cosmedream-data.txt');
    fs.writeFileSync(outputPath, extractedText);
    
    console.log('✅ Extraction successful!');
    console.log('📄 Output:', outputPath);
    console.log('📊 Length:', extractedText.length);
    console.log('📝 Preview:', extractedText.substring(0, 200));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testPDFExtraction();