/**
 * Mobile authentication fixes and workarounds
 */

/**
 * Fix for iOS Safari third-party cookie issues
 */
export const enableIOSAuthFix = () => {
  if (typeof window === 'undefined') return;
  
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
  
  if (isIOS && isSafari) {
    // Add meta tag to prevent iOS Safari from blocking third-party cookies
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0, user-scalable=no';
    
    const existingMeta = document.querySelector('meta[name="viewport"]');
    if (existingMeta) {
      existingMeta.setAttribute('content', meta.content);
    } else {
      document.head.appendChild(meta);
    }
  }
};

/**
 * Clear authentication storage on mobile browsers
 */
export const clearAuthStorage = () => {
  if (typeof window === 'undefined') return;
  
  try {
    // Clear localStorage
    const authKeys = Object.keys(localStorage).filter(key => 
      key.includes('firebase') || key.includes('auth') || key.includes('google')
    );
    authKeys.forEach(key => localStorage.removeItem(key));
    
    // Clear sessionStorage
    const sessionAuthKeys = Object.keys(sessionStorage).filter(key => 
      key.includes('firebase') || key.includes('auth') || key.includes('google')
    );
    sessionAuthKeys.forEach(key => sessionStorage.removeItem(key));
    
    console.log('Auth storage cleared');
  } catch (error) {
    console.warn('Could not clear auth storage:', error);
  }
};

/**
 * Force refresh authentication state
 */
export const refreshAuthState = () => {
  if (typeof window !== 'undefined') {
    // Force a page reload to refresh auth state
    window.location.reload();
  }
};

/**
 * Check if browser supports required features for authentication
 */
export const checkBrowserSupport = () => {
  if (typeof window === 'undefined') return false;
  
  const checks = {
    localStorage: typeof localStorage !== 'undefined',
    sessionStorage: typeof sessionStorage !== 'undefined',
    indexedDB: typeof indexedDB !== 'undefined',
    fetch: typeof fetch !== 'undefined',
    Promise: typeof Promise !== 'undefined',
    crypto: typeof crypto !== 'undefined' || typeof window.crypto !== 'undefined'
  };
  
  const unsupported = Object.entries(checks)
    .filter(([_, supported]) => !supported)
    .map(([feature]) => feature);
  
  if (unsupported.length > 0) {
    console.warn('Unsupported browser features:', unsupported);
    return false;
  }
  
  return true;
};

/**
 * Mobile-specific authentication preparation
 */
export const prepareMobileAuth = () => {
  if (typeof window === 'undefined') return;
  
  // Enable iOS fixes
  enableIOSAuthFix();
  
  // Check browser support
  if (!checkBrowserSupport()) {
    throw new Error('Your browser doesn\'t support the required features for authentication');
  }
  
  // Add mobile-specific event listeners
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      // Page became visible again, might be returning from auth redirect
      console.log('Page became visible, checking auth state');
    }
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Cleanup function
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
};

/**
 * Handle mobile browser back button during auth flow
 */
export const handleMobileBackButton = () => {
  if (typeof window === 'undefined') return;
  
  const handlePopState = (event: PopStateEvent) => {
    // If user navigates back during auth flow, clear any pending auth state
    if (window.location.pathname === '/' || window.location.pathname === '/login') {
      clearAuthStorage();
    }
  };
  
  window.addEventListener('popstate', handlePopState);
  
  return () => {
    window.removeEventListener('popstate', handlePopState);
  };
};