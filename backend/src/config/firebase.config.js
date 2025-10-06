const admin = require("firebase-admin");

/**
 * Firebase Admin SDK Configuration
 * Initializes once and exports for use across the application
 */

// Prevent multiple initializations
if (!admin.apps.length) {
  try {
    // Validate required environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    // Check for missing credentials
    if (!projectId || !privateKeyRaw || !clientEmail) {
      const missing = [];
      if (!projectId) missing.push("FIREBASE_PROJECT_ID");
      if (!privateKeyRaw) missing.push("FIREBASE_PRIVATE_KEY");
      if (!clientEmail) missing.push("FIREBASE_CLIENT_EMAIL");

      throw new Error(
        `Missing required Firebase environment variables: ${missing.join(", ")}`
      );
    }

    // Format private key (handle escaped newlines from .env)
    const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

    // Initialize Firebase Admin
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        privateKey,
        clientEmail,
      }),
      projectId,
    });

    console.log(
      `[Firebase Admin] Initialized successfully for project: ${projectId}`
    );
  } catch (error) {
    console.error("[Firebase Admin] Initialization failed:", {
      message: error.message,
      code: error.code || "UNKNOWN_ERROR",
    });

    // Fail fast in development, log and continue in production
    if (process.env.NODE_ENV !== "production") {
      throw error;
    }

    console.warn(
      "[Firebase Admin] Running in degraded mode. Firebase features unavailable."
    );
  }
}

module.exports = admin;
