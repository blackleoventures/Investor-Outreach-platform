const updateIncubator = async (req, res) => {
  res.status(400).json({ 
    success: false,
    error: "Update functionality disabled for Excel-only mode",
    message: "Please update the Excel file and re-upload to make changes"
  });
};

const deleteIncubator = async (req, res) => {
  res.status(400).json({ 
    success: false,
    error: "Delete functionality disabled for Excel-only mode",
    message: "Please update the Excel file and re-upload to make changes"
  });
};
const excelService = require('../services/excel.service');

// Get all incubators from Excel files
const getAllIncubators = async (req, res) => {
  try {
    const incubators = excelService.readExcelData(excelService.incubatorsFilePath);
    res.json({ 
      success: true, 
      data: incubators,
      docs: incubators,
      totalCount: incubators.length,
      source: 'excel_files'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add single incubator (disabled for Excel-only mode)
const addIncubator = async (req, res) => {
  res.status(400).json({ 
    success: false, 
    error: "Manual addition disabled. Please use Excel file upload instead.",
    message: "Use /api/excel/upload endpoint to add incubators via Excel files"
  });
};

// Redirect to Excel upload endpoint
const uploadIncubators = async (req, res) => {
  res.status(400).json({ 
    success: false,
    error: "Please use /api/excel/upload endpoint for file uploads",
    message: "File upload functionality moved to Excel service"
  });
};

module.exports = {
  getAllIncubators,
  addIncubator,
  uploadIncubators,
  updateIncubator,
  deleteIncubator
};