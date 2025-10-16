"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { message } from "antd";

interface UserData {
  uid: string;
  email: string;
  displayName: string;
  role: "client" | "admin" | "subadmin";
  photoURL?: string;
  active?: boolean;
  createdAt: any;
  lastLogin: any;
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Helper functions for cookies
const setCookie = (name: string, value: string, days: number) => {
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
};

const deleteCookie = (name: string) => {
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (
    uid: string,
    retryCount = 0
  ): Promise<UserData | null> => {
    try {
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data() as UserData;
        setUserData(data);
        // Set cookie immediately when user data is fetched
        setCookie("userRole", data.role, 7);
        console.log("User data fetched and cookie set:", data.role);
        return data;
      }

      if (retryCount < 2) {
        console.log(
          `User document not found, retrying... (${retryCount + 1}/2)`
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return fetchUserData(uid, retryCount + 1);
      }

      return null;
    } catch (error: any) {
      console.error("Error fetching user data:", error);

      if (error.code === "permission-denied" && retryCount < 2) {
        console.log(`Permission denied, retrying... (${retryCount + 1}/2)`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return fetchUserData(uid, retryCount + 1);
      }

      return null;
    }
  };

  const createOrUpdateUser = async (
    user: User,
    role?: "client" | "admin" | "subadmin"
  ) => {
    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      const timestamp = new Date().toISOString();

      if (userDoc.exists()) {
        const existingData = userDoc.data() as UserData;
        const updatedData: UserData = {
          ...existingData,
          lastLogin: timestamp,
          displayName: user.displayName || existingData.displayName,
          photoURL: user.photoURL || existingData.photoURL || "",
        };

        await setDoc(userDocRef, updatedData, { merge: true });
        setUserData(updatedData);

        // Set cookie immediately
        setCookie("userRole", existingData.role, 7);
        console.log("Cookie set for existing user:", existingData.role);

        return updatedData;
      }

      const userData: UserData = {
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || "",
        role: role || "client",
        photoURL: user.photoURL || "",
        active: true,
        createdAt: timestamp,
        lastLogin: timestamp,
      };

      await setDoc(userDocRef, userData);
      setUserData(userData);

      // Set cookie immediately
      setCookie("userRole", userData.role, 7);
      console.log("Cookie set for new user:", userData.role);

      return userData;
    } catch (error) {
      console.error("Error creating/updating user:", error);
      throw new Error("Failed to save user information");
    }
  };

  async function loginWithGoogle() {
    try {
      await setPersistence(auth, browserLocalPersistence);
      const provider = new GoogleAuthProvider();
      provider.addScope("email");
      provider.addScope("profile");

      const result = await signInWithPopup(auth, provider);

      // Create/update user and wait for it to complete
      await createOrUpdateUser(result.user, "client");

      // Small delay to ensure cookie is set
      await new Promise((resolve) => setTimeout(resolve, 100));

      message.success("Welcome! You have successfully signed in.");
    } catch (error: any) {
      console.error("Google login error:", error);

      if (error.code === "auth/popup-closed-by-user") {
        message.warning("Sign in was cancelled. Please try again.");
      } else if (error.code === "auth/popup-blocked") {
        message.error(
          "Pop-up was blocked by your browser. Please allow pop-ups and try again."
        );
      } else if (error.code === "auth/cancelled-popup-request") {
        // Silent
      } else if (error.code === "auth/network-request-failed") {
        message.error("Network error. Please check your internet connection.");
      } else {
        message.error(
          "Unable to sign in at the moment. Please try again later."
        );
      }
      throw error;
    }
  }

  async function loginWithEmail(email: string, password: string) {
    try {
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithEmailAndPassword(auth, email, password);

      await new Promise((resolve) => setTimeout(resolve, 500));

      const data = await fetchUserData(result.user.uid);

      if (!data) {
        await signOut(auth);
        deleteCookie("userRole");
        message.error("Account not found. Please contact administrator.");
        throw new Error("User data not found");
      }

      if (data.role !== "admin" && data.role !== "subadmin") {
        await signOut(auth);
        deleteCookie("userRole");
        message.error("Access denied. This area is for team members only.");
        throw new Error("Unauthorized role");
      }

      if (data.active === false) {
        await signOut(auth);
        deleteCookie("userRole");
        message.error(
          "Your account has been deactivated. Please contact administrator."
        );
        throw new Error("Account deactivated");
      }

      await createOrUpdateUser(result.user, data.role);

      message.success(`Welcome back, ${data.displayName || "Team Member"}!`);
    } catch (error: any) {
      console.error("Email login error:", error);

      if (
        error.message === "User data not found" ||
        error.message === "Unauthorized role" ||
        error.message === "Account deactivated"
      ) {
        throw error;
      }

      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/user-not-found"
      ) {
        message.error(
          "Invalid email or password. Please check your credentials."
        );
      } else if (error.code === "auth/too-many-requests") {
        message.error("Too many failed attempts. Please try again later.");
      } else if (error.code === "auth/network-request-failed") {
        message.error("Network error. Please check your internet connection.");
      } else if (error.code === "auth/invalid-email") {
        message.error("Please enter a valid email address.");
      } else {
        message.error("Unable to sign in. Please try again.");
      }
      throw error;
    }
  }

  async function logout() {
    try {
      await signOut(auth);
      setUserData(null);

      // Clear role cookie
      deleteCookie("userRole");
      console.log("Cookie cleared on logout");

      message.success("You have been signed out successfully.");
    } catch (error) {
      console.error("Logout error:", error);
      message.error("Unable to sign out. Please try again.");
      throw error;
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        const data = await fetchUserData(user.uid);
        if (data) {
          // Cookie is already set in fetchUserData
          console.log(
            "Auth state changed - user logged in with role:",
            data.role
          );
        }
      } else {
        setUserData(null);
        deleteCookie("userRole");
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userData,
    loading,
    loginWithGoogle,
    loginWithEmail,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
