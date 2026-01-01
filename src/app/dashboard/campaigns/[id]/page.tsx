// app/dashboard/campaigns/[id]/page.tsx (UPDATED)

"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  Button,
  Tag,
  Statistic,
  Progress,
  message,
  Spin,
  Modal,
  Tabs,
  Descriptions,
  Timeline,
  Badge,
} from "antd";
import {
  ArrowLeftOutlined,
  LinkOutlined,
  DownloadOutlined,
  MailOutlined,
  EyeOutlined,
  MessageOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  CalendarOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import DataTable, { Column, FilterColumn } from "@/components/data-table";
import FollowupTab from "@/components/campaigns/FollowupTab";
import EngagementStatsCards from "@/components/campaigns/EngagementStatsCards";
import FailedRecipientsTab from "@/components/campaigns/FailedRecipientsTab";
import CampaignActions from "@/components/campaigns/CampaignActions";
import { auth } from "@/lib/firebase";
import { getBaseUrl } from "@/lib/env-helper";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface Campaign {
  id: string;
  campaignName: string;
  clientName: string;
  clientId: string;
  status: string;
  targetType: string;
  totalRecipients: number;
  emailTemplate: {
    originalSubject: string;
    currentSubject: string;
    subjectImproved: boolean;
    originalBody: string;
    currentBody: string;
    bodyImproved: boolean;
  };
  schedule: {
    startDate: string;
    endDate: string;
    duration: number;
    dailyLimit: number;
    sendingWindow: {
      start: string;
      end: string;
      timezone: string;
    };
    pauseOnWeekends: boolean;
    priorityAllocation: {
      high: number;
      medium: number;
      low: number;
    };
  };
  stats: {
    sent: number;
    delivered: number;
    opened: number;
    replied: number;
    failed: number;
    pending: number;
    deliveryRate: number;
    openRate: number;
    replyRate: number;
    openedNotReplied: number;
    deliveredNotOpened: number;
  };
  followUps: {
    totalSent: number;
    openedNoReplyCandidates: number;
    deliveredNotOpenedCandidates: number;
  };
  publicToken: string;
  createdAt: string;
  lastUpdated: string;
  lastSentAt: string;
  completedAt?: string;
}

interface Client {
  id: string;
  companyName: string;
  founderName: string;
  email: string;
  industry: string;
  fundingStage: string;
  founded: string;
  website: string;
}

interface Aggregates {
  statusCounts: Record<string, number>;
  typeCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
  totalRecipients: number;
}

interface Recipient {
  id: string;
  originalContact: {
    name: string;
    email: string;
    organization: string;
    title?: string;
  };
  recipientType: string;
  priority: string;
  status: string;
  matchScore: number;
  scheduledFor: string;
  sentAt: string;
  deliveredAt: string;
  openedAt: string;
  repliedAt: string;
  trackingData: {
    opened: boolean;
    openCount: number;
    lastOpenedAt: string;
    replied: boolean;
  };
}

export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [aggregates, setAggregates] = useState<Aggregates | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    fetchUserRole();
    fetchCampaignDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  useEffect(() => {
    if (activeTab === "recipients") {
      fetchRecipients();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchUserRole = async () => {
    const user = auth.currentUser;
    if (user) {
      const tokenResult = await user.getIdTokenResult();
      setUserRole((tokenResult.claims.role as string) || "client");
    }
  };

  const getAuthToken = async () => {
    const user = auth.currentUser;
    if (!user) {
      message.error("Please login to continue");
      router.push("/login");
      return null;
    }
    return await user.getIdToken();
  };

  const fetchCampaignDetails = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch campaign details");
      }

      const data = await response.json();
      setCampaign(data.campaign);
      setClient(data.client);
      setAggregates(data.aggregates);
    } catch (error: any) {
      console.error("Fetch campaign error:", error);
      message.error(error.message || "Failed to load campaign");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecipients = async () => {
    try {
      setRecipientsLoading(true);
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(
        `${API_BASE_URL}/campaigns/${campaignId}/recipients`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch recipients");
      }

      const data = await response.json();
      setRecipients(data.recipients || []);
      console.log(recipients);
    } catch (error: any) {
      console.error("Fetch recipients error:", error);
      message.error(error.message || "Failed to load recipients");
    } finally {
      setRecipientsLoading(false);
    }
  };

  const copyPublicLink = () => {
    if (!campaign) return;
    const baseUrl = getBaseUrl();
    const publicUrl = `${baseUrl}/campaign-report/${campaign.publicToken}`;
    navigator.clipboard.writeText(publicUrl);
    message.success("Public report link copied!");
  };

  const openPublicReport = () => {
    if (!campaign) return;
    const baseUrl = getBaseUrl();
    const publicUrl = `${baseUrl}/campaign-report/${campaign.publicToken}`;
    window.open(publicUrl, "_blank");
  };

  const downloadCSV = async () => {
    try {
      message.loading({ content: "Preparing CSV download...", key: "csv" });
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(
        `${API_BASE_URL}/campaigns/${campaignId}/export`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to export campaign");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `campaign-${campaign?.campaignName || campaignId}-${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      message.success({ content: "CSV downloaded successfully!", key: "csv" });
    } catch (error: any) {
      console.error("Download CSV error:", error);
      message.error({ content: "Failed to download CSV", key: "csv" });
    }
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
      case "pending":
        return "default";
      case "delivered":
        return "cyan";
      case "opened":
        return "purple";
      case "replied":
        return "green";
      default:
        return "default";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "red";
      case "medium":
        return "orange";
      case "low":
        return "green";
      default:
        return "default";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "investor":
        return "blue";
      case "incubator":
        return "green";
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

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" tip="Loading campaign details..." />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Campaign not found</p>
          <Button onClick={() => router.push("/dashboard/campaigns")}>
            Back to Campaigns
          </Button>
        </div>
      </div>
    );
  }

  const progress =
    campaign.totalRecipients > 0
      ? Math.round(
          ((campaign.stats.sent + campaign.stats.failed) /
            campaign.totalRecipients) *
            100
        )
      : 0;

  const isAdminOrSubadmin = userRole === "admin" || userRole === "subadmin";

  const recipientColumns: Column<Recipient>[] = [
    {
      key: "name",
      title: "Name",
      width: 200,
      render: (_, record) => (
        <div>
          <p className="font-semibold text-gray-900">
            {record?.originalContact?.name || "N/A"}
          </p>
          <p className="text-xs text-gray-500">
            {record?.originalContact?.organization || "N/A"}
          </p>
        </div>
      ),
    },
    {
      key: "email",
      title: "Email",
      width: 200,
      render: (_, record) => (
        <span className="text-sm">
          {record?.originalContact?.email || "N/A"}
        </span>
      ),
    },
    {
      key: "type",
      title: "Type",
      width: 100,
      align: "center",
      render: (_, record) => (
        <Tag color={getTypeColor(record?.recipientType || "")}>
          {record?.recipientType === "investor" ? "Investor" : "Incubator"}
        </Tag>
      ),
    },
    {
      key: "priority",
      title: "Priority",
      width: 100,
      align: "center",
      render: (_, record) => (
        <Tag color={getPriorityColor(record?.priority || "")}>
          {(record?.priority || "").toUpperCase()}
        </Tag>
      ),
    },
    {
      key: "matchScore",
      title: "Match",
      width: 80,
      align: "center",
      render: (_, record) => (
        <Badge
          count={record?.matchScore || 0}
          showZero
          color={
            (record?.matchScore || 0) >= 80
              ? "green"
              : (record?.matchScore || 0) >= 60
              ? "orange"
              : "red"
          }
        />
      ),
    },
    {
      key: "status",
      title: "Status",
      width: 100,
      align: "center",
      render: (_, record) => (
        <Tag color={getStatusColor(record?.status || "")}>
          {(record?.status || "N/A").toUpperCase()}
        </Tag>
      ),
    },
    {
      key: "openCount",
      title: "Opens",
      width: 80,
      align: "center",
      render: (_, record) => (
        <span
          className={
            (record?.trackingData?.openCount || 0) > 0
              ? "text-blue-600 font-semibold"
              : ""
          }
        >
          {record?.trackingData?.openCount || 0}
        </span>
      ),
    },
    {
      key: "replied",
      title: "Replied",
      width: 80,
      align: "center",
      render: (_, record) =>
        record?.trackingData?.replied ? (
          <CheckCircleOutlined className="text-green-600 text-lg" />
        ) : (
          <CloseCircleOutlined className="text-gray-300 text-lg" />
        ),
    },
    {
      key: "sentAt",
      title: "Sent At",
      width: 150,
      render: (_, record) => (
        <span className="text-xs text-gray-600">
          {formatDateTime(record?.sentAt || "")}
        </span>
      ),
    },
  ];

  const recipientFilters: FilterColumn[] = [
    {
      key: "status",
      title: "Status",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Delivered", value: "delivered" },
        { label: "Opened", value: "opened" },
        { label: "Replied", value: "replied" },
        { label: "Failed", value: "failed" },
      ],
    },
    {
      key: "recipientType",
      title: "Type",
      options: [
        { label: "Investors", value: "investor" },
        { label: "Incubators", value: "incubator" },
      ],
    },
    {
      key: "priority",
      title: "Priority",
      options: [
        { label: "High", value: "high" },
        { label: "Medium", value: "medium" },
        { label: "Low", value: "low" },
      ],
    },
  ];

  const tabItems = [
    {
      key: "overview",
      label: (
        <span className="flex items-center gap-2">
          <FileTextOutlined /> Overview
        </span>
      ),
      children: (
        <div className="space-y-6">
          {/* Engagement Stats */}
          <EngagementStatsCards
            campaignId={campaignId}
            campaignName={campaign.campaignName}
          />

          {/* Client Information */}
          {client && (
            <div className="border border-gray-200 rounded-xl p-4 sm:p-6 bg-white shadow-sm">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-gray-800">
                <UserOutlined /> Client Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-500 text-sm">Company Name</p>
                  <p className="font-medium text-gray-800">
                    {client.companyName}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Founder Name</p>
                  <p className="font-medium text-gray-800">
                    {client.founderName}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Email</p>
                  <p className="font-medium text-gray-800">{client.email}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Industry</p>
                  <p className="font-medium text-gray-800">{client.industry}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Funding Stage</p>
                  <p className="font-medium text-gray-800">
                    {client.fundingStage}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Founded</p>
                  <p className="font-medium text-gray-800">{client.founded}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-gray-500 text-sm">Website</p>
                  <a
                    href={client.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all font-medium"
                  >
                    {client.website}
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Schedule & Timing */}
          <div className="border border-gray-200 rounded-xl p-4 sm:p-6 bg-white shadow-sm">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-gray-800">
              <CalendarOutlined /> Schedule & Timing
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoItem
                label="Start Date"
                value={formatDate(campaign.schedule.startDate)}
              />
              <InfoItem
                label="End Date"
                value={formatDate(campaign.schedule.endDate)}
              />
              <InfoItem
                label="Duration"
                value={`${campaign.schedule.duration} days`}
              />
              <InfoItem
                label="Daily Limit"
                value={`${campaign.schedule.dailyLimit} emails/day`}
              />
              <InfoItem
                label="Sending Window"
                value={`${campaign.schedule.sendingWindow.start} - ${campaign.schedule.sendingWindow.end} ${campaign.schedule.sendingWindow.timezone}`}
              />
              <InfoItem
                label="Weekends"
                value={campaign.schedule.pauseOnWeekends ? "Paused" : "Active"}
              />
              <InfoItem
                label="Last Email Sent"
                value={formatDateTime(campaign.lastSentAt)}
              />
              <InfoItem
                label="Last Updated"
                value={formatDateTime(campaign.lastUpdated)}
              />
            </div>
          </div>

          {/* Target Audience Breakdown */}
          {aggregates && (
            <div className="border border-gray-200 rounded-xl p-4 sm:p-6 bg-white shadow-sm">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">
                Target Audience Breakdown
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* By Type */}
                <div>
                  <h4 className="font-semibold mb-3 text-gray-700">By Type</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center">
                        <UserOutlined className="mr-2 text-blue-600" />
                        Investors
                      </span>
                      <Tag color="blue">
                        {aggregates.typeCounts.investor || 0} (
                        {Math.round(
                          ((aggregates.typeCounts.investor || 0) /
                            aggregates.totalRecipients) *
                            100
                        )}
                        %)
                      </Tag>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="flex items-center">
                        <UserOutlined className="mr-2 text-green-600" />
                        Incubators
                      </span>
                      <Tag color="green">
                        {aggregates.typeCounts.incubator || 0} (
                        {Math.round(
                          ((aggregates.typeCounts.incubator || 0) /
                            aggregates.totalRecipients) *
                            100
                        )}
                        %)
                      </Tag>
                    </div>
                  </div>
                </div>

                {/* By Priority */}
                <div>
                  <h4 className="font-semibold mb-3 text-gray-700">
                    By Priority
                  </h4>
                  <div className="space-y-2">
                    {[
                      {
                        label: "High Priority",
                        color: "red",
                        icon: "text-red-600",
                        count: aggregates.priorityCounts.high,
                      },
                      {
                        label: "Medium Priority",
                        color: "orange",
                        icon: "text-orange-600",
                        count: aggregates.priorityCounts.medium,
                      },
                      {
                        label: "Low Priority",
                        color: "green",
                        icon: "text-green-600",
                        count: aggregates.priorityCounts.low,
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex justify-between items-center"
                      >
                        <span className="flex items-center">
                          <ThunderboltOutlined
                            className={`mr-2 ${item.icon}`}
                          />
                          {item.label}
                        </span>
                        <Tag color={item.color}>
                          {item.count || 0} (
                          {Math.round(
                            ((item.count || 0) / aggregates.totalRecipients) *
                              100
                          )}
                          %)
                        </Tag>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "email",
      label: (
        <span>
          <MailOutlined /> Email Content
        </span>
      ),
      children: (
        <div className="space-y-6">
          <Card title="Email Subject">
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-lg font-semibold">
                {campaign.emailTemplate.currentSubject}
              </p>
            </div>
            {campaign.emailTemplate.subjectImproved && (
              <div className="mt-3">
                <Tag color="green">AI-Improved</Tag>
                <p className="text-sm text-gray-500 mt-2">
                  Original: {campaign.emailTemplate.originalSubject}
                </p>
              </div>
            )}
          </Card>

          <Card title="Email Body">
            <div className="bg-gray-50 p-4 rounded whitespace-pre-wrap">
              {campaign.emailTemplate.currentBody}
            </div>
            {campaign.emailTemplate.bodyImproved && (
              <div className="mt-3">
                <Tag color="green">AI-Improved</Tag>
              </div>
            )}
          </Card>
        </div>
      ),
    },
    {
      key: "recipients",
      label: (
        <span>
          <UserOutlined /> Recipients ({campaign.totalRecipients})
        </span>
      ),
      children: (
        <DataTable
          columns={recipientColumns}
          data={recipients}
          loading={recipientsLoading}
          onRefresh={fetchRecipients}
          searchPlaceholder="Search by name or email..."
          searchKeys={[
            "originalContact.name",
            "originalContact.email",
            "originalContact.organization",
          ]}
          rowKey={(record) => record.id}
          filterColumns={recipientFilters}
          pageSize={50}
          pageSizeOptions={[25, 50, 100, 200]}
        />
      ),
    },
    {
      key: "followups",
      label: (
        <span>
          <MessageOutlined /> Follow-ups
        </span>
      ),
      children: (
        <FollowupTab
          campaignId={campaignId}
          campaignName={campaign.campaignName}
        />
      ),
    },
    {
      key: "failed",
      label: (
        <span>
          <WarningOutlined /> Failed Emails
          {campaign.stats.failed > 0 && (
            <Badge
              count={campaign.stats.failed}
              style={{
                backgroundColor: "#ff4d4f",
                marginLeft: 8,
              }}
            />
          )}
        </span>
      ),
      children: (
        <FailedRecipientsTab
          campaignId={campaignId}
          campaignName={campaign.campaignName}
        />
      ),
    },
  ];

  return (
    <div className="max-w-[1800px] mx-auto">
      <div className="mb-6 space-y-4">
        {/* Back Button */}
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push("/dashboard/campaigns")}
          className="mb-2"
        >
          Back to Campaigns
        </Button>

        {/* Campaign Details */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 break-words">
            {campaign.campaignName}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm sm:text-base">
            <span className="text-gray-600">{campaign.clientName}</span>
            <Tag color={getStatusColor(campaign.status)}>
              {campaign.status.toUpperCase()}
            </Tag>
            <span className="text-gray-500">
              Created: {formatDate(campaign.createdAt)}
            </span>
          </div>
        </div>

        {/* Buttons Section */}
        <div className="flex flex-wrap gap-2">
          {/* Campaign Actions */}
          <CampaignActions
            campaignId={campaignId}
            campaignName={campaign.campaignName}
            campaignStatus={campaign.status}
            stats={campaign.stats}
            totalRecipients={campaign.totalRecipients}
            userRole={userRole}
            onStatusChange={fetchCampaignDetails}
          />

          <Button
            icon={<EyeOutlined />}
            onClick={openPublicReport}
            className="bg-blue-500 border-blue-500 text-white hover:bg-blue-600"
          >
            Public Report
          </Button>

          <Button
            icon={<LinkOutlined />}
            onClick={copyPublicLink}
            className="bg-green-500 border-green-500 text-white hover:bg-green-600"
          >
            Copy Link
          </Button>

          <Button
            icon={<DownloadOutlined />}
            onClick={downloadCSV}
            className="bg-purple-600 border-purple-600 text-white hover:bg-purple-700"
          >
            Export CSV
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-600">Emails Processed</span>
          <span className="text-gray-900 font-semibold">
            {campaign.stats.sent + campaign.stats.failed} /{" "}
            {campaign.totalRecipients} processed
          </span>
        </div>
        <Progress
          percent={progress}
          status={campaign.status === "completed" ? "success" : "active"}
          strokeColor={{
            "0%": "#108ee9",
            "100%": "#87d068",
          }}
        />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <Statistic
            title="Total Sent"
            value={campaign.stats.sent + campaign.stats.failed}
            prefix={<MailOutlined />}
            valueStyle={{ color: "#1890ff" }}
          />
        </Card>
        <Card>
          <Statistic
            title="Delivered"
            value={campaign.stats.delivered}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: "#52c41a" }}
          />
        </Card>
        <Card>
          <Statistic
            title="Failed"
            value={campaign.stats.failed}
            prefix={<CloseCircleOutlined />}
            valueStyle={{ color: "#ff4d4f" }}
          />
        </Card>
        <Card>
          <Statistic
            title="Pending"
            value={campaign.stats.pending}
            prefix={<ClockCircleOutlined />}
            valueStyle={{ color: "#faad14" }}
          />
        </Card>
      </div>

      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>
    </div>
  );
}

const InfoItem = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-gray-500 text-sm">{label}</p>
    <p className="font-medium text-gray-800 break-words">{value}</p>
  </div>
);
