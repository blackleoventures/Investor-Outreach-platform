"use client";

import React, { useState, useEffect } from "react";
import { Card, Row, Col, Progress, Table, Tag, Statistic, Select, DatePicker, Button } from "antd";
import { TrendingUpOutlined, MailOutlined, EyeOutlined, DownloadOutlined, MessageOutlined, UserOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "/api";
const { RangePicker } = DatePicker;
const { Option } = Select;

interface EngagementMetrics {
  totalInvestors: number;
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;
  decksViewed: number;
  decksDownloaded: number;
  repliesReceived: number;
  averageEngagementScore: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  conversionFunnel: {
    contacted: number;
    opened: number;
    clicked: number;
    viewed: number;
    downloaded: number;
    replied: number;
  };
  topPerformingEmails: Array<{
    subject: string;
    openRate: number;
    clickRate: number;
    replyRate: number;
    sentCount: number;
  }>;
  investorEngagement: Array<{
    investorId: string;
    investorName: string;
    partnerName: string;
    partnerEmail: string;
    engagementScore: number;
    emailsSent: number;
    emailsOpened: number;
    deckViewed: boolean;
    deckDownloaded: boolean;
    replied: boolean;
    lastActivity: Date;
    status: "hot" | "warm" | "cold" | "unresponsive";
  }>;
}

interface EngagementAnalyticsProps {
  dealRoomId?: string;
  companyId?: string;
}

export default function EngagementAnalytics({ dealRoomId, companyId }: EngagementAnalyticsProps) {
  const [metrics, setMetrics] = useState<EngagementMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState("30d");
  const [selectedMetric, setSelectedMetric] = useState("engagement");

  useEffect(() => {
    if (dealRoomId || companyId) {
      fetchAnalytics();
    }
  }, [dealRoomId, companyId, timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const endpoint = dealRoomId 
        ? `${BACKEND_URL}/deal-rooms/${dealRoomId}/analytics`
        : `${BACKEND_URL}/analytics/company/${companyId}`;
      
      const response = await fetch(`${endpoint}?timeRange=${timeRange}`);
      const data = await response.json();
      
      if (data.success) {
        setMetrics(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      // Mock data for demo
      setMetrics({
        totalInvestors: 45,
        emailsSent: 120,
        emailsOpened: 78,
        emailsClicked: 32,
        decksViewed: 28,
        decksDownloaded: 15,
        repliesReceived: 8,
        averageEngagementScore: 67,
        openRate: 65,
        clickRate: 27,
        replyRate: 7,
        conversionFunnel: {
          contacted: 45,
          opened: 35,
          clicked: 18,
          viewed: 15,
          downloaded: 8,
          replied: 5
        },
        topPerformingEmails: [
          { subject: "Investment Opportunity in AI Startup", openRate: 85, clickRate: 45, replyRate: 12, sentCount: 25 },
          { subject: "Series A Funding - $2M Round", openRate: 72, clickRate: 38, replyRate: 8, sentCount: 30 },
          { subject: "Disrupting Healthcare with AI", openRate: 68, clickRate: 25, replyRate: 5, sentCount: 20 }
        ],
        investorEngagement: [
          {
            investorId: "1",
            investorName: "Sequoia Capital",
            partnerName: "John Smith",
            partnerEmail: "john@sequoia.com",
            engagementScore: 95,
            emailsSent: 3,
            emailsOpened: 3,
            deckViewed: true,
            deckDownloaded: true,
            replied: true,
            lastActivity: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            status: "hot"
          },
          {
            investorId: "2",
            investorName: "Andreessen Horowitz",
            partnerName: "Sarah Johnson",
            partnerEmail: "sarah@a16z.com",
            engagementScore: 78,
            emailsSent: 2,
            emailsOpened: 2,
            deckViewed: true,
            deckDownloaded: false,
            replied: false,
            lastActivity: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            status: "warm"
          }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "hot": return "red";
      case "warm": return "orange";
      case "cold": return "blue";
      case "unresponsive": return "gray";
      default: return "default";
    }
  };

  const getEngagementColor = (score: number) => {
    if (score >= 80) return "#52c41a";
    if (score >= 60) return "#faad14";
    if (score >= 40) return "#fa8c16";
    return "#ff4d4f";
  };

  const investorColumns = [
    {
      title: "Investor",
      key: "investor",
      render: (record: any) => (
        <div>
          <div className="font-semibold">{record.investorName}</div>
          <div className="text-sm text-gray-600">{record.partnerName}</div>
          <div className="text-xs text-gray-500">{record.partnerEmail}</div>
        </div>
      ),
    },
    {
      title: "Engagement Score",
      dataIndex: "engagementScore",
      key: "engagementScore",
      render: (score: number) => (
        <div className="text-center">
          <Progress 
            type="circle" 
            percent={score} 
            size={50}
            strokeColor={getEngagementColor(score)}
          />
        </div>
      ),
      sorter: (a: any, b: any) => b.engagementScore - a.engagementScore,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status.toUpperCase()}
        </Tag>
      ),
      filters: [
        { text: "Hot", value: "hot" },
        { text: "Warm", value: "warm" },
        { text: "Cold", value: "cold" },
        { text: "Unresponsive", value: "unresponsive" },
      ],
      onFilter: (value: any, record: any) => record.status === value,
    },
    {
      title: "Activity",
      key: "activity",
      render: (record: any) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <MailOutlined className="text-blue-500" />
            <span>{record.emailsSent} sent, {record.emailsOpened} opened</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <EyeOutlined className={record.deckViewed ? "text-green-500" : "text-gray-400"} />
            <span>Deck {record.deckViewed ? "viewed" : "not viewed"}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <DownloadOutlined className={record.deckDownloaded ? "text-purple-500" : "text-gray-400"} />
            <span>Deck {record.deckDownloaded ? "downloaded" : "not downloaded"}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <MessageOutlined className={record.replied ? "text-red-500" : "text-gray-400"} />
            <span>{record.replied ? "Replied" : "No reply"}</span>
          </div>
        </div>
      ),
    },
    {
      title: "Last Activity",
      dataIndex: "lastActivity",
      key: "lastActivity",
      render: (date: Date) => {
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
        return (
          <div className="text-sm">
            {diffDays === 0 ? "Today" : 
             diffDays === 1 ? "Yesterday" : 
             `${diffDays} days ago`}
          </div>
        );
      },
      sorter: (a: any, b: any) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime(),
    },
  ];

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-500">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-800">Engagement Analytics</h3>
          <p className="text-gray-600">Track investor engagement and campaign performance</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onChange={setTimeRange} style={{ width: 120 }}>
            <Option value="7d">Last 7 days</Option>
            <Option value="30d">Last 30 days</Option>
            <Option value="90d">Last 90 days</Option>
            <Option value="all">All time</Option>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <motion.div whileHover={{ y: -5 }}>
            <Card className="text-center shadow-lg border-0">
              <Statistic
                title="Total Investors"
                value={metrics.totalInvestors}
                prefix={<UserOutlined className="text-blue-500" />}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <motion.div whileHover={{ y: -5 }}>
            <Card className="text-center shadow-lg border-0">
              <Statistic
                title="Emails Sent"
                value={metrics.emailsSent}
                prefix={<MailOutlined className="text-green-500" />}
                valueStyle={{ color: "#52c41a" }}
              />
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <motion.div whileHover={{ y: -5 }}>
            <Card className="text-center shadow-lg border-0">
              <Statistic
                title="Open Rate"
                value={metrics.openRate}
                suffix="%"
                prefix={<EyeOutlined className="text-orange-500" />}
                valueStyle={{ color: "#fa8c16" }}
              />
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <motion.div whileHover={{ y: -5 }}>
            <Card className="text-center shadow-lg border-0">
              <Statistic
                title="Reply Rate"
                value={metrics.replyRate}
                suffix="%"
                prefix={<MessageOutlined className="text-red-500" />}
                valueStyle={{ color: "#f5222d" }}
              />
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* Conversion Funnel */}
      <Card title="Conversion Funnel" className="shadow-lg">
        <div className="space-y-4">
          {Object.entries(metrics.conversionFunnel).map(([stage, count], index) => {
            const percentage = (count / metrics.conversionFunnel.contacted) * 100;
            return (
              <div key={stage} className="flex items-center gap-4">
                <div className="w-24 text-sm font-medium capitalize">{stage.replace('_', ' ')}</div>
                <div className="flex-1">
                  <Progress 
                    percent={percentage} 
                    strokeColor={`hsl(${220 - index * 30}, 70%, 50%)`}
                    trailColor="#f0f0f0"
                  />
                </div>
                <div className="w-16 text-right text-sm font-semibold">{count}</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Top Performing Emails */}
      <Card title="Top Performing Emails" className="shadow-lg">
        <div className="space-y-4">
          {metrics.topPerformingEmails.map((email, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg">
              <div className="font-semibold text-gray-800 mb-2">{email.subject}</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Open Rate</div>
                  <div className="font-semibold text-green-600">{email.openRate}%</div>
                </div>
                <div>
                  <div className="text-gray-600">Click Rate</div>
                  <div className="font-semibold text-blue-600">{email.clickRate}%</div>
                </div>
                <div>
                  <div className="text-gray-600">Reply Rate</div>
                  <div className="font-semibold text-red-600">{email.replyRate}%</div>
                </div>
                <div>
                  <div className="text-gray-600">Sent Count</div>
                  <div className="font-semibold text-gray-800">{email.sentCount}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Investor Engagement Table */}
      <Card title="Investor Engagement Details" className="shadow-lg">
        <Table
          dataSource={metrics.investorEngagement}
          columns={investorColumns}
          rowKey="investorId"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  );
}