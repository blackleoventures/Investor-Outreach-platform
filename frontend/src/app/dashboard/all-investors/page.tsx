"use client";

import React, { useState, useEffect } from "react";
import { Card, Typography, Button, Input, Table, Tag, Space, message, Avatar, Modal, Form, Select, Dropdown, Checkbox } from "antd";
import { UserOutlined, SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, SettingOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

export default function AllInvestorsPage() {
  const [investors, setInvestors] = useState([]);
  const [filteredInvestors, setFilteredInvestors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [addInvestorModal, setAddInvestorModal] = useState(false);
  const [editInvestorModal, setEditInvestorModal] = useState(false);
  const [selectedInvestor, setSelectedInvestor] = useState(null);
  const [form] = Form.useForm();
  const [visibleColumns, setVisibleColumns] = useState({
    serialNumber: true,
    investorName: true,
    fundStage: true,
    fundType: true,
    fundFocus: true,
    partnerName: false,
    partnerEmail: false,
    fundDescription: false,
    portfolioCompanies: false,
    numberOfInvestments: false,
    numberOfExits: false,
    location: false,
    foundingYear: false,
    website: false,
    twitterLink: false,
    linkedinLink: false,
    facebookLink: false
  });

  // Mock data for demonstration
  useEffect(() => {
    const investorData = [
      {
        id: 1,
        investorName: "Sequoia Capital",
        fundStage: "Series A, Series B",
        fundType: "Venture Capital",
        fundFocus: "Technology, SaaS, AI/ML",
        partnerName: "Roelof Botha",
        partnerEmail: "roelof@sequoiacap.com",
        fundDescription: "Leading venture capital firm investing in technology companies",
        portfolioCompanies: "Apple, Google, WhatsApp, Instagram, Airbnb",
        numberOfInvestments: 500,
        numberOfExits: 150,
        location: "Menlo Park, CA",
        foundingYear: 1972,
        website: "sequoiacap.com",
        twitterLink: "@sequoia",
        linkedinLink: "linkedin.com/company/sequoia-capital",
        facebookLink: "facebook.com/sequoiacapital"
      },
      {
        id: 2,
        investorName: "Andreessen Horowitz",
        fundStage: "Seed, Series A, Series B",
        fundType: "Venture Capital",
        fundFocus: "Software, Crypto, Bio, Consumer",
        partnerName: "Marc Andreessen",
        partnerEmail: "marc@a16z.com",
        fundDescription: "Venture capital firm focused on technology companies",
        portfolioCompanies: "Facebook, Twitter, Skype, Foursquare, Airbnb",
        numberOfInvestments: 400,
        numberOfExits: 120,
        location: "Menlo Park, CA",
        foundingYear: 2009,
        website: "a16z.com",
        twitterLink: "@a16z",
        linkedinLink: "linkedin.com/company/andreessen-horowitz",
        facebookLink: "facebook.com/a16z"
      },
      {
        id: 3,
        investorName: "Accel Partners",
        fundStage: "Seed, Series A",
        fundType: "Venture Capital",
        fundFocus: "Enterprise Software, Consumer Internet, Mobile",
        partnerName: "Jim Breyer",
        partnerEmail: "jim@accel.com",
        fundDescription: "Early and growth-stage venture capital firm",
        portfolioCompanies: "Facebook, Dropbox, Slack, Atlassian, Spotify",
        numberOfInvestments: 350,
        numberOfExits: 100,
        location: "Palo Alto, CA",
        foundingYear: 1983,
        website: "accel.com",
        twitterLink: "@accel",
        linkedinLink: "linkedin.com/company/accel-partners",
        facebookLink: "facebook.com/accelpartners"
      },
      {
        id: 4,
        investorName: "Kleiner Perkins",
        fundStage: "Series A, Series B, Growth",
        fundType: "Venture Capital",
        fundFocus: "Consumer, Enterprise, Hardtech, Fintech",
        partnerName: "John Doerr",
        partnerEmail: "john@kpcb.com",
        fundDescription: "Venture capital firm partnering with entrepreneurs",
        portfolioCompanies: "Google, Amazon, Twitter, Uber, Airbnb",
        numberOfInvestments: 800,
        numberOfExits: 200,
        location: "Menlo Park, CA",
        foundingYear: 1972,
        website: "kleinerperkins.com",
        twitterLink: "@kleinerperkins",
        linkedinLink: "linkedin.com/company/kleiner-perkins",
        facebookLink: "facebook.com/kleinerperkins"
      },
      {
        id: 5,
        investorName: "Benchmark Capital",
        fundStage: "Series A",
        fundType: "Venture Capital",
        fundFocus: "Consumer Internet, Enterprise Software, Mobile",
        partnerName: "Bill Gurley",
        partnerEmail: "bill@benchmark.com",
        fundDescription: "Early-stage venture capital firm",
        portfolioCompanies: "Uber, Twitter, Instagram, Snapchat, WeWork",
        numberOfInvestments: 200,
        numberOfExits: 80,
        location: "Menlo Park, CA",
        foundingYear: 1995,
        website: "benchmark.com",
        twitterLink: "@benchmark",
        linkedinLink: "linkedin.com/company/benchmark-capital",
        facebookLink: "facebook.com/benchmarkcapital"
      }
    ];
    setInvestors(investorData);
    setFilteredInvestors(investorData);
  }, []);

  useEffect(() => {
    let filtered = [...investors];
    
    if (searchQuery) {
      filtered = filtered.filter(investor =>
        investor.investorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        investor.partnerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        investor.fundFocus.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredInvestors(filtered);
  }, [searchQuery, investors]);

  const handleAddInvestor = async (values) => {
    const newInvestor = {
      id: Date.now(),
      ...values
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

  const handleColumnVisibilityChange = (columnKey, checked) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: checked
    }));
  };

  const columnDefinitions = [
    {
      key: 'serialNumber',
      title: 'Sr. No.',
      width: 80,
      align: 'center',
      render: (_, __, index) => index + 1,
    },
    {
      key: 'investorName',
      title: 'Investor Name',
      dataIndex: 'investorName',
      render: (name) => (
        <div className="flex items-center space-x-2">
          <Avatar size="small" icon={<UserOutlined />} />
          <Text strong>{name}</Text>
        </div>
      ),
    },
    {
      key: 'fundStage',
      title: 'Fund Stage',
      dataIndex: 'fundStage',
      render: (stage) => <Tag color="blue">{stage}</Tag>,
    },
    {
      key: 'fundType',
      title: 'Fund Type',
      dataIndex: 'fundType',
    },
    {
      key: 'fundFocus',
      title: 'Fund Focus (Sectors)',
      dataIndex: 'fundFocus',
      render: (focus) => (
        <div>
          {focus.split(', ').map(sector => (
            <Tag key={sector} color="green" size="small">{sector}</Tag>
          ))}
        </div>
      ),
    },
    {
      key: 'partnerName',
      title: 'Partner Name',
      dataIndex: 'partnerName',
    },
    {
      key: 'partnerEmail',
      title: 'Partner Email',
      dataIndex: 'partnerEmail',
      render: (email) => <Text copyable>{email}</Text>,
    },
    {
      key: 'fundDescription',
      title: 'Fund Description',
      dataIndex: 'fundDescription',
      ellipsis: true,
    },
    {
      key: 'portfolioCompanies',
      title: 'Portfolio Companies',
      dataIndex: 'portfolioCompanies',
      ellipsis: true,
    },
    {
      key: 'numberOfInvestments',
      title: 'Number Of Investments',
      dataIndex: 'numberOfInvestments',
      align: 'center',
    },
    {
      key: 'numberOfExits',
      title: 'Number Of Exits',
      dataIndex: 'numberOfExits',
      align: 'center',
    },
    {
      key: 'location',
      title: 'Location',
      dataIndex: 'location',
    },
    {
      key: 'foundingYear',
      title: 'Founding Year',
      dataIndex: 'foundingYear',
      align: 'center',
    },
    {
      key: 'website',
      title: 'Website (If Available)',
      dataIndex: 'website',
      render: (website) => website ? (
        <a href={`https://${website}`} target="_blank" rel="noreferrer">
          {website}
        </a>
      ) : 'N/A',
    },
    {
      key: 'twitterLink',
      title: 'Twitter Link',
      dataIndex: 'twitterLink',
      render: (twitter) => twitter ? (
        <a href={`https://twitter.com/${twitter.replace('@', '')}`} target="_blank" rel="noreferrer">
          {twitter}
        </a>
      ) : 'N/A',
    },
    {
      key: 'linkedinLink',
      title: 'Linkedin Link',
      dataIndex: 'linkedinLink',
      render: (linkedin) => linkedin ? (
        <a href={`https://${linkedin}`} target="_blank" rel="noreferrer">
          LinkedIn
        </a>
      ) : 'N/A',
    },
    {
      key: 'facebookLink',
      title: 'Facebook Link',
      dataIndex: 'facebookLink',
      render: (facebook) => facebook ? (
        <a href={`https://${facebook}`} target="_blank" rel="noreferrer">
          Facebook
        </a>
      ) : 'N/A',
    }
  ];

  const visibleColumnsArray = columnDefinitions.filter(col => visibleColumns[col.key]);

  const actionsColumn = {
    title: 'Actions',
    key: 'actions',
    width: 150,
    render: (_, record) => (
      <Space size="small">
        <Button size="small" icon={<EyeOutlined />} />
        <Button size="small" icon={<EditOutlined />} />
        <Button size="small" icon={<DeleteOutlined />} danger />
      </Space>
    ),
  };

  const finalColumns = [...visibleColumnsArray, actionsColumn];

  const customizeColumnsMenu = (
    <div className="p-4 w-80">
      <Title level={5} className="mb-4">Customize Columns</Title>
      
      {/* Basic Information */}
      <div className="mb-4">
        <Text strong className="text-blue-600 mb-2 block">📊 Basic Information</Text>
        <div className="space-y-2 pl-2">
          <div className="flex items-center">
            <Checkbox
              checked={visibleColumns.serialNumber}
              onChange={(e) => handleColumnVisibilityChange('serialNumber', e.target.checked)}
            >
              Sr. No.
            </Checkbox>
          </div>
          <div className="flex items-center">
            <Checkbox
              checked={visibleColumns.investorName}
              onChange={(e) => handleColumnVisibilityChange('investorName', e.target.checked)}
            >
              Investor Name
            </Checkbox>
          </div>
        </div>
      </div>

      {/* Fund Details */}
      <div className="mb-4">
        <Text strong className="text-green-600 mb-2 block">💰 Fund Details</Text>
        <div className="space-y-2 pl-2">
          <div className="flex items-center">
            <Checkbox
              checked={visibleColumns.fundStage}
              onChange={(e) => handleColumnVisibilityChange('fundStage', e.target.checked)}
            >
              Fund Stage
            </Checkbox>
          </div>
          <div className="flex items-center">
            <Checkbox
              checked={visibleColumns.fundType}
              onChange={(e) => handleColumnVisibilityChange('fundType', e.target.checked)}
            >
              Fund Type
            </Checkbox>
          </div>
          <div className="flex items-center">
            <Checkbox
              checked={visibleColumns.fundFocus}
              onChange={(e) => handleColumnVisibilityChange('fundFocus', e.target.checked)}
            >
              Fund Focus (Sectors)
            </Checkbox>
          </div>
          <div className="flex items-center">
            <Checkbox
              checked={visibleColumns.fundDescription}
              onChange={(e) => handleColumnVisibilityChange('fundDescription', e.target.checked)}
            >
              Fund Description
            </Checkbox>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="mb-4">
        <Text strong className="text-purple-600 mb-2 block">👤 Contact Information</Text>
        <div className="space-y-2 pl-2">
          <div className="flex items-center">
            <Checkbox
              checked={visibleColumns.partnerName}
              onChange={(e) => handleColumnVisibilityChange('partnerName', e.target.checked)}
            >
              Partner Name
            </Checkbox>
          </div>
          <div className="flex items-center">
            <Checkbox
              checked={visibleColumns.partnerEmail}
              onChange={(e) => handleColumnVisibilityChange('partnerEmail', e.target.checked)}
            >
              Partner Email
            </Checkbox>
          </div>
        </div>
      </div>

      {/* Portfolio & Stats */}
      <div className="mb-4">
        <Text strong className="text-orange-600 mb-2 block">📈 Portfolio & Stats</Text>
        <div className="space-y-2 pl-2">
          <div className="flex items-center">
            <Checkbox
              checked={visibleColumns.portfolioCompanies}
              onChange={(e) => handleColumnVisibilityChange('portfolioCompanies', e.target.checked)}
            >
              Portfolio Companies
            </Checkbox>
          </div>
          <div className="flex items-center">
            <Checkbox
              checked={visibleColumns.numberOfInvestments}
              onChange={(e) => handleColumnVisibilityChange('numberOfInvestments', e.target.checked)}
            >
              Number Of Investments
            </Checkbox>
          </div>
          <div className="flex items-center">
            <Checkbox
              checked={visibleColumns.numberOfExits}
              onChange={(e) => handleColumnVisibilityChange('numberOfExits', e.target.checked)}
            >
              Number Of Exits
            </Checkbox>
          </div>
        </div>
      </div>

      {/* Company Details */}
      <div className="mb-4">
        <Text strong className="text-red-600 mb-2 block">🏢 Company Details</Text>
        <div className="space-y-2 pl-2">
          <div className="flex items-center">
            <Checkbox
              checked={visibleColumns.location}
              onChange={(e) => handleColumnVisibilityChange('location', e.target.checked)}
            >
              Location
            </Checkbox>
          </div>
          <div className="flex items-center">
            <Checkbox
              checked={visibleColumns.foundingYear}
              onChange={(e) => handleColumnVisibilityChange('foundingYear', e.target.checked)}
            >
              Founding Year
            </Checkbox>
          </div>
        </div>
      </div>

      {/* Social Links */}
      <div className="mb-4">
        <Text strong className="text-cyan-600 mb-2 block">🔗 Social Links</Text>
        <div className="space-y-2 pl-2">
          <div className="flex items-center">
            <Checkbox
              checked={visibleColumns.website}
              onChange={(e) => handleColumnVisibilityChange('website', e.target.checked)}
            >
              Website
            </Checkbox>
          </div>
          <div className="flex items-center">
            <Checkbox
              checked={visibleColumns.twitterLink}
              onChange={(e) => handleColumnVisibilityChange('twitterLink', e.target.checked)}
            >
              Twitter Link
            </Checkbox>
          </div>
          <div className="flex items-center">
            <Checkbox
              checked={visibleColumns.linkedinLink}
              onChange={(e) => handleColumnVisibilityChange('linkedinLink', e.target.checked)}
            >
              LinkedIn Link
            </Checkbox>
          </div>
          <div className="flex items-center">
            <Checkbox
              checked={visibleColumns.facebookLink}
              onChange={(e) => handleColumnVisibilityChange('facebookLink', e.target.checked)}
            >
              Facebook Link
            </Checkbox>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <Card
        title={
          <Title level={4} className="!mb-0">
            All Investors
          </Title>
        }
        extra={
          <Space>
            <Dropdown
              overlay={customizeColumnsMenu}
              trigger={['click']}
              placement="bottomRight"
            >
              <Button icon={<SettingOutlined />}>
                Customize Columns
              </Button>
            </Dropdown>
            <Button
              type="primary"
              style={{
                backgroundColor: "#ac6a1e",
                color: "#fff",
              }}
              icon={<PlusOutlined />}
              onClick={() => setAddInvestorModal(true)}
            >
              Add Investors
            </Button>
          </Space>
        }
      >
        <div className="mb-6">
          <Search
            placeholder="Search investors by name, email, or focus..."
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ maxWidth: 400 }}
          />
        </div>

        <div className="overflow-x-auto">
          <Table
            columns={finalColumns}
            dataSource={filteredInvestors}
            rowKey="id"
            loading={loading}
            scroll={{ x: 'max-content' }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} investors`,
            }}
          />
        </div>
      </Card>

      {/* Add Investor Modal */}
      <Modal
        title="Add New Investor"
        open={addInvestorModal}
        onCancel={() => setAddInvestorModal(false)}
        footer={null}
        width={600}
      >
        <Form form={form} onFinish={handleAddInvestor} layout="vertical">
          <Form.Item name="investorName" label="Investor Name" rules={[{ required: true }]}>
            <Input placeholder="Investor name" />
          </Form.Item>
          <Form.Item name="fundStage" label="Fund Stage" rules={[{ required: true }]}>
            <Select placeholder="Select fund stage">
              <Option value="Seed">Seed</Option>
              <Option value="Series A">Series A</Option>
              <Option value="Series B">Series B</Option>
              <Option value="Series C">Series C</Option>
              <Option value="Growth">Growth</Option>
            </Select>
          </Form.Item>
          <Form.Item name="fundType" label="Fund Type" rules={[{ required: true }]}>
            <Input placeholder="Fund type" />
          </Form.Item>
          <Form.Item name="fundFocus" label="Fund Focus (Sectors)" rules={[{ required: true }]}>
            <Input placeholder="Technology, SaaS, Fintech" />
          </Form.Item>
          <Form.Item name="partnerName" label="Partner Name" rules={[{ required: true }]}>
            <Input placeholder="Partner name" />
          </Form.Item>
          <Form.Item name="partnerEmail" label="Partner Email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="partner@fund.com" />
          </Form.Item>
          <Form.Item name="location" label="Location">
            <Input placeholder="City, Country" />
          </Form.Item>
          <Form.Item name="website" label="Website">
            <Input placeholder="fund.com" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">Add Investor</Button>
              <Button onClick={() => setAddInvestorModal(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}