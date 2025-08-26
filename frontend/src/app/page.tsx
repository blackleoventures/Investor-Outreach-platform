"use client";

import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import auth from "../legacy_src/firebase/firebase.init";
import { useEffect } from "react";
import { useAuth } from "../legacy_src/Context/AuthContext";
import { Spin } from "antd";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const provider = new GoogleAuthProvider();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/dashboard/manage-client");
    }
  }, [loading, isAuthenticated, router]);

  if (loading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spin tip="Redirecting..." size="large" />
      </div>
    );
  }

  const handleGoogleSignIn = () => {
    signInWithPopup(auth, provider)
      .then(() => {
        router.push("/dashboard");
      })
      .catch((error) => {
        console.log(error);
      });
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-300 to-slate-600">
      <div className="bg-white shadow-2xl rounded-xl p-8 max-w-sm w-full text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Welcome Back!</h1>
        <p className="text-gray-500 mb-4">Sign in to continue</p>

        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center bg-blue-500 text-white font-medium p-3 rounded-lg shadow-md hover:bg-red-600 transition-all duration-300"
        >
          Continue with Google
        </button>

        <div className="mt-6 text-gray-500 text-sm">
          Don&apos;t have an account? <a href="#" className="text-blue-500 hover:underline">Sign up</a>
        </div>
      </div>
    </div>
  );
}
