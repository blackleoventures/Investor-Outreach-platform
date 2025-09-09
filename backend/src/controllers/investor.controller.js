const fs = require("fs").promises;
const fileDB = require('../services/file-db.service');

exports.getPaginatedInvestors = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    let investors = await fileDB.getAllInvestors();

    // Apply search filter
    if (search.trim()) {
      const searchTerm = search.trim().toLowerCase();
      investors = investors.filter(investor =>
        investor.partner_name?.toLowerCase().includes(searchTerm) ||
        investor.partner_email?.toLowerCase().includes(searchTerm) ||
        investor.firm_name?.toLowerCase().includes(searchTerm)
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
      hasPrevPage: parseInt(page) > 1
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Controller to add investors data manually
exports.bulkAddInvestors = async (req, res) => {
  try {
    const investorData = req.body;
    if (!Array.isArray(investorData) || investorData.length === 0) {
      return res.status(400).json({ error: "Array of investor data is required" });
    }

    const results = [];
    for (const investor of investorData) {
      const newInvestor = await fileDB.addInvestor(investor);
      results.push(newInvestor);
    }

    res.status(201).json({
      message: `Successfully added ${results.length} investors`,
      count: results.length
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to add investors", details: error.message });
  }
};

// Universal file upload handler for CSV, Excel, and JSON
exports.uploadInvestorFile = async (req, res) => {
  try {
    console.log('Files received:', req.files);
    console.log('File received:', req.file);
    
    const file = req.files?.[0] || req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = file.path;
    const fileExtension = file.originalname.split('.').pop().toLowerCase();
    
    console.log('Processing file:', file.originalname, 'Extension:', fileExtension);

    if (!['csv', 'xlsx', 'xls'].includes(fileExtension)) {
      await fs.unlink(filePath).catch(console.error);
      return res.status(400).json({ error: "Only CSV and Excel files are supported" });
    }

    const count = await fileDB.uploadFile(filePath, fileExtension);
    await fs.unlink(filePath).catch(console.error);

    res.status(201).json({
      success: true,
      message: `${count} investors uploaded successfully`,
      count
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: "Upload failed", details: error.message });
  }
};

// Legacy CSV upload (kept for backward compatibility)
exports.uploadCSV = async (req, res) => {
  return exports.uploadInvestorFile(req, res);
};

exports.getAllInvestors = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const allInvestors = await fileDB.getAllInvestors();
    
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const skip = (parsedPage - 1) * parsedLimit;
    const investors = allInvestors.slice(skip, skip + parsedLimit);

    res.status(200).json({
      message: "Successfully retrieved investors",
      totalCount: allInvestors.length,
      currentPage: parsedPage,
      totalPages: Math.ceil(allInvestors.length / parsedLimit),
      data: investors,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve investors", details: error.message });
  }
};

exports.updateInvestor = async (req, res) => {
  try {
    const investorId = req.params.id;
    const updateData = req.body;

    const updatedInvestor = await fileDB.updateInvestor(investorId, updateData);
    res.status(200).json({
      message: `Investor ${investorId} updated successfully`,
      data: updatedInvestor
    });
  } catch (error) {
    if (error.message === 'Investor not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to update investor", details: error.message });
  }
};

exports.deleteInvestor = async (req, res) => {
  try {
    const investorId = req.params.id;
    await fileDB.deleteInvestor(investorId);
    res.status(200).json({ message: `Successfully deleted investor with ID: ${investorId}` });
  } catch (error) {
    if (error.message === 'Investor not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to delete investor", details: error.message });
  }
};

exports.getFilterOptions = async (req, res) => {
  try {
    const investors = await fileDB.getAllInvestors();

    const fund_stage = [...new Set(investors.flatMap(inv => 
      Array.isArray(inv.fund_stage) ? inv.fund_stage : [inv.fund_stage]
    ).filter(Boolean))].sort();

    const fund_type = [...new Set(investors.flatMap(inv => 
      Array.isArray(inv.fund_type) ? inv.fund_type : [inv.fund_type]
    ).filter(Boolean))].sort();

    const sector_focus = [...new Set(investors.flatMap(inv => 
      Array.isArray(inv.sector_focus) ? inv.sector_focus : [inv.sector_focus]
    ).filter(Boolean))].sort();

    res.status(200).json({ fund_stage, fund_type, sector_focus });
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve filter options", details: error.message });
  }
};

exports.getUploadStats = async (req, res) => {
  try {
    const investors = await fileDB.getAllInvestors();
    res.status(200).json({
      totalInvestors: investors.length,
      message: `Total ${investors.length} investors in database`
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get stats" });
  }
};

exports.getUniqueFundSectors = async (req, res) => {
  try {
    const investors = await fileDB.getAllInvestors();
    const sectors = [...new Set(investors.flatMap(inv => 
      Array.isArray(inv.sector_focus) ? inv.sector_focus : [inv.sector_focus]
    ).filter(Boolean))].sort();

    res.status(200).json({ sector_focus: sectors });
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve sectors", details: error.message });
  }
};

exports.getUniqueFundTypes = async (req, res) => {
  try {
    const investors = await fileDB.getAllInvestors();
    const fundTypes = [...new Set(investors.flatMap(inv => 
      Array.isArray(inv.fund_type) ? inv.fund_type : [inv.fund_type]
    ).filter(Boolean))].sort();

    res.status(200).json({ fund_type: fundTypes });
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve fund types", details: error.message });
  }
};
