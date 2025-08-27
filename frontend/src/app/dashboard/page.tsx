"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Users, List, Briefcase, Plus, X, Mail, UserPlus, TrendingUp, Activity } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell } from "recharts";
// TODO: Replace with current fetch util or axios; keeping inline for now
const fetchData = async <T = any>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return (await res.json()) as T;
};
import { ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Button, Form, Input, Modal, Spin } from "antd";
import { useRouter } from "next/navigation";
// TODO: Re-add DemoBanner when present in current codebase
import Swal from "sweetalert2";
import axios from "axios";
import { createStyles } from "antd-style";
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL as string;

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

const emailDistributionData = [
  { name: "Email Sent", value: 85, color: "#4285F4" },
  { name: "Delivered", value: 32, color: "#34A853" },
  { name: "Replies", value: 5, color: "#EA4335" },
];

const useStyle = createStyles(({ token }) => ({
  "my-modal-body": {
    padding: token.paddingSM,
  },
  "my-modal-mask": {
    boxShadow: `inset 0 0 15px #fff`,
  },
  "my-modal-header": {
    borderBottom: `1px dotted ${token.colorPrimary}`,
  },
  "my-modal-footer": {
    color: token.colorPrimary,
  },
  "my-modal-content": {
    border: "1px solid #333",
  },
}));

const clientDistributionData = [
  { name: "Corporate", value: 400 },
  { name: "Individual", value: 300 },
  { name: "Government", value: 300 },
];

const API_ENDPOINTS = {
  STATS: `${BACKEND_URL}/stats`,
  EMAIL_STATS: `${BACKEND_URL}/email-stats`,
  CONTACT_LISTS: `${BACKEND_URL}/contact-lists`,
};

// Enhanced StatsCard with faster animations
const StatsCard = ({ title, count, icon: Icon, trend, trendPositive, classNames }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2 }}
    whileHover={{ y: -8, scale: 1.05 }}
    whileTap={{ scale: 0.98 }}
    className={`p-6 rounded-2xl cursor-pointer ${classNames || ''}`}
  >
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm opacity-90 font-medium">{title}</div>
        <div className="text-3xl font-bold mt-2">{count}</div>
        {trend && (
          <div className={`text-sm mt-2 font-semibold ${trendPositive ? 'text-green-200' : 'text-red-200'}`}>{trend}</div>
        )}
      </div>
      {Icon && (
        <div className="bg-white/20 p-3 rounded-xl">
          <Icon size={28} className="text-white" />
        </div>
      )}
    </div>
  </motion.div>
);

const Profile = () => {
  const [loading, setLoading] = useState(false);
  const [emailStatLoading, setEmailStatLoading] = useState(false);
  const [form] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState([false, false]);
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const { styles } = useStyle();
  const [emailStats, setEmailStats] = useState(null);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState({
    clients: 0,
    investorLists: 0,
    totalContacts: 0,
    clientDistribution: [],
  });

  const {
    user,
    loginTime,
    getTimeSinceLogin,
    loading: authLoading,
  } = useAuth();

  const [actualLoginTime, setActualLoginTime] = useState(null);

  useEffect(() => {
    if (user && !actualLoginTime) {
      const loginTimestamp =
        loginTime ||
        user.metadata?.lastSignInTime ||
        user.metadata?.creationTime ||
        user.lastLoginAt ||
        Date.now();

      setActualLoginTime(loginTimestamp);
      console.log("Login time set:", loginTimestamp, new Date(loginTimestamp));
    }
  }, [user, loginTime, actualLoginTime]);

  const formatLoginTime = useCallback((timestamp) => {
    if (!timestamp) return "Unknown";

    try {
      const loginDate = new Date(timestamp);

      if (isNaN(loginDate.getTime())) {
        return "Invalid date";
      }

      const now = new Date();
      const diffMs = now - loginDate;
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMinutes < 1) {
        return "Just now";
      } else if (diffMinutes < 60) {
        return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
      } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
      } else if (diffDays < 7) {
        return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
      } else {
        return loginDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    } catch (error) {
      console.error("Error formatting login time:", error);
      return "Unknown";
    }
  }, []);

  const getExactLoginTime = useCallback((timestamp) => {
    if (!timestamp) return "Login time not available";

    try {
      const loginDate = new Date(timestamp);

      if (isNaN(loginDate.getTime())) {
        return "Invalid login time";
      }

      return loginDate.toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "short",
      });
    } catch (error) {
      console.error("Error getting exact login time:", error);
      return "Error retrieving login time";
    }
  }, []);

  const classNames = {
    body: styles["my-modal-body"],
    mask: styles["my-modal-mask"],
    header: styles["my-modal-header"],
  };

  const modalStyles = {
    header: {
      borderRadius: 0,
      paddingInlineStart: 5,
    },
    body: {
      borderRadius: 5,
      padding: "10px",
    },
    mask: {
      backdropFilter: "blur(10px)",
    },
  };

  const toggleModal = useCallback((idx, target) => {
    setIsOpen(false);
    setIsModalOpen((p) => {
      const newState = [...p];
      newState[idx] = target;
      return newState;
    });
  }, []);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await fetchData(API_ENDPOINTS.STATS);
      setStats({
        ...data,
        performanceData: mockChartData,
        clientDistribution: clientDistributionData,
      });
    } catch (err) {
      console.error("Error loading stats:", err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setStats({
        clients: 0,
        investorLists: 0,
        totalContacts: 0,
        performanceData: mockChartData,
        clientDistribution: clientDistributionData,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEmailStats = useCallback(async () => {
    setEmailStatLoading(true);
    try {
      const { data } = await fetchData(API_ENDPOINTS.EMAIL_STATS);
      setEmailStats(data.data);
    } catch (err) {
      console.error("Error loading email stats:", err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setEmailStatLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadEmailStats();
  }, [loadEmailStats]);

  const handleSave = async (values) => {
    try {
      const response = await axios.post(API_ENDPOINTS.CONTACT_LISTS, {
        listName: values.listName,
      });
      if (response.data.success) {
        toggleModal(0, false);
        form.resetFields();
        Swal.fire({
          title: "Contact List Added Successfully",
          icon: "success",
          confirmButtonText: "Close",
        });
        router.push(`/dashboard/${response.data.id}/type`);
      }
    } catch (error) {
      if (error.response?.status === 409) {
        Swal.fire({
          title: "Duplicate List Name",
          text: error.response.data.message,
          icon: "warning",
          confirmButtonText: "OK",
        });
      } else {
        console.error("Error saving list:", error);
        Swal.fire({
          title: "Error",
          text: "Failed to create contact list",
          icon: "error",
          confirmButtonText: "OK",
        });
      }
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Spin tip="Loading" size="large">
          Authenticating...
        </Spin>
      </div>
    );
  }

  if (!user) {
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
        <Spin tip="Loading" size="large">
          Dashboard Loading...
        </Spin>
      </div>
    );
  }

  const currentUser = user.providerData?.[0] || user;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="fixed top-4 left-4 z-50">
        <div className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="px-6 py-8 rounded-2xl mt-8 mb-4 mx-4 bg-white/80 backdrop-blur-sm shadow-xl border border-white/20"
      >
        <div className="mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center"
          >
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Welcome back
                  </h1>
                </div>
                <h2 className="text-xl font-semibold text-gray-700">
                  {currentUser?.displayName || currentUser?.email || "User"}
                </h2>
                <p className="mt-1 opacity-90 text-gray-600">Here's your business overview</p>
              </div>
            </div>
            <div className="mt-4 md:mt-0 flex flex-col-reverse sm:flex-col md:flex-row gap-3 md:items-center md:space-x-3">
              <div>
                <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.05 }}>
                  <Button
                    type="primary"
                    size="large"
                    className="bg-gradient-to-r from-orange-500 to-red-600 border-0 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold px-8 py-2 h-12"
                    icon={<Plus size={18} />}
                    onClick={() => setIsOpen(true)}
                  >
                    Create New
                  </Button>
                </motion.div>
              </div>
              <div className="flex items-center gap-3">
                <motion.div whileHover={{ scale: 1.05 }} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-500 flex items-center justify-center">
                  <span className="font-medium text-sm text-wrap sm:text-base text-white">
                    {(currentUser?.displayName || currentUser?.email || "U")[0].toUpperCase()}
                  </span>
                </motion.div>
                <div className="text-center sm:text-left">
                  <p className="font-medium text-sm sm:text-base">{currentUser?.email || "No email"}</p>
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm opacity-75">Last login: {formatLoginTime(actualLoginTime || loginTime)}</p>
                    {actualLoginTime || loginTime ? (
                      <p className="text-xs opacity-60 font-mono">{getExactLoginTime(actualLoginTime || loginTime)}</p>
                    ) : (
                      <p className="text-xs opacity-50 text-yellow-600">⚠️ Login time unavailable</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <Modal
          width={800}
          transitionName=""
          title={
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">Create New</span>
              <X
                size={18}
                className="cursor-pointer hover:text-gray-600"
                onClick={() => setIsOpen(false)}
              />
            </div>
          }
          open={isOpen}
          onCancel={() => setIsOpen(false)}
          footer={null}
          centered
          closeIcon={null}
          style={{
            top: 0,
            margin: 0,
            boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
          }}
          className="top-modal"
        >
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
              <motion.div
                whileHover={{ y: -6, scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="p-8 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-blue-300"
                role="button"
                tabIndex={0}
                onClick={() => router.push("/dashboard/select-campaign")}
              >
                <div className="bg-blue-500 p-3 rounded-xl mb-4 w-fit">
                  <Mail className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-800">Create Email Campaign</h3>
                <p className="text-gray-600 text-base leading-relaxed">Design and send targeted email campaigns to your audience</p>
              </motion.div>

              <motion.div
                whileHover={{ y: -6, scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="p-8 bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-green-300"
                role="button"
                onClick={() => toggleModal(0, true)}
                tabIndex={0}
              >
                <div className="bg-green-500 p-3 rounded-xl mb-4 w-fit">
                  <List className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-800">Add New Contacts</h3>
                <p className="text-gray-600 text-base leading-relaxed">Organize and manage your subscriber lists effectively</p>
              </motion.div>

              <motion.div
                whileHover={{ y: -6, scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="p-8 bg-gradient-to-br from-purple-50 to-pink-100 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-purple-300"
                role="button"
                tabIndex={0}
                onClick={() => router.push("/dashboard/add-client")}
              >
                <div className="bg-purple-500 p-3 rounded-xl mb-4 w-fit">
                  <UserPlus className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-800">Create a Client</h3>
                <p className="text-gray-600 text-base leading-relaxed">Add new clients and manage their profiles in your system</p>
              </motion.div>
            </div>
          </div>
        </Modal>

        <Modal
          title="Create Contact List"
          footer={false}
          open={isModalOpen[0]}
          onCancel={() => toggleModal(0, false)}
          classNames={classNames}
          styles={modalStyles}
        >
          <Form
            form={form}
            name="contactListForm"
            onFinish={handleSave}
            layout="horizontal"
          >
            <Form.Item
              name="listName"
              label="List Name"
              rules={[
                {
                  required: true,
                  message: "Please enter a contact list name",
                },
              ]}
            >
              <Input placeholder="Enter contact list name" />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                style={{
                  backgroundColor: "#ac6a1e",
                  color: "#fff",
                }}
                htmlType="submit"
              >
                Save
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      </motion.div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
            <p className="text-yellow-800">
              <strong>Notice:</strong> Some data may not be available. {error}
            </p>
          </div>
        )}

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <StatsCard
            title="Total Investors"
            count={stats.clients || 0}
            icon={Users}
            trend="+12.5%"
            trendPositive={true}
            classNames="bg-gradient-to-br from-emerald-500 to-green-600 shadow-xl hover:shadow-2xl transition-all duration-300 text-white border-0"
          />
          <StatsCard
            title="Total Companies"
            count={stats.investorLists || 0}
            icon={List}
            trend="+8.2%"
            trendPositive={true}
            classNames="bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl hover:shadow-2xl transition-all duration-300 text-white border-0"
          />
          <StatsCard
            title="Sent Emails"
            count={stats.totalContacts || 0}
            icon={Mail}
            trend="-3.1%"
            trendPositive={false}
            classNames="bg-gradient-to-br from-purple-500 to-pink-600 shadow-xl hover:shadow-2xl transition-all duration-300 text-white border-0"
          />
          <StatsCard
            title="Responded"
            count={stats.totalContacts || 0}
            icon={TrendingUp}
            trend="-3.1%"
            trendPositive={false}
            classNames="bg-gradient-to-br from-orange-500 to-red-600 shadow-xl hover:shadow-2xl transition-all duration-300 text-white border-0"
          />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10"
        >
          <motion.div
            whileHover={{ y: -5, scale: 1.02 }}
            transition={{ duration: 0.2 }}
            className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">Email Monthly Report</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockChartData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="emails" fill="#4285F4" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div
            whileHover={{ y: -5, scale: 1.02 }}
            transition={{ duration: 0.2 }}
            className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">Users Monthly Report</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={emailDistributionData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  label
                >
                  {emailDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        </motion.div>

        {/* TODO: Re-add DemoBanner when present in current codebase */}
      </div>
    </div>
  );
};

export default function Page() {
  return <Profile />;
}

