"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  Statistic,
  Progress,
  Spin,
  Tag,
  Button,
  Table,
  Badge,
  Modal,
  message,
  Row,
  Col,
} from "antd";
import {
  MailOutlined,
  EyeOutlined,
  MessageOutlined,
  CheckCircleOutlined,
  UserOutlined,
  TeamOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  FileTextOutlined,
  SendOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
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
    failed: number;
    pending: number;
    deliveryRate: number;
    openRate: number;
    replyRate: number;
    uniqueOpened?: number;
    uniqueResponded?: number;
    totalFollowUpsSent?: number;
    deliveredNotOpened?: number;
    openedNotReplied?: number;
  };
  aggregates: {
    typeCounts: {
      investor: number;
      incubator: number;
    };
  };
  uniqueOpeners?: any[];
  uniqueRepliers?: any[];
  createdAt: string;
}

interface PublicRecipient {
  name: string;
  email: string;
  organization: string;
  type: string;
  status: string;
  matchScore: number;
  opened: boolean;
  replied: boolean;
  openCount: number;
  sentAt: string;
  deliveredAt: string;
  openedAt: string;
  repliedAt: string;
  uniqueOpeners?: Array<{
    name: string;
    email: string;
    totalOpens: number;
  }>;
  uniqueRepliers?: Array<{
    name: string;
    email: string;
    organization: string;
    totalReplies: number;
  }>;
}

export default function CampaignReportPage() {
  const params = useParams();
  const token = params.token as string;

  const [campaign, setCampaign] = useState<PublicCampaign | null>(null);
  const [recipients, setRecipients] = useState<PublicRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
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
      setModalVisible(true);
    } catch (error: any) {
      console.error("Fetch recipients error:", error);
      message.error("Failed to load recipients");
    } finally {
      setRecipientsLoading(false);
    }
  };

  const handleExport = () => {
    const exportUrl = `${API_BASE_URL}/campaigns/public/${token}/export`;
    window.open(exportUrl, "_blank");
    message.success("Exporting campaign data...");
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "green",
      completed: "blue",
      paused: "orange",
      pending: "default",
      delivered: "cyan",
      opened: "purple",
      replied: "green",
      failed: "red",
    };
    return colors[status] || "default";
  };

  const getTypeColor = (type: string) => {
    return type === "investor" ? "blue" : "green";
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

  const detailedColumns = [
    {
      title: "Recipient Name",
      key: "name",
      width: 180,
      fixed: "left" as const,
      render: (_: any, record: PublicRecipient) => (
        <div>
          <p className="font-semibold text-gray-900">{record.name}</p>
          <p className="text-xs text-gray-500">{record.email}</p>
        </div>
      ),
    },
    {
      title: "Organization",
      dataIndex: "organization",
      key: "organization",
      width: 180,
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 110,
      align: "center" as const,
      render: (type: string) => (
        <Tag color={getTypeColor(type)}>
          {type === "investor" ? "Investor" : "Incubator"}
        </Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      align: "center" as const,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag>
      ),
    },
    {
      title: "Total Opens",
      dataIndex: "openCount",
      key: "openCount",
      width: 100,
      align: "center" as const,
      render: (count: number) => (
        <Badge
          count={count}
          showZero
          style={{ backgroundColor: count > 0 ? "#52c41a" : "#d9d9d9" }}
        />
      ),
    },
    {
      title: "WHO Opened (Names)",
      key: "whoOpenedNames",
      width: 200,
      render: (_: any, record: any) => {
        const openers = record.uniqueOpeners || [];
        if (openers.length === 0)
          return <span className="text-gray-400">-</span>;

        const names = openers.map((o: any) => o.name).join(", ");
        return (
          <div className="text-sm">
            <p className="text-gray-800">{names}</p>
          </div>
        );
      },
    },
    {
      title: "WHO Opened (Emails)",
      key: "whoOpenedEmails",
      width: 220,
      render: (_: any, record: any) => {
        const openers = record.uniqueOpeners || [];
        if (openers.length === 0)
          return <span className="text-gray-400">-</span>;

        const emails = openers.map((o: any) => o.email).join(", ");
        return <div className="text-xs text-blue-600">{emails}</div>;
      },
    },
    {
      title: "Total Replies",
      key: "totalReplies",
      width: 100,
      align: "center" as const,
      render: (_: any, record: any) => {
        const repliers = record.uniqueRepliers || [];
        const totalReplies = repliers.reduce(
          (sum: number, r: any) => sum + (r.totalReplies || 0),
          0
        );

        return totalReplies > 0 ? (
          <Badge count={totalReplies} style={{ backgroundColor: "#722ed1" }} />
        ) : (
          <span className="text-gray-400">0</span>
        );
      },
    },
    {
      title: "WHO Replied (Names)",
      key: "whoRepliedNames",
      width: 200,
      render: (_: any, record: any) => {
        const repliers = record.uniqueRepliers || [];
        if (repliers.length === 0)
          return <span className="text-gray-400">-</span>;

        const names = repliers.map((r: any) => r.name).join(", ");
        return (
          <div className="text-sm text-green-700 font-semibold">{names}</div>
        );
      },
    },
    {
      title: "WHO Replied (Emails)",
      key: "whoRepliedEmails",
      width: 220,
      render: (_: any, record: any) => {
        const repliers = record.uniqueRepliers || [];
        if (repliers.length === 0)
          return <span className="text-gray-400">-</span>;

        const emails = repliers.map((r: any) => r.email).join(", ");
        return <div className="text-xs text-purple-600">{emails}</div>;
      },
    },
    {
      title: "WHO Replied (Organizations)",
      key: "whoRepliedOrgs",
      width: 220,
      render: (_: any, record: any) => {
        const repliers = record.uniqueRepliers || [];
        if (repliers.length === 0)
          return <span className="text-gray-400">-</span>;

        const orgs = repliers.map((r: any) => r.organization).join(", ");
        return <div className="text-sm text-gray-600">{orgs}</div>;
      },
    },
    {
      title: "Sent At",
      dataIndex: "sentAt",
      key: "sentAt",
      width: 150,
      render: (date: string) => (
        <span className="text-xs text-gray-500">{formatDateTime(date)}</span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Spin size="large" tip="Loading campaign report..." />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="text-center shadow-lg">
          <CloseCircleOutlined className="text-red-500 text-6xl mb-4" />
          <p className="text-gray-700 text-lg mb-4">
            {error || "Campaign report not found"}
          </p>
        </Card>
      </div>
    );
  }

  const progress =
    campaign.totalRecipients > 0
      ? Math.round((campaign.stats.sent / campaign.totalRecipients) * 100)
      : 0;

  const remaining = campaign.totalRecipients - campaign.stats.sent;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-block bg-white rounded-2xl shadow-xl px-8 py-6 mb-4">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
              {campaign.campaignName}
            </h1>
            <p className="text-gray-600 text-xl">{campaign.clientName}</p>
            <div className="mt-4">
              <Tag
                color={getStatusColor(campaign.status)}
                className="text-lg px-4 py-2"
              >
                {campaign.status.toUpperCase()}
              </Tag>
            </div>
          </div>
        </div>

        {/* Main Stats Grid - 6 Cards */}
        <Row gutter={[16, 16]} className="mb-8">
          <Col xs={24} sm={12} lg={8}>
            <Card className="shadow-lg hover:shadow-xl transition-shadow">
              <Statistic
                title={
                  <span className="text-base font-semibold">
                    Total Emails Sent
                  </span>
                }
                value={campaign.stats.sent}
                prefix={<SendOutlined className="text-blue-500" />}
                valueStyle={{
                  color: "#1890ff",
                  fontSize: "2.5rem",
                  fontWeight: "bold",
                }}
              />
              <div className="mt-2 text-sm text-gray-500">
                out of {campaign.totalRecipients} recipients
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Card className="shadow-lg hover:shadow-xl transition-shadow">
              <Statistic
                title={
                  <span className="text-base font-semibold">
                    Emails Remaining
                  </span>
                }
                value={remaining}
                prefix={<ClockCircleOutlined className="text-orange-500" />}
                valueStyle={{
                  color: "#fa8c16",
                  fontSize: "2.5rem",
                  fontWeight: "bold",
                }}
              />
              <div className="mt-2 text-sm text-gray-500">
                {Math.round((remaining / campaign.totalRecipients) * 100)}%
                pending
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Card className="shadow-lg hover:shadow-xl transition-shadow">
              <Statistic
                title={
                  <span className="text-base font-semibold">
                    Follow-ups Sent
                  </span>
                }
                value={campaign.stats.totalFollowUpsSent || 0}
                prefix={<ReloadOutlined className="text-purple-500" />}
                valueStyle={{
                  color: "#722ed1",
                  fontSize: "2.5rem",
                  fontWeight: "bold",
                }}
              />
              <div className="mt-2 text-sm text-purple-600 font-semibold">
                Reminders sent
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Card className="shadow-lg hover:shadow-xl transition-shadow">
              <Statistic
                title={
                  <span className="text-base font-semibold">
                    Unique Openers
                  </span>
                }
                value={campaign.stats.uniqueOpened || campaign.stats.opened}
                prefix={<EyeOutlined className="text-green-500" />}
                valueStyle={{
                  color: "#52c41a",
                  fontSize: "2.5rem",
                  fontWeight: "bold",
                }}
                suffix={
                  <span className="text-xl">/ {campaign.stats.delivered}</span>
                }
              />
              <div className="mt-2 text-sm font-semibold text-green-600">
                {campaign.stats.openRate}% open rate
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Card className="shadow-lg hover:shadow-xl transition-shadow">
              <Statistic
                title={
                  <span className="text-base font-semibold">
                    Unique Repliers
                  </span>
                }
                value={campaign.stats.uniqueResponded || campaign.stats.replied}
                prefix={<MessageOutlined className="text-purple-500" />}
                valueStyle={{
                  color: "#722ed1",
                  fontSize: "2.5rem",
                  fontWeight: "bold",
                }}
                suffix={
                  <span className="text-xl">/ {campaign.stats.delivered}</span>
                }
              />
              <div className="mt-2 text-sm font-semibold text-purple-600">
                {campaign.stats.replyRate}% reply rate
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Card className="shadow-lg hover:shadow-xl transition-shadow">
              <Statistic
                title={
                  <span className="text-base font-semibold">Failed Emails</span>
                }
                value={campaign.stats.failed || 0}
                prefix={<CloseCircleOutlined className="text-red-500" />}
                valueStyle={{
                  color: "#ff4d4f",
                  fontSize: "2.5rem",
                  fontWeight: "bold",
                }}
              />
              <div className="mt-2 text-sm text-red-500">
                Delivery rate: {campaign.stats.deliveryRate}%
              </div>
            </Card>
          </Col>
        </Row>

        {/* Progress Bar */}
        <Card className="mb-8 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-lg font-semibold text-gray-700">
              Campaign Progress
            </span>
            <span className="text-lg font-bold text-gray-900">
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
            strokeWidth={12}
          />
        </Card>

        {/* Engagement Breakdown */}
        <Row gutter={[16, 16]} className="mb-8">
          <Col xs={24} sm={12} lg={6}>
            <Card className="text-center shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {campaign.stats.delivered}
              </div>
              <div className="text-gray-700 font-semibold">Delivered</div>
              <div className="text-sm text-gray-500 mt-1">
                {campaign.stats.deliveryRate}%
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card className="text-center shadow-lg bg-gradient-to-br from-yellow-50 to-yellow-100">
              <div className="text-4xl font-bold text-yellow-600 mb-2">
                {campaign.stats.deliveredNotOpened || 0}
              </div>
              <div className="text-gray-700 font-semibold">Not Opened</div>
              <div className="text-sm text-gray-500 mt-1">Need follow-up</div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card className="text-center shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
              <div className="text-4xl font-bold text-purple-600 mb-2">
                {campaign.stats.openedNotReplied || 0}
              </div>
              <div className="text-gray-700 font-semibold">Opened No Reply</div>
              <div className="text-sm text-gray-500 mt-1">
                Awaiting response
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card className="text-center shadow-lg bg-gradient-to-br from-green-50 to-green-100">
              <div className="text-4xl font-bold text-green-600 mb-2">
                {campaign.stats.replied}
              </div>
              <div className="text-gray-700 font-semibold">Replied</div>
              <div className="text-sm text-gray-500 mt-1">
                {campaign.stats.replyRate}% conversion
              </div>
            </Card>
          </Col>
        </Row>

        {/* WHO Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* WHO Opened */}
          <Card
            title={
              <span className="text-xl font-bold">
                👁️ WHO Opened ({campaign.stats.uniqueOpened || 0})
              </span>
            }
            className="shadow-lg"
          >
            {campaign.uniqueOpeners && campaign.uniqueOpeners.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {campaign.uniqueOpeners
                  .slice(0, 10)
                  .map((opener: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">
                          {opener.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {opener.organization}
                        </p>
                      </div>
                      <Badge
                        count={opener.totalOpens}
                        style={{ backgroundColor: "#52c41a" }}
                      />
                    </div>
                  ))}
                {campaign.uniqueOpeners.length > 10 && (
                  <p className="text-center text-sm text-gray-500 pt-2">
                    +{campaign.uniqueOpeners.length - 10} more opened
                  </p>
                )}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No opens yet</p>
            )}
          </Card>

          {/* WHO Replied */}
          <Card
            title={
              <span className="text-xl font-bold">
                💬 WHO Replied ({campaign.stats.uniqueResponded || 0})
              </span>
            }
            className="shadow-lg"
          >
            {campaign.uniqueRepliers && campaign.uniqueRepliers.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {campaign.uniqueRepliers.map((replier: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">
                        {replier.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {replier.organization}
                      </p>
                    </div>
                    <CheckCircleOutlined className="text-green-600 text-2xl" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No replies yet</p>
            )}
          </Card>
        </div>

        {/* Target Breakdown */}
        <Card title="🎯 Target Audience" className="mb-8 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex justify-between items-center p-6 bg-gradient-to-r from-blue-100 to-blue-50 rounded-xl">
              <span className="flex items-center gap-3">
                <UserOutlined className="text-blue-600 text-3xl" />
                <span className="font-bold text-2xl text-gray-800">
                  Investors
                </span>
              </span>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600">
                  {campaign.aggregates.typeCounts.investor || 0}
                </div>
                <div className="text-sm text-gray-600">
                  {Math.round(
                    ((campaign.aggregates.typeCounts.investor || 0) /
                      campaign.totalRecipients) *
                      100
                  )}
                  % of total
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center p-6 bg-gradient-to-r from-green-100 to-green-50 rounded-xl">
              <span className="flex items-center gap-3">
                <TeamOutlined className="text-green-600 text-3xl" />
                <span className="font-bold text-2xl text-gray-800">
                  Incubators
                </span>
              </span>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-600">
                  {campaign.aggregates.typeCounts.incubator || 0}
                </div>
                <div className="text-sm text-gray-600">
                  {Math.round(
                    ((campaign.aggregates.typeCounts.incubator || 0) /
                      campaign.totalRecipients) *
                      100
                  )}
                  % of total
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mb-8">
          <Button
            type="primary"
            size="large"
            icon={<FileTextOutlined />}
            onClick={fetchRecipients}
            loading={recipientsLoading}
            style={{
              backgroundColor: "#1890ff",
              borderColor: "#1890ff",
              height: "56px",
              fontSize: "18px",
              paddingLeft: "40px",
              paddingRight: "40px",
              fontWeight: "600",
            }}
          >
            View Full Report
          </Button>

          <Button
            size="large"
            icon={<DownloadOutlined />}
            onClick={handleExport}
            style={{
              height: "56px",
              fontSize: "18px",
              paddingLeft: "40px",
              paddingRight: "40px",
              fontWeight: "600",
            }}
          >
            Export to CSV
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-600">
          <p className="text-lg mb-2">
            Campaign started on{" "}
            <strong>{formatDate(campaign.createdAt)}</strong>
          </p>
          <p className="text-sm">
            This is a public report generated by the Email Campaign System
          </p>
        </div>
      </div>

      {/* Full Report Modal */}
      <Modal
        title={
          <div className="text-2xl font-bold">
            <FileTextOutlined className="mr-2" />
            Full Campaign Report - Detailed View
          </div>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        width={1400}
        footer={[
          <Button
            key="export"
            icon={<DownloadOutlined />}
            onClick={handleExport}
            size="large"
            style={{
              backgroundColor: "#52c41a",
              borderColor: "#52c41a",
              color: "white",
            }}
          >
            Export to CSV
          </Button>,
          <Button
            key="close"
            size="large"
            onClick={() => setModalVisible(false)}
          >
            Close
          </Button>,
        ]}
      >
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>Total Recipients:</strong> {recipients.length} |{" "}
            <strong>Showing:</strong> All recipients with detailed engagement
            data
          </p>
        </div>

        <Table
          columns={detailedColumns}
          dataSource={recipients}
          rowKey={(record, index) => `${record.email}-${index}`}
          loading={recipientsLoading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50", "100"],
            showTotal: (total) => `Total ${total} recipients`,
          }}
          scroll={{ x: 2200 }}
          bordered
          size="middle"
        />
      </Modal>
    </div>
  );
}
