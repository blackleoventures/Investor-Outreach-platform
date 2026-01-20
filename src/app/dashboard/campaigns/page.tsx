"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { message, Tag, Button, Progress, Modal } from "antd";
import {
  PlusOutlined,
  EyeOutlined,
  LinkOutlined,
  CopyOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import DataTable, { Column, FilterColumn } from "@/components/data-table";
import { auth } from "@/lib/firebase";
import { getBaseUrl } from "@/lib/env-helper";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface Campaign {
  id: string;
  campaignName: string;
  clientName: string;
  clientEmail: string; // Added for search
  status: string;
  targetType: string;
  totalRecipients: number;
  sent: number;
  delivered: number;
  opened: number;
  replied: number;
  failed: number;
  pending: number;
  deliveryRate: number;
  openRate: number;
  replyRate: number;
  startDate: string;
  endDate: string;
  duration: number;
  dailyLimit: number;
  publicToken: string;
  createdAt: string;
  lastUpdated: string;
  lastSentAt: string;
}

export default function CampaignsListPage() {
  const router = useRouter();
  const { userData } = useAuth();
  const isAdmin = userData?.role === "admin";
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const getAuthToken = async () => {
    const user = auth.currentUser;
    if (!user) {
      message.error("Please login to continue");
      router.push("/login");
      return null;
    }
    return await user.getIdToken();
  };

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/campaigns/list`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch campaigns");
      }

      const data = await response.json();
      setCampaigns(data.campaigns || []);
      setLastUpdated(new Date().toLocaleString());
    } catch (error: any) {
      console.error("Fetch campaigns error:", error);
      message.error(error.message || "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  const copyPublicLink = (publicToken: string) => {
    const baseUrl = getBaseUrl();
    const publicUrl = `${baseUrl}/campaign-report/${publicToken}`;

    navigator.clipboard.writeText(publicUrl);
    message.success("Public report link copied to clipboard!");
  };

  const viewCampaignDetails = (campaignId: string) => {
    router.push(`/dashboard/campaigns/${campaignId}`);
  };

  const handleDeleteCampaign = (campaign: Campaign) => {
    Modal.confirm({
      title: "Delete Campaign",
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>
            Are you sure you want to delete{" "}
            <strong>{campaign.campaignName}</strong>?
          </p>
          <p className="text-red-600 mt-2 text-sm">
            This will permanently delete the campaign and all its recipients (
            {campaign.totalRecipients} recipients).
          </p>
          <p className="text-gray-500 mt-1 text-sm">
            This action cannot be undone.
          </p>
        </div>
      ),
      okText: "Delete",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: async () => {
        try {
          setDeleting(campaign.id);
          const token = await getAuthToken();
          if (!token) return;

          const response = await fetch(
            `${API_BASE_URL}/campaigns/${campaign.id}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || "Failed to delete campaign");
          }

          message.success(data.message || "Campaign deleted successfully");
          fetchCampaigns(); // Refresh the list
        } catch (error: any) {
          console.error("Delete campaign error:", error);
          message.error(error.message || "Failed to delete campaign");
        } finally {
          setDeleting(null);
        }
      },
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "green";
      case "completed":
        return "blue";
      case "paused":
        return "orange";
      case "failed":
        return "red";
      default:
        return "default";
    }
  };

  const getTargetTypeColor = (type: string) => {
    switch (type) {
      case "investors":
        return "blue";
      case "incubators":
        return "green";
      case "both":
        return "purple";
      default:
        return "default";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Define filter columns
  const filterColumns: FilterColumn[] = [
    {
      key: "status",
      title: "Status",
      options: [
        { label: "Active", value: "active" },
        { label: "Completed", value: "completed" },
        { label: "Paused", value: "paused" },
        { label: "Failed", value: "failed" },
      ],
    },
    {
      key: "targetType",
      title: "Target Type",
      options: [
        { label: "Investors", value: "investors" },
        { label: "Incubators", value: "incubators" },
        { label: "Both", value: "both" },
      ],
    },
  ];

  // Define table columns
  const columns: Column<Campaign>[] = [
    {
      key: "campaignName",
      title: "Campaign Name",
      width: 250,
      render: (_, record) => (
        <div>
          <p className="font-semibold text-gray-900">{record.campaignName}</p>
          <p className="text-xs text-gray-500">{record.clientName}</p>
          {record.clientEmail && (
            <p className="text-xs text-gray-400">{record.clientEmail}</p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      title: "Status",
      width: 100,
      align: "center",
      render: (_, record) => (
        <Tag color={getStatusColor(record.status)}>
          {record.status.toUpperCase()}
        </Tag>
      ),
    },
    {
      key: "targetType",
      title: "Target",
      width: 120,
      align: "center",
      render: (_, record) => (
        <Tag color={getTargetTypeColor(record.targetType)}>
          {record.targetType === "both"
            ? "Both"
            : record.targetType === "investors"
              ? "Investors"
              : "Incubators"}
        </Tag>
      ),
    },
    {
      key: "progress",
      title: "Progress",
      width: 200,
      render: (_, record) => {
        const progress =
          record.totalRecipients > 0
            ? Math.round(
                ((record.sent + record.failed) / record.totalRecipients) * 100,
              )
            : 0;

        return (
          <div>
            <Progress
              percent={progress}
              size="small"
              status={record.status === "completed" ? "success" : "active"}
            />
            <p className="text-xs text-gray-600 mt-1">
              {record.sent + record.failed} / {record.totalRecipients}
            </p>
          </div>
        );
      },
    },
    {
      key: "stats",
      title: "Stats",
      width: 120,
      render: (_, record) => (
        <div className="text-xs space-y-1">
          <p>
            <span className="text-gray-600">Opened:</span>{" "}
            <span className="font-semibold text-blue-600">{record.opened}</span>
          </p>
          <p>
            <span className="text-gray-600">Replied:</span>{" "}
            <span className="font-semibold text-green-600">
              {record.replied}
            </span>
          </p>
        </div>
      ),
    },
    {
      key: "schedule",
      title: "Schedule",
      width: 150,
      render: (_, record) => (
        <div className="text-xs space-y-1">
          <p>
            <span className="text-gray-600">Start:</span>{" "}
            {formatDate(record.startDate)}
          </p>
          <p>
            <span className="text-gray-600">Duration:</span> {record.duration}{" "}
            days
          </p>
          <p>
            <span className="text-gray-600">Daily Limit:</span>{" "}
            {record.dailyLimit}
          </p>
        </div>
      ),
    },
    {
      key: "createdAt",
      title: "Created",
      width: 120,
      render: (_, record) => (
        <div className="text-xs text-gray-600">
          {formatDate(record.createdAt)}
        </div>
      ),
    },
    {
      key: "actions",
      title: "Actions",
      width: 250,
      align: "center",
      render: (_, record) => (
        <div className="flex gap-2 justify-center">
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => viewCampaignDetails(record.id)}
            style={{
              backgroundColor: "#1890ff",
              borderColor: "#1890ff",
            }}
          >
            Details
          </Button>
          <Button
            size="small"
            icon={<CopyOutlined />}
            onClick={() => copyPublicLink(record.publicToken)}
            title="Copy Public Report Link"
            style={{
              backgroundColor: "#52c41a",
              borderColor: "#52c41a",
              color: "white",
            }}
          >
            Link
          </Button>
          {isAdmin && (
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteCampaign(record)}
              loading={deleting === record.id}
              title="Delete Campaign (Admin Only)"
            >
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-[1800px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-600 mt-1">
            Manage and monitor all email campaigns
          </p>
        </div>

        <button
          onClick={() => router.push("/dashboard/campaigns/create")}
          className="flex items-center gap-2 px-4 py-2 bg-[#ac6a1e] text-white rounded-lg hover:bg-[#8d5518] transition-colors"
        >
          <PlusOutlined className="h-4 w-4" />
          Create Campaign
        </button>
      </div>

      <DataTable
        columns={columns}
        data={campaigns}
        loading={loading}
        onRefresh={fetchCampaigns}
        searchPlaceholder="Search by campaign name, client name, or email..."
        searchKeys={["campaignName", "clientName", "clientEmail"]}
        rowKey={(record) => record.id}
        filterColumns={filterColumns}
        pageSize={20}
        pageSizeOptions={[10, 20, 50, 100]}
      />
    </div>
  );
}
