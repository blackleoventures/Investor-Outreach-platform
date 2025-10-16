import {
  GoogleSpreadsheet,
  GoogleSpreadsheetRow,
  GoogleSpreadsheetWorksheet,
} from "google-spreadsheet";
import { JWT } from "google-auth-library";

/**
 * Initialize Google Sheets connection
 */
export async function initializeGoogleSheet(sheetId: string): Promise<{
  doc: GoogleSpreadsheet;
  sheet: GoogleSpreadsheetWorksheet;
}> {
  try {
    const credentials = {
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    };

    if (!credentials.client_email || !credentials.private_key) {
      throw new Error(
        "Firebase credentials not found in environment variables"
      );
    }

    const serviceAccountAuth = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0];
    if (!sheet) {
      throw new Error("No sheets found in the document");
    }

    await sheet.loadHeaderRow();
    return { doc, sheet };
  } catch (error: any) {
    console.error("[Google Sheets] Initialization failed:", error.message);
    throw new Error(`Failed to connect to Google Sheets: ${error.message}`);
  }
}

/**
 * Initialize Investor Sheet
 */
export async function initializeInvestorSheet(): Promise<{
  doc: GoogleSpreadsheet;
  sheet: GoogleSpreadsheetWorksheet;
}> {
  const sheetId = process.env.INVESTOR_SHEET_ID;

  if (!sheetId) {
    throw new Error("INVESTOR_SHEET_ID environment variable is not set");
  }

  console.log("[Google Sheets] Initializing Investor Sheet");
  return initializeGoogleSheet(sheetId);
}

/**
 * Initialize Incubator Sheet
 */
export async function initializeIncubatorSheet(): Promise<{
  doc: GoogleSpreadsheet;
  sheet: GoogleSpreadsheetWorksheet;
}> {
  const sheetId = process.env.INCUBATOR_SHEET_ID;

  if (!sheetId) {
    throw new Error("INCUBATOR_SHEET_ID environment variable is not set");
  }

  console.log("[Google Sheets] Initializing Incubator Sheet");
  return initializeGoogleSheet(sheetId);
}

/**
 * Get all investors from sheet
 */
export async function getInvestorsFromSheet() {
  try {
    const { sheet } = await initializeInvestorSheet();
    const rows = await sheet.getRows();

    const investors = rows.map((row: GoogleSpreadsheetRow) => ({
      id: row.rowNumber,
      name: row.get("Investor Name") || row.get("investor_name") || "",
      partnerName: row.get("Partner Name") || row.get("partner_name") || "",
      email: row.get("Partner Email") || row.get("partner_email") || "",
      phone: row.get("Phone number") || row.get("phone_number") || "",
      fundType: row.get("Fund Type") || row.get("fund_type") || "",
      investmentStages: parseArrayField(
        row.get("Fund Stage") || row.get("fund_stage") || ""
      ),
      sectorFocus: parseArrayField(
        row.get("Fund Focus (Sectors)") || row.get("sector_focus") || ""
      ),
      locations: parseArrayField(
        row.get("Location") || row.get("location") || ""
      ),
      ticketSize: row.get("Ticket Size") || row.get("ticket_size") || "",
      ticketSizeMin: extractTicketMin(
        row.get("Ticket Size") || row.get("ticket_size") || ""
      ),
      ticketSizeMax: extractTicketMax(
        row.get("Ticket Size") || row.get("ticket_size") || ""
      ),
      website: row.get("Website") || row.get("website") || "",
      status: "active", // Assume active if present in sheet
      firm: row.get("Investor Name") || row.get("investor_name") || "",
    }));

    return investors;
  } catch (error) {
    console.error("[Google Sheets] Error fetching investors:", error);
    throw error;
  }
}

/**
 * Get all incubators from sheet
 */
export async function getIncubatorsFromSheet() {
  try {
    const { sheet } = await initializeIncubatorSheet();
    const rows = await sheet.getRows();

    const incubators = rows.map((row: GoogleSpreadsheetRow) => ({
      id: row.rowNumber,
      name: row.get("Incubator Name") || row.get("incubator_name") || "",
      partnerName: row.get("Partner Name") || row.get("partner_name") || "",
      email: row.get("Partner Email") || row.get("partner_email") || "",
      phone: row.get("Phone Number") || row.get("phone_number") || "",
      sectorFocus: parseArrayField(
        row.get("Sector Focus") || row.get("sector_focus") || ""
      ),
      country: row.get("Country") || row.get("country") || "",
      stateCity: row.get("State/City") || row.get("state_city") || "",
      locations: parseArrayField(
        (row.get("Country") || "") + "," + (row.get("State/City") || "")
      ),
      website: row.get("Website") || row.get("website") || "",
      status: "active",
      programName: row.get("Incubator Name") || row.get("incubator_name") || "",
      acceptedStages: ["pre-seed", "seed"], // Default stages for incubators
    }));

    return incubators;
  } catch (error) {
    console.error("[Google Sheets] Error fetching incubators:", error);
    throw error;
  }
}

/**
 * Parse comma-separated string into array
 */
function parseArrayField(value: string): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

/**
 * Extract minimum ticket size from string like "$500K-$2M" or "500K to 2M"
 */
function extractTicketMin(ticketSize: string): string {
  if (!ticketSize) return "";

  const match = ticketSize.match(/\$?\s*(\d+\.?\d*)\s*([KMB]?)/i);
  if (match) {
    return `${match[1]}${match[2]}`;
  }

  return "";
}

/**
 * Extract maximum ticket size from string
 */
function extractTicketMax(ticketSize: string): string {
  if (!ticketSize) return "";

  // Look for second number in range
  const rangeMatch = ticketSize.match(/[-–to]\s*\$?\s*(\d+\.?\d*)\s*([KMB]?)/i);
  if (rangeMatch) {
    return `${rangeMatch[1]}${rangeMatch[2]}`;
  }

  // If no range, return the single value
  const singleMatch = ticketSize.match(/\$?\s*(\d+\.?\d*)\s*([KMB]?)/i);
  if (singleMatch) {
    return `${singleMatch[1]}${singleMatch[2]}`;
  }

  return "";
}
