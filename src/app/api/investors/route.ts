import { NextRequest, NextResponse } from "next/server";
import { GoogleSpreadsheetRow } from "google-spreadsheet";
import { initializeInvestorSheet } from "@/lib/google-sheets";
import { Investor, InvestorApiResponse } from "@/types/investor";

/**
 * GET /api/investors
 */
export async function GET(request: NextRequest) {
  try {
    const { sheet } = await initializeInvestorSheet();
    const rows: GoogleSpreadsheetRow[] = await sheet.getRows();

    const investors: Investor[] = rows.map(
      (row: GoogleSpreadsheetRow, index: number) => {
        const investor: any = {};

        sheet.headerValues.forEach((header: string) => {
          investor[header] = row.get(header) || "";
        });

        investor.id =
          investor["Partner Email"] ||
          investor["Investor Name"] ||
          `row_${index}`;

        return investor as Investor;
      }
    );

    console.log(
      `[Investors] Retrieved ${investors.length} investors from Google Sheets`
    );

    const response: InvestorApiResponse<Investor[]> = {
      success: true,
      message: "Successfully retrieved investors",
      data: investors,
      totalCount: investors.length,
      source: "google_sheets",
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error: any) {
    console.error("[Investors] Error fetching investors:", error.message);

    const errorResponse: InvestorApiResponse = {
      success: false,
      error: "Failed to retrieve investors from Google Sheets",
      message: error.message,
      data: [],
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * POST /api/investors
 */
export async function POST(request: NextRequest) {
  try {
    const investorData = await request.json();

    if (!investorData["Investor Name"] && !investorData["Partner Email"]) {
      return NextResponse.json(
        {
          success: false,
          error: "Investor Name or Partner Email is required",
        },
        { status: 400 }
      );
    }

    const { sheet } = await initializeInvestorSheet();

    // Check for duplicate email
    const rows: GoogleSpreadsheetRow[] = await sheet.getRows();
    const emailExists = rows.some((row: GoogleSpreadsheetRow) => {
      const email = String(row.get("Partner Email") || "").toLowerCase();
      return (
        email &&
        email === String(investorData["Partner Email"] || "").toLowerCase()
      );
    });

    if (emailExists) {
      return NextResponse.json(
        {
          success: false,
          error: "An investor with this email already exists",
        },
        { status: 409 }
      );
    }

    // Prepare row data
    const rowData: Record<string, any> = {};
    sheet.headerValues.forEach((header: string) => {
      const value = investorData[header];
      rowData[header] = value !== undefined ? value : "";
    });

    await sheet.addRow(rowData);

    console.log("[Investors] Created investor:", investorData["Investor Name"]);

    const response: InvestorApiResponse = {
      success: true,
      message: "Investor created successfully",
      data: investorData,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error: any) {
    console.error("[Investors] Error creating investor:", error.message);

    const errorResponse: InvestorApiResponse = {
      success: false,
      error: "Failed to create investor",
      message: error.message,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
