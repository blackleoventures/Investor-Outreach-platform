import { NextRequest, NextResponse } from "next/server";
import { GoogleSpreadsheetRow } from "google-spreadsheet";
import { initializeIncubatorSheet, normalizeIncubatorColumnName } from "@/lib/google-sheets";
import { Incubator, IncubatorApiResponse } from "@/types/incubator";

/**
 * GET /api/incubators/[id]
 * Get single incubator by ID
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Incubator ID is required",
        },
        { status: 400 }
      );
    }

    const { sheet } = await initializeIncubatorSheet();
    const rows: GoogleSpreadsheetRow[] = await sheet.getRows();

    const targetRow = rows.find((row: GoogleSpreadsheetRow) => {
      const email = String(row.get("Partner Email") || "").toLowerCase();
      const name = String(row.get("Incubator Name") || "").toLowerCase();
      return email === id.toLowerCase() || name === id.toLowerCase();
    });

    if (!targetRow) {
      return NextResponse.json(
        {
          success: false,
          error: "Incubator not found",
        },
        { status: 404 }
      );
    }

    const incubator: any = {};
    sheet.headerValues.forEach((header: string) => {
      incubator[header] = targetRow.get(header) || "";
    });
    incubator.id = incubator["Partner Email"] || incubator["Incubator Name"];

    console.log("[Incubators] Retrieved incubator:", incubator.id);

    const response: IncubatorApiResponse<Incubator> = {
      success: true,
      data: incubator,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[Incubators] Error fetching incubator:", error.message);

    const errorResponse: IncubatorApiResponse = {
      success: false,
      error: "Failed to retrieve incubator",
      message: error.message,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * PUT /api/incubators/[id]
 * Update existing incubator
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const updates = await request.json();

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Incubator ID is required",
        },
        { status: 400 }
      );
    }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No update data provided",
        },
        { status: 400 }
      );
    }

    const { sheet } = await initializeIncubatorSheet();
    const rows: GoogleSpreadsheetRow[] = await sheet.getRows();

    const targetRow = rows.find((row: GoogleSpreadsheetRow) => {
      const email = String(row.get("Partner Email") || "").toLowerCase();
      const name = String(row.get("Incubator Name") || "").toLowerCase();
      return email === id.toLowerCase() || name === id.toLowerCase();
    });

    if (!targetRow) {
      return NextResponse.json(
        {
          success: false,
          error: "Incubator not found in Google Sheets",
        },
        { status: 404 }
      );
    }

    Object.entries(updates).forEach(([key, value]: [string, any]) => {
      const normalizedKey = normalizeIncubatorColumnName(key, sheet.headerValues);
      if (sheet.headerValues.includes(normalizedKey)) {
        targetRow.set(normalizedKey, value !== null && value !== undefined ? value : "");
      }
    });

    await targetRow.save();

    console.log("[Incubators] Updated incubator:", id);

    const response: IncubatorApiResponse = {
      success: true,
      message: "Incubator updated successfully",
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[Incubators] Error updating incubator:", error.message);

    const errorResponse: IncubatorApiResponse = {
      success: false,
      error: "Failed to update incubator",
      message: error.message,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * DELETE /api/incubators/[id]
 * Delete incubator
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Incubator ID is required",
        },
        { status: 400 }
      );
    }

    const { sheet } = await initializeIncubatorSheet();
    const rows: GoogleSpreadsheetRow[] = await sheet.getRows();

    const targetRowIndex = rows.findIndex((row: GoogleSpreadsheetRow) => {
      const email = String(row.get("Partner Email") || "").toLowerCase();
      const name = String(row.get("Incubator Name") || "").toLowerCase();
      return email === id.toLowerCase() || name === id.toLowerCase();
    });

    if (targetRowIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: "Incubator not found in Google Sheets",
        },
        { status: 404 }
      );
    }

    await rows[targetRowIndex].delete();

    console.log("[Incubators] Deleted incubator:", id);

    const response: IncubatorApiResponse = {
      success: true,
      message: "Incubator deleted successfully",
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[Incubators] Error deleting incubator:", error.message);

    const errorResponse: IncubatorApiResponse = {
      success: false,
      error: "Failed to delete incubator",
      message: error.message,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
