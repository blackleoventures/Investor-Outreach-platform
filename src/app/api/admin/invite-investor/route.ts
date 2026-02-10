import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { verifyFirebaseToken, createAuthErrorResponse } from "@/lib/auth-middleware";

export async function POST(request: NextRequest) {
    try {
        // 1. Authenticate Admin
        const decodedToken = await verifyFirebaseToken(request);

        // START: Check if requester is admin/subadmin
        // (This Logic might need adjustment based on how roles are stored in token vs DB)
        // For now, we'll fetch the user from DB to verify role if it's not in the token
        const requesterDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
        const requesterData = requesterDoc.data();

        if (!requesterData || (requesterData.role !== 'admin' && requesterData.role !== 'subadmin')) {
            return NextResponse.json(
                { success: false, error: "Unauthorized: Only admins can invite investors." },
                { status: 403 }
            );
        }
        // END: Admin Check

        const body = await request.json();
        const { email, fullName, firm } = body;

        if (!email || !fullName || !firm) {
            return NextResponse.json(
                { success: false, error: "Missing required fields: email, fullName, firm" },
                { status: 400 }
            );
        }

        console.log(`[InviteInvestor] Creating investor account for ${email}`);

        // 2. Create Passwordless User in Firebase Auth
        let userRecord;
        try {
            userRecord = await adminAuth.createUser({
                email,
                emailVerified: true, // Auto-verify since admin is inviting
                displayName: fullName,
                disabled: false,
            });
            console.log(`[InviteInvestor] Created Auth user: ${userRecord.uid}`);
        } catch (createError: any) {
            if (createError.code === 'auth/email-already-exists') {
                // If user exists, we might want to just update their role or fail
                // For now, let's fetch the existing user
                userRecord = await adminAuth.getUserByEmail(email);
                console.log(`[InviteInvestor] User already exists: ${userRecord.uid}. Proceeding to update role.`);
            } else {
                throw createError;
            }
        }

        // 3. Set 'investor' role and details in Firestore
        // Note: We use the UID from Auth to create the User document
        await adminDb.collection("users").doc(userRecord.uid).set({
            uid: userRecord.uid,
            email,
            displayName: fullName,
            firstName: fullName.split(' ')[0],
            lastName: fullName.split(' ').slice(1).join(' '),
            role: "investor",
            firmName: firm,
            createdAt: new Date().toISOString(),
            invitedBy: decodedToken.uid,
            status: "active"
        }, { merge: true });

        // 4. (Optional) Set Custom Claims for simplified role checks
        await adminAuth.setCustomUserClaims(userRecord.uid, { role: "investor" });

        return NextResponse.json(
            {
                success: true,
                message: `Investor ${fullName} invited successfully.`,
                data: { uid: userRecord.uid, email }
            },
            { status: 200 }
        );

    } catch (error: any) {
        console.error("[InviteInvestor] Error:", error);
        if (error.name === "AuthenticationError") {
            return createAuthErrorResponse(error);
        }
        return NextResponse.json(
            { success: false, error: error.message || "Failed to invite investor" },
            { status: 500 }
        );
    }
}
