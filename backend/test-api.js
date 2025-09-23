const excelService = require('./src/services/excel.service');

console.log('=== TESTING BACKEND DATA ===');

// Test reading Excel data directly
const data = excelService.readExcelData();
console.log('Total records:', data.length);

if (data.length > 0) {
  console.log('First record:', data[0]);
  console.log('Column names:', Object.keys(data[0]));
  console.log('First 3 records:');
  data.slice(0, 3).forEach((record, index) => {
    console.log(`Record ${index + 1}:`, record);
  });
}

console.log('=== END BACKEND TEST ===');