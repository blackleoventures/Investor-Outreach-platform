"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithPopup, 
  signInWithRedirect,
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthContextType {
  currentUser: User | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function login() {
    if (!auth) {
      console.error('Firebase auth not initialized');
      throw new Error('Authentication service not available');
    }
    
    // Set persistence to LOCAL for mobile
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch (error) {
      console.warn('Could not set auth persistence:', error);
    }
    
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    // Mobile detection
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isMobile) {
      // For mobile, always use redirect
      try {
        console.log('Mobile detected, using redirect method with persistence');
        await signInWithRedirect(auth, provider);
        return;
      } catch (error: any) {
        console.error('Mobile redirect failed:', error);
        
        // iOS Safari specific fix
        if (isIOS && error.code === 'auth/operation-not-supported-in-this-environment') {
          alert('Please use Safari browser for Google Sign-in on iOS');
        }
        throw error;
      }
    } else {
      // Desktop: try popup first, fallback to redirect
      try {
        const result = await signInWithPopup(auth, provider);
        console.log('Desktop popup login successful');
        return result;
      } catch (error: any) {
        console.log('Popup failed, trying redirect:', error.code);
        await signInWithRedirect(auth, provider);
        return;
      }
    }
  }

  async function logout() {
    if (!auth) {
      console.error('Firebase auth not initialized');
      throw new Error('Authentication service not available');
    }
    
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  useEffect(() => {
    if (!auth) {
      console.warn('Firebase auth not available, skipping auth state listener');
      setLoading(false);
      return;
    }

    let mounted = true;

    // Handle redirect result when page loads
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && mounted) {
          console.log('Redirect login successful:', result.user.email);
          setCurrentUser(result.user);
        }
      } catch (error) {
        console.error('Redirect result error:', error);
      }
    };

    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (mounted) {
        console.log('Auth state changed:', user ? user.email : 'No user');
        setCurrentUser(user);
        setLoading(false);
      }
    });

    // Handle redirect result after setting up listener
    handleRedirectResult();

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const value = {
    currentUser,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 