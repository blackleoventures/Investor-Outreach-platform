"use client";

import { useState, useEffect } from 'react';
import { detectBrowserEnvironment, isAuthSupported } from '@/lib/auth-utils';

export default function AuthDebugInfo() {
  const [browserInfo, setBrowserInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Only show in development
    if (process.env.NODE_ENV === 'development') {
      setBrowserInfo({
        ...detectBrowserEnvironment(),
        authSupported: isAuthSupported(),
        userAgent: navigator.userAgent
      });
    }
  }, []);

  if (!mounted || process.env.NODE_ENV !== 'development' || !browserInfo) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setShowDebug(!showDebug)}
        className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
      >
        Debug Auth
      </button>
      
      {showDebug && (
        <div className="absolute bottom-10 right-0 bg-black/90 text-white p-4 rounded-lg text-xs max-w-sm">
          <h3 className="font-bold mb-2">Browser Info</h3>
          <div className="space-y-1">
            <div>Mobile: {browserInfo.isMobile ? '✅' : '❌'}</div>
            <div>iOS: {browserInfo.isIOS ? '✅' : '❌'}</div>
            <div>Android: {browserInfo.isAndroid ? '✅' : '❌'}</div>
            <div>Browser: {browserInfo.browser}</div>
            <div>Supports Popup: {browserInfo.supportsPopup ? '✅' : '❌'}</div>
            <div>Recommended: {browserInfo.recommendedMethod}</div>
            <div>Auth Supported: {browserInfo.authSupported ? '✅' : '❌'}</div>
          </div>
          <details className="mt-2">
            <summary className="cursor-pointer">User Agent</summary>
            <div className="text-xs mt-1 break-all opacity-70">
              {browserInfo.userAgent}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}