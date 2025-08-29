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
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { detectBrowserEnvironment, getAuthErrorMessage, isAuthSupported, getAuthSettings } from '@/lib/auth-utils';
import { prepareMobileAuth, handleMobileBackButton } from '@/lib/mobile-auth-fix';

interface AuthContextType {
  currentUser: User | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  authError: string | null;
  retryLogin: () => Promise<void>;
  clearError: () => void;
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
  const [authError, setAuthError] = useState<string | null>(null);
  const [loginAttempts, setLoginAttempts] = useState(0);

  // Initialize mobile auth fixes
  useEffect(() => {
    const browserInfo = detectBrowserEnvironment();
    if (browserInfo.isMobile) {
      const cleanupMobileAuth = prepareMobileAuth();
      const cleanupBackButton = handleMobileBackButton();
      
      return () => {
        cleanupMobileAuth?.();
        cleanupBackButton?.();
      };
    }
  }, []);

  async function login() {
    if (!auth) {
      console.error('Firebase auth not initialized');
      throw new Error('Authentication service not available');
    }
    
    // Check if authentication is supported in this environment
    if (!isAuthSupported()) {
      const error = 'Your browser doesn\'t support the required features for authentication. Please enable cookies and local storage.';
      setAuthError(error);
      throw new Error(error);
    }
    
    setAuthError(null);
    const browserInfo = detectBrowserEnvironment();
    const authSettings = getAuthSettings(browserInfo);
    
    console.log('Browser environment:', browserInfo);
    console.log('Auth settings:', authSettings);
    
    // Set appropriate persistence based on browser
    try {
      const persistence = authSettings.persistence === 'local' ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistence);
      console.log('Auth persistence set successfully');
    } catch (error) {
      console.warn('Could not set auth persistence:', error);
    }
    
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    provider.setCustomParameters(authSettings.customParameters);
    
    // Enhanced login strategy based on browser capabilities
    try {
      if (authSettings.method === 'popup' && browserInfo.supportsPopup) {
        console.log(`Using popup method for ${browserInfo.browser}`);
        const result = await signInWithPopup(auth, provider);
        console.log('Popup login successful');
        return result;
      } else {
        console.log(`Using redirect method for ${browserInfo.browser}`);
        await signInWithRedirect(auth, provider);
        return;
      }
    } catch (error: any) {
      console.error('Primary login method failed:', error);
      
      // Set user-friendly error message
      const errorMessage = getAuthErrorMessage(error.code, browserInfo);
      setAuthError(errorMessage);
      
      // Fallback strategies
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
        console.log('Trying redirect as fallback');
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectError: any) {
          console.error('Redirect fallback also failed:', redirectError);
          const fallbackErrorMessage = getAuthErrorMessage(redirectError.code, browserInfo);
          setAuthError(fallbackErrorMessage);
          throw redirectError;
        }
      }
      
      throw error;
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
    const browserInfo = detectBrowserEnvironment();

    // Enhanced redirect result handling
    const handleRedirectResult = async () => {
      try {
        console.log('Checking for redirect result...');
        const result = await getRedirectResult(auth);
        
        if (result && mounted) {
          console.log('Redirect login successful:', result.user.email);
          setCurrentUser(result.user);
          setAuthError(null);
          
          // Clear any error states on successful login
          if (typeof window !== 'undefined') {
            // Remove any error parameters from URL
            const url = new URL(window.location.href);
            if (url.searchParams.has('error')) {
              url.searchParams.delete('error');
              window.history.replaceState({}, '', url.toString());
            }
          }
        } else if (result === null) {
          console.log('No redirect result found');
        }
      } catch (error: any) {
        console.error('Redirect result error:', error);
        
        if (mounted) {
          // Use utility function for consistent error messages
          const errorMessage = getAuthErrorMessage(error.code, browserInfo);
          setAuthError(errorMessage);
        }
      }
    };

    // Set up auth state listener with enhanced error handling
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (mounted) {
        console.log('Auth state changed:', user ? user.email : 'No user');
        setCurrentUser(user);
        setLoading(false);
        
        // Clear auth error when user successfully logs in
        if (user && authError) {
          setAuthError(null);
        }
      }
    }, (error) => {
      console.error('Auth state change error:', error);
      if (mounted) {
        setLoading(false);
        setAuthError(`Authentication error: ${error.message}`);
      }
    });

    // Handle redirect result with a small delay to ensure auth is ready
    // Longer delay for mobile browsers
    const delay = browserInfo.isMobile ? 500 : 100;
    
    const timeoutId = setTimeout(() => {
      if (mounted) {
        handleRedirectResult();
      }
    }, delay);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [authError]);

  const retryLogin = async () => {
    if (loginAttempts >= 3) {
      setAuthError('Too many login attempts. Please refresh the page and try again.');
      return;
    }
    
    setLoginAttempts(prev => prev + 1);
    await login();
  };

  const clearError = () => {
    setAuthError(null);
    setLoginAttempts(0);
  };

  const value = {
    currentUser,
    login,
    logout,
    loading,
    authError,
    retryLogin,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 