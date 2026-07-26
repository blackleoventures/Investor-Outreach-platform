"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  Empty,
  Input,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { ApplicationStatus, StartupApplication } from "@/types/startup-application";

const { Title, Text } = Typography;

const STATUS_META: Record<ApplicationStatus, { label: string; color: string }> = {
  pending_review: { label: "Pending Review", color: "gold" },
  approved: { label: "Approved", color: "green" },
  rejected: { label: "Rejected", color: "red" },
  needs_changes: { label: "Needs Changes", color: "blue" },
};

const TABS: Array<{ key: ApplicationStatus | "all"; label: string }> = [
  { key: "pending_review", label: "Pending Review" },
  { key: "needs_changes", label: "Needs Changes" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

interface Counts {
  pending_review: number;
  approved: number;
  rejected: number;
  needs_changes: number;
  total: number;
}

export default function ApplicationsQueuePage() {
  const router = useRouter();
  const { userData, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<StartupApplication[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [activeTab, setActiveTab] = useState<ApplicationStatus | "all">("pending_review");
  const [search, setSearch] = useState("");

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        router.push("/login");
        return;
      }
      const token = await user.getIdToken();

      const query = activeTab === "all" ? "" : `?status=${activeTab}`;
      const response = await fetch(`/api/startup-applications${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setApplications(data.data || []);
        setCounts(data.counts || null);
      } else {
        message.error(data.error?.message || "Unable to load applications.");
        setApplications([]);
      }
    } catch (error) {
      console.error("Failed to load applications:", error);
      message.error("Unable to load applications.");
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, router]);

  useEffect(() => {
    if (authLoading) return;

    if (userData?.role !== "admin" && userData?.role !== "subadmin") {
      router.push("/dashboard");
      return;
    }

    fetchApplications();
  }, [authLoading, userData?.role, fetchApplications, router]);

  const term = search.trim().toLowerCase();
  const visible = term
    ? applications.filter((app) =>
        [
          app.startup?.startupName,
          app.founder?.founderName,
          app.founder?.email,
          app.overview?.sector,
          app.applicationId,
        ]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(term))
      )
    : applications;

  const columns = [
    {
      title: "Startup",
      key: "startup",
      render: (_: unknown, record: StartupApplication) => (
        <div>
          <Text strong>{record.startup?.startupName}</Text>
          <div>
            <Text type="secondary" className="text-xs">
              {record.applicationId}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Founder",
      key: "founder",
      render: (_: unknown, record: StartupApplication) => (
        <div>
          <div>{record.founder?.founderName}</div>
          <Text type="secondary" className="text-xs">
            {record.founder?.designation}
          </Text>
        </div>
      ),
    },
    {
      title: "Sector",
      key: "sector",
      render: (_: unknown, record: StartupApplication) => record.overview?.sector || "-",
    },
    {
      title: "Stage",
      key: "stage",
      render: (_: unknown, record: StartupApplication) =>
        record.overview?.stage ? <Tag>{record.overview.stage}</Tag> : "-",
    },
    {
      title: "Raising",
      key: "raising",
      render: (_: unknown, record: StartupApplication) =>
        record.fundraising?.raisingAmount || "-",
    },
    {
      title: "Country",
      key: "country",
      render: (_: unknown, record: StartupApplication) => record.startup?.country || "-",
    },
    {
      title: "Submitted",
      key: "createdAt",
      render: (_: unknown, record: StartupApplication) =>
        record.createdAt ? new Date(record.createdAt).toLocaleDateString() : "-",
    },
    {
      title: "Status",
      key: "status",
      render: (_: unknown, record: StartupApplication) => {
        const meta = STATUS_META[record.review?.status] || STATUS_META.pending_review;
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: "",
      key: "action",
      render: (_: unknown, record: StartupApplication) => (
        <Button
          type="primary"
          size="small"
          onClick={() => router.push(`/dashboard/applications/${record.id}`)}
        >
          Review
        </Button>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <Title level={3} style={{ marginBottom: 4 }}>
            Application Review
          </Title>
          <Text type="secondary">
            Only approved startups appear in the investor portal.
          </Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchApplications} loading={loading}>
          Refresh
        </Button>
      </div>

      <Card className="mb-4 rounded-xl" bodyStyle={{ padding: 16 }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => {
              const count =
                tab.key === "all" ? counts?.total : counts?.[tab.key as keyof Counts];
              return (
                <Badge key={tab.key} count={count || 0} offset={[-4, 2]} size="small">
                  <Button
                    type={activeTab === tab.key ? "primary" : "default"}
                    onClick={() => setActiveTab(tab.key)}
                    style={
                      activeTab === tab.key ? { backgroundColor: "#4f46e5" } : undefined
                    }
                  >
                    {tab.label}
                  </Button>
                </Badge>
              );
            })}
          </div>

          <Input
            allowClear
            placeholder="Search startup, founder, email, or ID"
            prefix={<SearchOutlined className="text-gray-400" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full lg:max-w-sm"
          />
        </div>
      </Card>

      <Card className="rounded-xl" bodyStyle={{ padding: 0 }}>
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spin size="large" />
          </div>
        ) : visible.length === 0 ? (
          <div className="py-16">
            <Empty description="No applications in this view." />
          </div>
        ) : (
          <Table
            rowKey="id"
            dataSource={visible}
            columns={columns}
            pagination={{ pageSize: 20, showSizeChanger: false }}
            scroll={{ x: 1000 }}
          />
        )}
      </Card>
    </div>
  );
}
