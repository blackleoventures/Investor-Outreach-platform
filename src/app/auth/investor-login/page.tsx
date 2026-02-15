"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Spin, Result, Button, message } from "antd";
import { LoadingOutlined } from "@ant-design/icons";

export default function InvestorLoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [status, setStatus] = useState<"loading" | "error" | "success">("loading");
    const [errorMessage, setErrorMessage] = useState("Verifying your access...");

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setErrorMessage("Invalid Link: No access token provided.");
            return;
        }

        const verifyAndLogin = async () => {
            try {
                // 1. Verify Token with Backend
                const response = await fetch("/api/auth/verify-magic-link", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Verification failed");
                }

                // 2. Sign in with Firebase Custom Token
                await signInWithCustomToken(auth, data.customToken);

                // Set session flag for link-only access
                if (typeof window !== "undefined") {
                    sessionStorage.setItem('dealRoomAccess', 'granted');
                }

                setStatus("success");
                message.success("Login successful! Redirecting...");

                // 3. Redirect to Deal Room
                setTimeout(() => {
                    router.push("/dashboard/deal-room");
                }, 1500);

            } catch (error: any) {
                console.error("Login Error:", error);
                setStatus("error");
                setErrorMessage(error.message || "Failed to log you in. Please try again.");
            }
        };

        verifyAndLogin();
    }, [token, router]);

    if (status === "loading") {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
                <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
                <h2 className="mt-6 text-xl font-semibold text-gray-700">Accessing Deal Room...</h2>
                <p className="text-gray-500">Verifying your secure invitation.</p>
            </div>
        );
    }

    if (status === "error") {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
                <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
                    <Result
                        status="error"
                        title="Access Denied"
                        subTitle={errorMessage}
                        extra={[
                            <Button type="primary" key="home" onClick={() => router.push("/")}>
                                Go Home
                            </Button>,
                        ]}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-green-50 p-4">
            <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
            <h2 className="mt-6 text-xl font-semibold text-green-700">Welcome Back!</h2>
            <p className="text-gray-500">Redirecting to your dashboard...</p>
        </div>
    );
}
