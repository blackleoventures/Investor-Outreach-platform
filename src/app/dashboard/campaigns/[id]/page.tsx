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
  contactInfo: {
    name: string;
    email: string;
    organization: string;
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
            {record.contactInfo.name}
          </p>
          <p className="text-xs text-gray-500">
            {record.contactInfo.organization}
          </p>
        </div>
      ),
    },
    {
      key: "email",
      title: "Email",
      width: 200,
      render: (_, record) => (
        <span className="text-sm">{record.contactInfo.email}</span>
      ),
    },
    {
      key: "type",
      title: "Type",
      width: 100,
      align: "center",
      render: (_, record) => (
        <Tag color={getTypeColor(record.recipientType)}>
          {record.recipientType === "investor" ? "Investor" : "Incubator"}
        </Tag>
      ),
    },
    {
      key: "priority",
      title: "Priority",
      width: 100,
      align: "center",
      render: (_, record) => (
        <Tag color={getPriorityColor(record.priority)}>
          {record.priority.toUpperCase()}
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
          count={record.matchScore}
          showZero
          color={
            record.matchScore >= 80
              ? "green"
              : record.matchScore >= 60
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
        <Tag color={getStatusColor(record.status)}>
          {record.status.toUpperCase()}
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
            record.trackingData.openCount > 0
              ? "text-blue-600 font-semibold"
              : ""
          }
        >
          {record.trackingData.openCount}
        </span>
      ),
    },
    {
      key: "replied",
      title: "Replied",
      width: 80,
      align: "center",
      render: (_, record) =>
        record.trackingData.replied ? (
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
          {formatDateTime(record.sentAt)}
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
        <span>
          <FileTextOutlined /> Overview
        </span>
      ),
      children: (
        <div className="space-y-6">
          <EngagementStatsCards
            campaignId={campaignId}
            campaignName={campaign.campaignName}
          />
          {client && (
            <Card title="Client Information">
              <Descriptions bordered column={2}>
                <Descriptions.Item label="Company Name">
                  {client.companyName}
                </Descriptions.Item>
                <Descriptions.Item label="Founder Name">
                  {client.founderName}
                </Descriptions.Item>
                <Descriptions.Item label="Email">
                  {client.email}
                </Descriptions.Item>
                <Descriptions.Item label="Industry">
                  {client.industry}
                </Descriptions.Item>
                <Descriptions.Item label="Funding Stage">
                  {client.fundingStage}
                </Descriptions.Item>
                <Descriptions.Item label="Founded">
                  {client.founded}
                </Descriptions.Item>
                <Descriptions.Item label="Website" span={2}>
                  <a
                    href={client.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600"
                  >
                    {client.website}
                  </a>
                </Descriptions.Item>
              </Descriptions>
              <div className="mt-4">
                <Button
                  type="link"
                  onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                >
                  View Full Client Profile →
                </Button>
              </div>
            </Card>
          )}

          <Card
            title={
              <>
                <CalendarOutlined /> Schedule & Timing
              </>
            }
          >
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Start Date">
                {formatDate(campaign.schedule.startDate)}
              </Descriptions.Item>
              <Descriptions.Item label="End Date">
                {formatDate(campaign.schedule.endDate)}
              </Descriptions.Item>
              <Descriptions.Item label="Duration">
                {campaign.schedule.duration} days
              </Descriptions.Item>
              <Descriptions.Item label="Daily Limit">
                {campaign.schedule.dailyLimit} emails/day
              </Descriptions.Item>
              <Descriptions.Item label="Sending Window">
                {campaign.schedule.sendingWindow.start} -{" "}
                {campaign.schedule.sendingWindow.end}{" "}
                {campaign.schedule.sendingWindow.timezone}
              </Descriptions.Item>
              <Descriptions.Item label="Weekends">
                {campaign.schedule.pauseOnWeekends ? "Paused" : "Active"}
              </Descriptions.Item>
              <Descriptions.Item label="Last Email Sent">
                {formatDateTime(campaign.lastSentAt)}
              </Descriptions.Item>
              <Descriptions.Item label="Last Updated">
                {formatDateTime(campaign.lastUpdated)}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {aggregates && (
            <Card title="Target Audience Breakdown">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">By Type</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span>
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
                      <span>
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

                <div>
                  <h4 className="font-semibold mb-3">By Priority</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span>
                        <ThunderboltOutlined className="mr-2 text-red-600" />
                        High Priority
                      </span>
                      <Tag color="red">
                        {aggregates.priorityCounts.high || 0} (
                        {Math.round(
                          ((aggregates.priorityCounts.high || 0) /
                            aggregates.totalRecipients) *
                            100
                        )}
                        %)
                      </Tag>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>
                        <ThunderboltOutlined className="mr-2 text-orange-600" />
                        Medium Priority
                      </span>
                      <Tag color="orange">
                        {aggregates.priorityCounts.medium || 0} (
                        {Math.round(
                          ((aggregates.priorityCounts.medium || 0) /
                            aggregates.totalRecipients) *
                            100
                        )}
                        %)
                      </Tag>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>
                        <ThunderboltOutlined className="mr-2 text-green-600" />
                        Low Priority
                      </span>
                      <Tag color="green">
                        {aggregates.priorityCounts.low || 0} (
                        {Math.round(
                          ((aggregates.priorityCounts.low || 0) /
                            aggregates.totalRecipients) *
                            100
                        )}
                        %)
                      </Tag>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          <Card title="Campaign Timeline">
            <Timeline
              items={[
                {
                  color: "green",
                  children: (
                    <>
                      <p className="font-semibold">Campaign Created</p>
                      <p className="text-sm text-gray-500">
                        {formatDateTime(campaign.createdAt)}
                      </p>
                    </>
                  ),
                },
                campaign.lastSentAt && {
                  color: "blue",
                  children: (
                    <>
                      <p className="font-semibold">First Email Sent</p>
                      <p className="text-sm text-gray-500">
                        {formatDateTime(campaign.lastSentAt)}
                      </p>
                    </>
                  ),
                },
                campaign.stats.opened > 0 && {
                  color: "purple",
                  children: (
                    <>
                      <p className="font-semibold">First Open Detected</p>
                      <p className="text-sm text-gray-500">
                        {campaign.stats.opened} total opens
                      </p>
                    </>
                  ),
                },
                campaign.stats.replied > 0 && {
                  color: "green",
                  children: (
                    <>
                      <p className="font-semibold">First Reply Received</p>
                      <p className="text-sm text-gray-500">
                        {campaign.stats.replied} total replies
                      </p>
                    </>
                  ),
                },
                {
                  color: campaign.status === "completed" ? "green" : "gray",
                  children: (
                    <>
                      <p className="font-semibold">Campaign Completion</p>
                      <p className="text-sm text-gray-500">
                        {campaign.status === "completed"
                          ? formatDateTime(campaign.completedAt!)
                          : `Expected: ${formatDate(
                              campaign.schedule.endDate
                            )}`}
                      </p>
                    </>
                  ),
                },
              ].filter(Boolean)}
            />
          </Card>
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

            <div className="mt-4 p-3 bg-blue-50 rounded">
              <p className="font-semibold text-sm mb-2">
                Personalization Variables:
              </p>
              <ul className="text-sm space-y-1">
                <li>
                  • <code>{"{{investorName}}"}</code> → Recipient&apos;s name
                </li>
                <li>
                  • <code>{"{{organizationName}}"}</code> → Recipient&apos;s
                  organization
                </li>
                <li>
                  • <code>{"{{companyName}}"}</code> → Client&apos;s company
                  name
                </li>
                <li>
                  • <code>{"{{founderName}}"}</code> → Client&apos;s founder
                  name
                </li>
              </ul>
            </div>
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
            "contactInfo.name",
            "contactInfo.email",
            "contactInfo.organization",
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
      <div className="mb-6">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push("/dashboard/campaigns")}
          className="mb-4"
        >
          Back to Campaigns
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {campaign.campaignName}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-gray-600">{campaign.clientName}</span>
              <Tag color={getStatusColor(campaign.status)}>
                {campaign.status.toUpperCase()}
              </Tag>
              <span className="text-sm text-gray-500">
                Created: {formatDate(campaign.createdAt)}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            {/* Campaign Actions Component */}
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
              style={{
                backgroundColor: "#1890ff",
                borderColor: "#1890ff",
                color: "white",
              }}
            >
              Public Report
            </Button>
            <Button
              icon={<LinkOutlined />}
              onClick={copyPublicLink}
              style={{
                backgroundColor: "#52c41a",
                borderColor: "#52c41a",
                color: "white",
              }}
            >
              Copy Link
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={downloadCSV}
              style={{
                backgroundColor: "#722ed1",
                borderColor: "#722ed1",
                color: "white",
              }}
            >
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      <Card className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-600">Campaign Progress</span>
          <span className="text-gray-900 font-semibold">
            {campaign.stats.sent + campaign.stats.failed} /{" "}
            {campaign.totalRecipients} emails
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
            value={campaign.stats.sent}
            prefix={<MailOutlined />}
            valueStyle={{ color: "#1890ff" }}
          />
        </Card>
        <Card>
          <Statistic
            title="Opened"
            value={campaign.stats.opened}
            suffix={`(${campaign.stats.openRate}%)`}
            prefix={<EyeOutlined />}
            valueStyle={{ color: "#52c41a" }}
          />
        </Card>
        <Card>
          <Statistic
            title="Replied"
            value={campaign.stats.replied}
            suffix={`(${campaign.stats.replyRate}%)`}
            prefix={<MessageOutlined />}
            valueStyle={{ color: "#722ed1" }}
          />
        </Card>
        {/* Failed Card - ONLY visible to admin/subadmin */}
        {isAdminOrSubadmin ? (
          <Card>
            <Statistic
              title="Failed"
              value={campaign.stats.failed}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: "#ff4d4f" }}
            />
          </Card>
        ) : (
          <Card>
            <Statistic
              title="Delivered"
              value={campaign.stats.delivered}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <Statistic
            title="Pending"
            value={campaign.stats.pending}
            prefix={<ClockCircleOutlined />}
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
            title="Delivery Rate"
            value={campaign.stats.deliveryRate}
            suffix="%"
          />
        </Card>
        <Card>
          <Statistic
            title="Reply Rate"
            value={campaign.stats.replyRate}
            suffix="%"
          />
        </Card>
      </div>

      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>
    </div>
  );
}
