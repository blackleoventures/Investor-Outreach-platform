import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
    try {
        const { token } = await request.json();

        if (!token) {
            return NextResponse.json(
                { success: false, error: "Missing access token" },
                { status: 400 }
            );
        }

        console.log(`[InvestorLogin] Attempting login with token: ${token}`);

        // 1. Find investor by secureAccessToken
        const investorsSnapshot = await adminDb
            .collection("investors")
            .where("secureAccessToken", "==", token)
            .limit(1)
            .get();

        if (investorsSnapshot.empty) {
            return NextResponse.json(
                { success: false, error: "Invalid or expired invitation token." },
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
            role: "investor"
        });

        // 4. Update Stats
        await investorDoc.ref.update({
            status: "active",
            lastLogin: new Date().toISOString()
        });

        console.log(`[InvestorLogin] Success for user ${uid}.`);

        return NextResponse.json(
            {
                success: true,
                customToken,
                user: {
                    email: investorData.email,
                    displayName: investorData.displayName
                }
            },
            { status: 200 }
        );

    } catch (error: any) {
        console.error("[InvestorLogin] Error:", error);
        return NextResponse.json(
            { success: false, error: "Login failed." },
            { status: 500 }
        );
    }
}
