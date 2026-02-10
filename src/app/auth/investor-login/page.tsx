"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Spin, Result, Button, message } from "antd";
import { LoadingOutlined, RocketTwoTone } from "@ant-design/icons";
import { useAuth } from "@/contexts/AuthContext";


function LoginProcess() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const [status, setStatus] = useState<"loading" | "error" | "success">("loading");
    const [errorMsg, setErrorMsg] = useState("Verifying credentials...");

    // Check for existing session
    const { currentUser, userData, loading } = useAuth();

    // Effect 1: Handle Redirect if already logged in
    useEffect(() => {
        if (!loading && currentUser && userData?.role === 'investor') {
            router.push("/dashboard/deal-room");
        }
    }, [currentUser, userData, loading, router]);

    // Effect 2: Handle Token Login
    useEffect(() => {
        // If loading or already logged in, wait or skip
        if (loading || (currentUser && userData?.role === 'investor')) return;

        if (!token) {
            setStatus("error");
            setErrorMsg("No invitation token found in URL.");
            return;
        }

        const verifyAndLogin = async () => {
            try {
                // 1. Verify token with backend
                const res = await fetch("/api/auth/investor-login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token }),
                });

                const data = await res.json();

                if (!data.success) {
                    throw new Error(data.error || "Login failed");
                }

                // 2. Sign in with Custom Token
                await signInWithCustomToken(auth, data.customToken);

                setStatus("success");
                message.success("Welcome to the Deal Room!");

                // 3. Redirect
                setTimeout(() => {
                    router.push("/dashboard/deal-room");
                }, 1500);

            } catch (err: any) {
                console.error("Login error:", err);
                setStatus("error");
                setErrorMsg(err.message || "Authentication failed.");
            }
        };

        verifyAndLogin();
    }, [token, router, loading, currentUser, userData]);

    if (status === "loading" || (currentUser && userData?.role === 'investor')) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
                <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
                <h2 className="mt-6 text-xl font-medium text-gray-700">Accessing Deal Room...</h2>
                <p className="text-gray-500">Verifying specific detailed information...</p>
            </div>
        );
    }

    if (status === "error") {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
                <Result
                    status="error"
                    title="Access Denied"
                    subTitle={errorMsg}
                    extra={[
                        <Button type="primary" key="home" onClick={() => router.push("/")}>
                            Go to Home
                        </Button>,
                    ]}
                />
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Result
                icon={<RocketTwoTone twoToneColor="#52c41a" />}
                title="Access Granted!"
                subTitle="Redirecting you to the Deal Room..."
            />
        </div>
    );
}

export default function InvestorLoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <LoginProcess />
        </Suspense>
    )
}
