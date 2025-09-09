const { db } = require('./src/config/firebase-db.config');

async function testFirebase() {
  try {
    console.log('Testing Firebase connection...');
    
    // Try to write a test document
    const testRef = db.collection('test').doc('connection-test');
    await testRef.set({
      message: 'Firebase connection test',
      timestamp: new Date()
    });
    
    console.log('✅ Firebase write successful');
    
    // Try to read it back
    const doc = await testRef.get();
    if (doc.exists) {
      console.log('✅ Firebase read successful:', doc.data());
    }
    
    // Clean up
    await testRef.delete();
    console.log('✅ Firebase delete successful');
    
  } catch (error) {
    console.log('❌ Firebase error:', error.message);
  }
}

testFirebase();