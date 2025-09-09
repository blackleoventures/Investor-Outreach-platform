const fileDB = require('./src/services/file-db.service');

async function testFileDB() {
  try {
    console.log('🚀 Testing file database...');
    
    // Test upload
    const count = await fileDB.uploadFile('./test-data.csv', 'csv');
    console.log('✅ Upload successful:', count, 'records');
    
    // Test get all
    const investors = await fileDB.getAllInvestors();
    console.log('✅ Retrieved investors:', investors.length);
    console.log('Sample:', investors[0]);
    
    // Test add
    const newInvestor = await fileDB.addInvestor({
      partner_name: 'Test User',
      partner_email: 'test@example.com',
      firm_name: 'Test Firm'
    });
    console.log('✅ Added investor:', newInvestor.id);
    
    // Test update
    const updated = await fileDB.updateInvestor(newInvestor.id, {
      partner_name: 'Updated User'
    });
    console.log('✅ Updated investor:', updated.partner_name);
    
    // Test delete
    await fileDB.deleteInvestor(newInvestor.id);
    console.log('✅ Deleted investor');
    
    console.log('🎉 All tests passed!');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testFileDB();