const fileDB = require('./src/services/file-db.service');

async function testUpload() {
  console.log('Testing file upload process...');
  
  // Test data
  const testData = [
    {
      investor_name: 'Test Fund 1',
      partner_name: 'John Doe',
      partner_email: 'john@testfund.com',
      fund_type: 'VC',
      country: 'USA'
    },
    {
      investor_name: 'Test Fund 2', 
      partner_name: 'Jane Smith',
      partner_email: 'jane@testfund2.com',
      fund_type: 'Angel',
      country: 'UK'
    }
  ];

  try {
    // Write test data directly
    await fileDB.writeData(testData);
    console.log('Test data written successfully');
    
    // Read back the data
    const readData = await fileDB.getAllInvestors();
    console.log('Read back data:', readData.length, 'records');
    console.log('Sample record:', readData[0]);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testUpload();