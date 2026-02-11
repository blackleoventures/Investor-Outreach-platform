import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
    try {
        const { token } = await request.json();

        if (!token) {
            return NextResponse.json(
                { success: false, error: "Missing token" },
                { status: 400 }
            );
        }

        console.log(`[VerifyMagicLink] Verifying token: ${token}`);

        // 1. Find Investor by secureAccessToken
        const investorsSnapshot = await adminDb
            .collection("investors")
            .where("secureAccessToken", "==", token)
            .limit(1)
            .get();

        if (investorsSnapshot.empty) {
            return NextResponse.json(
                { success: false, error: "Invalid or expired invitation link." },
                { status: 401 }
            );
        }

        const investorDoc = investorsSnapshot.docs[0];
        const investorData = investorDoc.data();
        const uid = investorData.uid;

        // 2. Check Status
        if (investorData.status === "revoked") {
            return NextResponse.json(
                { success: false, error: "Access has been revoked." },
                { status: 403 }
            );
        }

        // 3. Generate Custom Token
        const customToken = await adminAuth.createCustomToken(uid, {
            role: 'investor'
        });

        // 4. Update Investor Record (activate if invited, update lastLogin)
        await investorDoc.ref.update({
            status: "active",
            lastLogin: new Date().toISOString(),
            emailVerified: true // Ensure they are marked verified
        });

        // 5. Update User Record (sync)
        await adminDb.collection("users").doc(uid).set({
            status: "active",
            lastLogin: new Date().toISOString()
        }, { merge: true });

        return NextResponse.json({
            success: true,
            customToken,
            user: {
                uid,
                email: investorData.email,
                displayName: investorData.displayName
            }
        });

    } catch (error: any) {
        console.error("[VerifyMagicLink] Error:", error);
        return NextResponse.json(
            { success: false, error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
