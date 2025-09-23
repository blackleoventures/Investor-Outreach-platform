const excelService = require('./src/services/excel.service');

console.log('=== TESTING REAL EXCEL DATA ===');

// Test reading Excel data directly
const data = excelService.readExcelData();
console.log('Total records:', data.length);

if (data.length > 0) {
  console.log('\n=== FIRST RECORD ===');
  console.log(data[0]);
  
  console.log('\n=== COLUMN NAMES ===');
  console.log(Object.keys(data[0]));
  
  console.log('\n=== CHECKING FOR REAL DATA ===');
  const firstRecord = data[0];
  console.log('Investor Name:', firstRecord['Investor Name']);
  console.log('Partner Name:', firstRecord['Partner Name']);
  console.log('Partner Email:', firstRecord['Partner Email']);
  console.log('Fund Type:', firstRecord['Fund Type']);
  console.log('Fund Stage:', firstRecord['Fund Stage']);
  console.log('Location:', firstRecord['Location']);
  
  console.log('\n=== FIRST 3 REAL RECORDS ===');
  data.slice(0, 3).forEach((record, index) => {
    console.log(`\nRecord ${index + 1}:`);
    console.log(`  Investor: ${record['Investor Name']}`);
    console.log(`  Partner: ${record['Partner Name']}`);
    console.log(`  Email: ${record['Partner Email']}`);
    console.log(`  Phone: ${record['Phone number']}`);
    console.log(`  Fund Type: ${record['Fund Type']}`);
    console.log(`  Location: ${record['Location']}`);
  });
}

console.log('\n=== END TEST ===');