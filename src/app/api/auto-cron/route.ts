import { NextRequest, NextResponse } from "next/server";

// Import the scheduler directly
import { startAutoCronScheduler } from "@/lib/cron/auto-cron-scheduler";

let schedulerInitialized = false;

export async function GET(request: NextRequest) {
  try {
    if (!schedulerInitialized) {
      console.log("[Auto Cron API] Initializing scheduler via API call");
      startAutoCronScheduler();
      schedulerInitialized = true;
    }

    return NextResponse.json({
      success: true,
      message: "Auto-cron scheduler is running",
      initialized: schedulerInitialized,
    });
  } catch (error: any) {
    console.error("[Auto Cron API] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
