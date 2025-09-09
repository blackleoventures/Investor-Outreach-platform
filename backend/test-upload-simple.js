// Simple test without Firebase - just test file parsing
const fs = require('fs');
const Papa = require('papaparse');
const XLSX = require('xlsx');

async function testFileParsing() {
  try {
    console.log('🚀 Testing file parsing...');
    
    // Test CSV parsing
    const csvContent = fs.readFileSync('./test-data.csv', 'utf-8');
    const csvResult = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
    
    console.log('✅ CSV parsed successfully:');
    console.log('Records:', csvResult.data.length);
    console.log('Sample record:', csvResult.data[0]);
    
    // Create Excel file for testing
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(csvResult.data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Investors');
    XLSX.writeFile(workbook, './test-data.xlsx');
    
    // Test Excel parsing
    const excelWorkbook = XLSX.readFile('./test-data.xlsx');
    const excelWorksheet = excelWorkbook.Sheets[excelWorkbook.SheetNames[0]];
    const excelData = XLSX.utils.sheet_to_json(excelWorksheet);
    
    console.log('✅ Excel parsed successfully:');
    console.log('Records:', excelData.length);
    console.log('Sample record:', excelData[0]);
    
    console.log('🎉 File parsing works perfectly!');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testFileParsing();