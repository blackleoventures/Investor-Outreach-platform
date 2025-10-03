const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const chokidar = require('chokidar');
const { db } = require('../config/firebase-db.config');
const transformFrontendToDB = require('../utils/functions');

class ExcelService {
  constructor() {
    // Use local data directory instead of /tmp
    this.excelFilePath = path.join(__dirname, '../../data/investors.xlsx');
    this.incubatorsFilePath = path.join(__dirname, '../../data/incubators.xlsx');
    this.isWatching = false;
    this.watcher = null;
  }

  // Initialize Excel file if it doesn't exist
  async initializeExcelFile() {
    try {
      const dataDir = path.dirname(this.excelFilePath);
      
      // Create data directory if it doesn't exist
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Create Excel file if it doesn't exist
      if (!fs.existsSync(this.excelFilePath)) {
        const headers = [
          'investor_name', 'partner_name', 'partner_email', 'phone_number',
          'fund_type', 'fund_stage', 'country', 'state', 'city', 'ticket_size',
          'website', 'sector_focus', 'location', 'founded_year', 'portfolio_companies',
          'twitter_link', 'linkedIn_link', 'facebook_link', 'number_of_investments',
          'number_of_exits', 'fund_description'
        ];
        
        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.aoa_to_sheet([headers]);
        xlsx.utils.book_append_sheet(wb, ws, 'Investors');
        xlsx.writeFile(wb, this.excelFilePath);
        
        console.log('Excel file created:', this.excelFilePath);
      }
    } catch (error) {
      console.log('Excel file initialization skipped in serverless environment');
    }
  }

  // Read data from Excel file
  readExcelData(filePath = null) {
    try {
      const targetPath = filePath || this.excelFilePath;
      if (!fs.existsSync(targetPath)) {
        console.log(`Excel file not found: ${targetPath}`);
        return [];
      }

      const workbook = xlsx.readFile(targetPath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet);
      
      return data.filter(row => {
        // More flexible filtering for different file types
        return row['Partner Email'] || row.partner_email || row.email || row.contact_email || 
               Object.values(row).some(val => 
                 typeof val === 'string' && val.includes('@')
               );
      });
    } catch (error) {
      console.error('Error reading Excel file:', error);
      return [];
    }
  }

  // Read both investors and incubators data
  readAllExcelData() {
    try {
      const investorsData = this.readExcelData(this.excelFilePath);
      const incubatorsData = this.readExcelData(this.incubatorsFilePath);
      
      return {
        investors: investorsData,
        incubators: incubatorsData,
        total: investorsData.length + incubatorsData.length
      };
    } catch (error) {
      console.error('Error reading all Excel data:', error);
      return { investors: [], incubators: [], total: 0 };
    }
  }

  // Write data to Excel file
  async writeExcelData(data) {
    try {
      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.json_to_sheet(data);
      xlsx.utils.book_append_sheet(wb, ws, 'Investors');
      xlsx.writeFile(wb, this.excelFilePath);
      
      console.log('Excel file updated with', data.length, 'records');
    } catch (error) {
      console.error('Error writing Excel file:', error);
      throw error;
    }
  }

  // Sync Excel data to Firebase
  async syncExcelToFirebase() {
    try {
      console.log('Syncing Excel to Firebase...');
      
      const excelData = this.readExcelData();
      if (excelData.length === 0) {
        console.log('No data in Excel file');
        return { success: true, message: 'No data to sync' };
      }

      // Validate data
      const validData = excelData.filter(item => {
        const email = item['Partner Email'] || item.partner_email || item.email;
        return email && email.trim();
      });
      if (validData.length === 0) {
        throw new Error('No valid records found. Partner email is required.');
      }

      // Get current Firebase data
      const investorsRef = db.collection('investors');
      const snapshot = await investorsRef.get();
      const firebaseData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Process data in smaller batches
      const batchSize = 500;
      const normalizedData = validData.map(item => {
        try {
          return transformFrontendToDB(item);
        } catch (err) {
          console.error('Transform error:', err, item);
          return null;
        }
      }).filter(Boolean);
      
      if (normalizedData.length === 0) {
        throw new Error('No valid data after processing');
      }
      
      // Clear existing data first
      if (firebaseData.length > 0) {
        for (let i = 0; i < firebaseData.length; i += batchSize) {
          const batch = db.batch();
          const chunk = firebaseData.slice(i, i + batchSize);
          chunk.forEach(investor => {
            batch.delete(investorsRef.doc(investor.id));
          });
          await batch.commit();
        }
      }
      
      // Add new data in batches
      for (let i = 0; i < normalizedData.length; i += batchSize) {
        const batch = db.batch();
        const chunk = normalizedData.slice(i, i + batchSize);
        
        chunk.forEach(investor => {
          const investorRef = investorsRef.doc();
          batch.set(investorRef, {
            ...investor,
            createdAt: new Date(),
            syncedFromExcel: true
          });
        });
        
        await batch.commit();
      }
      
      console.log(`Synced ${normalizedData.length} investors from Excel to Firebase`);
      return { success: true, recordCount: normalizedData.length };
      
    } catch (error) {
      console.error('Error syncing Excel to Firebase:', error);
      throw error;
    }
  }

  // Sync Firebase data to Excel
  async syncFirebaseToExcel() {
    try {
      console.log('Syncing Firebase to Excel...');
      
      const investorsRef = db.collection('investors');
      const snapshot = await investorsRef.get();
      const firebaseData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          investor_name: data.investor_name || '',
          partner_name: data.partner_name || '',
          partner_email: data.partner_email || '',
          phone_number: data.phone_number || '',
          fund_type: data.fund_type || '',
          fund_stage: Array.isArray(data.fund_stage) ? data.fund_stage.join(', ') : data.fund_stage || '',
          country: data.country || '',
          state: data.state || '',
          city: data.city || '',
          ticket_size: data.ticket_size || '',
          website: data.website || '',
          sector_focus: Array.isArray(data.sector_focus) ? data.sector_focus.join(', ') : data.sector_focus || '',
          location: data.location || '',
          founded_year: data.founded_year || '',
          portfolio_companies: Array.isArray(data.portfolio_companies) ? data.portfolio_companies.join(', ') : data.portfolio_companies || '',
          twitter_link: data.twitter_link || '',
          linkedIn_link: data.linkedIn_link || '',
          facebook_link: data.facebook_link || '',
          number_of_investments: data.number_of_investments || 0,
          number_of_exits: data.number_of_exits || 0,
          fund_description: data.fund_description || ''
        };
      });

      await this.writeExcelData(firebaseData);
      console.log(`Synced ${firebaseData.length} investors from Firebase to Excel`);
      
    } catch (error) {
      console.error('Error syncing Firebase to Excel:', error);
    }
  }

  // Start watching Excel files for changes
  startWatching() {
    // Skip file watching in serverless environment
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      console.log('File watching disabled in serverless environment');
      return;
    }
    
    if (this.isWatching) {
      console.log('Already watching Excel files');
      return;
    }

    try {
      // Watch both investors and incubators files
      const filesToWatch = [this.excelFilePath, this.incubatorsFilePath];
      
      this.watcher = chokidar.watch(filesToWatch, {
        ignored: /^\./, 
        persistent: true,
        ignoreInitial: true
      });

      this.watcher.on('change', async (filePath) => {
        console.log(`Excel file changed: ${filePath}`);
        // Sync disabled - just log the change
        console.log('File watching active, but auto-sync disabled');
      });

      this.isWatching = true;
      console.log('Started watching Excel files:', filesToWatch);
    } catch (error) {
      console.log('File watching not available in this environment');
    }
  }

  // Stop watching Excel file
  stopWatching() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    this.isWatching = false;
    console.log('Stopped watching Excel file');
  }

  // Add single investor to Excel file
  async addInvestor(investorData) {
    try {
      const data = this.readExcelData();
      
      // Add new investor to the data
      const newInvestor = {
        investor_name: investorData.name || investorData.investor_name || '',
        partner_name: investorData.partner_name || '',
        partner_email: investorData.email || investorData.partner_email || '',
        phone_number: investorData.phone || investorData.phone_number || '',
        fund_type: investorData.fund_type || '',
        fund_stage: Array.isArray(investorData.fund_stage) ? investorData.fund_stage.join(', ') : investorData.fund_stage || '',
        country: investorData.country || '',
        state: investorData.state || '',
        city: investorData.city || '',
        ticket_size: investorData.ticket_size || '',
        website: investorData.website || '',
        sector_focus: Array.isArray(investorData.sector_focus) ? investorData.sector_focus.join(', ') : investorData.sector_focus || '',
        location: investorData.location || '',
        founded_year: investorData.founded_year || '',
        portfolio_companies: Array.isArray(investorData.portfolio_companies) ? investorData.portfolio_companies.join(', ') : investorData.portfolio_companies || '',
        twitter_link: investorData.twitter_link || '',
        linkedIn_link: investorData.linkedIn_link || '',
        facebook_link: investorData.facebook_link || '',
        number_of_investments: investorData.number_of_investments || 0,
        number_of_exits: investorData.number_of_exits || 0,
        fund_description: investorData.fund_description || ''
      };
      
      data.push(newInvestor);
      this.writeExcelData(data);
      
      console.log(`✅ Added investor to Excel: ${newInvestor.investor_name}`);
      return newInvestor;
    } catch (error) {
      console.error('❌ Error adding investor to Excel:', error);
      throw error;
    }
  }

  // Add single incubator to Excel file
  async addIncubator(incubatorData) {
    try {
      // Read existing incubator data
      let data = [];
      if (fs.existsSync(this.incubatorsFilePath)) {
        const workbook = xlsx.readFile(this.incubatorsFilePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        data = xlsx.utils.sheet_to_json(worksheet);
      }
      
      // Add new incubator to the data
      const newIncubator = {
        name: incubatorData.name || '',
        location: incubatorData.location || '',
        website: incubatorData.website || '',
        email: incubatorData.email || '',
        phone: incubatorData.phone || '',
        focus_sectors: Array.isArray(incubatorData.focus_sectors) ? incubatorData.focus_sectors.join(', ') : incubatorData.focus_sectors || '',
        program_duration: incubatorData.program_duration || '',
        equity_taken: incubatorData.equity_taken || '',
        funding_amount: incubatorData.funding_amount || '',
        application_deadline: incubatorData.application_deadline || '',
        description: incubatorData.description || ''
      };
      
      data.push(newIncubator);
      
      // Write back to Excel file
      const newWorkbook = xlsx.utils.book_new();
      const newWorksheet = xlsx.utils.json_to_sheet(data);
      xlsx.utils.book_append_sheet(newWorkbook, newWorksheet, 'Incubators');
      
      // Ensure directory exists
      const dataDir = path.dirname(this.incubatorsFilePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      xlsx.writeFile(newWorkbook, this.incubatorsFilePath);
      
      console.log(`✅ Added incubator to Excel: ${newIncubator.name}`);
      return newIncubator;
    } catch (error) {
      console.error('❌ Error adding incubator to Excel:', error);
      throw error;
    }
  }

  // Get Excel file path for download
  getExcelFilePath() {
    return this.excelFilePath;
  }
}

module.exports = new ExcelService();