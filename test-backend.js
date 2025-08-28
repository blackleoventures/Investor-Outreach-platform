async function testBackend() {
  try {
    const response = await fetch("http://localhost:5000/api/health");
    if (response.ok) {
      console.log("✅ Backend is running");
    } else {
      console.log("❌ Backend not responding");
    }
  } catch (error) {
    console.log("❌ Backend connection failed:", error.message);
  }
}

testBackend();