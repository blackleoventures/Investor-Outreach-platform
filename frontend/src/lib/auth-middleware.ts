import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "./firebase-admin";

/**
 * User interface for authenticated requests
 */
export interface AuthUser {
  uid: string;
  email: string;
  role: string;
  displayName?: string;
  photoURL?: string;
  active: boolean;
}

/**
 * Custom Authentication Error class
 */
export class AuthenticationError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode: number = 401) {
    super(message);
    this.name = "AuthenticationError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Verify Firebase ID token from request headers
 * 
 * @param request - Next.js request object
 * @returns Authenticated user object
 * @throws AuthenticationError if authentication fails
 */
export async function verifyFirebaseToken(request: NextRequest): Promise<AuthUser> {
  try {
    // Extract authorization header
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      throw new AuthenticationError(
        "Authorization header missing",
        "NO_TOKEN",
        401
      );
    }

    // Validate Bearer token format
    if (!authHeader.startsWith("Bearer ")) {
      throw new AuthenticationError(
        "Invalid authorization format. Expected 'Bearer <token>'",
        "INVALID_FORMAT",
        401
      );
    }

    // Extract token
    const idToken = authHeader.split("Bearer ")[1];

    if (!idToken || idToken.trim() === "") {
      throw new AuthenticationError(
        "Authentication token is empty",
        "EMPTY_TOKEN",
        401
      );
    }

    // Verify Firebase ID token (checkRevoked: true for security)
    const decodedToken = await adminAuth.verifyIdToken(idToken, true);

    // Fetch user data from Firestore
    const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      throw new AuthenticationError(
        "User profile not found. Please contact support.",
        "USER_NOT_FOUND",
        404
      );
    }

    const userData = userDoc.data() as any;

    // Validate user account status
    if (userData.active === false) {
      throw new AuthenticationError(
        "Your account has been deactivated. Please contact administrator.",
        "ACCOUNT_DISABLED",
        403
      );
    }

    // Construct authenticated user object
    const user: AuthUser = {
      uid: decodedToken.uid,
      email: decodedToken.email || userData.email,
      role: userData.role,
      displayName: userData.displayName,
      photoURL: userData.photoURL,
      active: userData.active,
    };

    // Log successful authentication (production-safe logging)
    console.log("[Auth] Token verified:", {
      uid: user.uid,
      email: user.email,
      role: user.role,
      timestamp: new Date().toISOString(),
    });

    return user;
  } catch (error: any) {
    // Log authentication failure with context
    console.error("[Auth] Authentication failed:", {
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString(),
      // Only log stack in development
      ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
    });

    // Handle custom authentication errors
    if (error instanceof AuthenticationError) {
      throw error;
    }

    // Handle Firebase-specific errors
    if (error.code === "auth/id-token-expired") {
      throw new AuthenticationError(
        "Your session has expired. Please sign in again.",
        "TOKEN_EXPIRED",
        401
      );
    }

    if (error.code === "auth/id-token-revoked") {
      throw new AuthenticationError(
        "Your session has been revoked. Please sign in again.",
        "TOKEN_REVOKED",
        401
      );
    }

    if (error.code === "auth/argument-error") {
      throw new AuthenticationError(
        "Invalid authentication token format.",
        "INVALID_TOKEN",
        401
      );
    }

    if (error.code === "auth/user-disabled") {
      throw new AuthenticationError(
        "Your account has been disabled. Please contact support.",
        "USER_DISABLED",
        403
      );
    }

    if (error.code === "auth/user-not-found") {
      throw new AuthenticationError(
        "User account not found.",
        "USER_NOT_FOUND",
        404
      );
    }

    // Generic authentication failure
    throw new AuthenticationError(
      "Authentication failed. Please sign in again.",
      "UNAUTHORIZED",
      401
    );
  }
}

/**
 * Verify admin role
 * 
 * @param user - Authenticated user object
 * @throws AuthenticationError if user is not admin
 */
export function verifyAdmin(user: AuthUser): void {
  if (!user) {
    throw new AuthenticationError(
      "Authentication required.",
      "UNAUTHORIZED",
      401
    );
  }

  if (user.role !== "admin") {
    console.warn("[Auth] Access denied - Admin required:", {
      uid: user.uid,
      email: user.email,
      role: user.role,
      timestamp: new Date().toISOString(),
    });

    throw new AuthenticationError(
      "Access denied. Administrator privileges required.",
      "FORBIDDEN",
      403
    );
  }

  console.log("[Auth] Admin access granted:", {
    email: user.email,
    uid: user.uid,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Verify admin or subadmin role
 * 
 * @param user - Authenticated user object
 * @throws AuthenticationError if user is not admin or subadmin
 */
export function verifyAdminOrSubadmin(user: AuthUser): void {
  if (!user) {
    throw new AuthenticationError(
      "Authentication required.",
      "UNAUTHORIZED",
      401
    );
  }

  if (user.role !== "admin" && user.role !== "subadmin") {
    console.warn("[Auth] Access denied - Team member required:", {
      uid: user.uid,
      email: user.email,
      role: user.role,
      timestamp: new Date().toISOString(),
    });

    throw new AuthenticationError(
      "Access denied. Team member privileges required.",
      "FORBIDDEN",
      403
    );
  }

  console.log("[Auth] Team access granted:", {
    email: user.email,
    role: user.role,
    uid: user.uid,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Create standardized error response
 * 
 * @param error - Error object (AuthenticationError or generic Error)
 * @returns Next.js Response object with error details
 */
export function createAuthErrorResponse(error: AuthenticationError | Error): NextResponse {
  const isAuthError = error instanceof AuthenticationError;

  const statusCode = isAuthError ? error.statusCode : 500;

  const response = {
    success: false,
    error: {
      code: isAuthError ? error.code : "INTERNAL_ERROR",
      message: error.message,
      // Only include details in development
      ...(process.env.NODE_ENV === "development" && {
        details: error.message,
        ...(error.stack && { stack: error.stack }),
      }),
    },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Helper function to check if user has specific role
 * 
 * @param user - Authenticated user object
 * @param allowedRoles - Array of allowed roles
 * @returns boolean indicating if user has required role
 */
export function hasRole(user: AuthUser, allowedRoles: string[]): boolean {
  return allowedRoles.includes(user.role);
}

/**
 * Verify custom role permissions
 * 
 * @param user - Authenticated user object
 * @param allowedRoles - Array of allowed roles
 * @throws AuthenticationError if user doesn't have required role
 */
export function verifyRole(user: AuthUser, allowedRoles: string[]): void {
  if (!user) {
    throw new AuthenticationError(
      "Authentication required.",
      "UNAUTHORIZED",
      401
    );
  }

  if (!hasRole(user, allowedRoles)) {
    console.warn("[Auth] Access denied - Required role not found:", {
      uid: user.uid,
      email: user.email,
      userRole: user.role,
      requiredRoles: allowedRoles,
      timestamp: new Date().toISOString(),
    });

    throw new AuthenticationError(
      `Access denied. Required role: ${allowedRoles.join(" or ")}`,
      "FORBIDDEN",
      403
    );
  }

  console.log("[Auth] Role access granted:", {
    email: user.email,
    role: user.role,
    requiredRoles: allowedRoles,
    timestamp: new Date().toISOString(),
  });
}
