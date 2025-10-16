import { NextRequest, NextResponse } from "next/server";
import { GoogleSpreadsheetRow } from "google-spreadsheet";
import { initializeIncubatorSheet } from "@/lib/google-sheets";
import { Incubator, IncubatorApiResponse } from "@/types/incubator";

/**
 * GET /api/incubators
 * Get all incubators from Google Sheets
 */
export async function GET(request: NextRequest) {
  try {
    const { sheet } = await initializeIncubatorSheet();
    const rows: GoogleSpreadsheetRow[] = await sheet.getRows();

    const incubators: Incubator[] = rows.map((row: GoogleSpreadsheetRow, index: number) => {
      const incubator: any = {};

      sheet.headerValues.forEach((header: string) => {
        incubator[header] = row.get(header) || "";
      });

      incubator.id = incubator["Partner Email"] || incubator["Incubator Name"] || `row_${index}`;

      return incubator as Incubator;
    });

    console.log(`[Incubators] Retrieved ${incubators.length} incubators from Google Sheets`);

    const response: IncubatorApiResponse<Incubator[]> = {
      success: true,
      message: "Successfully retrieved incubators",
      data: incubators,
      totalCount: incubators.length,
      source: "google_sheets",
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error: any) {
    console.error("[Incubators] Error fetching incubators:", error.message);

    const errorResponse: IncubatorApiResponse = {
      success: false,
      error: "Failed to retrieve incubators from Google Sheets",
      message: error.message,
      data: [],
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * POST /api/incubators
 * Create new incubator
 */
export async function POST(request: NextRequest) {
  try {
    const incubatorData = await request.json();

    if (!incubatorData["Incubator Name"] && !incubatorData["Partner Email"]) {
      return NextResponse.json(
        {
          success: false,
          error: "Incubator Name or Partner Email is required",
        },
        { status: 400 }
      );
    }

    const { sheet } = await initializeIncubatorSheet();

    // Check for duplicate email
    const rows: GoogleSpreadsheetRow[] = await sheet.getRows();
    const emailExists = rows.some((row: GoogleSpreadsheetRow) => {
      const email = String(row.get("Partner Email") || "").toLowerCase();
      return email && email === String(incubatorData["Partner Email"] || "").toLowerCase();
    });

    if (emailExists) {
      return NextResponse.json(
        {
          success: false,
          error: "An incubator with this email already exists",
        },
        { status: 409 }
      );
    }

    // Prepare row data
    const rowData: Record<string, any> = {};
    sheet.headerValues.forEach((header: string) => {
      const value = incubatorData[header];
      rowData[header] = value !== undefined ? value : "";
    });

    await sheet.addRow(rowData);

    console.log("[Incubators] Created incubator:", incubatorData["Incubator Name"]);

    const response: IncubatorApiResponse = {
      success: true,
      message: "Incubator created successfully",
      data: incubatorData,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error: any) {
    console.error("[Incubators] Error creating incubator:", error.message);

    const errorResponse: IncubatorApiResponse = {
      success: false,
      error: "Failed to create incubator",
      message: error.message,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
