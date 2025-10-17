"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  Statistic,
  Progress,
  Spin,
  Tag,
  Descriptions,
  Button,
  Table,
  Badge,
} from "antd";
import {
  MailOutlined,
  EyeOutlined,
  MessageOutlined,
  CheckCircleOutlined,
  UserOutlined,
  TeamOutlined,
  EyeInvisibleOutlined,
} from "@ant-design/icons";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface PublicCampaign {
  campaignName: string;
  clientName: string;
  status: string;
  targetType: string;
  totalRecipients: number;
  stats: {
    sent: number;
    delivered: number;
    opened: number;
    replied: number;
    deliveryRate: number;
    openRate: number;
    replyRate: number;
  };
  aggregates: {
    typeCounts: {
      investor: number;
      incubator: number;
    };
  };
  createdAt: string;
}

interface PublicRecipient {
  name: string;
  organization: string;
  type: string;
  status: string;
  matchScore: number;
  opened: boolean;
  replied: boolean;
}

export default function CampaignReportPage() {
  const params = useParams();
  const token = params.token as string;

  const [campaign, setCampaign] = useState<PublicCampaign | null>(null);
  const [recipients, setRecipients] = useState<PublicRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [showRecipients, setShowRecipients] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPublicReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchPublicReport = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/campaigns/public/${token}`);

      if (!response.ok) {
        throw new Error("Campaign report not found");
      }

      const data = await response.json();
      setCampaign(data.campaign);
    } catch (error: any) {
      console.error("Fetch public report error:", error);
      setError(error.message || "Failed to load campaign report");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecipients = async () => {
    try {
      setRecipientsLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/campaigns/public/${token}/recipients`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch recipients");
      }

      const data = await response.json();
      setRecipients(data.recipients || []);
      setShowRecipients(true);
    } catch (error: any) {
      console.error("Fetch recipients error:", error);
    } finally {
      setRecipientsLoading(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Spin size="large" tip="Loading campaign report..." />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 mb-4">
            {error || "Campaign report not found"}
          </p>
        </div>
      </div>
    );
  }

  const progress =
    campaign.totalRecipients > 0
      ? Math.round((campaign.stats.sent / campaign.totalRecipients) * 100)
      : 0;

  const recipientColumns = [
    {
      title: "Contact Information",
      key: "contact",
      width: 250,
      render: (_: any, record: PublicRecipient) => (
        <div>
          <p className="font-semibold text-gray-900">{record.name}</p>
          <p className="text-sm text-gray-600">{record.organization}</p>
        </div>
      ),
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 120,
      align: "center" as const,
      render: (type: string) => (
        <Tag color={getTypeColor(type)}>
          {type === "investor" ? "Investor" : "Incubator"}
        </Tag>
      ),
    },
    {
      title: "Match Score",
      dataIndex: "matchScore",
      key: "matchScore",
      width: 120,
      align: "center" as const,
      render: (score: number) => (
        <Badge
          count={score}
          showZero
          color={score >= 80 ? "green" : score >= 60 ? "orange" : "red"}
        />
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      align: "center" as const,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag>
      ),
    },
    {
      title: "Engagement",
      key: "engagement",
      width: 150,
      align: "center" as const,
      render: (_: any, record: PublicRecipient) => (
        <div className="flex gap-3 justify-center">
          <div className="flex flex-col items-center">
            {record.opened ? (
              <EyeOutlined className="text-green-600 text-lg" />
            ) : (
              <EyeInvisibleOutlined className="text-gray-300 text-lg" />
            )}
            <span className="text-xs text-gray-500">
              {record.opened ? "Opened" : "Not Opened"}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <MessageOutlined 
              className={record.replied ? "text-green-600 text-lg" : "text-gray-300 text-lg"} 
            />
            <span className="text-xs text-gray-500">
              {record.replied ? "Replied" : "No Reply"}
            </span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {campaign.campaignName}
          </h1>
          <p className="text-gray-600 text-lg">{campaign.clientName}</p>
          <div className="mt-3">
            <Tag color={getStatusColor(campaign.status)}>
              {campaign.status.toUpperCase()}
            </Tag>
          </div>
        </div>

        {/* Campaign Info */}
        <Card className="mb-6">
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Target Type" span={2}>
              <Tag
                color={
                  campaign.targetType === "both"
                    ? "purple"
                    : campaign.targetType === "investors"
                    ? "blue"
                    : "green"
                }
              >
                {campaign.targetType === "both"
                  ? "Investors & Incubators"
                  : campaign.targetType === "investors"
                  ? "Investors Only"
                  : "Incubators Only"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Total Recipients">
              {campaign.totalRecipients}
            </Descriptions.Item>
            <Descriptions.Item label="Campaign Started">
              {formatDate(campaign.createdAt)}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* Progress */}
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 font-semibold">Campaign Progress</span>
            <span className="text-gray-900 font-semibold">
              {campaign.stats.sent} / {campaign.totalRecipients} emails sent
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

        {/* Stats */}
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
          <Card>
            <Statistic
              title="Delivered"
              value={campaign.stats.delivered}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </div>

        {/* Target Breakdown */}
        {campaign.aggregates && (
          <Card title="Target Audience Breakdown" className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                <span className="flex items-center gap-3">
                  <UserOutlined className="text-blue-600 text-xl" />
                  <span className="font-semibold text-lg">Investors</span>
                </span>
                <Tag color="blue" className="text-lg px-4 py-2">
                  {campaign.aggregates.typeCounts.investor || 0} (
                  {Math.round(
                    ((campaign.aggregates.typeCounts.investor || 0) /
                      campaign.totalRecipients) *
                      100
                  )}
                  %)
                </Tag>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                <span className="flex items-center gap-3">
                  <TeamOutlined className="text-green-600 text-xl" />
                  <span className="font-semibold text-lg">Incubators</span>
                </span>
                <Tag color="green" className="text-lg px-4 py-2">
                  {campaign.aggregates.typeCounts.incubator || 0} (
                  {Math.round(
                    ((campaign.aggregates.typeCounts.incubator || 0) /
                      campaign.totalRecipients) *
                      100
                  )}
                  %)
                </Tag>
              </div>
            </div>
          </Card>
        )}

        {/* Performance Rates */}
        <Card title="Campaign Performance" className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {campaign.stats.deliveryRate}%
              </div>
              <div className="text-gray-700 font-medium">Delivery Rate</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-4xl font-bold text-green-600 mb-2">
                {campaign.stats.openRate}%
              </div>
              <div className="text-gray-700 font-medium">Open Rate</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-4xl font-bold text-purple-600 mb-2">
                {campaign.stats.replyRate}%
              </div>
              <div className="text-gray-700 font-medium">Reply Rate</div>
            </div>
          </div>
        </Card>

        {/* Recipients Section */}
        <Card
          title={`Recipients List (${campaign.totalRecipients})`}
          className="mb-6"
        >
          {!showRecipients ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">
                View detailed recipient information including names, organizations,
                and engagement status
              </p>
              <Button
                type="primary"
                size="large"
                onClick={fetchRecipients}
                loading={recipientsLoading}
                icon={<EyeOutlined />}
                style={{
                  backgroundColor: "#1890ff",
                  borderColor: "#1890ff",
                }}
              >
                View Recipients Details
              </Button>
            </div>
          ) : (
            <Table
              columns={recipientColumns}
              dataSource={recipients}
              rowKey={(record, index) => `${record.name}-${record.organization}-${index}`}
              loading={recipientsLoading}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                pageSizeOptions: ["10", "20", "50", "100"],
                showTotal: (total) => `Total ${total} recipients`,
              }}
              scroll={{ x: 800 }}
            />
          )}
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p className="mb-2">
            Campaign started on {formatDate(campaign.createdAt)}
          </p>
          <p>This is a public report generated by the Email Campaign System</p>
          <p className="mt-4 text-xs text-gray-400">
            Note: Email addresses and contact details are hidden for privacy
          </p>
        </div>
      </div>
    </div>
  );
}
