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
import Image from "next/image";

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Add mobile-specific styles
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = `
        @media (max-width: 768px) {
          body {
            overflow-x: hidden !important;
          }
          .ant-layout {
            overflow-x: hidden !important;
          }
          .ant-table-wrapper {
            overflow-x: auto !important;
          }
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);
  const { currentUser, logout, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [drawerKey, setDrawerKey] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push("/");
    }
  }, [currentUser, loading, router]);

  // Prevent hydration mismatch
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

  // Show loading spinner while checking auth
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

  const SidebarContent = () => (
    <Menu
      mode="inline"
      selectedKeys={[pathname]}
      style={{ borderRight: 0, backgroundColor: '#f8fafc', paddingTop: '16px' }}
      items={menuItems}
      onClick={() => isMobile && setMobileMenuOpen(false)}
    />
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header - Full Width */}
      <Header
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: isMobile ? "0 12px" : "0 24px",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          height: isMobile ? "56px" : "64px"
        }}
      >
        <div className="flex items-center gap-2">
          <div className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} bg-white rounded-full flex items-center justify-center shadow-md p-1`}>
            <Image 
              src="/logo.png" 
              alt="Logo" 
              width={isMobile ? 24 : 32} 
              height={isMobile ? 24 : 32} 
              className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} object-contain`} 
            />
          </div>
          <Title 
            level={isMobile ? 5 : 4} 
            className="m-0 text-white font-semibold"
            style={{ 
              fontSize: isMobile ? '14px' : '18px',
              lineHeight: isMobile ? '20px' : '24px',
              whiteSpace: isMobile ? 'nowrap' : 'normal',
              overflow: isMobile ? 'hidden' : 'visible',
              textOverflow: isMobile ? 'ellipsis' : 'clip',
              maxWidth: isMobile ? '150px' : 'none'
            }}
          >
            {isMobile ? 'Investor Platform' : 'Investor Outreach Platform'}
          </Title>
        </div>

        <div className="flex items-center gap-2">
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
                <span className="text-white text-sm">
                  {currentUser.displayName || currentUser.email}
                </span>
              )}
            </Space>
          </Dropdown>
          
          {isMobile && (
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => {
                setMobileMenuOpen(true);
                setDrawerKey(prev => prev + 1);
              }}
              size="small"
              style={{ color: 'white', padding: '4px' }}
            />
          )}
        </div>
      </Header>

      {/* Main Content Area */}
      <div style={{ 
        display: "flex", 
        flex: 1, 
        marginTop: isMobile ? "56px" : "64px",
        overflow: "hidden",
        position: "relative"
      }}>
        {/* Desktop Sidebar */}
        {!isMobile && (
          <Sider
            width={250}
            style={{
              background: "#f8fafc",
              borderRight: "1px solid #e2e8f0",
              boxShadow: "2px 0 8px rgba(0,0,0,0.1)",
              height: `calc(100vh - ${isMobile ? '56px' : '64px'})`,
              position: "fixed",
              left: 0,
              top: isMobile ? "56px" : "64px",
              overflow: "auto"
            }}
          >
            <SidebarContent />
          </Sider>
        )}

        {/* Mobile Drawer */}
        <Drawer
          title="Navigation"
          placement="left"
          onClose={() => {
            setMobileMenuOpen(false);
            setDrawerKey(prev => prev + 1);
          }}
          open={mobileMenuOpen}
          bodyStyle={{ padding: 0 }}
          width={isMobile ? 280 : 250}
          key={`mobile-drawer-${drawerKey}`}
          destroyOnClose={true}
          headerStyle={{ 
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            borderBottom: "1px solid #e2e8f0"
          }}
        >
          <SidebarContent />
        </Drawer>

        {/* Content */}
        <div
          style={{
            flex: 1,
            marginLeft: !isMobile ? "250px" : "0",
            padding: isMobile ? "8px" : "24px",
            background: "#f5f5f5",
            height: `calc(100vh - ${isMobile ? '56px' : '64px'})`,
            overflow: "auto",
            position: "relative"
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: isMobile ? "8px" : "12px",
              padding: isMobile ? "16px" : "24px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              border: "1px solid #f1f5f9",
              minHeight: isMobile ? "auto" : `calc(100vh - 128px)`,
              width: "100%",
              boxSizing: "border-box"
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

