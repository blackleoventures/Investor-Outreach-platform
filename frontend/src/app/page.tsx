"use client";

import { useEffect, useState, FormEvent } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useRouter } from "next/navigation";

import { Mail, Lock, User, Shield, Loader2 } from "lucide-react";
import Image from "next/image";

export default function Home() {
  const { currentUser, loginWithGoogle, loginWithEmail, loading } = useAuth();
  const { push: navigate } = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"client" | "member">("client");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (currentUser && !loading) {
      console.log("User authenticated, redirecting to dashboard");
      navigate("/dashboard");
    }
  }, [currentUser, loading, navigate]);

  const handleGoogleLogin = async () => {
    try {
      setIsLoggingIn(true);
      await loginWithGoogle();
    } catch (error) {
      console.error("Google login failed:", error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleEmailLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !password) {
      return;
    }

    try {
      setIsLoggingIn(true);
      await loginWithEmail(email, password);
    } catch (error) {
      console.error("Email login failed:", error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-white text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Show loading spinner during auth check
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-white text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is logged in, don't show login page (redirect will happen)
  if (currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-white text-sm">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="bg-white/10 backdrop-blur-lg p-8 rounded-2xl shadow-2xl max-w-md w-full border border-white/20">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mb-6">
            <div className="mx-auto w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-lg">
              <Image
                src="/logo.png"
                alt="Logo"
                width={80}
                height={80}
                className="w-20 h-20 object-contain"
                priority
              />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-white/5 rounded-lg p-1 mb-6">
          <button
            onClick={() => setActiveTab("client")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
              activeTab === "client"
                ? "bg-blue-600 text-white shadow-lg"
                : "text-gray-300 hover:text-white hover:bg-white/10"
            }`}
            data-testid="client-tab"
          >
            <User className="w-4 h-4" />
            Client Area
          </button>
          <button
            onClick={() => setActiveTab("member")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
              activeTab === "member"
                ? "bg-purple-600 text-white shadow-lg"
                : "text-gray-300 hover:text-white hover:bg-white/10"
            }`}
            data-testid="member-tab"
          >
            <Shield className="w-4 h-4" />
            Member Area
          </button>
        </div>

        {/* Client Area Tab */}
        {activeTab === "client" && (
          <div className="space-y-6" data-testid="client-area">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-white mb-2">
                Client Sign In
              </h2>
              <p className="text-gray-300 text-sm mb-6">
                Access your client dashboard with Google
              </p>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              className="w-full bg-white hover:bg-gray-100 disabled:bg-gray-300 disabled:cursor-not-allowed text-black font-semibold py-4 px-6 rounded-xl transition duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:scale-105 transform"
              data-testid="google-signin-btn"
            >
              {isLoggingIn ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              {isLoggingIn ? "Signing in..." : "Sign in with Google"}
            </button>
          </div>
        )}

        {/* Member Area Tab */}
        {activeTab === "member" && (
          <div className="space-y-6" data-testid="member-area">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-white mb-2">
                Member Sign In
              </h2>
              <p className="text-gray-300 text-sm mb-6">
                Team members and administrators only
              </p>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  required
                  data-testid="email-input"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  required
                  data-testid="password-input"
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn || !email || !password}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:scale-105 transform"
                data-testid="member-signin-btn"
              >
                {isLoggingIn ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Shield className="w-5 h-5" />
                )}
                {isLoggingIn ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="text-center">
              <p className="text-xs text-gray-400">
                Only admin and subadmin accounts can access this area
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Having trouble? Contact support for assistance
          </p>
        </div>
      </div>
    </div>
  );
}
