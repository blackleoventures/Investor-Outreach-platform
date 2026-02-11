import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { verifyFirebaseToken, createAuthErrorResponse } from "@/lib/auth-middleware";
import { sendMagicLinkEmail, sendMagicLinkByUid } from "@/lib/email";

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

        // 2. Generate Secure Access Token
        const secureAccessToken = crypto.randomUUID();

        // 3. Create Passwordless User in Firebase Auth
        let userRecord;
        try {
            userRecord = await adminAuth.createUser({
                email,
                emailVerified: true,
                displayName: fullName,
                disabled: false,
            });
            console.log(`[InviteInvestor] Created Auth user: ${userRecord.uid}`);
        } catch (createError: any) {
            if (createError.code === 'auth/email-already-exists') {
                userRecord = await adminAuth.getUserByEmail(email);
                console.log(`[InviteInvestor] User already exists: ${userRecord.uid}`);
            } else {
                throw createError;
            }
        }

        // 4. Create/Update Investor Record in 'investors' collection
        await adminDb.collection("investors").doc(userRecord.uid).set({
            uid: userRecord.uid,
            email,
            displayName: fullName,
            firmName: firm,
            role: "investor",
            status: "invited",
            secureAccessToken, // CRITICAL: This is the key for magic link
            invitedBy: decodedToken.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }, { merge: true });

        // 5. Update 'users' collection for consistency
        await adminDb.collection("users").doc(userRecord.uid).set({
            uid: userRecord.uid,
            email,
            displayName: fullName,
            firstName: fullName.split(' ')[0],
            lastName: fullName.split(' ').slice(1).join(' '),
            role: "investor",
            firmName: firm,
            status: "active",
            active: true, // Required for frontend badge
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }, { merge: true });

        // 6. Set Custom Claims
        await adminAuth.setCustomUserClaims(userRecord.uid, { role: "investor" });

        // 7. Generate Magic Link
        const magicLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/investor-login?token=${secureAccessToken}`;

        console.log("==================================================================");
        console.log(`[MAGIC LINK] for ${email}: ${magicLink}`);
        console.log("==================================================================");

        // 8. Send Email (non-blocking for response)
        try {
            await sendMagicLinkByUid(userRecord.uid, magicLink);
        } catch (emailError) {
            console.error("[InviteInvestor] Failed to send email, but user was created:", emailError);
            // We don't fail the whole request because the user is already created
        }

        return NextResponse.json(
            {
                success: true,
                message: `Investor invited. Magic link sent to ${email}.`,
                data: {
                    uid: userRecord.uid,
                    email,
                    magicLink // Still returning this for UI fallback
                }
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
