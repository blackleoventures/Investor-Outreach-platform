"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useCallback, useState } from "react";
import {
  Layout,
  Menu,
  Button,
  Avatar,
  Dropdown,
  Space,
  Typography,
} from "antd";
import {
  UserOutlined,
  TeamOutlined,
  MailOutlined,
  BarChartOutlined,
  LogoutOutlined,
  DashboardOutlined,
  NotificationOutlined,
  SearchOutlined,
  UserSwitchOutlined,
  RobotOutlined,
  MenuOutlined,
  CloseOutlined,
  PlusOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import Image from "next/image";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, userData, logout, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };
    checkMobile();
    const debouncedResize = debounce(checkMobile, 100);
    window.addEventListener("resize", debouncedResize);
    return () => window.removeEventListener("resize", debouncedResize);
  }, []);

  const debounce = (func: (...args: any[]) => void, wait: number) => {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      router.push("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }, [logout, router]);

  const navItem = useCallback(
    (key: string, label: string) => ({
      label: (
        <Link href={key} prefetch={true}>
          {label}
        </Link>
      ),
    }),
    []
  );

  // Admin menu items (full access)
  const adminMenuItems = useMemo(
    () => [
      {
        key: "/dashboard",
        icon: <DashboardOutlined />,
        ...navItem("/dashboard", "Dashboard"),
      },
      {
        key: "client-management",
        icon: <UserOutlined />,
        label: "Client Management",
        children: [
          {
            key: "/dashboard/all-client",
            icon: <TeamOutlined />,
            ...navItem("/dashboard/all-client", "All Clients"),
          },
          {
            key: "/dashboard/add-client",
            icon: <PlusOutlined />,
            ...navItem("/dashboard/add-client", "Add Client"),
          },
        ],
      },
      {
        key: "/dashboard/allCampaign",
        icon: <NotificationOutlined />,
        ...navItem("/dashboard/allCampaign", "Manage Campaigns"),
      },
      {
        key: "/dashboard/select-campaign",
        icon: <MailOutlined />,
        ...navItem("/dashboard/select-campaign", "Select Campaign"),
      },
      {
        key: "/dashboard/all-reports",
        icon: <BarChartOutlined />,
        ...navItem("/dashboard/all-reports", "Reports"),
      },
      {
        key: "/dashboard/matchmaker",
        icon: <SearchOutlined />,
        ...navItem("/dashboard/matchmaker", "Matchmaker"),
      },
      {
        key: "investor-management",
        icon: <UserSwitchOutlined />,
        label: "Investor Management",
        children: [
          {
            key: "/dashboard/all-investors",
            icon: <UserSwitchOutlined />,
            ...navItem("/dashboard/all-investors", "All Investors"),
          },
          {
            key: "/dashboard/add-investor",
            icon: <PlusOutlined />,
            ...navItem("/dashboard/add-investor", "Add Investor"),
          },
        ],
      },
      {
        key: "incubator-management",
        icon: <RobotOutlined />,
        label: "Incubator Management",
        children: [
          {
            key: "/dashboard/all-incubators",
            icon: <RobotOutlined />,
            ...navItem("/dashboard/all-incubators", "All Incubators"),
          },
          {
            key: "/dashboard/add-incubator",
            icon: <PlusOutlined />,
            ...navItem("/dashboard/add-incubator", "Add Incubator"),
          },
        ],
      },
      {
        key: "/dashboard/account-management",
        icon: <UserOutlined />,
        ...navItem("/dashboard/account-management", "Account Management"),
      },
    ],
    [navItem]
  );

  // Subadmin menu items (exclude account management)
  const subadminMenuItems = useMemo(
    () => [
      {
        key: "/dashboard",
        icon: <DashboardOutlined />,
        ...navItem("/dashboard", "Dashboard"),
      },
      {
        key: "client-management",
        icon: <UserOutlined />,
        label: "Client Management",
        children: [
          {
            key: "/dashboard/all-client",
            icon: <TeamOutlined />,
            ...navItem("/dashboard/all-client", "All Clients"),
          },
          {
            key: "/dashboard/add-client",
            icon: <PlusOutlined />,
            ...navItem("/dashboard/add-client", "Add Client"),
          },
        ],
      },
      {
        key: "/dashboard/allCampaign",
        icon: <NotificationOutlined />,
        ...navItem("/dashboard/allCampaign", "Manage Campaigns"),
      },
      {
        key: "/dashboard/select-campaign",
        icon: <MailOutlined />,
        ...navItem("/dashboard/select-campaign", "Select Campaign"),
      },
      {
        key: "/dashboard/all-reports",
        icon: <BarChartOutlined />,
        ...navItem("/dashboard/all-reports", "Reports"),
      },
      {
        key: "/dashboard/matchmaker",
        icon: <SearchOutlined />,
        ...navItem("/dashboard/matchmaker", "Matchmaker"),
      },
      {
        key: "investor-management",
        icon: <UserSwitchOutlined />,
        label: "Investor Management",
        children: [
          {
            key: "/dashboard/all-investors",
            icon: <UserSwitchOutlined />,
            ...navItem("/dashboard/all-investors", "All Investors"),
          },
          {
            key: "/dashboard/add-investor",
            icon: <PlusOutlined />,
            ...navItem("/dashboard/add-investor", "Add Investor"),
          },
        ],
      },
      {
        key: "incubator-management",
        icon: <RobotOutlined />,
        label: "Incubator Management",
        children: [
          {
            key: "/dashboard/all-incubators",
            icon: <RobotOutlined />,
            ...navItem("/dashboard/all-incubators", "All Incubators"),
          },
          {
            key: "/dashboard/add-incubator",
            icon: <PlusOutlined />,
            ...navItem("/dashboard/add-incubator", "Add Incubator"),
          },
        ],
      },
    ],
    [navItem]
  );

  // Client menu items (only submit information)
  const clientMenuItems = useMemo(
    () => [
      {
        key: "/dashboard/submit-information",
        icon: <FileTextOutlined />,
        ...navItem("/dashboard/submit-information", "Submit Information"),
      },
    ],
    [navItem]
  );

  // Get menu items based on user role
  const menuItems = useMemo(() => {
    if (!userData?.role) return [];

    switch (userData.role) {
      case "admin":
        return adminMenuItems;
      case "subadmin":
        return subadminMenuItems;
      case "client":
        return clientMenuItems;
      default:
        return [];
    }
  }, [userData?.role, adminMenuItems, subadminMenuItems, clientMenuItems]);

  const userMenuItems = useMemo(
    () => [
      {
        key: "user-info",
        label: (
          <div className="py-2 px-1">
            <Text strong className="block text-sm">
              {currentUser?.displayName || "User"}
            </Text>
            <Text type="secondary" className="block text-xs">
              {currentUser?.email}
            </Text>
            <Text type="secondary" className="block text-xs mt-1 capitalize">
              Role: {userData?.role || "N/A"}
            </Text>
            <Text type="secondary" className="block text-xs mt-1">
              Last login: {new Date().toLocaleDateString()}
            </Text>
          </div>
        ),
        disabled: true,
      },
      {
        type: "divider" as const,
      },
      {
        key: "logout",
        icon: <LogoutOutlined />,
        label: "Logout",
        onClick: handleLogout,
        danger: true,
      },
    ],
    [currentUser, userData, handleLogout]
  );

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push("/");
    }
  }, [currentUser, loading, router]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <Layout className="min-h-screen">
      {/* Sidebar */}
      <Sider
        width={280}
        breakpoint="lg"
        collapsedWidth="0"
        trigger={null}
        collapsed={isMobile && !sidebarOpen}
        className="fixed left-0 top-0 bottom-0 z-50 overflow-auto"
        style={{
          background: "#fff",
          boxShadow: "2px 0 8px rgba(0,0,0,0.08)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="Logo"
                width={24}
                height={24}
                className="w-6 h-6 object-contain"
              />
            </div>
            <div className="flex flex-col">
              <h1 className="text-base font-bold leading-tight">
                Investor Outreach
              </h1>
              <p className="text-xs text-gray-600">Platform</p>
            </div>
          </div>
          {isMobile && sidebarOpen && (
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={() => setSidebarOpen(false)}
              className="text-gray-600 hover:text-gray-900"
            />
          )}
        </div>

        {/* Navigation Menu */}
        <Menu
          mode="inline"
          selectedKeys={[pathname]}
          className="border-0 pt-4"
          items={menuItems}
          onClick={() => isMobile && setSidebarOpen(false)}
          style={{
            background: "#fff",
            fontSize: "14px",
          }}
        />

        {/* Role Badge */}
        {/* {userData?.role && (
          <div className="absolute bottom-4 left-6 right-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <Text className="text-xs text-gray-600 block mb-1">
                Current Role
              </Text>
              <Text
                strong
                className="text-sm capitalize block"
                style={{
                  color:
                    userData.role === "admin"
                      ? "#1890ff"
                      : userData.role === "subadmin"
                      ? "#722ed1"
                      : "#52c41a",
                }}
              >
                {userData.role}
              </Text>
            </div>
          </div>
        )} */}
      </Sider>

      {/* Overlay for mobile */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Layout */}
      <Layout
        className="transition-all duration-300"
        style={{
          marginLeft: isMobile ? 0 : 280,
        }}
      >
        {/* Header */}
        <Header
          className="fixed top-0 right-0 z-30 flex items-center justify-between px-4 lg:px-6 bg-white border-b border-gray-200"
          style={{
            left: isMobile ? 0 : 280,
            height: 64,
            lineHeight: "64px",
            padding: "0 24px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          }}
        >
          <div className="flex items-center gap-4">
            {isMobile && (
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setSidebarOpen(true)}
                className="text-gray-600 hover:text-gray-900 text-lg"
                size="large"
              />
            )}
            <h2 className="text-lg font-bold hidden sm:block">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Welcome back,
              </span>{" "}
              <span className="text-base">{currentUser.displayName}</span>
            </h2>
          </div>

          <Dropdown
            menu={{ items: userMenuItems }}
            placement="bottomRight"
            arrow
            trigger={["click"]}
          >
            <Space className="cursor-pointer transition-colors">
              <Avatar
                icon={<UserOutlined />}
                src={currentUser.photoURL || undefined}
                size="default"
                className="bg-gradient-to-br from-blue-500 to-purple-600"
              />
              <span className="text-sm font-medium text-gray-700 hidden sm:inline">
                {currentUser.displayName || currentUser.email?.split("@")[0]}
              </span>
            </Space>
          </Dropdown>
        </Header>

        {/* Content */}
        <Content
          className="mt-16 p-4 lg:p-6"
          style={{
            minHeight: "calc(100vh - 64px)",
            background: "#f5f7fa",
          }}
        >
          <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6 min-h-full border border-gray-100">
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
