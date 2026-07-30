"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  Users,
  List,
  Mail,
  UserPlus,
  TrendingUp,
  Activity,
} from "lucide-react";
import dynamic from "next/dynamic";

const MonthlyEmailBarChart = dynamic(() => import("@/components/charts/MonthlyEmailBarChart"), { ssr: false });
const EmailDistributionPie = dynamic(() => import("@/components/charts/EmailDistributionPie"), { ssr: false });
const Spin = dynamic(async () => (await import("antd")).Spin, { ssr: false });

type ChartPoint = { name: string; emails: number };

const StatsCard = React.memo(({ title, count, icon: Icon, classNames }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2 }}
    className={`p-6 rounded-2xl ${classNames || ""}`}
  >
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm opacity-90 font-medium">{title}</div>
        <div className="text-3xl font-bold mt-2">{count}</div>
      </div>
      {Icon && (
        <div className="bg-white/20 p-3 rounded-xl">
          <Icon size={28} className="text-white" />
        </div>
      )}
    </div>
  </motion.div>
));

const Profile = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentUser, loading: authLoading } = useAuth();

  type ClientDistributionItem = { name: string; value: number };
  const [stats, setStats] = useState<{
    totalClients: number;
    totalInvestors: number;
    totalIncubators: number;
    sentEmails: number;
    delivered?: number;
    responded: number;
    responseRate: number;
    clientDistribution: ClientDistributionItem[];
    performanceData?: ChartPoint[];
  }>({
    totalClients: 0,
    totalInvestors: 0,
    totalIncubators: 0,
    sentEmails: 0,
    responded: 0,
    responseRate: 0,
    clientDistribution: [],
  });

  const getAuthToken = useCallback(async () => {
    if (!currentUser) return null;
    try {
      return await currentUser.getIdToken();
    } catch {
      return null;
    }
  }, [currentUser]);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error("User not authenticated");
      }
      const response = await fetch("/api/dashboard/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.stats) {
        setStats({
          ...data.stats,
          performanceData: data.stats.performanceData || [],
          clientDistribution: data.stats.clientDistribution || [],
        });
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.error("Error loading stats:", err);
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [getAuthToken]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Spin tip="Loading" size="large">Authenticating...</Spin>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-lg mb-4">User not authenticated</p>
          <p className="text-gray-600">Please log in to access the dashboard</p>
        </div>
      </div>
    );
  }

  const performanceData = [
    {
      name: "Emails Sent",
      value: stats.sentEmails || 0,
      color: "#4f46e5",
    },
    ...(typeof stats.delivered === "number"
      ? [{ name: "Delivered", value: stats.delivered, color: "#16a34a" }]
      : []),
    {
      name: "Replied",
      value: stats.responded || 0,
      color: "#dc2626",
    },
  ];

  return (
    <div className="min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 text-base">Overview of your investor outreach platform</p>
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Spin size="small" />
              <span>Refreshing...</span>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="font-semibold text-red-700">Failed to load dashboard data</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
            <button
              onClick={loadStats}
              className="self-start sm:self-auto inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-white hover:bg-brand-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6 mb-8"
        >
          <StatsCard
            title="Total Clients"
            count={(stats.totalClients || 0).toLocaleString()}
            icon={Users}
            classNames="bg-gradient-to-br from-brand-500 to-brand-700 text-white"
          />
          <StatsCard
            title="Total Investors"
            count={(stats.totalInvestors || 0).toLocaleString()}
            icon={UserPlus}
            classNames="bg-gradient-to-br from-brand-500 to-brand-700 text-white"
          />
          <StatsCard
            title="Total Incubators"
            count={(stats.totalIncubators || 0).toLocaleString()}
            icon={List}
            classNames="bg-gradient-to-br from-brand-500 to-brand-700 text-white"
          />
          <StatsCard
            title="Sent Emails"
            count={(stats.sentEmails || 0).toLocaleString()}
            icon={Mail}
            classNames="bg-gradient-to-br from-brand-500 to-brand-700 text-white"
          />
          <StatsCard
            title="Responded"
            count={(stats.responded || 0).toLocaleString()}
            icon={TrendingUp}
            classNames="bg-gradient-to-br from-brand-500 to-brand-700 text-white"
          />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-brand-100 rounded-lg">
                <Activity className="w-5 h-5 text-brand-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">Email Monthly Report</h2>
            </div>
            <MonthlyEmailBarChart data={stats.performanceData || []} />
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-brand-100 rounded-lg">
                <Users className="w-5 h-5 text-brand-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">Email Performance Report</h2>
            </div>
            <EmailDistributionPie data={performanceData} />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default function Page() {
  return <Profile />;
}
