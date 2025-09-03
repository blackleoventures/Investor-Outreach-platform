"use client";

import React, { useState, useEffect } from "react";
import { Card, Tabs, Typography, Button, Input, Table, Tag, Badge, Space, message, Avatar, Modal, Form, Select, Upload } from "antd";
import { UserOutlined, SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, MailOutlined, StarOutlined, FilterOutlined } from "@ant-design/icons";
import dynamic from "next/dynamic";
import "@/styles/investor.css";

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { Dragger } = Upload;

// Dynamic imports for better performance
const InvestorMatcher = dynamic(() => import("@/components/InvestorMatcher"), { ssr: false });

export default function AllInvestorsPage() {
  const [activeTab, setActiveTab] = useState("1");
  const [investors, setInvestors] = useState([]);
  const [filteredInvestors, setFilteredInvestors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState({
    sector: [],
    stage: [],
    location: [],
    checkSize: []
  });
  const [addInvestorModal, setAddInvestorModal] = useState(false);
  const [editInvestorModal, setEditInvestorModal] = useState(false);
  const [selectedInvestor, setSelectedInvestor] = useState(null);
  const [form] = Form.useForm();

  // Mock data for demonstration
  useEffect(() => {
    const investorData = [
      {
        id: 1,
        name: "John Smith",
        email: "john@techventures.com",
        fund: "Tech Ventures Fund",
        sector: ["Technology", "SaaS"],
        stage: ["Seed", "Series A"],
        checkSize: "$500K - $2M",
        location: "San Francisco",
        score: 95,
        status: "active",
        lastContact: "2024-01-15",
        portfolio: 45,
        avgCheck: "$1.2M",
        website: "techventures.com",
        linkedin: "linkedin.com/in/johnsmith",
        notes: "Very responsive, interested in AI/ML startups"
      },
      {
        id: 2,
        name: "Sarah Johnson",
        email: "sarah@growthpartners.com",
        fund: "Growth Partners",
        sector: ["SaaS", "Fintech"],
        stage: ["Series B", "Series C"],
        checkSize: "$2M - $5M",
        location: "New York",
        score: 87,
        status: "active",
        lastContact: "2024-01-10",
        portfolio: 32,
        avgCheck: "$3.1M",
        website: "growthpartners.com",
        linkedin: "linkedin.com/in/sarahjohnson",
        notes: "Focuses on B2B SaaS with strong unit economics"
      },
      {
        id: 3,
        name: "Michael Chen",
        email: "michael@earlystage.com",
        fund: "Early Stage Capital",
        sector: ["Fintech", "Healthcare"],
        stage: ["Seed"],
        checkSize: "$100K - $500K",
        location: "Boston",
        score: 92,
        status: "pending",
        lastContact: "2024-01-05",
        portfolio: 28,
        avgCheck: "$300K",
        website: "earlystage.com",
        linkedin: "linkedin.com/in/michaelchen",
        notes: "Great for first-time founders, very hands-on"
      },
      {
        id: 4,
        name: "Emily Davis",
        email: "emily@cleantech.vc",
        fund: "CleanTech Ventures",
        sector: ["CleanTech", "Technology"],
        stage: ["Series A", "Series B"],
        checkSize: "$2M - $5M",
        location: "Austin",
        score: 89,
        status: "active",
        lastContact: "2024-01-12",
        portfolio: 38,
        avgCheck: "$2.8M",
        website: "cleantech.vc",
        linkedin: "linkedin.com/in/emilydavis",
        notes: "Passionate about sustainable technology solutions"
      },
      {
        id: 5,
        name: "David Wilson",
        email: "david@aiventures.com",
        fund: "AI Ventures",
        sector: ["AI/ML", "Technology"],
        stage: ["Seed", "Series A"],
        checkSize: "$500K - $2M",
        location: "Seattle",
        score: 94,
        status: "active",
        lastContact: "2024-01-18",
        portfolio: 22,
        avgCheck: "$1.5M",
        website: "aiventures.com",
        linkedin: "linkedin.com/in/davidwilson",
        notes: "Expert in AI/ML, former Google executive"
      },
      {
        id: 6,
        name: "Lisa Brown",
        email: "lisa@healthcapital.com",
        fund: "Health Capital Partners",
        sector: ["Healthcare", "Fintech"],
        stage: ["Series A", "Series B"],
        checkSize: "$2M - $5M",
        location: "Los Angeles",
        score: 91,
        status: "active",
        lastContact: "2024-01-08",
        portfolio: 41,
        avgCheck: "$3.2M",
        website: "healthcapital.com",
        linkedin: "linkedin.com/in/lisabrown",
        notes: "Focus on digital health and medical devices"
      },
      {
        id: 7,
        name: "Robert Taylor",
        email: "robert@ecommercefund.com",
        fund: "E-commerce Growth Fund",
        sector: ["E-commerce", "SaaS"],
        stage: ["Series B", "Series C"],
        checkSize: "$5M+",
        location: "New York",
        score: 85,
        status: "active",
        lastContact: "2024-01-14",
        portfolio: 29,
        avgCheck: "$6.5M",
        website: "ecommercefund.com",
        linkedin: "linkedin.com/in/roberttaylor",
        notes: "Specializes in scaling e-commerce platforms"
      },
      {
        id: 8,
        name: "Jennifer Martinez",
        email: "jennifer@edtechvc.com",
        fund: "EdTech Ventures",
        sector: ["Education", "Technology"],
        stage: ["Seed", "Series A"],
        checkSize: "$500K - $2M",
        location: "San Francisco",
        score: 88,
        status: "pending",
        lastContact: "2024-01-06",
        portfolio: 35,
        avgCheck: "$1.1M",
        website: "edtechvc.com",
        linkedin: "linkedin.com/in/jennifermartinez",
        notes: "Former educator, passionate about learning tech"
      },
      {
        id: 9,
        name: "James Anderson",
        email: "james@mobilityvc.com",
        fund: "Mobility Ventures",
        sector: ["Transportation", "Technology"],
        stage: ["Series A", "Series B"],
        checkSize: "$2M - $5M",
        location: "Boston",
        score: 90,
        status: "active",
        lastContact: "2024-01-11",
        portfolio: 26,
        avgCheck: "$2.9M",
        website: "mobilityvc.com",
        linkedin: "linkedin.com/in/jamesanderson",
        notes: "Focus on autonomous vehicles and smart transportation"
      },
      {
        id: 10,
        name: "Amanda Garcia",
        email: "amanda@foodtechfund.com",
        fund: "FoodTech Innovation Fund",
        sector: ["Food & Beverage", "Technology"],
        stage: ["Seed", "Series A"],
        checkSize: "$500K - $2M",
        location: "Remote",
        score: 86,
        status: "active",
        lastContact: "2024-01-09",
        portfolio: 31,
        avgCheck: "$1.3M",
        website: "foodtechfund.com",
        linkedin: "linkedin.com/in/amandagarcia",
        notes: "Expertise in food technology and sustainable agriculture"
      }
    ];
    setInvestors(investorData);
    setFilteredInvestors(investorData);
  }, []);

  useEffect(() => {
    let filtered = [...investors];
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(investor =>
        investor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        investor.fund.toLowerCase().includes(searchQuery.toLowerCase()) ||
        investor.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply selected filters
    if (selectedFilters.sector.length > 0) {
      filtered = filtered.filter(investor =>
        investor.sector.some(s => selectedFilters.sector.includes(s))
      );
    }
    
    if (selectedFilters.stage.length > 0) {
      filtered = filtered.filter(investor =>
        investor.stage.some(s => selectedFilters.stage.includes(s))
      );
    }
    
    if (selectedFilters.location.length > 0) {
      filtered = filtered.filter(investor =>
        selectedFilters.location.includes(investor.location)
      );
    }
    
    setFilteredInvestors(filtered);
  }, [searchQuery, selectedFilters, investors]);

  const handleAddInvestor = async (values) => {
    const newInvestor = {
      id: Date.now(),
      ...values,
      score: Math.floor(Math.random() * 30) + 70, // Random score for demo
      status: "active",
      lastContact: new Date().toISOString().split('T')[0],
      portfolio: 0,
      notes: ""
    };
    
    setInvestors([...investors, newInvestor]);
    setAddInvestorModal(false);
    form.resetFields();
    message.success("Investor added successfully!");
  };

  const handleEditInvestor = async (values) => {
    const updatedInvestors = investors.map(investor =>
      investor.id === selectedInvestor.id ? { ...investor, ...values } : investor
    );
    
    setInvestors(updatedInvestors);
    setEditInvestorModal(false);
    setSelectedInvestor(null);
    form.resetFields();
    message.success("Investor updated successfully!");
  };

  const handleDeleteInvestor = (investorId) => {
    Modal.confirm({
      title: "Delete Investor",
      content: "Are you sure you want to delete this investor?",
      onOk: () => {
        setInvestors(investors.filter(investor => investor.id !== investorId));
        message.success("Investor deleted successfully!");
      }
    });
  };

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
      width: 70,
      align: 'center',
      render: (score) => (
        <div className={`score-badge ${
          score >= 90 ? 'score-high' : score >= 80 ? 'score-medium' : 'score-low'
        }`}>
          {score}
        </div>
      ),
      sorter: (a, b) => a.score - b.score,
    },
    {
      title: 'Investor',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name, record) => (
        <div className="flex items-center space-x-2">
          <Avatar size="small" icon={<UserOutlined />} />
          <div>
            <div className="font-medium text-sm">{name}</div>
            <div className="text-xs text-gray-500">{record.fund}</div>
          </div>
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
          {record.sector.map(s => (
            <Tag key={s} color="blue" size="small">{s}</Tag>
          ))}
          {record.stage.map(s => (
            <Tag key={s} color="green" size="small">{s}</Tag>
          ))}
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
      title: 'Portfolio',
      dataIndex: 'portfolio',
      key: 'portfolio',
      render: (portfolio) => (
        <div className="text-center">
          <div className="font-medium">{portfolio}</div>
          <div className="text-xs text-gray-500">companies</div>
        </div>
      ),
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
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EyeOutlined />}>View</Button>
          <Button size="small" icon={<EditOutlined />}>Edit</Button>
          <Button size="small" icon={<DeleteOutlined />} danger>Delete</Button>
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
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddInvestorModal(true)}>
                Add Investor
              </Button>
            </div>
            
            <div className="mb-4">
              <Search
                placeholder="Search investors by name, fund, or email..."
                allowClear
                enterButton={<SearchOutlined />}
                size="large"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="overflow-x-auto">
              <Table
                columns={columns}
                dataSource={filteredInvestors}
                rowKey="id"
                loading={loading}
                scroll={{ x: 1200 }}
                className="custom-table"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} investors`,
                }}
              />
            </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Text strong>Sector Focus</Text>
                <Select
                  mode="multiple"
                  placeholder="Select sectors"
                  value={selectedFilters.sector}
                  onChange={(value) => setSelectedFilters({...selectedFilters, sector: value})}
                  style={{ width: '100%', marginTop: 8 }}
                >
                  {['Technology', 'SaaS', 'Fintech', 'Healthcare', 'E-commerce', 'AI/ML', 'CleanTech'].map(sector => (
                    <Option key={sector} value={sector}>{sector}</Option>
                  ))}
                </Select>
              </div>
              
              <div>
                <Text strong>Investment Stage</Text>
                <Select
                  mode="multiple"
                  placeholder="Select stages"
                  value={selectedFilters.stage}
                  onChange={(value) => setSelectedFilters({...selectedFilters, stage: value})}
                  style={{ width: '100%', marginTop: 8 }}
                >
                  {['Seed', 'Series A', 'Series B', 'Series C', 'Growth'].map(stage => (
                    <Option key={stage} value={stage}>{stage}</Option>
                  ))}
                </Select>
              </div>
              
              <div>
                <Text strong>Location</Text>
                <Select
                  mode="multiple"
                  placeholder="Select locations"
                  value={selectedFilters.location}
                  onChange={(value) => setSelectedFilters({...selectedFilters, location: value})}
                  style={{ width: '100%', marginTop: 8 }}
                >
                  {['San Francisco', 'New York', 'Boston', 'Austin', 'Los Angeles', 'Seattle', 'Remote'].map(location => (
                    <Option key={location} value={location}>{location}</Option>
                  ))}
                </Select>
              </div>
              
              <div>
                <Text strong>Check Size Range</Text>
                <Select
                  mode="multiple"
                  placeholder="Select check sizes"
                  value={selectedFilters.checkSize}
                  onChange={(value) => setSelectedFilters({...selectedFilters, checkSize: value})}
                  style={{ width: '100%', marginTop: 8 }}
                >
                  {['$100K - $500K', '$500K - $2M', '$2M - $5M', '$5M+'].map(size => (
                    <Option key={size} value={size}>{size}</Option>
                  ))}
                </Select>
              </div>
            </div>
            
            <div className="mt-4 text-center">
              <Button onClick={() => setSelectedFilters({
                sector: [],
                stage: [],
                location: [],
                checkSize: []
              })}>
                Clear All Filters
              </Button>
            </div>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto p-6">
          <div className="mb-8">
            <Title level={1} className="text-3xl font-bold text-gray-800 mb-2">
              🚀 Investor Outreach Platform
            </Title>
            <Text className="text-lg text-gray-600">
              AI-powered investor matching, deal rooms, and engagement tracking
            </Text>
          </div>

          <Card className="shadow-xl border-0 rounded-2xl overflow-hidden">
            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab} 
              items={tabItems}
              size="large"
              type="card"
              className="custom-tabs"
            />
          </Card>
        </div>
      </div>

      {/* Add Investor Modal */}
      <Modal
        title="Add New Investor"
        open={addInvestorModal}
        onCancel={() => setAddInvestorModal(false)}
        footer={null}
        width={600}
      >
        <Form form={form} onFinish={handleAddInvestor} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="Investor name" />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="investor@fund.com" />
          </Form.Item>
          <Form.Item name="fund" label="Fund" rules={[{ required: true }]}>
            <Input placeholder="Fund name" />
          </Form.Item>
          <Form.Item name="sector" label="Sectors" rules={[{ required: true }]}>
            <Select mode="multiple" placeholder="Select sectors">
              {['Technology', 'SaaS', 'Fintech', 'Healthcare', 'E-commerce', 'AI/ML', 'CleanTech'].map(sector => (
                <Option key={sector} value={sector}>{sector}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="stage" label="Investment Stages" rules={[{ required: true }]}>
            <Select mode="multiple" placeholder="Select stages">
              {['Seed', 'Series A', 'Series B', 'Series C', 'Growth'].map(stage => (
                <Option key={stage} value={stage}>{stage}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="checkSize" label="Check Size" rules={[{ required: true }]}>
            <Select placeholder="Select check size">
              {['$100K - $500K', '$500K - $2M', '$2M - $5M', '$5M+'].map(size => (
                <Option key={size} value={size}>{size}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="location" label="Location" rules={[{ required: true }]}>
            <Select placeholder="Select location">
              {['San Francisco', 'New York', 'Boston', 'Austin', 'Los Angeles', 'Seattle', 'Remote'].map(location => (
                <Option key={location} value={location}>{location}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">Add Investor</Button>
              <Button onClick={() => setAddInvestorModal(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Investor Modal */}
      <Modal
        title="Edit Investor"
        open={editInvestorModal}
        onCancel={() => {
          setEditInvestorModal(false);
          setSelectedInvestor(null);
        }}
        footer={null}
        width={600}
      >
        <Form form={form} onFinish={handleEditInvestor} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="Investor name" />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="investor@fund.com" />
          </Form.Item>
          <Form.Item name="fund" label="Fund" rules={[{ required: true }]}>
            <Input placeholder="Fund name" />
          </Form.Item>
          <Form.Item name="sector" label="Sectors" rules={[{ required: true }]}>
            <Select mode="multiple" placeholder="Select sectors">
              {['Technology', 'SaaS', 'Fintech', 'Healthcare', 'E-commerce', 'AI/ML', 'CleanTech'].map(sector => (
                <Option key={sector} value={sector}>{sector}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="stage" label="Investment Stages" rules={[{ required: true }]}>
            <Select mode="multiple" placeholder="Select stages">
              {['Seed', 'Series A', 'Series B', 'Series C', 'Growth'].map(stage => (
                <Option key={stage} value={stage}>{stage}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="checkSize" label="Check Size" rules={[{ required: true }]}>
            <Select placeholder="Select check size">
              {['$100K - $500K', '$500K - $2M', '$2M - $5M', '$5M+'].map(size => (
                <Option key={size} value={size}>{size}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="location" label="Location" rules={[{ required: true }]}>
            <Select placeholder="Select location">
              {['San Francisco', 'New York', 'Boston', 'Austin', 'Los Angeles', 'Seattle', 'Remote'].map(location => (
                <Option key={location} value={location}>{location}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">Update Investor</Button>
              <Button onClick={() => {
                setEditInvestorModal(false);
                setSelectedInvestor(null);
              }}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}