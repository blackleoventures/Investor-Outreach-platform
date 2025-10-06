const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");
const path = require("path");

// Use Firebase Admin SDK credentials for Google Sheets
const INCUBATOR_SHEET_ID = process.env.INCUBATOR_SHEET_ID;
const CREDENTIALS_PATH =
  process.env.FIREBASE_CREDENTIALS_PATH ||
  path.join(__dirname, "../config/firebase-admin-sdk.json");

if (!INCUBATOR_SHEET_ID) {
  console.error("CRITICAL: INCUBATOR_SHEET_ID environment variable is not set");
}

/**
 * Initialize Google Sheets connection for Incubators
 */
const initializeIncubatorSheet = async () => {
  try {
    const serviceAccountAuth = new JWT({
      keyFile: CREDENTIALS_PATH,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(INCUBATOR_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0];
    if (!sheet) {
      throw new Error("No sheets found in the incubator document");
    }

    await sheet.loadHeaderRow();
    return { doc, sheet };
  } catch (error) {
    console.error(
      "Incubator Google Sheets initialization failed:",
      error.message
    );
    throw new Error(
      `Failed to connect to Incubator Google Sheets: ${error.message}`
    );
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
    incubator_name: "Incubator Name",
    partner_name: "Partner Name",
    partner_email: "Partner Email",
    phone_number: "Phone Number",
    sector_focus: "Sector Focus",
    country: "Country",
    state_city: "State/City",
    website: "Website",
  };

  return columnMap[key.toLowerCase()] || key;
};

/**
 * GET all incubators from Google Sheets
 */
exports.getAllIncubators = async (req, res) => {
  try {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const { sheet } = await initializeIncubatorSheet();
    const rows = await sheet.getRows();

    const incubators = rows.map((row, index) => {
      const incubator = {};

      sheet.headerValues.forEach((header) => {
        incubator[header] = row.get(header) || "";
      });

      incubator.id =
        incubator["Partner Email"] ||
        incubator["Incubator Name"] ||
        `row_${index}`;

      return incubator;
    });

    console.log(
      `Successfully retrieved ${incubators.length} incubators from Google Sheets`
    );

    return res.status(200).json({
      success: true,
      message: "Successfully retrieved incubators",
      data: incubators,
      totalCount: incubators.length,
      source: "google_sheets",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching incubators:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve incubators from Google Sheets",
      message: error.message,
      data: [],
    });
  }
};

/**
 * GET single incubator by ID
 */
exports.getIncubatorById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Incubator ID is required",
      });
    }

    const { sheet } = await initializeIncubatorSheet();
    const rows = await sheet.getRows();

    const targetRow = rows.find((row) => {
      const email = String(row.get("Partner Email") || "").toLowerCase();
      const name = String(row.get("Incubator Name") || "").toLowerCase();
      return email === id.toLowerCase() || name === id.toLowerCase();
    });

    if (!targetRow) {
      return res.status(404).json({
        success: false,
        error: "Incubator not found",
      });
    }

    const incubator = {};
    sheet.headerValues.forEach((header) => {
      incubator[header] = targetRow.get(header) || "";
    });
    incubator.id = incubator["Partner Email"] || incubator["Incubator Name"];

    console.log("Successfully retrieved incubator:", incubator.id);

    return res.status(200).json({
      success: true,
      data: incubator,
    });
  } catch (error) {
    console.error("Error fetching incubator by ID:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve incubator",
      message: error.message,
    });
  }
};

/**
 * POST create new incubator
 */
exports.createIncubator = async (req, res) => {
  try {
    const incubatorData = req.body;

    if (!incubatorData["Incubator Name"] && !incubatorData["Partner Email"]) {
      return res.status(400).json({
        success: false,
        error: "Incubator Name or Partner Email is required",
      });
    }

    const { sheet } = await initializeIncubatorSheet();

    const rows = await sheet.getRows();
    const emailExists = rows.some((row) => {
      const email = String(row.get("Partner Email") || "").toLowerCase();
      return (
        email &&
        email === String(incubatorData["Partner Email"] || "").toLowerCase()
      );
    });

    if (emailExists) {
      return res.status(409).json({
        success: false,
        error: "An incubator with this email already exists",
      });
    }

    const rowData = {};
    sheet.headerValues.forEach((header) => {
      const value = incubatorData[header];
      rowData[header] = value !== undefined ? value : "";
    });

    await sheet.addRow(rowData);

    console.log(
      "Successfully created incubator:",
      incubatorData["Incubator Name"]
    );

    return res.status(201).json({
      success: true,
      message: "Incubator created successfully",
      data: incubatorData,
    });
  } catch (error) {
    console.error("Error creating incubator:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to create incubator",
      message: error.message,
    });
  }
};

/**
 * PUT update existing incubator
 */
exports.updateIncubator = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Incubator ID is required",
      });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: "No update data provided",
      });
    }

    const { sheet } = await initializeIncubatorSheet();
    const rows = await sheet.getRows();

    const targetRow = rows.find((row) => {
      const email = String(row.get("Partner Email") || "").toLowerCase();
      const name = String(row.get("Incubator Name") || "").toLowerCase();
      return email === id.toLowerCase() || name === id.toLowerCase();
    });

    if (!targetRow) {
      return res.status(404).json({
        success: false,
        error: "Incubator not found in Google Sheets",
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

    console.log("Successfully updated incubator:", id);

    return res.status(200).json({
      success: true,
      message: "Incubator updated successfully",
    });
  } catch (error) {
    console.error("Error updating incubator:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to update incubator",
      message: error.message,
    });
  }
};

/**
 * DELETE incubator
 */
exports.deleteIncubator = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Incubator ID is required",
      });
    }

    const { sheet } = await initializeIncubatorSheet();
    const rows = await sheet.getRows();

    const targetRowIndex = rows.findIndex((row) => {
      const email = String(row.get("Partner Email") || "").toLowerCase();
      const name = String(row.get("Incubator Name") || "").toLowerCase();
      return email === id.toLowerCase() || name === id.toLowerCase();
    });

    if (targetRowIndex === -1) {
      return res.status(404).json({
        success: false,
        error: "Incubator not found in Google Sheets",
      });
    }

    await rows[targetRowIndex].delete();

    console.log("Successfully deleted incubator:", id);

    return res.status(200).json({
      success: true,
      message: "Incubator deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting incubator:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to delete incubator",
      message: error.message,
    });
  }
};
