const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

console.log('=== TESTING EXCEL FILE DIRECTLY ===');

const excelFilePath = path.join(__dirname, 'data/investors.xlsx');
console.log('Excel file path:', excelFilePath);
console.log('File exists:', fs.existsSync(excelFilePath));

if (fs.existsSync(excelFilePath)) {
  try {
    const workbook = xlsx.readFile(excelFilePath);
    const sheetName = workbook.SheetNames[0];
    console.log('Sheet name:', sheetName);
    
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    console.log('Total records:', data.length);
    
    if (data.length > 0) {
      console.log('First record:', data[0]);
      console.log('Column names:', Object.keys(data[0]));
      console.log('\nFirst 3 records:');
      data.slice(0, 3).forEach((record, index) => {
        console.log(`\nRecord ${index + 1}:`);
        Object.entries(record).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });
      });
    }
  } catch (error) {
    console.error('Error reading Excel:', error);
  }
} else {
  console.log('Excel file not found!');
}

console.log('\n=== END EXCEL TEST ===');