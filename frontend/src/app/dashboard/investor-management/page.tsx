"use client";

import { useState, useEffect } from "react";
import { Card, Tabs, Typography, Button, Input, Table, Tag, Badge, Space, message, Spin } from "antd";
import { UserOutlined, SearchOutlined, FilterOutlined, StarOutlined, MailOutlined, EyeOutlined, PlusOutlined } from "@ant-design/icons";
import dynamic from "next/dynamic";

const { Title, Text } = Typography;
const { Search } = Input;

// Dynamic imports for better performance
const InvestorMatcher = dynamic(() => import("@/components/InvestorMatcher"), { ssr: false });


type InvestorRow = {
  id: number;
  name: string;
  email: string;
  fund: string;
  sector: string;
  stage: string;
  checkSize: string;
  location: string;
  score: number;
  status: 'active' | 'pending' | 'inactive';
  lastContact: string;
};

export default function InvestorManagementPage() {
  const [activeTab, setActiveTab] = useState("1");
  const [investors, setInvestors] = useState<InvestorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredInvestors, setFilteredInvestors] = useState<InvestorRow[]>([]);

  // Mock data for demonstration
  useEffect(() => {
    setInvestors([
      {
        id: 1,
        name: "John Smith",
        email: "john@venturecapital.com",
        fund: "Tech Ventures Fund",
        sector: "Technology",
        stage: "Series A",
        checkSize: "$500K - $2M",
        location: "San Francisco",
        score: 95,
        status: "active",
        lastContact: "2024-01-15"
      },
      {
        id: 2,
        name: "Sarah Johnson",
        email: "sarah@growthpartners.com",
        fund: "Growth Partners",
        sector: "SaaS",
        stage: "Series B",
        checkSize: "$2M - $5M",
        location: "New York",
        score: 87,
        status: "active",
        lastContact: "2024-01-10"
      },
      {
        id: 3,
        name: "Michael Chen",
        email: "michael@earlystage.com",
        fund: "Early Stage Capital",
        sector: "Fintech",
        stage: "Seed",
        checkSize: "$100K - $500K",
        location: "Boston",
        score: 92,
        status: "pending",
        lastContact: "2024-01-05"
      }
    ]);
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = investors.filter(investor =>
        investor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        investor.fund.toLowerCase().includes(searchQuery.toLowerCase()) ||
        investor.sector.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredInvestors(filtered);
    } else {
      setFilteredInvestors(investors);
    }
  }, [searchQuery, investors]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 80) return 'warning';
    return 'error';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      case 'inactive': return 'default';
      default: return 'default';
    }
  };

  const columns = [
    {
      title: 'Score',
      dataIndex: 'score',
      key: 'score',
      render: (score: number) => (
        <Badge 
          count={score} 
          style={{ 
            backgroundColor: getScoreColor(score) === 'success' ? '#52c41a' : 
                           getScoreColor(score) === 'warning' ? '#faad14' : '#ff4d4f'
          }}
        />
      ),
      sorter: (a: InvestorRow, b: InvestorRow) => a.score - b.score,
    },
    {
      title: 'Investor',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: InvestorRow) => (
        <div>
          <div className="font-medium">{name}</div>
          <div className="text-sm text-gray-500">{record.fund}</div>
        </div>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email: string) => <Text copyable>{email}</Text>,
    },
    {
      title: 'Focus',
      key: 'focus',
      render: (_: any, record: InvestorRow) => (
        <div className="space-y-1">
          <Tag color="blue">{record.sector}</Tag>
          <Tag color="green">{record.stage}</Tag>
        </div>
      ),
    },
    {
      title: 'Check Size',
      dataIndex: 'checkSize',
      key: 'checkSize',
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: InvestorRow) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />}>View</Button>
          <Button size="small" icon={<MailOutlined />} type="primary">Contact</Button>
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: "1",
      label: (
        <span>
          <StarOutlined />
          Smart Matching
        </span>
      ),
      children: (
        <div className="space-y-6">
          <Card title="🤖 AI-Powered Investor Matching" className="shadow-lg">
            <div className="mb-4">
              <Text>
                Use our AI matching algorithm to find the best investors for your startup based on sector, 
                stage, check size, and other criteria.
              </Text>
            </div>
            <InvestorMatcher />
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <Title level={1} className="text-3xl font-bold text-gray-800 mb-2">
          🤖 Smart Investor Matching
        </Title>
        <Text className="text-lg text-gray-600">
          Find the best-fit investors for your startup using AI matching
        </Text>
      </div>

      <Card className="shadow-xl">
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab} 
          items={tabItems}
          size="large"
          type="card"
        />
      </Card>
    </div>
  );
}