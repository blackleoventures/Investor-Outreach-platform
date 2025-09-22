const fs = require('fs');
const path = require('path');

async function simplePDFTest() {
  console.log('🧪 Simple PDF Test...');
  
  const pdfPath = path.join(__dirname, 'Cosmedream Deck (1).pdf');
  
  try {
    if (!fs.existsSync(pdfPath)) {
      console.log('❌ PDF not found');
      return;
    }
    
    console.log('✅ PDF found');
    
    // Direct PDF parsing without Firebase
    const pdfParse = require('pdf-parse');
    const buffer = fs.readFileSync(pdfPath);
    
    console.log('📄 PDF buffer size:', buffer.length, 'bytes');
    
    const data = await pdfParse(buffer);
    const extractedText = data.text;
    
    // Save to text file
    const outputPath = path.join(__dirname, 'cosmedream-extracted.txt');
    fs.writeFileSync(outputPath, extractedText);
    
    console.log('✅ Success!');
    console.log('📄 Output file:', outputPath);
    console.log('📊 Text length:', extractedText.length);
    console.log('📝 First 500 chars:');
    console.log(extractedText.substring(0, 500));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

simplePDFTest();