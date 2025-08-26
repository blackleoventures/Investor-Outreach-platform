"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
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
  SettingOutlined,
  LogoutOutlined,
  DashboardOutlined,
  NotificationOutlined,
  FileTextOutlined,
  CalendarOutlined,
  SearchOutlined,
  UserSwitchOutlined,
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

  useEffect(() => {
    if (!currentUser) {
      router.push("/");
    }
  }, [currentUser, router]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const navItem = (key: string, label: string) => ({
    key,
    label: <Link href={key}>{label}</Link>,
  });

  const menuItems = [
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
  ];

  const userMenuItems = [
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
  ];

  if (!currentUser) {
    return null;
  }

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        width={250}
        style={{
          background: "#fff",
          borderRight: "1px solid #f0f0f0",
        }}
      >
        <div className="p-4 border-b border-gray-200">
          <Title level={4} className="m-0 text-center">
            Investor Outreach
          </Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[pathname]}
          style={{ borderRight: 0 }}
          items={menuItems}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: "#fff",
            padding: "0 24px",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div className="flex items-center">
            <Title level={4} className="m-0">
              Dashboard
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
              />
              <span className="text-gray-700">
                {currentUser.displayName || currentUser.email}
              </span>
            </Space>
          </Dropdown>
        </Header>

        <Content
          style={{
            margin: "24px",
            padding: "24px",
            background: "#fff",
            borderRadius: "8px",
            minHeight: "calc(100vh - 112px)",
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}

