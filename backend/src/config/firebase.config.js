const admin = require("firebase-admin");

// Guard against missing envs to avoid crashing on require
const projectId = process.env.FIREBASE_PROJECT_ID;
const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY || "";
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

if (!admin.apps.length) {
  try {
    const privateKey = privateKeyRaw.replace(/\\n/g, "\n");
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, privateKey, clientEmail }),
      projectId: projectId,
    });
    console.log('Firebase Admin initialized successfully');
  } catch (e) {
    console.error('Failed to initialize Firebase Admin. Check FIREBASE_* envs.', e?.message);
    // Don't throw in production, just log
    if (process.env.NODE_ENV !== 'production') {
      throw e;
    }
  }
}

module.exports = admin;
