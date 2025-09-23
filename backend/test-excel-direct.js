const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

console.log('=== TESTING EXCEL FILE FOR REAL DATA ===');

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
      console.log('\n=== FIRST RECORD ===');
      console.log(data[0]);
      
      console.log('\n=== COLUMN NAMES ===');
      console.log(Object.keys(data[0]));
      
      console.log('\n=== CHECKING FOR REAL DATA ===');
      const first = data[0];
      console.log('Investor Name:', first['Investor Name']);
      console.log('Partner Name:', first['Partner Name']);
      console.log('Partner Email:', first['Partner Email']);
      console.log('Fund Type:', first['Fund Type']);
      console.log('Location:', first['Location']);
      
      // Check if this looks like real data or dummy data
      const investorName = first['Investor Name'];
      if (investorName && investorName.includes('.406 Ventures')) {
        console.log('\n✅ REAL DATA DETECTED!');
      } else if (investorName && investorName.includes('Investor ')) {
        console.log('\n❌ DUMMY DATA DETECTED!');
      } else {
        console.log('\n❓ UNKNOWN DATA FORMAT');
      }
      
      console.log('\n=== FIRST 3 RECORDS ===');
      data.slice(0, 3).forEach((record, index) => {
        console.log(`\nRecord ${index + 1}:`);
        console.log(`  Investor: ${record['Investor Name']}`);
        console.log(`  Partner: ${record['Partner Name']}`);
        console.log(`  Email: ${record['Partner Email']}`);
        console.log(`  Location: ${record['Location']}`);
      });
    }
  } catch (error) {
    console.error('Error reading Excel:', error);
  }
} else {
  console.log('Excel file not found!');
}

console.log('\n=== END TEST ===');