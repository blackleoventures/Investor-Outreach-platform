/**
 * Authentication utilities for better mobile browser support
 */

export interface BrowserInfo {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  isEdge: boolean;
  browser: string;
  supportsPopup: boolean;
  recommendedMethod: 'popup' | 'redirect';
}

/**
 * Detect browser environment and capabilities
 */
export const detectBrowserEnvironment = (): BrowserInfo => {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isIOS: false,
      isAndroid: false,
      isSafari: false,
      isChrome: false,
      isFirefox: false,
      isEdge: false,
      browser: 'unknown',
      supportsPopup: false,
      recommendedMethod: 'redirect'
    };
  }
  
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(userAgent);
  const isIOS = /ipad|iphone|ipod/.test(userAgent);
  const isAndroid = /android/.test(userAgent);
  const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
  const isChrome = /chrome/.test(userAgent);
  const isFirefox = /firefox/.test(userAgent);
  const isEdge = /edge/.test(userAgent);
  
  let browser = 'unknown';
  if (isChrome) browser = 'chrome';
  else if (isSafari) browser = 'safari';
  else if (isFirefox) browser = 'firefox';
  else if (isEdge) browser = 'edge';
  
  // Determine popup support and recommended method
  let supportsPopup = true;
  let recommendedMethod: 'popup' | 'redirect' = 'popup';
  
  if (isMobile) {
    // Most mobile browsers work better with redirect
    recommendedMethod = 'redirect';
    
    // Some mobile browsers have issues with popups
    if (isIOS && !isSafari) {
      // iOS non-Safari browsers (like Chrome on iOS) sometimes support popup
      supportsPopup = true;
      recommendedMethod = 'popup';
    } else if (isAndroid && isChrome) {
      // Android Chrome usually supports popup
      supportsPopup = true;
      recommendedMethod = 'popup';
    } else {
      // Default mobile behavior
      supportsPopup = false;
      recommendedMethod = 'redirect';
    }
  }
  
  return {
    isMobile,
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    isFirefox,
    isEdge,
    browser,
    supportsPopup,
    recommendedMethod
  };
};

/**
 * Get user-friendly error messages for authentication errors
 */
export const getAuthErrorMessage = (errorCode: string, browserInfo: BrowserInfo): string => {
  switch (errorCode) {
    case 'auth/popup-blocked':
      return 'Popup was blocked by your browser. Please allow popups for this site or try again.';
    
    case 'auth/popup-closed-by-user':
      return 'Sign-in was cancelled. Please try again.';
    
    case 'auth/operation-not-supported-in-this-environment':
      if (browserInfo.isIOS && !browserInfo.isSafari) {
        return 'Please use Safari browser for Google Sign-in on iOS, or try opening in a new tab.';
      }
      return 'This browser doesn\'t support Google Sign-in. Please try Chrome, Firefox, or Safari.';
    
    case 'auth/web-storage-unsupported':
      return 'Your browser doesn\'t support web storage. Please enable cookies and local storage.';
    
    case 'auth/operation-not-allowed':
      return 'Google Sign-in is not enabled. Please contact support.';
    
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for Google Sign-in.';
    
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection and try again.';
    
    case 'auth/internal-error':
      return 'An internal error occurred. Please try again.';
    
    default:
      return `Authentication failed: ${errorCode}. Please try again or contact support.`;
  }
};

/**
 * Check if the current environment supports authentication
 */
export const isAuthSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    // Check for required APIs
    const hasLocalStorage = typeof localStorage !== 'undefined';
    const hasSessionStorage = typeof sessionStorage !== 'undefined';
    const hasIndexedDB = typeof indexedDB !== 'undefined';
    
    return hasLocalStorage && hasSessionStorage && hasIndexedDB;
  } catch (error) {
    return false;
  }
};

/**
 * Get recommended authentication settings for the current browser
 */
export const getAuthSettings = (browserInfo: BrowserInfo) => {
  return {
    persistence: browserInfo.isMobile ? 'local' : 'session',
    method: browserInfo.recommendedMethod,
    customParameters: {
      prompt: 'select_account',
      ...(browserInfo.isMobile && { display: 'popup' })
    }
  };
};