import { NextRequest, NextResponse } from "next/server";
import {
  verifyFirebaseToken,
  verifyAdmin,
  createAuthErrorResponse,
} from "@/lib/auth-middleware";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import {
  AdminUser,
  CreateAdminUserRequest,
  AdminUserApiResponse,
} from "@/types/admin-user";

/**
 * GET /api/admin-users
 * Get all admin and subadmin users (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate and verify admin role
    const user = await verifyFirebaseToken(request);
    verifyAdmin(user);

    console.log("[Admin Users] Fetching all admin and subadmin users");

    const usersSnapshot = await adminDb
      .collection("users")
      .where("role", "in", ["admin", "subadmin"])
      .get();

    const users: AdminUser[] = [];
    usersSnapshot.forEach((doc) => {
      users.push({ uid: doc.id, ...doc.data() } as AdminUser);
    });

    console.log(`[Admin Users] Found ${users.length} admin users`);

    const response: AdminUserApiResponse<AdminUser[]> = {
      success: true,
      message: "Admin users retrieved successfully.",
      data: users,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[Admin Users] Error fetching admin users:", error.message);

    if (error.name === "AuthenticationError") {
      return createAuthErrorResponse(error);
    }

    const errorResponse: AdminUserApiResponse = {
      success: false,
      message: "Unable to retrieve admin users. Please try again.",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * POST /api/admin-users
 * Create new admin/subadmin user (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate and verify admin role
    const user = await verifyFirebaseToken(request);
    verifyAdmin(user);

    const body: CreateAdminUserRequest = await request.json();
    const { email, password, displayName, photoURL } = body;

    // Validation
    if (!email || !password || !displayName) {
      return NextResponse.json(
        {
          success: false,
          message: "Email, password, and name are required.",
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "Password must be at least 6 characters long.",
        },
        { status: 400 }
      );
    }

    // Build user creation data
    const authUserData: any = {
      email: email,
      password: password,
      displayName: displayName,
      disabled: false,
    };

    // Only add photoURL if it exists and is not empty
    if (photoURL && photoURL.trim() !== "") {
      authUserData.photoURL = photoURL.trim();
    }

    console.log("[Admin Users] Creating user in Firebase Auth");

    // Create user in Firebase Authentication
    const userRecord = await adminAuth.createUser(authUserData);

    // Create user document in Firestore
    const timestamp = new Date().toISOString();
    const newUserData: AdminUser = {
      uid: userRecord.uid,
      email: email,
      displayName: displayName,
      role: "subadmin",
      password: password,
      photoURL: photoURL && photoURL.trim() !== "" ? photoURL.trim() : "",
      active: true,
      createdAt: timestamp,
      lastLogin: null,
    };

    await adminDb.collection("users").doc(userRecord.uid).set(newUserData);

    console.log("[Admin Users] User created successfully:", userRecord.uid);

    const response: AdminUserApiResponse<AdminUser> = {
      success: true,
      message: `Account created successfully for ${displayName}.`,
      data: newUserData,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error: any) {
    console.error("[Admin Users] Error creating admin user:", error);

    if (error.name === "AuthenticationError") {
      return createAuthErrorResponse(error);
    }

    // Handle Firebase Auth errors
    if (error.code === "auth/email-already-exists") {
      return NextResponse.json(
        {
          success: false,
          message: "This email is already registered. Please use a different email.",
        },
        { status: 409 }
      );
    }

    if (error.code === "auth/invalid-email") {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide a valid email address.",
        },
        { status: 400 }
      );
    }

    if (error.code === "auth/weak-password") {
      return NextResponse.json(
        {
          success: false,
          message: "Password is too weak. Please choose a stronger password.",
        },
        { status: 400 }
      );
    }

    if (error.code === "auth/invalid-photo-url") {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide a valid photo URL or leave it empty.",
        },
        { status: 400 }
      );
    }

    const errorResponse: AdminUserApiResponse = {
      success: false,
      message: "Unable to create account. Please try again.",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
