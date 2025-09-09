const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testUpload() {
  try {
    console.log('🚀 Testing file upload...');
    
    const form = new FormData();
    form.append('file', fs.createReadStream('./test-data.csv'));
    
    console.log('📤 Sending request to: http://localhost:5000/api/investors/upload-file');
    
    const response = await axios.post('http://localhost:5000/api/investors/upload-file', form, {
      headers: form.getHeaders(),
      timeout: 10000
    });
    
    console.log('✅ Success:', response.data);
    
  } catch (error) {
    console.log('❌ Error Status:', error.response?.status);
    console.log('❌ Error Data:', error.response?.data);
    console.log('❌ Error Message:', error.message);
  }
}

testUpload();