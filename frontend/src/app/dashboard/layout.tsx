"use client";

import { AppstoreOutlined, DollarOutlined, NodeIndexOutlined, NotificationOutlined, UnorderedListOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Layout, Menu, Spin } from "antd";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Navbar from "../../legacy_src/components/shared/Navbar";
import { useAuth } from "../../legacy_src/Context/AuthContext";
import auth from "../../legacy_src/firebase/firebase.init";

const { Sider, Content } = Layout;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState<boolean>(() => typeof window !== "undefined" && window.innerWidth <= 768);
  const { logout, user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

  const items = useMemo(() => {
    const navItem = (to: string, label: string) => ({
      label: (
        <Link href={to} onClick={() => isMobile && setCollapsed(true)}>
          {label}
        </Link>
      ),
    });
    return [
      { key: "/dashboard", icon: <AppstoreOutlined style={{ fontSize: "16px" }} />, ...navItem("/dashboard", "Dashboard") },
      {
        key: "sub1",
        label: "Manage Clients",
        icon: <UserOutlined style={{ fontSize: "16px" }} />,
        children: [
          { key: "/dashboard/all-client", ...navItem("/dashboard/all-client", "All Client") },
          { key: "/dashboard/manage-client", ...navItem("/dashboard/manage-client", "Active Client") },
          { key: "/dashboard/add-client", ...navItem("/dashboard/add-client", "Add Client") },
        ],
      },
      { key: "/dashboard/allCampaign", icon: <NotificationOutlined style={{ fontSize: "16px" }} />, ...navItem("/dashboard/allCampaign", "Manage Campaigns") },
      { key: "/dashboard/match-making", icon: <NodeIndexOutlined style={{ fontSize: "16px" }} />, ...navItem("/dashboard/match-making", "Match Making") },
      { key: "/dashboard/manage-contactsList", icon: <UnorderedListOutlined style={{ fontSize: "15px" }} />, ...navItem("/dashboard/manage-contactsList", "Manage Lists") },
    ];
  }, [isMobile]);

  const [openKeys, setOpenKeys] = useState<string[]>([]);
  useEffect(() => {
    const parent = items.find((item: any) => item.children?.some((c: any) => c.key === pathname));
    setOpenKeys(parent ? [parent.key as string] : []);
  }, [items, pathname]);

  const onOpenChange = (keys: string[]) => {
    const latestOpenKey = keys.find((key) => !openKeys.includes(key));
    if (items.some((item: any) => item.key === latestOpenKey)) {
      setOpenKeys(latestOpenKey ? [latestOpenKey] : []);
    } else {
      setOpenKeys([]);
    }
  };

  const handleLogout = async () => {
    try {
      await logout(auth);
    } catch (error) {
      console.error("Logout Error:", (error as any)?.message);
    }
  };

  if (loading || (!user && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spin size="large" tip="Loading..." />
      </div>
    );
  }

  if (!user) return null;

  return (
    <Layout className="min-h-screen">
      <Sider
        collapsible
        collapsed={collapsed}
        trigger={null}
        width={200}
        collapsedWidth={64}
        className="fixed h-screen left-0 top-0 z-[1000] bg-white border-r overflow-hidden"
      >
        <div className="p-4 text-center h-20 flex flex-col justify-center">
          <img src="/logo.png" alt="Logo" width={collapsed ? 24 : 32} height={collapsed ? 24 : 32} className="mx-auto" />
          {!collapsed && <h1 className="mt-2 text-lg font-semibold">Black Leo Venture</h1>}
        </div>
        <div className="h-[calc(100vh-160px)] overflow-y-auto overflow-x-hidden">
          <Menu
            mode="inline"
            theme="light"
            selectedKeys={[pathname]}
            openKeys={openKeys}
            onOpenChange={onOpenChange}
            inlineCollapsed={collapsed}
            items={items as any}
            className="sidebar-menu h-full border-r-0"
          />
        </div>
        {!collapsed && (
          <div className="absolute bottom-0 w-full p-4 border-t bg-white h-20 flex flex-col justify-center">
            <Button onClick={handleLogout} icon={<LogOut size={16} />} className="w-full text-left" type="text">
              Logout
            </Button>
          </div>
        )}
      </Sider>

      <Layout className={`${collapsed ? "ml-16" : "ml-[200px]"} transition-[margin-left] duration-200 min-h-screen`}>
        <div className="bg-white h-16 flex items-center pl-6 justify-between sticky top-0 z-[999]">
          <Button type="text" icon={collapsed ? <span className="anticon"><span className="anticon-menu-unfold" /></span> : <span className="anticon"><span className="anticon-menu-fold" /></span>} onClick={() => setCollapsed(!collapsed)} className="text-2xl mr-4" />
          <Navbar />
        </div>
        <Content className="m-6 md:m-4 bg-[#f4f6f8] min-h-[calc(100vh-112px)] overflow-auto p-0">
          <div className="p-6 bg-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] min-h-full">
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

