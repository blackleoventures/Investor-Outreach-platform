"use client";

import { useState, useEffect } from "react";
import { Card, Tabs, Typography, Button, Input, Table, Tag, Badge, Space, message, Spin } from "antd";
import { UserOutlined, SearchOutlined, FilterOutlined, StarOutlined, MailOutlined, EyeOutlined } from "@ant-design/icons";
import dynamic from "next/dynamic";

const { Title, Text } = Typography;
const { Search } = Input;

// Dynamic imports for better performance
const InvestorMatcher = dynamic(() => import("@/components/InvestorMatcher"), { ssr: false });


export default function InvestorManagementPage() {
  const [activeTab, setActiveTab] = useState("1");
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredInvestors, setFilteredInvestors] = useState([]);

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

  const getScoreColor = (score) => {
    if (score >= 90) return 'success';
    if (score >= 80) return 'warning';
    return 'error';
  };

  const getStatusColor = (status) => {
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
      render: (score) => (
        <Badge 
          count={score} 
          style={{ 
            backgroundColor: getScoreColor(score) === 'success' ? '#52c41a' : 
                           getScoreColor(score) === 'warning' ? '#faad14' : '#ff4d4f'
          }}
        />
      ),
      sorter: (a, b) => a.score - b.score,
    },
    {
      title: 'Investor',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <div>
          <div className="font-medium">{name}</div>
          <div className="text-sm text-gray-500">{record.fund}</div>
        </div>
      ),
    },
    {
      title: 'Contact',
      dataIndex: 'email',
      key: 'email',
      render: (email) => <Text copyable>{email}</Text>,
    },
    {
      title: 'Focus',
      key: 'focus',
      render: (_, record) => (
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
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
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
          <UserOutlined />
          Investor Database
        </span>
      ),
      children: (
        <div className="space-y-6">
          <Card>
            <div className="flex justify-between items-center mb-4">
              <div>
                <Title level={4}>Investor Database</Title>
                <Text type="secondary">Manage and track your investor relationships</Text>
              </div>
              <Button type="primary" icon={<UserOutlined />}>
                Add Investor
              </Button>
            </div>
            
            <div className="mb-4">
              <Search
                placeholder="Search investors by name, fund, or sector..."
                allowClear
                enterButton={<SearchOutlined />}
                size="large"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Table
              columns={columns}
              dataSource={filteredInvestors}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} investors`,
              }}
            />
          </Card>
        </div>
      ),
    },
    {
      key: "2",
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
    {
      key: "3",
      label: (
        <span>
          <FilterOutlined />
          Advanced Filters
        </span>
      ),
      children: (
        <div className="space-y-6">
          <Card title="🔍 Advanced Investor Filtering" className="shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Text strong>Sector Focus</Text>
                <div className="mt-2 space-y-2">
                  {['Technology', 'SaaS', 'Fintech', 'Healthcare', 'E-commerce'].map(sector => (
                    <Tag key={sector} className="cursor-pointer hover:bg-blue-50">
                      {sector}
                    </Tag>
                  ))}
                </div>
              </div>
              <div>
                <Text strong>Investment Stage</Text>
                <div className="mt-2 space-y-2">
                  {['Seed', 'Series A', 'Series B', 'Series C', 'Growth'].map(stage => (
                    <Tag key={stage} className="cursor-pointer hover:bg-blue-50">
                      {stage}
                    </Tag>
                  ))}
                </div>
              </div>
              <div>
                <Text strong>Check Size Range</Text>
                <div className="mt-2 space-y-2">
                  {['$100K - $500K', '$500K - $2M', '$2M - $5M', '$5M+'].map(size => (
                    <Tag key={size} className="cursor-pointer hover:bg-blue-50">
                      {size}
                    </Tag>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      ),
    },

  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <Title level={1} className="text-3xl font-bold text-gray-800 mb-2">
          🎯 Investor Management
        </Title>
        <Text className="text-lg text-gray-600">
          Comprehensive investor database, AI-powered matching, and relationship management
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