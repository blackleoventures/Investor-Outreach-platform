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
  Modal,
  message,
  Row,
  Col,
} from "antd";
import {
  MessageOutlined,
  UserOutlined,
  TeamOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  FileTextOutlined,
  SendOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
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
  matchScore: number;
  opened: boolean;
  replied: boolean;
  uniqueOpeners?: Array<{
    name: string;
    email: string;
  }>;
  uniqueRepliers?: Array<{
    name: string;
    email: string;
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

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const detailedColumns = [
    {
      title: "Founder Name",
      key: "name",
      width: 180,
      fixed: "left" as const,
      render: (_: any, record: PublicRecipient) => (
        <div>
          <p className="font-semibold text-gray-900">{record.name}</p>
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
  ];

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
        <Card className="text-center shadow-md max-w-md">
          <CloseCircleOutlined className="text-red-500 text-5xl mb-4" />
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
    <div className="min-h-screen bg-gray-50 py-6 sm:py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-4 sm:px-6 md:px-8 py-4 sm:py-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                {campaign.campaignName}
              </h1>
              <p className="text-sm sm:text-base text-gray-600">{campaign.clientName}</p>
            </div>
            <div className="flex items-center gap-3">
              <Tag
                color={getStatusColor(campaign.status)}
                className="text-sm sm:text-base px-3 py-1"
              >
                {campaign.status.toUpperCase()}
              </Tag>
            </div>
          </div>
        </div>

        {/* Main Stats Grid */}
        <Row gutter={[12, 12]} className="mb-6 sm:mb-8">
          <Col xs={24} sm={12} lg={8}>
            <Card className="shadow-sm border border-gray-200 h-full">
              <Statistic
                title={
                  <span className="text-sm sm:text-base font-medium text-gray-600">
                    Firms Contacted
                  </span>
                }
                value={campaign.stats.sent}
                prefix={<SendOutlined className="text-gray-700" />}
                valueStyle={{
                  color: "#1f2937",
                  fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
                  fontWeight: "600",
                }}
              />
              <div className="mt-2 text-xs sm:text-sm text-gray-500">
                of {campaign.totalRecipients} total firms
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Card className="shadow-sm border border-gray-200 h-full">
              <Statistic
                title={
                  <span className="text-sm sm:text-base font-medium text-gray-600">
                    Remaining Firms to Contact
                  </span>
                }
                value={remaining}
                prefix={<ClockCircleOutlined className="text-gray-700" />}
                valueStyle={{
                  color: "#1f2937",
                  fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
                  fontWeight: "600",
                }}
              />
              <div className="mt-2 text-xs sm:text-sm text-gray-500">
                {Math.round((remaining / campaign.totalRecipients) * 100)}% pending outreach
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Card className="shadow-sm border border-gray-200 h-full">
              <Statistic
                title={
                  <span className="text-sm sm:text-base font-medium text-gray-600">
                    Follow-up Outreaches Sent
                  </span>
                }
                value={campaign.stats.totalFollowUpsSent || 0}
                prefix={<ReloadOutlined className="text-gray-700" />}
                valueStyle={{
                  color: "#1f2937",
                  fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
                  fontWeight: "600",
                }}
              />
              <div className="mt-2 text-xs sm:text-sm text-gray-500">
                Follow-up reminders sent
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={24} lg={24}>
            <Card className="shadow-sm border border-gray-200 h-full">
              <Statistic
                title={
                  <span className="text-sm sm:text-base font-medium text-gray-600">
                    People Who Have Responded to Outreaches
                  </span>
                }
                value={campaign.stats.uniqueResponded || campaign.stats.replied}
                prefix={<MessageOutlined className="text-gray-700" />}
                valueStyle={{
                  color: "#1f2937",
                  fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
                  fontWeight: "600",
                }}
              />
              <div className="mt-2 text-xs sm:text-sm font-medium text-gray-700">
                {campaign.stats.replyRate}% response rate
              </div>
            </Card>
          </Col>
        </Row>

        {/* Progress Bar */}
        <Card className="mb-6 sm:mb-8 shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <span className="text-base sm:text-lg font-semibold text-gray-800">
              Campaign Progress
            </span>
            <span className="text-base sm:text-lg font-semibold text-gray-900">
              {campaign.stats.sent} of {campaign.totalRecipients} firms contacted
            </span>
          </div>
          <Progress
            percent={progress}
            status={campaign.status === "completed" ? "success" : "active"}
            strokeColor="#1f2937"
            strokeWidth={10}
          />
        </Card>

        {/* Target Breakdown */}
        {(() => {
          const investorCount = campaign.aggregates.typeCounts.investor || 0;
          const incubatorCount = campaign.aggregates.typeCounts.incubator || 0;
          const hasInvestors = investorCount > 0;
          const hasIncubators = incubatorCount > 0;
          const hasBoth = hasInvestors && hasIncubators;

          if (!hasInvestors && !hasIncubators) return null;

          return (
            <Card className="mb-6 sm:mb-8 shadow-sm border border-gray-200">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Target Audience</h3>
              
              {hasBoth ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 mb-4">
                    You selected both Investors and Incubators for this campaign
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex justify-between items-center p-4 bg-white border-2 border-gray-300 rounded-lg">
                      <span className="flex items-center gap-2 sm:gap-3">
                        <UserOutlined className="text-gray-700 text-xl" />
                        <span className="font-semibold text-base sm:text-lg text-gray-900">
                          Investors
                        </span>
                      </span>
                      <div className="text-right">
                        <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                          {investorCount}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600">
                          {Math.round((investorCount / campaign.totalRecipients) * 100)}% of total
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center p-4 bg-white border-2 border-gray-300 rounded-lg">
                      <span className="flex items-center gap-2 sm:gap-3">
                        <TeamOutlined className="text-gray-700 text-xl" />
                        <span className="font-semibold text-base sm:text-lg text-gray-900">
                          Incubators
                        </span>
                      </span>
                      <div className="text-right">
                        <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                          {incubatorCount}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600">
                          {Math.round((incubatorCount / campaign.totalRecipients) * 100)}% of total
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : hasInvestors ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 mb-4">
                    You selected Investors only for this campaign
                  </p>
                  <div className="flex justify-center">
                    <div className="w-full max-w-md">
                      <div className="flex justify-between items-center p-4 sm:p-6 bg-white border-2 border-gray-300 rounded-lg">
                        <span className="flex items-center gap-2 sm:gap-3">
                          <UserOutlined className="text-gray-700 text-xl sm:text-2xl" />
                          <span className="font-semibold text-lg sm:text-xl text-gray-900">
                            Investors
                          </span>
                        </span>
                        <div className="text-right">
                          <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                            {investorCount}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-600">
                            100% of campaign
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 mb-4">
                    You selected Incubators only for this campaign
                  </p>
                  <div className="flex justify-center">
                    <div className="w-full max-w-md">
                      <div className="flex justify-between items-center p-4 sm:p-6 bg-white border-2 border-gray-300 rounded-lg">
                        <span className="flex items-center gap-2 sm:gap-3">
                          <TeamOutlined className="text-gray-700 text-xl sm:text-2xl" />
                          <span className="font-semibold text-lg sm:text-xl text-gray-900">
                            Incubators
                          </span>
                        </span>
                        <div className="text-right">
                          <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                            {incubatorCount}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-600">
                            100% of campaign
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })()}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Button
            type="primary"
            size="large"
            icon={<FileTextOutlined />}
            onClick={fetchRecipients}
            loading={recipientsLoading}
            className="w-full sm:w-auto"
            style={{
              backgroundColor: "#1f2937",
              borderColor: "#1f2937",
              height: "48px",
              fontSize: "16px",
              fontWeight: "500",
            }}
          >
            View Full Report
          </Button>

          <Button
            size="large"
            icon={<DownloadOutlined />}
            onClick={handleExport}
            className="w-full sm:w-auto"
            style={{
              height: "48px",
              fontSize: "16px",
              fontWeight: "500",
              borderColor: "#d1d5db",
            }}
          >
            Export to CSV
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 sm:mt-12 text-gray-600 px-4">
          <p className="text-sm sm:text-base mb-2">
            Campaign started on <strong>{formatDate(campaign.createdAt)}</strong>
          </p>
          <p className="text-xs sm:text-sm text-gray-500">
            Email Campaign System Report
          </p>
        </div>
      </div>

      {/* Full Report Modal */}
      <Modal
        title={
          <div className="text-lg sm:text-xl font-semibold">
            <FileTextOutlined className="mr-2" />
            Full Campaign Report
          </div>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        width="95vw"
        style={{ maxWidth: "1200px", top: 20 }}
        footer={[
          <Button
            key="export"
            icon={<DownloadOutlined />}
            onClick={handleExport}
            size="large"
            style={{
              backgroundColor: "#1f2937",
              borderColor: "#1f2937",
              color: "white",
            }}
          >
            Export CSV
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
        <div className="mb-4 p-3 sm:p-4 bg-gray-50 border border-gray-200 rounded">
          <p className="text-xs sm:text-sm text-gray-700">
            <strong>Total Recipients:</strong> {recipients.length} | <strong>Showing:</strong> All recipients with engagement data
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
          scroll={{ x: 1000 }}
          bordered
          size="middle"
        />
      </Modal>
    </div>
  );
}
