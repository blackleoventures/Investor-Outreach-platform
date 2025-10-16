import { NextRequest, NextResponse } from "next/server";
import { GoogleSpreadsheetRow } from "google-spreadsheet";
import {
  initializeInvestorSheet,
  normalizeInvestorColumnName,
} from "@/lib/google-sheets";
import { Investor, InvestorApiResponse } from "@/types/investor";

/**
 * GET /api/investors/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Investor ID is required",
        },
        { status: 400 }
      );
    }

    const { sheet } = await initializeInvestorSheet();
    const rows: GoogleSpreadsheetRow[] = await sheet.getRows();

    const targetRow = rows.find((row: GoogleSpreadsheetRow) => {
      const email = String(row.get("Partner Email") || "").toLowerCase();
      const name = String(row.get("Investor Name") || "").toLowerCase();
      return email === id.toLowerCase() || name === id.toLowerCase();
    });

    if (!targetRow) {
      return NextResponse.json(
        {
          success: false,
          error: "Investor not found",
        },
        { status: 404 }
      );
    }

    const investor: any = {};
    sheet.headerValues.forEach((header: string) => {
      investor[header] = targetRow.get(header) || "";
    });
    investor.id = investor["Partner Email"] || investor["Investor Name"];

    console.log("[Investors] Retrieved investor:", investor.id);

    const response: InvestorApiResponse<Investor> = {
      success: true,
      data: investor,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[Investors] Error fetching investor:", error.message);

    const errorResponse: InvestorApiResponse = {
      success: false,
      error: "Failed to retrieve investor",
      message: error.message,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * PUT /api/investors/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const updates = await request.json();

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Investor ID is required",
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

    const { sheet } = await initializeInvestorSheet();
    const rows: GoogleSpreadsheetRow[] = await sheet.getRows();

    const targetRow = rows.find((row: GoogleSpreadsheetRow) => {
      const email = String(row.get("Partner Email") || "").toLowerCase();
      const name = String(row.get("Investor Name") || "").toLowerCase();
      return email === id.toLowerCase() || name === id.toLowerCase();
    });

    if (!targetRow) {
      return NextResponse.json(
        {
          success: false,
          error: "Investor not found in Google Sheets",
        },
        { status: 404 }
      );
    }

    Object.entries(updates).forEach(([key, value]: [string, any]) => {
      const normalizedKey = normalizeInvestorColumnName(
        key,
        sheet.headerValues
      );
      if (sheet.headerValues.includes(normalizedKey)) {
        targetRow.set(
          normalizedKey,
          value !== null && value !== undefined ? value : ""
        );
      }
    });

    await targetRow.save();

    console.log("[Investors] Updated investor:", id);

    const response: InvestorApiResponse = {
      success: true,
      message: "Investor updated successfully",
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[Investors] Error updating investor:", error.message);

    const errorResponse: InvestorApiResponse = {
      success: false,
      error: "Failed to update investor",
      message: error.message,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * DELETE /api/investors/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Investor ID is required",
        },
        { status: 400 }
      );
    }

    const { sheet } = await initializeInvestorSheet();
    const rows: GoogleSpreadsheetRow[] = await sheet.getRows();

    const targetRowIndex = rows.findIndex((row: GoogleSpreadsheetRow) => {
      const email = String(row.get("Partner Email") || "").toLowerCase();
      const name = String(row.get("Investor Name") || "").toLowerCase();
      return email === id.toLowerCase() || name === id.toLowerCase();
    });

    if (targetRowIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: "Investor not found in Google Sheets",
        },
        { status: 404 }
      );
    }

    await rows[targetRowIndex].delete();

    console.log("[Investors] Deleted investor:", id);

    const response: InvestorApiResponse = {
      success: true,
      message: "Investor deleted successfully",
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[Investors] Error deleting investor:", error.message);

    const errorResponse: InvestorApiResponse = {
      success: false,
      error: "Failed to delete investor",
      message: error.message,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
