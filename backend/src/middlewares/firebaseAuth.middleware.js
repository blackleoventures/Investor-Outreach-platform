const admin = require("../config/firebase.config");

class AuthenticationError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "AuthenticationError";
    this.code = code;
  }
}

const verifyFirebaseToken = async (req, res, next) => {
  try {
    if (
      process.env.NODE_ENV === "development" &&
      process.env.BYPASS_AUTH === "true"
    ) {
      console.warn("[Auth] Development mode: Authentication bypassed");
      req.user = { email: "dev@example.com" };
      return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AuthenticationError("Authorization header missing", "NO_TOKEN");
    }

    if (!authHeader.startsWith("Bearer ")) {
      throw new AuthenticationError(
        "Invalid authorization format",
        "INVALID_FORMAT"
      );
    }

    const idToken = authHeader.split("Bearer ")[1];

    if (!idToken || idToken.trim() === "") {
      throw new AuthenticationError("Token is empty", "EMPTY_TOKEN");
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken, true);

    req.user = { email: decodedToken.email };

    console.log("[Auth] Token verified successfully for:", decodedToken.email);

    next();
  } catch (error) {
    console.error("[Auth] Authentication failed:", {
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString(),
    });

    if (error instanceof AuthenticationError) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication failed",
          details:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        },
      });
    }

    if (error.code === "auth/id-token-expired") {
      return res.status(401).json({
        success: false,
        error: {
          code: "TOKEN_EXPIRED",
          message: "Token has expired",
        },
      });
    }

    if (error.code === "auth/id-token-revoked") {
      return res.status(401).json({
        success: false,
        error: {
          code: "TOKEN_REVOKED",
          message: "Token has been revoked",
        },
      });
    }

    if (error.code === "auth/argument-error") {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid token format",
        },
      });
    }

    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication failed",
      },
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      req.user = null;
      return next();
    }

    const idToken = authHeader.split("Bearer ")[1];

    if (!idToken || idToken.trim() === "") {
      req.user = null;
      return next();
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken, true);

    req.user = { email: decodedToken.email };

    next();
  } catch (error) {
    console.warn("[Auth] Optional authentication failed:", error.message);
    req.user = null;
    next();
  }
};

module.exports = {
  verifyFirebaseToken,
  optionalAuth,
};
