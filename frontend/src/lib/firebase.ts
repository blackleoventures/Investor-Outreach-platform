import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Validate Firebase configuration
const isValidConfig = firebaseConfig.apiKey && firebaseConfig.projectId;

if (!isValidConfig) {
  console.warn('⚠️ Firebase configuration incomplete, using fallback');
}

// Initialize Firebase with error handling
let app = null;
if (isValidConfig) {
  try {
    app = initializeApp(firebaseConfig);
  } catch (error) {
    console.warn('Firebase initialization failed:', error);
    app = null;
  }
}

// Initialize Firebase services with null checks
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

// Export config validation status
export const isFirebaseConfigured = !!app;

// Skip emulators for Google Sign-in to work properly

// Lazy load analytics only when needed
export const getAnalytics = async () => {
  if (typeof window !== 'undefined' && app) {
    const { getAnalytics } = await import('firebase/analytics');
    return getAnalytics(app);
  }
  return null;
};
export default app; 