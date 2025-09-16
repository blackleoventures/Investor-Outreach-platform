const express = require('express');
const app = express();

// Test route to check investor data
app.get('/test-investors', async (req, res) => {
  try {
    // Simulate the same API call that frontend makes
    const fs = require('fs');
    const path = require('path');
    
    // Check if there are any investor files
    const uploadsDir = path.join(__dirname, 'uploads');
    console.log('Checking uploads directory:', uploadsDir);
    
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      console.log('Files in uploads:', files);
      
      const investorFiles = files.filter(f => f.includes('investor') || f.includes('Investor'));
      console.log('Investor files:', investorFiles);
      
      if (investorFiles.length > 0) {
        const filePath = path.join(uploadsDir, investorFiles[0]);
        console.log('Reading file:', filePath);
        
        if (filePath.endsWith('.json')) {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          console.log('JSON data sample:', data.slice(0, 3));
          res.json({ source: 'JSON file', count: data.length, sample: data.slice(0, 5) });
        } else {
          res.json({ source: 'Non-JSON file', file: investorFiles[0] });
        }
      } else {
        res.json({ source: 'No investor files found', files });
      }
    } else {
      res.json({ source: 'No uploads directory' });
    }
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 5002;
app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
  console.log('Visit http://localhost:${PORT}/test-investors to check data');
});