// app/api/campaigns/[id]/mark-complete/route.ts

import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken, verifyAdminOrSubadmin } from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";
import { getCurrentTimestamp } from "@/lib/utils/date-helper";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const user = await verifyFirebaseToken(request);
    
    // ONLY admin/subadmin can mark campaign as complete
    verifyAdminOrSubadmin(user);

    const campaignId = params.id;

    console.log('[Mark Complete] Campaign:', campaignId);
    console.log('[Mark Complete] User:', user.email);

    // Get campaign
    const campaignDoc = await adminDb.collection('campaigns').doc(campaignId).get();

    if (!campaignDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const campaignData = campaignDoc.data();

    // Check if already completed
    if (campaignData?.status === 'completed') {
      return NextResponse.json(
        { success: false, error: 'Campaign is already completed' },
        { status: 400 }
      );
    }

    // Mark as completed
    const completedAt = getCurrentTimestamp();

    await adminDb.collection('campaigns').doc(campaignId).update({
      status: 'completed',
      completedAt,
      lastUpdated: completedAt,
    });

    console.log('[Mark Complete] Campaign marked as completed');
    console.log('[Mark Complete] Completed at:', completedAt);

    return NextResponse.json({
      success: true,
      message: 'Campaign marked as completed',
      completedAt,
    });

  } catch (error: any) {
    console.error('[Mark Complete] Error:', error);
    
    if (error.message === 'Forbidden') {
      return NextResponse.json(
        { success: false, error: 'Only admins can mark campaigns as complete' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
