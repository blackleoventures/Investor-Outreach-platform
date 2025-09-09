const axios = require('axios');

async function testFrontendEndpoints() {
  try {
    console.log('🚀 Testing frontend API endpoints...');
    
    // Test get all investors
    console.log('📋 Testing GET /api/investors/all...');
    const response = await axios.get('http://localhost:5000/api/investors/all');
    console.log('✅ GET all investors:', response.data.totalCount, 'investors found');
    
    // Test upload stats
    console.log('📊 Testing GET /api/investors/upload-stats...');
    const statsResponse = await axios.get('http://localhost:5000/api/investors/upload-stats');
    console.log('✅ Upload stats:', statsResponse.data);
    
    console.log('🎉 All frontend endpoints working!');
    
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
  }
}

testFrontendEndpoints();