// Clear cache script
console.log('Clearing Next.js cache...');

const fs = require('fs');
const path = require('path');

const nextDir = path.join(__dirname, '.next');

if (fs.existsSync(nextDir)) {
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.log('Cache cleared successfully!');
} else {
  console.log('No cache found.');
}

console.log('Please refresh your browser and clear browser cache (Ctrl+Shift+R)');