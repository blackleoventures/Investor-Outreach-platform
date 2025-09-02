const fs = require('fs');
const pdfParse = require('pdf-parse');

async function testPDFExtraction() {
  try {
    console.log('🔍 Testing PDF extraction...');
    
    const buffer = fs.readFileSync('./test-pitch-deck.pdf');
    console.log('📄 PDF buffer size:', buffer.length, 'bytes');
    
    // Method 1: Standard extraction
    try {
      const data = await pdfParse(buffer, {
        normalizeWhitespace: true,
        disableCombineTextItems: false
      });
      const text = data.text || '';
      console.log('✅ Method 1 extracted:', text.length, 'chars');
      console.log('📄 Sample text:', text.substring(0, 300));
      
      if (text.length > 100) {
        console.log('✅ PDF extraction successful!');
        return;
      }
    } catch (error) {
      console.log('❌ Method 1 failed:', error.message);
    }
    
    // Method 2: Simple extraction
    try {
      const data = await pdfParse(buffer);
      const text = data.text || '';
      console.log('✅ Method 2 extracted:', text.length, 'chars');
      console.log('📄 Sample text:', text.substring(0, 300));
      
      if (text.length > 100) {
        console.log('✅ PDF extraction successful!');
        return;
      }
    } catch (error) {
      console.log('❌ Method 2 failed:', error.message);
    }
    
    console.log('❌ All PDF extraction methods failed');
    
  } catch (error) {
    console.log('❌ PDF test failed:', error.message);
  }
}

testPDFExtraction();