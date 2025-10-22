"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  Users,
  List,
  Plus,
  X,
  Mail,
  UserPlus,
  TrendingUp,
  Activity,
} from "lucide-react";
import dynamic from "next/dynamic";
import { Button, Form, Input } from "antd";
import { useRouter } from "next/navigation";
import { createStyles } from "antd-style";

const MonthlyEmailBarChart = dynamic(() => import("@/components/charts/MonthlyEmailBarChart"), { ssr: false });
const EmailDistributionPie = dynamic(() => import("@/components/charts/EmailDistributionPie"), { ssr: false });
const Modal = dynamic(async () => (await import("antd")).Modal, { ssr: false });
const Spin = dynamic(async () => (await import("antd")).Spin, { ssr: false });

let lazyAxios: typeof import("axios") | null = null;
let lazySwal: typeof import("sweetalert2") | null = null;

const mockChartData = [
  { name: "Jan", emails: 3000 },
  { name: "Feb", emails: 4500 },
  { name: "Mar", emails: 10000 },
  { name: "Apr", emails: 0 },
  { name: "May", emails: 0 },
  { name: "Jun", emails: 6000 },
  { name: "Jul", emails: 0 },
  { name: "Aug", emails: 0 },
  { name: "Sep", emails: 0 },
  { name: "Oct", emails: 0 },
  { name: "Nov", emails: 0 },
  { name: "Dec", emails: 2000 },
];

const clientDistributionData = [
  { name: "Corporate", value: 400 },
  { name: "Individual", value: 300 },
  { name: "Government", value: 300 },
];

const useStyle = createStyles(({ token }) => ({
  "my-modal-body": { padding: token.paddingSM },
  "my-modal-mask": { boxShadow: `inset 0 0 15px #fff` },
  "my-modal-header": { borderBottom: `1px dotted ${token.colorPrimary}` },
  "my-modal-footer": { color: token.colorPrimary },
  "my-modal-content": { border: "1px solid #333" },
}));

const StatsCard = React.memo(({ title, count, icon: Icon, trend, trendPositive, classNames }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2 }}
    whileHover={{ y: -8, scale: 1.05 }}
    whileTap={{ scale: 0.98 }}
    className={`p-6 rounded-2xl cursor-pointer ${classNames || ""}`}
  >
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm opacity-90 font-medium">{title}</div>
        <div className="text-3xl font-bold mt-2">{count}</div>
        {trend && (
          <div className={`text-sm mt-2 font-semibold ${trendPositive ? "text-green-200" : "text-red-200"}`}>
            {trend}
          </div>
        )}
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
  const [form] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState([false, false]);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { styles } = useStyle();
  const { currentUser, loading: authLoading } = useAuth();

  type ClientDistributionItem = { name: string; value: number };
  const [stats, setStats] = useState<{
    totalClients: number;
    totalInvestors: number;
    totalIncubators: number;
    sentEmails: number;
    responded: number;
    responseRate: number;
    clientDistribution: ClientDistributionItem[];
    performanceData?: typeof mockChartData;
  }>({
    totalClients: 0,
    totalInvestors: 0,
    totalIncubators: 0,
    sentEmails: 0,
    responded: 0,
    responseRate: 0,
    clientDistribution: [],
  });

  const classNames = {
    body: styles["my-modal-body"],
    mask: styles["my-modal-mask"],
    header: styles["my-modal-header"],
  };

  const modalStyles = {
    header: { borderRadius: 0, paddingInlineStart: 5 },
    body: { borderRadius: 5, padding: "10px" },
    mask: { backdropFilter: "blur(10px)" },
  };

  const toggleModal = useCallback((idx: number, target: boolean) => {
    setIsOpen(false);
    setIsModalOpen((p) => {
      const newState = [...p];
      newState[idx] = target;
      return newState;
    });
  }, []);

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
          performanceData: data.stats.performanceData || mockChartData,
          clientDistribution: data.stats.clientDistribution || clientDistributionData,
        });
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.error("Error loading stats:", err);
      setStats({
        totalClients: 0,
        totalInvestors: 0,
        totalIncubators: 0,
        sentEmails: 0,
        responded: 0,
        responseRate: 0,
        performanceData: mockChartData,
        clientDistribution: clientDistributionData,
      });
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Spin tip="Loading" size="large">Dashboard Loading...</Spin>
      </div>
    );
  }

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
          <Button
            type="primary"
            size="large"
            icon={<Plus size={18} />}
            className="bg-gradient-to-r from-orange-500 to-red-600 border-0 shadow-lg px-8 py-2 h-12"
            onClick={() => setIsOpen(true)}
          >
            Create New
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8"
        >
          <StatsCard
            title="Total Clients"
            count={stats.totalClients || 0}
            icon={Users}
            trend="+12.5%"
            trendPositive={true}
            classNames="bg-gradient-to-br from-emerald-500 to-green-600 text-white"
          />
          <StatsCard
            title="Total Investors"
            count={stats.totalInvestors || 0}
            icon={UserPlus}
            trend="+15.3%"
            trendPositive={true}
            classNames="bg-gradient-to-br from-cyan-500 to-blue-600 text-white"
          />
          <StatsCard
            title="Total Incubators"
            count={stats.totalIncubators || 0}
            icon={List}
            trend="+8.2%"
            trendPositive={true}
            classNames="bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
          />
          <StatsCard
            title="Sent Emails"
            count={stats.sentEmails || 0}
            icon={Mail}
            trend="+22.7%"
            trendPositive={true}
            classNames="bg-gradient-to-br from-purple-500 to-pink-600 text-white"
          />
          <StatsCard
            title="Responded"
            count={stats.responded || 0}
            icon={TrendingUp}
            trend="+5.8%"
            trendPositive={true}
            classNames="bg-gradient-to-br from-orange-500 to-red-600 text-white"
          />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">Email Monthly Report</h2>
            </div>
            <MonthlyEmailBarChart data={stats.performanceData || mockChartData} />
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">Email Performance Report</h2>
            </div>
            <EmailDistributionPie
              data={[
                {
                  name: "Emails Sent",
                  value: stats.sentEmails || 0,
                  color: "#4285F4",
                },
                {
                  name: "Delivered",
                  value: Math.floor((stats.sentEmails || 0) * 0.85),
                  color: "#34A853",
                },
                {
                  name: "Replied",
                  value: stats.responded || 0,
                  color: "#EA4335",
                },
              ]}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default function Page() {
  return <Profile />;
}
