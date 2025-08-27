"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Users, List, Briefcase, Plus, X, Mail, UserPlus } from "lucide-react";
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

// Minimal local StatsCard to replace legacy component
const StatsCard = ({ title, count, icon: Icon, trend, trendPositive, classNames }) => (
  <div className={`p-4 rounded-lg ${classNames || ''}`}>
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm opacity-80">{title}</div>
        <div className="text-2xl font-semibold">{count}</div>
        {trend && (
          <div className={`text-xs mt-1 ${trendPositive ? 'text-green-600' : 'text-red-600'}`}>{trend}</div>
        )}
      </div>
      {Icon && <Icon size={24} />}
    </div>
  </div>
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
    <div className="min-h-screen ">
      <div
        style={{ boxShadow: "0 0 4px rgba(0, 0, 0, 0.1)" }}
        className="px-6 py-8 rounded-2xl mt-8 mb-4 mx-4"
      >
        <div className="mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-3xl font-bold">
                Welcome back,{" "}
                {currentUser?.displayName || currentUser?.email || "User"}
              </h1>
              <p className="mt-2 opacity-90">
                Here&apos;s your business overview
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex flex-col-reverse sm:flex-col md:flex-row gap-3 md:items-center md:space-x-3">
              <div>
                <Button
                  variant="solid"
                  style={{
                    backgroundColor: "#ac6a1e",
                    color: "#fff",
                  }}
                  icon={<Plus size={16} />}
                  onClick={() => setIsOpen(true)}
                  className="w-full sm:w-auto"
                >
                  Create
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-500 flex items-center justify-center">
                  <span className="font-medium text-sm text-wrap sm:text-base text-white">
                    {(currentUser?.displayName ||
                      currentUser?.email ||
                      "U")[0].toUpperCase()}
                  </span>
                </div>
                <div className="text-center sm:text-left">
                  <p className="font-medium text-sm sm:text-base">
                    {currentUser?.email || "No email"}
                  </p>

                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm opacity-75">
                      Last login:{" "}
                      {formatLoginTime(actualLoginTime || loginTime)}
                    </p>

                    {actualLoginTime || loginTime ? (
                      <p className="text-xs opacity-60 font-mono">
                        {getExactLoginTime(actualLoginTime || loginTime)}
                      </p>
                    ) : (
                      <p className="text-xs opacity-50 text-yellow-600">
                        ⚠️ Login time unavailable
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
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
              <div
                className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer border hover:border-blue-100"
                role="button"
                tabIndex={0}
                onClick={() => router.push("/dashboard/select-campaign")}
              >
                <div className="text-blue-500 mb-4">
                  <Mail className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Create Email Campaign
                </h3>
                <p className="text-gray-600 text-sm">
                  Design and send targeted email campaigns to your audience
                </p>
              </div>

              <div
                className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer border hover:border-green-100"
                role="button"
                onClick={() => toggleModal(0, true)}
                tabIndex={0}
              >
                <div className="text-green-500 mb-4">
                  <List className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Add New Contacts
                </h3>
                <p className="text-gray-600 text-sm">
                  Organize and manage your subscriber lists effectively
                </p>
              </div>

              <div
                className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer border hover:border-purple-100"
                role="button"
                tabIndex={0}
                onClick={() => router.push("/dashboard/add-client")}
              >
                <div className="text-purple-500 mb-4">
                  <UserPlus className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Create a Client
                </h3>
                <p className="text-gray-600 text-sm">
                  Add new clients and manage their profiles in your system
                </p>
              </div>
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
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
            <p className="text-yellow-800">
              <strong>Notice:</strong> Some data may not be available. {error}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Investors"
            count={stats.clients || 0}
            icon={Users}
            trend="+12.5%"
            trendPositive={true}
            classNames="bg-green-500 shadow-lg hover:shadow-xl transition-shadow text-white"
          />
          <StatsCard
            title="Total Companies"
            count={stats.investorLists || 0}
            icon={List}
            trend="+8.2%"
            trendPositive={true}
            classNames="bg-blue-400 shadow-lg hover:shadow-xl transition-shadow"
          />
          <StatsCard
            title="Sent Emails"
            count={stats.totalContacts || 0}
            icon={Briefcase}
            trend="-3.1%"
            trendPositive={false}
            classNames="bg-red-300 shadow-lg hover:shadow-xl transition-shadow"
          />
          <StatsCard
            title="Responded"
            count={stats.totalContacts || 0}
            icon={Briefcase}
            trend="-3.1%"
            trendPositive={false}
            classNames="bg-orange-500 shadow-lg hover:shadow-xl transition-shadow"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
          <div
            className="bg-white p-6 rounded-xl"
            style={{ boxShadow: "0 0 4px rgba(0, 0, 0, 0.1)" }}
          >
            <h2 className="text-lg font-semibold mb-4">Email Monthly Report</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockChartData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="emails" fill="#4285F4" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div
            className="bg-white p-6 rounded-xl"
            style={{ boxShadow: "0 0 4px rgba(0, 0, 0, 0.1)" }}
          >
            <h2 className="text-lg font-semibold mb-4">Users Monthly Report</h2>
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
          </div>
        </div>

        {/* TODO: Re-add DemoBanner when present in current codebase */}
      </div>
    </div>
  );
};

export default function Page() {
  return <Profile />;
}

