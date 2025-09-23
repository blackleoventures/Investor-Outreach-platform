const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// Complete data from your Google Sheets
const realData = [
  { 'Investor Name': '.406 Ventures', 'Partner Name': 'Payal Divakaran', 'Partner Email': 'payal@406ventures.com', 'Phone number': '+919047724970', 'Fund Type': 'Venture Fund', 'Fund Stage': 'Seed', 'Fund Focus (Sectors)': 'Software,Cybersecurity,Healthcare,Big Data & Analytics', 'Location': 'Boston' },
  { 'Investor Name': '01 Advisors', 'Partner Name': 'David Rivinus', 'Partner Email': 'dave@01a.com', 'Phone number': '+917620691166', 'Fund Type': 'Venture Fund', 'Fund Stage': 'Pre-Seed,Seed,Series A', 'Fund Focus (Sectors)': 'Cryptocurrency / Blockchain,Entertainment & Media,Sports,AI/ML,FinTech', 'Location': 'San Francisco,California' },
  { 'Investor Name': '1/0 Capital', 'Partner Name': 'Vishal Garg', 'Partner Email': 'vgarg@better.com', 'Phone number': '+918322596794', 'Fund Type': 'Venture Fund', 'Fund Stage': 'Series A,Series B,Series C,Series D', 'Fund Focus (Sectors)': 'Software,Mobile,SaaS,Consumer,FinTech', 'Location': 'New York' },
  { 'Investor Name': '1confirmation', 'Partner Name': 'Nick Tomaino', 'Partner Email': 'nick@1confirmation.com', 'Phone number': '+919091013248', 'Fund Type': 'Venture Fund', 'Fund Stage': 'Seed,Series A,Series B', 'Fund Focus (Sectors)': 'Cryptocurrency / Blockchain,Information Technology', 'Location': 'San Francisco' },
  { 'Investor Name': '2.12 Angels', 'Partner Name': 'Ben Orthlieb', 'Partner Email': 'ben@212angels.com', 'Phone number': '+917687937169', 'Fund Type': 'Venture Fund', 'Fund Stage': 'Seed', 'Fund Focus (Sectors)': 'Developer Tools,Professional Services', 'Location': 'San Francisco' },
  { 'Investor Name': '3ig Ventures', 'Partner Name': 'Chip Brian', 'Partner Email': 'chip@3igventures.com', 'Phone number': '+917922030026', 'Fund Type': 'Venture Fund', 'Fund Stage': 'Seed,Series A,Series B', 'Fund Focus (Sectors)': 'Cryptocurrency / Blockchain,E-Commerce,FinTech', 'Location': 'New York' },
  { 'Investor Name': '3L Capital', 'Partner Name': 'Jodi Kessler', 'Partner Email': 'jodi@3lcap.com', 'Phone number': '+917420830720', 'Fund Type': 'Venture Fund', 'Fund Stage': 'Seed,Series A,Series B,Series C', 'Fund Focus (Sectors)': 'PropTech,Software,Enterprise,Logistics,Insurance', 'Location': 'Los Angeles' },
  { 'Investor Name': '3Lines', 'Partner Name': 'Krishna Kunapuli', 'Partner Email': 'krishna.kunapuli@3lines.vc', 'Phone number': '+919754829773', 'Fund Type': 'Venture Fund', 'Fund Stage': 'Pre-Seed,Seed,Series A', 'Fund Focus (Sectors)': 'ClimaTech & CleanTech,Software,Energy,Infrastructure', 'Location': 'Greenwood Village' },
  { 'Investor Name': '3one4 Capital', 'Partner Name': 'Anurag Ramdasan', 'Partner Email': 'anurag@3one4capital.com', 'Phone number': '+917917944002', 'Fund Type': 'Venture Fund', 'Fund Stage': 'Seed,Series A,Series B', 'Fund Focus (Sectors)': 'Mobile,Apps,EdTech,FinTech,Sales Automation', 'Location': 'Bangalore,India' },
  { 'Investor Name': '3VC', 'Partner Name': 'Marius Istrate', 'Partner Email': 'marius@three.vc', 'Phone number': '+919541494666', 'Fund Type': 'Venture Fund', 'Fund Stage': 'Seed,Series A,Series B', 'Fund Focus (Sectors)': 'Healthcare,Artificial Intelligence & Machine Learning (AI/ML)', 'Location': 'Vienna,Austria' },
  { 'Investor Name': '4BIO Capital', 'Partner Name': 'Dmitry "Dima" Kuzmin', 'Partner Email': 'dkuzmin@hornet-tx.com', 'Phone number': '+919709142438', 'Fund Type': 'Venture Fund', 'Fund Stage': 'Seed,Series A,Series B,Series C', 'Fund Focus (Sectors)': 'Biotech,Healthcare,Life Science,Medical Devices', 'Location': 'London,United Kingdom' },
  { 'Investor Name': '4DX Ventures', 'Partner Name': 'Peter Orth', 'Partner Email': 'peter@4dxventures.com', 'Phone number': '+919928495602', 'Fund Type': 'Venture Fund', 'Fund Stage': 'Pre-Seed,Seed,Series A', 'Fund Focus (Sectors)': 'FinTech,Apps,SpaceTech,Telecommunications', 'Location': 'Brooklyn' },
  { 'Investor Name': '5AM Ventures', 'Partner Name': 'John Diekman', 'Partner Email': 'john@5amventures.com', 'Phone number': '+919840498515', 'Fund Type': 'Venture Fund', 'Fund Stage': 'Pre-Seed,Seed,Series A,Series B', 'Fund Focus (Sectors)': 'BioTech,Life Science,Healthcare,Advanced Materials', 'Location': 'Menlo Park,California' },
  { 'Investor Name': '6th Man Ventures', 'Partner Name': 'Mike Dudas', 'Partner Email': 'mdudas@6thman.ventures', 'Phone number': '+919668202693', 'Fund Type': 'Venture Fund', 'Fund Stage': 'Pre-Seed,Seed,Series A', 'Fund Focus (Sectors)': 'Cryptocurrency / Blockchain,Software', 'Location': 'New York' },
  { 'Investor Name': '7BC Venture Capital', 'Partner Name': 'Alejandro Hill', 'Partner Email': 'alejandro@7bc.vc', 'Phone number': '+917931611617', 'Fund Type': 'Venture Fund', 'Fund Stage': 'Seed,Series A', 'Fund Focus (Sectors)': 'Artificial Intelligence & Machine Learning (AI/ML)', 'Location': 'San Francisco' },
  { 'Investor Name': '7percent Ventures', 'Partner Name': 'Andrew Gault', 'Partner Email': 'andrew@7pc.vc', 'Phone number': '+917005717560', 'Fund Type': 'Venture Fund', 'Fund Stage': 'Seed,Series A,Series B', 'Fund Focus (Sectors)': 'AgTech (FarmTech),Food and Beverage,PropTech', 'Location': 'London,United Kingdom' },
  { 'Investor Name': '7hirty Capital', 'Partner Name': 'Micah Tapman', 'Partner Email': 'micah@7thirtycapital.com', 'Phone number': '+919471731806', 'Fund Type': 'Venture Fund', 'Fund Stage': 'Seed,Series A,Series B', 'Fund Focus (Sectors)': 'AgTech (FarmTech),Cannabis,Enterprise,Software', 'Location': 'Boulder,Colorado' },
  { 'Investor Name': '7wire Ventures', 'Partner Name': 'Glen Tullman', 'Partner Email': 'glen@7wireventures.com', 'Phone number': '+917415441156', 'Fund Type': 'Venture Fund', 'Fund Stage': 'Pre-Seed,Seed,Series A', 'Fund Focus (Sectors)': 'Elder Care,Healthcare,Professional Services,Software', 'Location': 'Chicago,Illinois' },
  { 'Investor Name': '8VC', 'Partner Name': 'Jack Moshkovich', 'Partner Email': 'jmoshkovich@8vc.com', 'Phone number': '+919428216295', 'Fund Type': 'Venture Fund', 'Fund Stage': 'Pre-Seed,Seed,Series A', 'Fund Focus (Sectors)': 'Manufacturing,FinTech,ClimaTech & CleanTech', 'Location': 'Austin,France' },
  { 'Investor Name': '9Unicorns Accelerator', 'Partner Name': 'Soham Avlani', 'Partner Email': 'soham@9unicorns.in', 'Phone number': '+918769140108', 'Fund Type': 'Accelerator', 'Fund Stage': 'Seed,Series A,Series B', 'Fund Focus (Sectors)': 'Consumer Electronics,Health & Wellness,Commerce', 'Location': 'Mumbai,India' },
  { 'Investor Name': '9Yards Capital', 'Partner Name': 'Theo Osborne', 'Partner Email': 'theo@9yardscapital.com', 'Phone number': '+917535520288', 'Fund Type': 'Venture Fund', 'Fund Stage': 'Series B,Series C,Series D', 'Fund Focus (Sectors)': 'Manufacturing,B2B,FinTech,Healthcare,Micro-Mobility', 'Location': 'San Francisco' },
  { 'Investor Name': '10Branch', 'Partner Name': 'Miles Haladay', 'Partner Email': 'mileshaladay@gmail.com', 'Phone number': '+919790702358', 'Fund Type': 'Family Office', 'Fund Stage': 'Series B,Series C', 'Fund Focus (Sectors)': 'FinTech,SaaS,Cryptocurrency / Blockchain,AI', 'Location': 'Portland' },
  { 'Investor Name': '10T Holdings', 'Partner Name': 'Stan Miroshnik', 'Partner Email': 'sm@10tfund.com', 'Phone number': '+918792543797', 'Fund Type': 'Venture Fund', 'Fund Stage': 'Series C,Series D', 'Fund Focus (Sectors)': 'Cryptocurrency / Blockchain', 'Location': 'Greenwich' }
];

console.log('=== UPDATING EXCEL WITH REAL DATA ===');

const excelFilePath = path.join(__dirname, 'data/investors.xlsx');
console.log('Excel file path:', excelFilePath);

try {
  // Create new workbook with real data
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(realData);
  xlsx.utils.book_append_sheet(wb, ws, 'Investors');
  
  // Write to file
  xlsx.writeFile(wb, excelFilePath);
  
  console.log('✅ Excel file updated with real data!');
  console.log('Records added:', realData.length);
  
  // Verify the update
  const workbook = xlsx.readFile(excelFilePath);
  const worksheet = workbook.Sheets['Investors'];
  const data = xlsx.utils.sheet_to_json(worksheet);
  
  console.log('\n=== VERIFICATION ===');
  console.log('Total records in file:', data.length);
  console.log('First record:', data[0]);
  console.log('Column names:', Object.keys(data[0]));
  
} catch (error) {
  console.error('Error updating Excel file:', error);
}

console.log('\n=== DONE ===');