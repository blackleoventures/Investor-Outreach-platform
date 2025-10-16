import admin from "firebase-admin";

/**
 * Firebase Admin SDK Initialization
 */

// Prevent multiple initializations (important for serverless)
if (!admin.apps.length) {
  try {
    console.log("[Firebase Admin] Starting initialization...");

    // Get environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    // Validate required credentials
    if (!projectId || !privateKeyRaw || !clientEmail) {
      const missing: string[] = [];
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
  } catch (error: any) {
    console.error("[Firebase Admin] Initialization failed:", {
      message: error.message,
      code: error.code || "UNKNOWN_ERROR",
    });

    // Throw error to prevent app from running with broken Firebase
    throw new Error(
      `Firebase Admin initialization failed: ${error.message}`
    );
  }
}

// Export Firebase Admin services
export const adminAuth = admin.auth();
export const adminDb = admin.firestore();

// Default export
export default admin;
