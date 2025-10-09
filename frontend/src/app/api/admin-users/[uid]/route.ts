import { NextRequest, NextResponse } from "next/server";
import {
  verifyFirebaseToken,
  verifyAdmin,
  createAuthErrorResponse,
} from "@/lib/auth-middleware";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import {
  AdminUser,
  UpdateAdminUserRequest,
  AdminUserApiResponse,
} from "@/types/admin-user";

/**
 * PUT /api/admin-users/[uid]
 * Update admin/subadmin user (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { uid: string } }
) {
  try {
    // Authenticate and verify admin role
    const user = await verifyFirebaseToken(request);
    verifyAdmin(user);

    const { uid } = params;
    const body: UpdateAdminUserRequest = await request.json();
    const { displayName, photoURL, active, password } = body;

    if (!uid) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID is required.",
        },
        { status: 400 }
      );
    }

    console.log("[Admin Users] Updating user:", uid);

    // Check if user exists in Firestore
    const userDoc = await adminDb.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        {
          success: false,
          message: "User account not found.",
        },
        { status: 404 }
      );
    }

    const userData = userDoc.data() as AdminUser;

    if (userData.role !== "admin" && userData.role !== "subadmin") {
      return NextResponse.json(
        {
          success: false,
          message: "Cannot modify non-admin user accounts.",
        },
        { status: 403 }
      );
    }

    // Update Firebase Authentication
    const authUpdateData: any = {};
    if (displayName) authUpdateData.displayName = displayName;

    // Handle photoURL carefully
    if (photoURL !== undefined) {
      if (photoURL && photoURL.trim() !== "") {
        authUpdateData.photoURL = photoURL.trim();
      }
    }

    // Update password if provided
    if (password && password.trim() !== "") {
      if (password.length < 6) {
        return NextResponse.json(
          {
            success: false,
            message: "Password must be at least 6 characters long.",
          },
          { status: 400 }
        );
      }
      authUpdateData.password = password.trim();
    }

    if (active === false) authUpdateData.disabled = true;
    if (active === true) authUpdateData.disabled = false;

    if (Object.keys(authUpdateData).length > 0) {
      await adminAuth.updateUser(uid, authUpdateData);
    }

    // Update Firestore document
    const firestoreUpdateData: Partial<AdminUser> = {
      updatedAt: new Date().toISOString(),
    };
    if (displayName) firestoreUpdateData.displayName = displayName;
    if (photoURL !== undefined) {
      firestoreUpdateData.photoURL =
        photoURL && photoURL.trim() !== "" ? photoURL.trim() : "";
    }
    if (active !== undefined) firestoreUpdateData.active = active;
    if (password && password.trim() !== "")
      firestoreUpdateData.password = password.trim();

    await adminDb.collection("users").doc(uid).update(firestoreUpdateData);

    console.log("[Admin Users] User updated successfully:", uid);

    const response: AdminUserApiResponse = {
      success: true,
      message: "Account updated successfully.",
      data: { uid, ...firestoreUpdateData },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[Admin Users] Error updating admin user:", error.message);

    if (error.name === "AuthenticationError") {
      return createAuthErrorResponse(error);
    }

    if (error.code === "auth/user-not-found") {
      return NextResponse.json(
        {
          success: false,
          message: "User account not found in authentication system.",
        },
        { status: 404 }
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
      message: "Unable to update account. Please try again.",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * DELETE /api/admin-users/[uid]
 * Delete admin/subadmin user (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { uid: string } }
) {
  try {
    // Authenticate and verify admin role
    const user = await verifyFirebaseToken(request);
    verifyAdmin(user);

    const { uid } = params;

    if (!uid) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID is required.",
        },
        { status: 400 }
      );
    }

    // Prevent deleting self
    if (uid === user.uid) {
      return NextResponse.json(
        {
          success: false,
          message: "You cannot delete your own account.",
        },
        { status: 400 }
      );
    }

    console.log("[Admin Users] Deleting user:", uid);

    // Check if user exists
    const userDoc = await adminDb.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        {
          success: false,
          message: "User account not found.",
        },
        { status: 404 }
      );
    }

    const userData = userDoc.data() as AdminUser;

    if (userData.role === "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Admin accounts cannot be deleted.",
        },
        { status: 403 }
      );
    }

    // Delete from Firebase Authentication
    await adminAuth.deleteUser(uid);

    // Delete from Firestore
    await adminDb.collection("users").doc(uid).delete();

    console.log("[Admin Users] User deleted successfully:", uid);

    const response: AdminUserApiResponse = {
      success: true,
      message: `Account for ${userData.displayName} has been deleted successfully.`,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[Admin Users] Error deleting admin user:", error.message);

    if (error.name === "AuthenticationError") {
      return createAuthErrorResponse(error);
    }

    if (error.code === "auth/user-not-found") {
      return NextResponse.json(
        {
          success: false,
          message: "User account not found in authentication system.",
        },
        { status: 404 }
      );
    }

    const errorResponse: AdminUserApiResponse = {
      success: false,
      message: "Unable to delete account. Please try again.",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
