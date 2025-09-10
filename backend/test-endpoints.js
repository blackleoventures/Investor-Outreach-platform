const axios = require('axios');

async function testEndpoints() {
  const baseURL = 'http://localhost:5000';
  
  try {
    console.log('Testing /api/investors/all endpoint...');
    const response = await axios.get(`${baseURL}/api/investors/all`);
    console.log('Response:', response.data);
    console.log('Total count:', response.data.totalCount);
    console.log('Data length:', response.data.data?.length || 0);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testEndpoints();