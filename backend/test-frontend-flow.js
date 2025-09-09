const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testFrontendFlow() {
  try {
    console.log('🚀 Testing complete frontend flow...');
    
    // 1. Upload file
    console.log('📤 Step 1: Upload file...');
    const form = new FormData();
    form.append('file', fs.createReadStream('./test-data.csv'));
    
    const uploadResponse = await axios.post('http://localhost:5000/api/investors/upload-file', form, {
      headers: form.getHeaders()
    });
    console.log('✅ Upload successful:', uploadResponse.data);
    
    // 2. Get all investors (what frontend will show)
    console.log('📋 Step 2: Get all investors...');
    const allResponse = await axios.get('http://localhost:5000/api/investors/all');
    console.log('✅ Total investors:', allResponse.data.totalCount);
    console.log('✅ Sample investor:', allResponse.data.data[0]);
    
    // 3. Test update
    console.log('✏️ Step 3: Update investor...');
    const firstInvestor = allResponse.data.data[0];
    const updateResponse = await axios.put(`http://localhost:5000/api/investors/${firstInvestor.id}`, {
      partner_name: 'Updated Name'
    });
    console.log('✅ Update successful:', updateResponse.data.message);
    
    // 4. Test delete
    console.log('🗑️ Step 4: Delete investor...');
    const deleteResponse = await axios.delete(`http://localhost:5000/api/investors/${firstInvestor.id}`);
    console.log('✅ Delete successful:', deleteResponse.data.message);
    
    // 5. Final count
    console.log('📊 Step 5: Final count...');
    const finalResponse = await axios.get('http://localhost:5000/api/investors/all');
    console.log('✅ Final count:', finalResponse.data.totalCount);
    
    console.log('🎉 Complete frontend flow working perfectly!');
    
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
  }
}

testFrontendFlow();