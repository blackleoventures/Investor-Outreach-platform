import {
  GoogleSpreadsheet,
  GoogleSpreadsheetRow,
  GoogleSpreadsheetWorksheet,
} from "google-spreadsheet";
import { JWT } from "google-auth-library";

/**
 * Initialize Google Sheets connection
 * @param sheetId - The Google Sheet ID (investor or incubator)
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
 * Normalize column names for Investors
 */
export function normalizeInvestorColumnName(
  key: string,
  headerValues: string[]
): string {
  const directMatch = headerValues.find(
    (h) => h.toLowerCase() === String(key).toLowerCase()
  );
  if (directMatch) return directMatch;

  const columnMap: Record<string, string> = {
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
}

/**
 * Normalize column names for Incubators
 */
export function normalizeIncubatorColumnName(
  key: string,
  headerValues: string[]
): string {
  const directMatch = headerValues.find(
    (h) => h.toLowerCase() === String(key).toLowerCase()
  );
  if (directMatch) return directMatch;

  const columnMap: Record<string, string> = {
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
}
