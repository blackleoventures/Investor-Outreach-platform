const fs = require('fs');
const path = require('path');
const fileDB = require('./src/services/file-db.service');

async function testCSVUpload() {
  console.log('Testing CSV upload process...');
  
  const csvPath = path.join(__dirname, 'test-investors.csv');
  
  try {
    // Test the uploadFile method directly
    const count = await fileDB.uploadFile(csvPath, 'csv');
    console.log('Upload completed, count:', count);
    
    // Read back all data
    const allData = await fileDB.getAllInvestors();
    console.log('Total records in database:', allData.length);
    console.log('Sample records:', allData.slice(0, 3));
    
  } catch (error) {
    console.error('Upload test failed:', error);
  }
}

testCSVUpload();