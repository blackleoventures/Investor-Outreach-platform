const fs = require('fs');
const path = require('path');

// Test the document extraction functionality
async function testDocumentExtraction() {
  console.log('🧪 Testing Document Extraction...');
  
  // Create a sample text file for testing
  const testContent = `
Company Name: TechStartup Inc.
Founder: John Smith, CEO
Problem: Small businesses struggle with inventory management
Solution: AI-powered inventory optimization platform
Market: Small business software market worth $50B
Traction: 1,000+ active users, $100K ARR, 25% month-over-month growth
Funding: Raising $2M seed round
Use of Funds: 40% product development, 35% marketing, 25% team expansion
Team: 15+ years combined experience in enterprise software
Revenue: $100K annual recurring revenue
Customers: 1,000+ small businesses across 5 countries
Sector: B2B SaaS
Email: john@techstartup.com
Phone: +1-555-0123
  `;
  
  const testFilePath = path.join(__dirname, '../../../uploads/test-document.txt');
  
  try {
    // Ensure uploads directory exists
    const uploadsDir = path.dirname(testFilePath);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Write test file
    fs.writeFileSync(testFilePath, testContent);
    console.log('✅ Test file created:', testFilePath);
    
    // Test extraction
    const { extractTextFromFile } = require('../controllers/ai.controller');
    
    if (typeof extractTextFromFile === 'function') {
      const extractedText = await extractTextFromFile(testFilePath, 'test-document.txt');
      console.log('📄 Extracted text length:', extractedText.length);
      console.log('📄 Sample text:', extractedText.substring(0, 200) + '...');
      
      if (extractedText.includes('TechStartup Inc.')) {
        console.log('✅ Text extraction working correctly');
      } else {
        console.log('❌ Text extraction failed');
      }
    } else {
      console.log('❌ extractTextFromFile function not found');
    }
    
    // Clean up
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
      console.log('🧹 Test file cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testDocumentExtraction().then(() => {
  console.log('🏁 Test completed');
}).catch(error => {
  console.error('💥 Test error:', error);
});