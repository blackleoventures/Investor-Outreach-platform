const axios = require('axios');

async function testServer() {
  try {
    console.log('Testing server connection...');
    const response = await axios.get('http://localhost:5000/api/healthcheck');
    console.log('✅ Server is running:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Server not responding:', error.message);
    return false;
  }
}

testServer();