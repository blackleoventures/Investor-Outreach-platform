// Fallback functions for when Firebase is not configured
export const mockAuth = {
  currentUser: null,
  onAuthStateChanged: () => () => {},
  signInWithPopup: () => Promise.reject(new Error('Firebase not configured')),
  signOut: () => Promise.reject(new Error('Firebase not configured')),
};

export const mockDb = {
  collection: () => ({
    doc: () => ({
      get: () => Promise.resolve({ exists: false, data: () => null }),
      set: () => Promise.reject(new Error('Firebase not configured')),
      update: () => Promise.reject(new Error('Firebase not configured')),
      delete: () => Promise.reject(new Error('Firebase not configured')),
    }),
    get: () => Promise.resolve({ empty: true, docs: [] }),
    add: () => Promise.reject(new Error('Firebase not configured')),
  }),
};

export const getFirebaseOrFallback = () => {
  try {
    const { auth, db, isFirebaseConfigured } = require('./firebase');
    if (isFirebaseConfigured) {
      return { auth, db };
    }
  } catch (error) {
    console.warn('Firebase not available, using fallback');
  }
  return { auth: mockAuth, db: mockDb };
};