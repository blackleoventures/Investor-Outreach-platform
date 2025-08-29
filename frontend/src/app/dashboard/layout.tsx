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
  Drawer,
} from "antd";
import {
  UserOutlined,
  TeamOutlined,
  MailOutlined,
  BarChartOutlined,
  SettingOutlined,
  LogoutOutlined,
  DashboardOutlined,
  NotificationOutlined,
  FileTextOutlined,
  CalendarOutlined,
  SearchOutlined,
  UserSwitchOutlined,
  RobotOutlined,
  MenuOutlined,
} from "@ant-design/icons";

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!currentUser) {
      router.push("/");
    }
  }, [currentUser, router]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      router.push("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }, [logout, router]);

  const navItem = useCallback((key: string, label: string) => ({
    label: <Link href={key}>{label}</Link>,
  }), []);

  const menuItems = useMemo(() => ([
    {
      key: "/dashboard",
      icon: <DashboardOutlined style={{ fontSize: "16px" }} />,
      ...navItem("/dashboard", "Dashboard"),
    },
    {
      key: "/dashboard/manage-client",
      icon: <UserOutlined style={{ fontSize: "16px" }} />,
      ...navItem("/dashboard/manage-client", "Manage Clients"),
    },
    {
      key: "/dashboard/all-client",
      icon: <TeamOutlined style={{ fontSize: "16px" }} />,
      ...navItem("/dashboard/all-client", "All Clients"),
    },
    {
      key: "/dashboard/add-client",
      icon: <UserOutlined style={{ fontSize: "16px" }} />,
      ...navItem("/dashboard/add-client", "Add Client"),
    },
    {
      key: "/dashboard/allCampaign",
      icon: <NotificationOutlined style={{ fontSize: "16px" }} />,
      ...navItem("/dashboard/allCampaign", "Manage Campaigns"),
    },
    {
      key: "/dashboard/select-campaign",
      icon: <MailOutlined style={{ fontSize: "16px" }} />,
      ...navItem("/dashboard/select-campaign", "Select Campaign"),
    },
    {
      key: "/dashboard/manage-contactsList",
      icon: <TeamOutlined style={{ fontSize: "16px" }} />,
      ...navItem("/dashboard/manage-contactsList", "Contact Lists"),
    },
    {
      key: "/dashboard/all-reports",
      icon: <BarChartOutlined style={{ fontSize: "16px" }} />,
      ...navItem("/dashboard/all-reports", "Reports"),
    },
    {
      key: "/dashboard/all-investors",
      icon: <UserSwitchOutlined style={{ fontSize: "16px" }} />,
      ...navItem("/dashboard/all-investors", "Investors"),
    },
    {
      key: "/dashboard/investor-management",
      icon: <SettingOutlined style={{ fontSize: "16px" }} />,
      ...navItem("/dashboard/investor-management", "Investor Management"),
    },
    {
      key: "/dashboard/matching-test",
      icon: <SearchOutlined style={{ fontSize: "16px" }} />,
      ...navItem("/dashboard/matching-test", "Matching Test"),
    },
    {
      key: "/dashboard/schedule-demo",
      icon: <CalendarOutlined style={{ fontSize: "16px" }} />,
      ...navItem("/dashboard/schedule-demo", "Schedule Demo"),
    },

    {
      key: "/dashboard/pitch-analyzer",
      icon: <RobotOutlined style={{ fontSize: "16px" }} />,
      ...navItem("/dashboard/pitch-analyzer", "Pitch Analyzer"),
    },
  ]), [navItem]);

  const userMenuItems = useMemo(() => ([
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Profile",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Logout",
      onClick: handleLogout,
    },
  ]), [handleLogout]);

  if (!currentUser) {
    return null;
  }

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
            <span className="text-blue-600 font-bold text-lg">IO</span>
          </div>
          <Title level={4} className="m-0 text-white font-semibold">
            Investor Outreach
          </Title>
        </div>
      </div>
      <Menu
        mode="inline"
        selectedKeys={[pathname]}
        style={{ borderRight: 0, backgroundColor: '#f8fafc' }}
        items={menuItems}
        onClick={() => isMobile && setMobileMenuOpen(false)}
      />
    </>
  );

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sider
          width={250}
          style={{
            background: "#f8fafc",
            borderRight: "1px solid #e2e8f0",
            boxShadow: "2px 0 8px rgba(0,0,0,0.1)",
          }}
        >
          <SidebarContent />
        </Sider>
      )}

      {/* Mobile Drawer */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">IO</span>
            </div>
            <span className="text-gray-800 font-semibold">Navigation</span>
          </div>
        }
        placement="left"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        bodyStyle={{ padding: 0 }}
        width={250}
      >
        <SidebarContent />
      </Drawer>

      <Layout>
        <Header
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: isMobile ? "0 16px" : "0 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <div className="flex items-center gap-3">
            {isMobile && (
              <>
                <Button
                  type="text"
                  icon={<MenuOutlined />}
                  onClick={() => setMobileMenuOpen(true)}
                  size="large"
                  style={{ color: 'white' }}
                />
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md">
                  <span className="text-blue-600 font-bold text-sm">IO</span>
                </div>
              </>
            )}
            <Title level={isMobile ? 5 : 4} className="m-0 text-white font-semibold">
              {isMobile ? "IO Platform" : "Investor Outreach Platform"}
            </Title>
          </div>

          <Dropdown
            menu={{ items: userMenuItems }}
            placement="bottomRight"
            arrow
          >
            <Space className="cursor-pointer">
              <Avatar
                icon={<UserOutlined />}
                src={currentUser.photoURL || undefined}
                size={isMobile ? "small" : "default"}
              />
              {!isMobile && (
                <span className="text-gray-700">
                  {currentUser.displayName || currentUser.email}
                </span>
              )}
            </Space>
          </Dropdown>
        </Header>

        <Content
          style={{
            margin: isMobile ? "16px" : "24px",
            padding: isMobile ? "16px" : "24px",
            background: "#fff",
            borderRadius: "12px",
            minHeight: "calc(100vh - 112px)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            border: "1px solid #f1f5f9",
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}

