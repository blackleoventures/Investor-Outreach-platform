const fs = require('fs');
const path = require('path');

console.log('🔧 Applying comprehensive mobile fixes...');

// Clear Next.js cache
const nextDir = path.join(__dirname, '.next');
if (fs.existsSync(nextDir)) {
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.log('✅ Cleared Next.js cache');
}

// Clear node_modules cache
const cacheDir = path.join(__dirname, 'node_modules', '.cache');
if (fs.existsSync(cacheDir)) {
  fs.rmSync(cacheDir, { recursive: true, force: true });
  console.log('✅ Cleared node_modules cache');
}

console.log('🚀 Mobile optimization complete!');
console.log('📱 Instructions:');
console.log('1. Hard refresh browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)');
console.log('2. Open DevTools > Application > Storage > Clear storage');
console.log('3. Check mobile view - should show only 3 campaign cards');
console.log('4. If still showing old content, try incognito/private mode');