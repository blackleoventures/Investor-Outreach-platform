const fs = require("fs").promises;
const excelService = require('../services/excel.service');

// Get investors from Excel files only
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
    let investors = await getInvestorsFromExcel();

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

    // Apply pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedInvestors = investors.slice(startIndex, endIndex);

    res.status(200).json({
      docs: paginatedInvestors,
      totalDocs: investors.length,
      limit: parseInt(limit),
      page: parseInt(page),
      totalPages: Math.ceil(investors.length / parseInt(limit)),
      hasNextPage: endIndex < investors.length,
      hasPrevPage: parseInt(page) > 1,
      source: 'excel_files',
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
    const allInvestors = await getInvestorsFromExcel();
    
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const skip = (parsedPage - 1) * parsedLimit;
    const investors = allInvestors.slice(skip, skip + parsedLimit);

    res.status(200).json({
      message: "Successfully retrieved investors from Excel files",
      totalCount: allInvestors.length,
      currentPage: parsedPage,
      totalPages: Math.ceil(allInvestors.length / parsedLimit),
      data: investors,
      docs: investors,
      source: 'excel_files',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve investors", details: error.message });
  }
};

exports.updateInvestor = async (req, res) => {
  res.status(400).json({ 
    error: "Update functionality disabled for Excel-only mode",
    message: "Please update the Excel file and re-upload to make changes"
  });
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
