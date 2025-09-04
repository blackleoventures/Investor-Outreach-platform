"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

import { useRouter } from "next/navigation";
import Image from "next/image";
import AuthDebugInfo from "@/components/AuthDebugInfo";
import AuthTestButton from "@/components/AuthTestButton";

export default function Home() {
  const { currentUser, login, loading, authError, retryLogin, clearError } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (currentUser && !loading) {
      console.log('User authenticated, redirecting to dashboard');
      router.replace("/dashboard");
    }
  }, [currentUser, loading, router]);

  const handleLogin = async () => {
    try {
      await login();
      // The redirect will be handled by the useEffect above
    } catch (error) {
      console.error("Login failed:", error);
      // Error will be handled by AuthContext and shown via authError
    }
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0f1a] via-[#0b1220] to-[#0a0f1a]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-white text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Show loading spinner during auth check
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0f1a] via-[#0b1220] to-[#0a0f1a]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-white text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is logged in, don't show login page (redirect will happen)
  if (currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0f1a] via-[#0b1220] to-[#0a0f1a]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-white text-sm">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0f1a] via-[#0b1220] to-[#0a0f1a] px-4">
      <div className="bg-black/70 backdrop-blur-md p-6 sm:p-8 rounded-2xl shadow-2xl max-w-md w-full border border-gray-800">
        <div className="text-center mb-8">
          <div className="mb-6">
            <div className="mx-auto w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-lg">
              <Image src="/logo.png" alt="Logo" width={80} height={80} className="w-20 h-20 object-contain" priority />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Welcome back
          </h1>
          <p className="text-gray-300">
            Sign in to access your investor outreach platform
          </p>
        </div>

        {authError && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
            <div className="text-center mb-2">{authError}</div>
            <div className="flex gap-2 justify-center">
              <button
                onClick={retryLogin}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs transition-colors"
              >
                Retry
              </button>
              <button
                onClick={clearError}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-xs transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-white hover:bg-gray-100 disabled:bg-gray-300 disabled:cursor-not-allowed text-black font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-xl transition duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl text-sm sm:text-base hover:scale-105 transform"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Image src="/google.png" alt="Google" width={24} height={24} className="w-6 h-6" />
          )}
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </button>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Having trouble? Try refreshing the page or using a different browser
          </p>
        </div>
      </div>
      
      <AuthDebugInfo />
      <AuthTestButton />
    </div>
  );
}
