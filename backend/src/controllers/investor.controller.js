const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");
const path = require("path");

// Use Firebase Admin SDK credentials for Google Sheets
const SHEET_ID = process.env.INVESTOR_SHEET_ID;
const CREDENTIALS_PATH =
  process.env.FIREBASE_CREDENTIALS_PATH ||
  path.join(__dirname, "../config/firebase-admin-sdk.json");

if (!SHEET_ID) {
  console.error("CRITICAL: SHEET_ID environment variable is not set");
}

/**
 * Initialize Google Sheets connection
 */
const initializeGoogleSheet = async () => {
  try {
    const serviceAccountAuth = new JWT({
      keyFile: CREDENTIALS_PATH,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0];
    if (!sheet) {
      throw new Error("No sheets found in the document");
    }

    await sheet.loadHeaderRow();
    return { doc, sheet };
  } catch (error) {
    console.error("Google Sheets initialization failed:", error.message);
    throw new Error(`Failed to connect to Google Sheets: ${error.message}`);
  }
};

/**
 * Normalize column names from various formats
 */
const normalizeColumnName = (key, headerValues) => {
  const directMatch = headerValues.find(
    (h) => h.toLowerCase() === String(key).toLowerCase()
  );
  if (directMatch) return directMatch;

  const columnMap = {
    investor_name: "Investor Name",
    partner_name: "Partner Name",
    partner_email: "Partner Email",
    phone_number: "Phone number",
    fund_type: "Fund Type",
    fund_stage: "Fund Stage",
    fund_focus: "Fund Focus (Sectors)",
    sector_focus: "Fund Focus (Sectors)",
    location: "Location",
    ticket_size: "Ticket Size",
    website: "Website",
  };

  return columnMap[key.toLowerCase()] || key;
};

/**
 * GET all investors from Google Sheets
 */
exports.getAllInvestors = async (req, res) => {
  try {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const { sheet } = await initializeGoogleSheet();
    const rows = await sheet.getRows();

    const investors = rows.map((row, index) => {
      const investor = {};

      sheet.headerValues.forEach((header) => {
        investor[header] = row.get(header) || "";
      });

      investor.id =
        investor["Partner Email"] ||
        investor["Investor Name"] ||
        `row_${index}`;

      return investor;
    });

    console.log(
      `Successfully retrieved ${investors.length} investors from Google Sheets`
    );

    return res.status(200).json({
      success: true,
      message: "Successfully retrieved investors",
      data: investors,
      totalCount: investors.length,
      source: "google_sheets",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching investors:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve investors from Google Sheets",
      message: error.message,
      data: [],
    });
  }
};

/**
 * GET single investor by ID
 */
exports.getInvestorById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Investor ID is required",
      });
    }

    const { sheet } = await initializeGoogleSheet();
    const rows = await sheet.getRows();

    const targetRow = rows.find((row) => {
      const email = String(row.get("Partner Email") || "").toLowerCase();
      const name = String(row.get("Investor Name") || "").toLowerCase();
      return email === id.toLowerCase() || name === id.toLowerCase();
    });

    if (!targetRow) {
      return res.status(404).json({
        success: false,
        error: "Investor not found",
      });
    }

    const investor = {};
    sheet.headerValues.forEach((header) => {
      investor[header] = targetRow.get(header) || "";
    });
    investor.id = investor["Partner Email"] || investor["Investor Name"];

    console.log("Successfully retrieved investor:", investor.id);

    return res.status(200).json({
      success: true,
      data: investor,
    });
  } catch (error) {
    console.error("Error fetching investor by ID:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve investor",
      message: error.message,
    });
  }
};

/**
 * POST create new investor
 */
exports.createInvestor = async (req, res) => {
  try {
    const investorData = req.body;

    if (!investorData["Investor Name"] && !investorData["Partner Email"]) {
      return res.status(400).json({
        success: false,
        error: "Investor Name or Partner Email is required",
      });
    }

    const { sheet } = await initializeGoogleSheet();

    const rows = await sheet.getRows();
    const emailExists = rows.some((row) => {
      const email = String(row.get("Partner Email") || "").toLowerCase();
      return (
        email &&
        email === String(investorData["Partner Email"] || "").toLowerCase()
      );
    });

    if (emailExists) {
      return res.status(409).json({
        success: false,
        error: "An investor with this email already exists",
      });
    }

    const rowData = {};
    sheet.headerValues.forEach((header) => {
      const value = investorData[header];
      rowData[header] = value !== undefined ? value : "";
    });

    await sheet.addRow(rowData);

    console.log(
      "Successfully created investor:",
      investorData["Investor Name"]
    );

    return res.status(201).json({
      success: true,
      message: "Investor created successfully",
      data: investorData,
    });
  } catch (error) {
    console.error("Error creating investor:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to create investor",
      message: error.message,
    });
  }
};

/**
 * PUT update existing investor
 */
exports.updateInvestor = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Investor ID is required",
      });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: "No update data provided",
      });
    }

    const { sheet } = await initializeGoogleSheet();
    const rows = await sheet.getRows();

    const targetRow = rows.find((row) => {
      const email = String(row.get("Partner Email") || "").toLowerCase();
      const name = String(row.get("Investor Name") || "").toLowerCase();
      return email === id.toLowerCase() || name === id.toLowerCase();
    });

    if (!targetRow) {
      return res.status(404).json({
        success: false,
        error: "Investor not found in Google Sheets",
      });
    }

    Object.entries(updates).forEach(([key, value]) => {
      const normalizedKey = normalizeColumnName(key, sheet.headerValues);
      if (sheet.headerValues.includes(normalizedKey)) {
        targetRow.set(
          normalizedKey,
          value !== null && value !== undefined ? value : ""
        );
      }
    });

    await targetRow.save();

    console.log("Successfully updated investor:", id);

    return res.status(200).json({
      success: true,
      message: "Investor updated successfully",
    });
  } catch (error) {
    console.error("Error updating investor:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to update investor",
      message: error.message,
    });
  }
};

/**
 * DELETE investor
 */
exports.deleteInvestor = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Investor ID is required",
      });
    }

    const { sheet } = await initializeGoogleSheet();
    const rows = await sheet.getRows();

    const targetRowIndex = rows.findIndex((row) => {
      const email = String(row.get("Partner Email") || "").toLowerCase();
      const name = String(row.get("Investor Name") || "").toLowerCase();
      return email === id.toLowerCase() || name === id.toLowerCase();
    });

    if (targetRowIndex === -1) {
      return res.status(404).json({
        success: false,
        error: "Investor not found in Google Sheets",
      });
    }

    await rows[targetRowIndex].delete();

    console.log("Successfully deleted investor:", id);

    return res.status(200).json({
      success: true,
      message: "Investor deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting investor:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to delete investor",
      message: error.message,
    });
  }
};
exports.getPaginatedInvestors = async (req, res) => {
  try {
    // Add cache-busting headers
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const { page = 1, limit = 10, search = "" } = req.query;
    const userEmail = req.user?.email || null;

    let investors = await getInvestorsFromGoogleSheet(userEmail);
    if (!investors || investors.length === 0) {
      investors = await getInvestorsFromExcel(userEmail);
    }

    // Apply search filter
    if (search.trim()) {
      const searchTerm = search.trim().toLowerCase();
      investors = investors.filter(
        (investor) =>
          investor["Partner name"]?.toLowerCase().includes(searchTerm) ||
          investor["partner_name"]?.toLowerCase().includes(searchTerm) ||
          investor["Partner email"]?.toLowerCase().includes(searchTerm) ||
          investor["partner_email"]?.toLowerCase().includes(searchTerm) ||
          investor["Investor name"]?.toLowerCase().includes(searchTerm) ||
          investor["investor_name"]?.toLowerCase().includes(searchTerm)
      );
    }

    // Map column names to expected format
    const mappedInvestors = investors.map((row) => {
      const country = row.Country || row.country || "";
      const state = row.State || row.state || "";
      const city = row.City || row.city || "";
      const location =
        [city, state, country].filter(Boolean).join(", ") ||
        row["Location"] ||
        row.location ||
        "";

      return {
        id: row.id || `investor_${Date.now()}_${Math.random()}`,
        investor_name: row["Investor Name"] || row.investor_name || row.name,
        partner_name: row["Partner Name"] || row.partner_name || row.partner,
        partner_email: row["Partner Email"] || row.partner_email || row.email,
        phone_number: row["Phone number"] || row.phone_number || row.phone,
        fund_type: row["Fund Type"] || row.fund_type || row.type,
        fund_stage: row["Fund Stage"] || row.fund_stage || row.stage,
        fund_focus:
          row["Fund Focus (Sectors)"] ||
          row.fund_focus ||
          row.sector_focus ||
          row.sectors,
        location: location,
        sector_focus:
          row["Fund Focus (Sectors)"] ||
          row.fund_focus ||
          row.sector_focus ||
          row.sectors,
        ticket_size: row["Ticket Size"] || row.ticket_size,
        website: row.Website || row.website,
        ...row,
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
      source:
        investors && investors !== null && investors.length > 0
          ? "google_sheets"
          : "excel_files",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Controller to add investors data manually
exports.bulkAddInvestors = async (req, res) => {
  try {
    // Handle both formats: direct array or wrapped in 'investors' property
    let investors;
    if (Array.isArray(req.body)) {
      // Direct array format: [investor1, investor2, ...]
      investors = req.body;
    } else if (req.body.investors && Array.isArray(req.body.investors)) {
      // Wrapped format: { investors: [investor1, investor2, ...] }
      investors = req.body.investors;
    } else {
      return res.status(400).json({
        error:
          "Invalid data format. Expected array of investors or { investors: [...] }",
      });
    }

    console.log(`📝 Adding ${investors.length} investors manually...`);

    // Add investors to Excel file via excelService
    const results = [];
    for (const investor of investors) {
      try {
        // Validate required fields
        if (!investor.name || !investor.email) {
          results.push({
            success: false,
            error: "Name and email are required",
            data: investor,
          });
          continue;
        }

        // Add to Excel service
        await excelService.addInvestor(investor);
        results.push({ success: true, data: investor });
        console.log(`✅ Added investor: ${investor.name}`);
      } catch (error) {
        console.error(
          `❌ Failed to add investor ${investor.name}:`,
          error.message
        );
        results.push({
          success: false,
          error: error.message,
          data: investor,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;

    res.json({
      success: true,
      message: `Added ${successCount} investors successfully${
        failCount > 0 ? `, ${failCount} failed` : ""
      }`,
      results,
      summary: {
        total: investors.length,
        success: successCount,
        failed: failCount,
      },
    });
  } catch (error) {
    console.error("❌ Bulk add investors error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Redirect to Excel upload endpoint
exports.uploadInvestorFile = async (req, res) => {
  res.status(400).json({
    error: "Please use /api/excel/upload endpoint for file uploads",
    message: "File upload functionality moved to Excel service",
  });
};

// Legacy CSV upload (kept for backward compatibility)
exports.uploadCSV = async (req, res) => {
  return exports.uploadInvestorFile(req, res);
};
exports.getFilterOptions = async (req, res) => {
  try {
    const investors = await getInvestorsFromExcel();

    const fund_stage = [
      ...new Set(
        investors
          .flatMap((inv) => {
            const stage = inv["Fund stage"] || inv["fund_stage"] || "";
            return Array.isArray(stage) ? stage : [stage];
          })
          .filter(Boolean)
      ),
    ].sort();

    const fund_type = [
      ...new Set(
        investors
          .flatMap((inv) => {
            const type = inv["Fund type"] || inv["fund_type"] || "";
            return Array.isArray(type) ? type : [type];
          })
          .filter(Boolean)
      ),
    ].sort();

    const sector_focus = [
      ...new Set(
        investors
          .flatMap((inv) => {
            const sector = inv["Sector focus"] || inv["sector_focus"] || "";
            return Array.isArray(sector) ? sector : [sector];
          })
          .filter(Boolean)
      ),
    ].sort();

    res.status(200).json({ fund_stage, fund_type, sector_focus });
  } catch (error) {
    res
      .status(500)
      .json({
        error: "Failed to retrieve filter options",
        details: error.message,
      });
  }
};

exports.getUploadStats = async (req, res) => {
  try {
    const investors = await getInvestorsFromExcel();
    res.status(200).json({
      totalInvestors: investors.length,
      message: `Total ${investors.length} investors in Excel files`,
      source: "excel_files",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get stats" });
  }
};

exports.getUniqueFundSectors = async (req, res) => {
  try {
    const investors = await getInvestorsFromExcel();
    const sectors = [
      ...new Set(
        investors
          .flatMap((inv) => {
            const sector = inv["Sector focus"] || inv["sector_focus"] || "";
            return Array.isArray(sector) ? sector : [sector];
          })
          .filter(Boolean)
      ),
    ].sort();

    res.status(200).json({ sector_focus: sectors });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to retrieve sectors", details: error.message });
  }
};

exports.getUniqueFundTypes = async (req, res) => {
  try {
    const investors = await getInvestorsFromExcel();
    const fundTypes = [
      ...new Set(
        investors
          .flatMap((inv) => {
            const type = inv["Fund type"] || inv["fund_type"] || "";
            return Array.isArray(type) ? type : [type];
          })
          .filter(Boolean)
      ),
    ].sort();

    res.status(200).json({ fund_type: fundTypes });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to retrieve fund types", details: error.message });
  }
};
