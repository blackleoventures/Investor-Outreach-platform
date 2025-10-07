const admin = require("../config/firebase.config");
const { db } = require("../config/firebase.config");

class AuthenticationError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "AuthenticationError";
    this.code = code;
  }
}

const verifyFirebaseToken = async (req, res, next) => {
  try {
    // Development bypass
    if (
      process.env.NODE_ENV === "development" &&
      process.env.BYPASS_AUTH === "true"
    ) {
      console.warn("[Auth] Development mode: Authentication bypassed");
      req.user = {
        uid: "dev-uid",
        email: "dev@example.com",
        role: "admin",
      };
      return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AuthenticationError("Authorization header missing", "NO_TOKEN");
    }

    if (!authHeader.startsWith("Bearer ")) {
      throw new AuthenticationError(
        "Invalid authorization format. Expected 'Bearer <token>'",
        "INVALID_FORMAT"
      );
    }

    const idToken = authHeader.split("Bearer ")[1];

    if (!idToken || idToken.trim() === "") {
      throw new AuthenticationError(
        "Authentication token is empty",
        "EMPTY_TOKEN"
      );
    }

    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken, true);

    // Fetch user data from Firestore to get role and other details
    const userDoc = await db.collection("users").doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User profile not found. Please contact support.",
        },
      });
    }

    const userData = userDoc.data();

    // Attach user information to request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || userData.email,
      role: userData.role,
      displayName: userData.displayName,
      photoURL: userData.photoURL,
      active: userData.active,
    };

    // Check if user is active
    if (userData.active === false) {
      return res.status(403).json({
        success: false,
        error: {
          code: "ACCOUNT_DISABLED",
          message:
            "Your account has been deactivated. Please contact administrator.",
        },
      });
    }

    console.log("[Auth] Token verified successfully for:", {
      email: req.user.email,
      role: req.user.role,
      uid: req.user.uid,
    });

    next();
  } catch (error) {
    console.error("[Auth] Authentication failed:", {
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString(),
    });

    // Handle custom authentication errors
    if (error instanceof AuthenticationError) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication failed. Please sign in again.",
          details:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        },
      });
    }

    // Handle Firebase-specific errors
    if (error.code === "auth/id-token-expired") {
      return res.status(401).json({
        success: false,
        error: {
          code: "TOKEN_EXPIRED",
          message: "Your session has expired. Please sign in again.",
        },
      });
    }

    if (error.code === "auth/id-token-revoked") {
      return res.status(401).json({
        success: false,
        error: {
          code: "TOKEN_REVOKED",
          message: "Your session has been revoked. Please sign in again.",
        },
      });
    }

    if (error.code === "auth/argument-error") {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid authentication token format.",
        },
      });
    }

    if (error.code === "auth/user-disabled") {
      return res.status(403).json({
        success: false,
        error: {
          code: "USER_DISABLED",
          message: "Your account has been disabled. Please contact support.",
        },
      });
    }

    if (error.code === "auth/user-not-found") {
      return res.status(404).json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User account not found.",
        },
      });
    }

    // Generic authentication failure
    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication failed. Please sign in again.",
      },
    });
  }
};

// Middleware to verify admin role
const verifyAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required.",
        },
      });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Access denied. Administrator privileges required.",
        },
      });
    }

    console.log("[Auth] Admin access verified for:", req.user.email);
    next();
  } catch (error) {
    console.error("[Auth] Admin verification failed:", error.message);
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Unable to verify administrator access.",
      },
    });
  }
};

// Middleware to verify admin or subadmin role
const verifyAdminOrSubadmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required.",
        },
      });
    }

    if (req.user.role !== "admin" && req.user.role !== "subadmin") {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Access denied. Team member privileges required.",
        },
      });
    }

    console.log("[Auth] Team access verified for:", {
      email: req.user.email,
      role: req.user.role,
    });
    next();
  } catch (error) {
    console.error("[Auth] Role verification failed:", error.message);
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Unable to verify access permissions.",
      },
    });
  }
};

// Export each component separately (maintains backward compatibility)
module.exports = verifyFirebaseToken;
module.exports.verifyAdmin = verifyAdmin;
module.exports.verifyAdminOrSubadmin = verifyAdminOrSubadmin;
