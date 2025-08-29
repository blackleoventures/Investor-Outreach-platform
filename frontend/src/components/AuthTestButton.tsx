"use client";

import { useState, useEffect } from 'react';
import { detectBrowserEnvironment, isAuthSupported } from '@/lib/auth-utils';
import { checkBrowserSupport, clearAuthStorage } from '@/lib/mobile-auth-fix';

export default function AuthTestButton() {
  const [testResults, setTestResults] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const runAuthTests = () => {
    const browserInfo = detectBrowserEnvironment();
    const authSupported = isAuthSupported();
    const browserSupport = checkBrowserSupport();
    
    const results = {
      browserInfo,
      authSupported,
      browserSupport,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      cookiesEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      localStorage: {
        available: typeof localStorage !== 'undefined',
        quota: (() => {
          try {
            const test = 'test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return 'Working';
          } catch (e) {
            return 'Blocked or Full';
          }
        })()
      },
      sessionStorage: {
        available: typeof sessionStorage !== 'undefined',
        quota: (() => {
          try {
            const test = 'test';
            sessionStorage.setItem(test, test);
            sessionStorage.removeItem(test);
            return 'Working';
          } catch (e) {
            return 'Blocked or Full';
          }
        })()
      }
    };
    
    setTestResults(results);
    setShowResults(true);
    console.log('Auth Test Results:', results);
  };

  const clearStorage = () => {
    clearAuthStorage();
    alert('Auth storage cleared! Please refresh the page.');
  };

  if (!mounted || process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="flex flex-col gap-2">
        <button
          onClick={runAuthTests}
          className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
        >
          Test Auth
        </button>
        
        <button
          onClick={clearStorage}
          className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700"
        >
          Clear Storage
        </button>
      </div>
      
      {showResults && testResults && (
        <div className="absolute bottom-20 left-0 bg-black/95 text-white p-4 rounded-lg text-xs max-w-md max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">Auth Test Results</h3>
            <button
              onClick={() => setShowResults(false)}
              className="text-red-400 hover:text-red-300"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-2">
            <div>
              <strong>Browser:</strong> {testResults.browserInfo.browser}
              {testResults.browserInfo.isMobile && ' (Mobile)'}
            </div>
            
            <div>
              <strong>Auth Method:</strong> {testResults.browserInfo.recommendedMethod}
            </div>
            
            <div>
              <strong>Popup Support:</strong> {testResults.browserInfo.supportsPopup ? '✅' : '❌'}
            </div>
            
            <div>
              <strong>Auth Supported:</strong> {testResults.authSupported ? '✅' : '❌'}
            </div>
            
            <div>
              <strong>Browser Support:</strong> {testResults.browserSupport ? '✅' : '❌'}
            </div>
            
            <div>
              <strong>Cookies:</strong> {testResults.cookiesEnabled ? '✅' : '❌'}
            </div>
            
            <div>
              <strong>Online:</strong> {testResults.onLine ? '✅' : '❌'}
            </div>
            
            <div>
              <strong>LocalStorage:</strong> {testResults.localStorage.quota}
            </div>
            
            <div>
              <strong>SessionStorage:</strong> {testResults.sessionStorage.quota}
            </div>
            
            <details className="mt-2">
              <summary className="cursor-pointer">Full Results</summary>
              <pre className="text-xs mt-1 whitespace-pre-wrap break-all opacity-70">
                {JSON.stringify(testResults, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}