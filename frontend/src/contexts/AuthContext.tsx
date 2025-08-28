"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithPopup, 
  signInWithRedirect,
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  getRedirectResult
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
    
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    
    // Check if mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Use redirect for mobile devices
      try {
        await signInWithRedirect(auth, provider);
        return;
      } catch (error) {
        console.error('Mobile redirect login failed:', error);
        throw error;
      }
    } else {
      // Use popup for desktop
      try {
        const result = await signInWithPopup(auth, provider);
        console.log('Login successful:', result.user.email);
        return result;
      } catch (error: any) {
        console.error('Popup login failed, trying redirect:', error);
        
        // Fallback to redirect
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectError) {
          console.error('Redirect login also failed:', redirectError);
          throw redirectError;
        }
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

    // Handle redirect result when page loads
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          console.log('Redirect login successful:', result.user.email);
        }
      } catch (error) {
        console.error('Redirect result error:', error);
      }
    };

    handleRedirectResult();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
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