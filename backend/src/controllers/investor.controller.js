const fs = require("fs").promises;
const path = require('path');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const excelService = require('../services/excel.service');

// Google Sheets configuration (service account JSON already placed in config)
const SHEET_ID = '1oyzpOlYhSKRG3snodvPXZxwA2FPnMk2Qok0AMgk2iX0';
const CREDENTIALS_PATH = path.join(__dirname, '../config/excel.json');

// Attempt to get investors directly from Google Sheets
const getInvestorsFromGoogleSheet = async () => {
  try {
    const serviceAccountAuth = new JWT({
      keyFile: CREDENTIALS_PATH,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    await sheet.loadHeaderRow();
    const rows = await sheet.getRows();

    const data = rows.map(row => {
      const rowData = {};
      sheet.headerValues.forEach(header => {
        rowData[header] = row.get(header) || '';
      });
      return rowData;
    });

    return data;
  } catch (error) {
    console.error('Google Sheets read failed, will fallback to Excel files:', error.message);
    return null;
  }
};

// Get investors from Excel files (fallback)
const getInvestorsFromExcel = async () => {
  try {
    return excelService.readExcelData();
  } catch (error) {
    console.error('Error reading investors from Excel:', error);
    return [];
  }
};

exports.getPaginatedInvestors = async (req, res) => {
  try {
    // Add cache-busting headers
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    const { page = 1, limit = 10, search = "" } = req.query;
    let investors = await getInvestorsFromGoogleSheet();
    if (!investors || investors.length === 0) {
      investors = await getInvestorsFromExcel();
    }

    // Apply search filter
    if (search.trim()) {
      const searchTerm = search.trim().toLowerCase();
      investors = investors.filter(investor =>
        investor['Partner name']?.toLowerCase().includes(searchTerm) ||
        investor['partner_name']?.toLowerCase().includes(searchTerm) ||
        investor['Partner email']?.toLowerCase().includes(searchTerm) ||
        investor['partner_email']?.toLowerCase().includes(searchTerm) ||
        investor['Investor name']?.toLowerCase().includes(searchTerm) ||
        investor['investor_name']?.toLowerCase().includes(searchTerm)
      );
    }

    // Map column names to expected format
    const mappedInvestors = investors.map(row => {
      const country = row.Country || row.country || '';
      const state = row.State || row.state || '';
      const city = row.City || row.city || '';
      const location = [city, state, country].filter(Boolean).join(', ') || row['Location'] || row.location || '';
      
      return {
        id: row.id || `investor_${Date.now()}_${Math.random()}`,
        investor_name: row['Investor Name'] || row.investor_name || row.name,
        partner_name: row['Partner Name'] || row.partner_name || row.partner,
        partner_email: row['Partner Email'] || row.partner_email || row.email,
        phone_number: row['Phone number'] || row.phone_number || row.phone,
        fund_type: row['Fund Type'] || row.fund_type || row.type,
        fund_stage: row['Fund Stage'] || row.fund_stage || row.stage,
        fund_focus: row['Fund Focus (Sectors)'] || row.fund_focus || row.sector_focus || row.sectors,
        location: location,
        sector_focus: row['Fund Focus (Sectors)'] || row.fund_focus || row.sector_focus || row.sectors,
        ticket_size: row['Ticket Size'] || row.ticket_size,
        website: row.Website || row.website,
        ...row
      };
    });

    // Apply pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedInvestors = mappedInvestors.slice(startIndex, endIndex);

    res.status(200).json({
      docs: paginatedInvestors,
      totalDocs: mappedInvestors.length,
      limit: parseInt(limit),
      page: parseInt(page),
      totalPages: Math.ceil(mappedInvestors.length / parseInt(limit)),
      hasNextPage: endIndex < mappedInvestors.length,
      hasPrevPage: parseInt(page) > 1,
      source: (investors && investors !== null && investors.length > 0) ? 'google_sheets' : 'excel_files',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Controller to add investors data manually (disabled for Excel-only mode)
exports.bulkAddInvestors = async (req, res) => {
  res.status(400).json({ 
    error: "Manual addition disabled. Please use Excel file upload instead.",
    message: "Use /api/excel/upload endpoint to add investors via Excel files"
  });
};

// Redirect to Excel upload endpoint
exports.uploadInvestorFile = async (req, res) => {
  res.status(400).json({ 
    error: "Please use /api/excel/upload endpoint for file uploads",
    message: "File upload functionality moved to Excel service"
  });
};

// Legacy CSV upload (kept for backward compatibility)
exports.uploadCSV = async (req, res) => {
  return exports.uploadInvestorFile(req, res);
};

exports.getAllInvestors = async (req, res) => {
  try {
    // Add cache-busting headers
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    const { page = 1, limit = 10000 } = req.query;
    let allInvestors = await getInvestorsFromGoogleSheet();
    if (!allInvestors || allInvestors.length === 0) {
      allInvestors = await getInvestorsFromExcel();
    }
    
    // Map column names to expected format
    const mappedInvestors = allInvestors.map(row => {
      const country = row.Country || row.country || '';
      const state = row.State || row.state || '';
      const city = row.City || row.city || '';
      const location = [city, state, country].filter(Boolean).join(', ') || row['Location'] || row.location || '';
      
      return {
        id: row.id || `investor_${Date.now()}_${Math.random()}`,
        investor_name: row['Investor Name'] || row.investor_name || row.name,
        partner_name: row['Partner Name'] || row.partner_name || row.partner,
        partner_email: row['Partner Email'] || row.partner_email || row.email,
        phone_number: row['Phone number'] || row.phone_number || row.phone,
        fund_type: row['Fund Type'] || row.fund_type || row.type,
        fund_stage: row['Fund Stage'] || row.fund_stage || row.stage,
        fund_focus: row['Fund Focus (Sectors)'] || row.fund_focus || row.sector_focus || row.sectors,
        location: location,
        sector_focus: row['Fund Focus (Sectors)'] || row.fund_focus || row.sector_focus || row.sectors,
        ticket_size: row['Ticket Size'] || row.ticket_size,
        website: row.Website || row.website,
        ...row
      };
    });
    
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const skip = (parsedPage - 1) * parsedLimit;
    const investors = mappedInvestors.slice(skip, skip + parsedLimit);

    res.status(200).json({
      message: "Successfully retrieved investors",
      totalCount: mappedInvestors.length,
      currentPage: parsedPage,
      totalPages: Math.ceil(mappedInvestors.length / parsedLimit),
      data: investors,
      docs: investors,
      source: (allInvestors && allInvestors !== null && allInvestors.length > 0) ? 'google_sheets' : 'excel_files',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve investors", details: error.message });
  }
};

exports.updateInvestor = async (req, res) => {
  try {
    // Accept updates coming from the All Investors edit modal
    const updates = req.body || {};

    // Resolve identifier - prefer Partner Email, then email fields, then optional id
    const resolveField = (obj, keys) => {
      for (const k of keys) {
        if (obj[k] != null && String(obj[k]).toString().trim() !== '') return String(obj[k]).toString().trim();
      }
      return undefined;
    };

    const targetEmail = resolveField({ ...updates, ...(req.body || {}) }, ['Partner Email', 'partner_email', 'email', 'partnerEmail']);
    const targetName = resolveField({ ...updates, ...(req.body || {}) }, ['Investor Name', 'investor_name', 'name']);

    if (!targetEmail && !targetName) {
      return res.status(400).json({ error: 'Provide at least Partner Email or Investor Name to update' });
    }

    // Connect to Google Sheets
    const serviceAccountAuth = new JWT({
      keyFile: CREDENTIALS_PATH,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    await sheet.loadHeaderRow();
    const rows = await sheet.getRows();

    // Locate row by Partner Email (case-insensitive), fallback to Investor Name
    const emailHeader = sheet.headerValues.find(h => h.toLowerCase().trim() === 'partner email');
    const nameHeader = sheet.headerValues.find(h => h.toLowerCase().trim() === 'investor name');

    let targetRow = null;
    for (const row of rows) {
      const rowEmail = emailHeader ? String(row.get(emailHeader) || '').toLowerCase() : '';
      const rowName = nameHeader ? String(row.get(nameHeader) || '').toLowerCase() : '';
      const emailMatch = targetEmail ? rowEmail === String(targetEmail).toLowerCase() : false;
      const nameMatch = targetName ? rowName === String(targetName).toLowerCase() : false;
      if (emailMatch || (targetEmail == null && nameMatch)) { targetRow = row; break; }
    }

    if (!targetRow) {
      return res.status(404).json({ error: 'Matching row not found in Google Sheet' });
    }

    // Map incoming keys to existing header names
    const normalizeKey = (k) => {
      const direct = sheet.headerValues.find(h => h.toLowerCase() === String(k).toLowerCase());
      if (direct) return direct;
      const map = {
        investor_name: 'Investor Name',
        partner_name: 'Partner Name',
        partner_email: 'Partner Email',
        phone_number: 'Phone number',
        fund_type: 'Fund Type',
        fund_stage: 'Fund Stage',
        fund_focus: 'Fund Focus (Sectors)',
        sector_focus: 'Fund Focus (Sectors)',
        location: 'Location',
        ticket_size: 'Ticket Size',
        website: 'Website',
      };
      return map[k] || k;
    };

    Object.entries(updates).forEach(([key, value]) => {
      const header = normalizeKey(key);
      if (sheet.headerValues.includes(header)) {
        targetRow.set(header, value == null ? '' : value);
      }
    });
    await targetRow.save();

    return res.status(200).json({ success: true, message: 'Investor updated successfully in Google Sheet' });
  } catch (error) {
    console.error('Error updating investor (Google Sheets):', error);
    return res.status(500).json({ error: 'Failed to update investor', details: error.message });
  }
};

exports.deleteInvestor = async (req, res) => {
  res.status(400).json({ 
    error: "Delete functionality disabled for Excel-only mode",
    message: "Please update the Excel file and re-upload to make changes"
  });
};

exports.getFilterOptions = async (req, res) => {
  try {
    const investors = await getInvestorsFromExcel();

    const fund_stage = [...new Set(investors.flatMap(inv => {
      const stage = inv['Fund stage'] || inv['fund_stage'] || '';
      return Array.isArray(stage) ? stage : [stage];
    }).filter(Boolean))].sort();

    const fund_type = [...new Set(investors.flatMap(inv => {
      const type = inv['Fund type'] || inv['fund_type'] || '';
      return Array.isArray(type) ? type : [type];
    }).filter(Boolean))].sort();

    const sector_focus = [...new Set(investors.flatMap(inv => {
      const sector = inv['Sector focus'] || inv['sector_focus'] || '';
      return Array.isArray(sector) ? sector : [sector];
    }).filter(Boolean))].sort();

    res.status(200).json({ fund_stage, fund_type, sector_focus });
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve filter options", details: error.message });
  }
};

exports.getUploadStats = async (req, res) => {
  try {
    const investors = await getInvestorsFromExcel();
    res.status(200).json({
      totalInvestors: investors.length,
      message: `Total ${investors.length} investors in Excel files`,
      source: 'excel_files'
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get stats" });
  }
};

exports.getUniqueFundSectors = async (req, res) => {
  try {
    const investors = await getInvestorsFromExcel();
    const sectors = [...new Set(investors.flatMap(inv => {
      const sector = inv['Sector focus'] || inv['sector_focus'] || '';
      return Array.isArray(sector) ? sector : [sector];
    }).filter(Boolean))].sort();

    res.status(200).json({ sector_focus: sectors });
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve sectors", details: error.message });
  }
};

exports.getUniqueFundTypes = async (req, res) => {
  try {
    const investors = await getInvestorsFromExcel();
    const fundTypes = [...new Set(investors.flatMap(inv => {
      const type = inv['Fund type'] || inv['fund_type'] || '';
      return Array.isArray(type) ? type : [type];
    }).filter(Boolean))].sort();

    res.status(200).json({ fund_type: fundTypes });
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve fund types", details: error.message });
  }
};
