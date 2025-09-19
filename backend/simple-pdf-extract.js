const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

async function extractPDF() {
  console.log('🧪 Extracting PDF data...');
  
  const pdfPath = path.join(__dirname, '../Cosmedream Deck (1).pdf');
  
  try {
    if (!fs.existsSync(pdfPath)) {
      console.log('❌ PDF not found:', pdfPath);
      return;
    }
    
    console.log('✅ PDF found:', pdfPath);
    
    const buffer = fs.readFileSync(pdfPath);
    console.log('📄 PDF size:', buffer.length, 'bytes');
    
    const data = await pdfParse(buffer);
    const text = data.text;
    
    const outputPath = path.join(__dirname, '../cosmedream-extracted-data.txt');
    fs.writeFileSync(outputPath, text);
    
    console.log('✅ Extraction complete!');
    console.log('📄 Output:', outputPath);
    console.log('📊 Length:', text.length, 'characters');
    console.log('📝 Preview:');
    console.log('=' * 50);
    console.log(text.substring(0, 800));
    console.log('=' * 50);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

extractPDF();