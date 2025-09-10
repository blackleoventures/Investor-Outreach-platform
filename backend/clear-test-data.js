const fileDB = require('./src/services/file-db.service');

async function clearTestData() {
  console.log('Clearing test data...');
  
  try {
    // Write empty array to clear all data
    await fileDB.writeData([]);
    console.log('Test data cleared successfully');
    
    // Verify it's empty
    const data = await fileDB.getAllInvestors();
    console.log('Current data count:', data.length);
    
  } catch (error) {
    console.error('Clear failed:', error);
  }
}

clearTestData();