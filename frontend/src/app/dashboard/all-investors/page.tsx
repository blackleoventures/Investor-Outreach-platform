"use client";

import React, { useState, useEffect } from "react";
import { Card, Typography, Button, Input, Table, Tag, Space, message, Avatar, Modal, Form, Select, Dropdown, Checkbox } from "antd";
import { UserOutlined, SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, SettingOutlined, FileTextOutlined } from "@ant-design/icons";

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

  const customizeColumnsMenu = {
    items: [
      {
        key: 'customize-panel',
        label: (
          <div className="w-64" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <div className="p-2 border-b border-gray-200 mb-2">
              <Text strong className="text-gray-800">Select Columns</Text>
            </div>
            
            <div className="space-y-1 px-2 pb-2">
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.investorName}
                  onChange={(e) => handleColumnVisibilityChange('investorName', e.target.checked)}
                >
                  Investor Name
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.fundStage}
                  onChange={(e) => handleColumnVisibilityChange('fundStage', e.target.checked)}
                >
                  Fund Stage
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.fundType}
                  onChange={(e) => handleColumnVisibilityChange('fundType', e.target.checked)}
                >
                  Fund Type
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.fundFocus}
                  onChange={(e) => handleColumnVisibilityChange('fundFocus', e.target.checked)}
                >
                  Fund Focus (Sectors)
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.partnerName}
                  onChange={(e) => handleColumnVisibilityChange('partnerName', e.target.checked)}
                >
                  Partner Name
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.partnerEmail}
                  onChange={(e) => handleColumnVisibilityChange('partnerEmail', e.target.checked)}
                >
                  Partner Email
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.fundDescription}
                  onChange={(e) => handleColumnVisibilityChange('fundDescription', e.target.checked)}
                >
                  Fund Description
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.portfolioCompanies}
                  onChange={(e) => handleColumnVisibilityChange('portfolioCompanies', e.target.checked)}
                >
                  Portfolio Companies
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.numberOfInvestments}
                  onChange={(e) => handleColumnVisibilityChange('numberOfInvestments', e.target.checked)}
                >
                  Number Of Investments
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.numberOfExits}
                  onChange={(e) => handleColumnVisibilityChange('numberOfExits', e.target.checked)}
                >
                  Number Of Exits
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.location}
                  onChange={(e) => handleColumnVisibilityChange('location', e.target.checked)}
                >
                  Location
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.foundingYear}
                  onChange={(e) => handleColumnVisibilityChange('foundingYear', e.target.checked)}
                >
                  Founding Year
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.website}
                  onChange={(e) => handleColumnVisibilityChange('website', e.target.checked)}
                >
                  Website (If Available)
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.twitterLink}
                  onChange={(e) => handleColumnVisibilityChange('twitterLink', e.target.checked)}
                >
                  Twitter Link
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.linkedinLink}
                  onChange={(e) => handleColumnVisibilityChange('linkedinLink', e.target.checked)}
                >
                  Linkedin Link
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.facebookLink}
                  onChange={(e) => handleColumnVisibilityChange('facebookLink', e.target.checked)}
                >
                  Facebook Link
                </Checkbox>
              </div>
            </div>
          </div>
        ),
      },
    ],
  };

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
              menu={customizeColumnsMenu}
              trigger={['click']}
              placement="bottomRight"
            >
              <Button icon={<SettingOutlined />}>
                Customize Columns
              </Button>
            </Dropdown>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'manual',
                    label: (
                      <div className="flex items-center gap-2 p-2">
                        <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                          <UserOutlined className="text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium">Manual Entry</div>
                          <div className="text-xs text-gray-500">Add contacts individually with detailed information</div>
                        </div>
                      </div>
                    ),
                    onClick: () => setAddInvestorModal(true)
                  },
                  {
                    key: 'csv',
                    label: (
                      <div className="flex items-center gap-2 p-2">
                        <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                          <FileTextOutlined className="text-green-600" />
                        </div>
                        <div>
                          <div className="font-medium">CSV Import</div>
                          <div className="text-xs text-gray-500">Bulk upload contacts using CSV file format</div>
                        </div>
                      </div>
                    ),
                    onClick: () => console.log('CSV Upload clicked')
                  }
                ]
              }}
              placement="bottomRight"
            >
              <Button
                type="primary"
                style={{
                  backgroundColor: "#ac6a1e",
                  color: "#fff",
                }}
                icon={<PlusOutlined />}
              >
                Add Investors
              </Button>
            </Dropdown>
          </Space>
        }
      >
        <div className="mb-6">
          <Search
            placeholder="Search investors by name, email, or focus..."
            allowClear
            enterButton
            size="large"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              maxWidth: 400,
            }}
            className="custom-search"
          />
        </div>
        
        <style jsx>{`
          :global(.custom-search .ant-btn) {
            background-color: #1890ff !important;
            border-color: #1890ff !important;
            color: white !important;
          }
          :global(.custom-search .ant-btn:hover) {
            background-color: #40a9ff !important;
            border-color: #40a9ff !important;
          }
        `}</style>

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
        title={
          <div className="flex items-center gap-2">
            <Button type="text" icon={<SettingOutlined />} size="small">
              Customize Columns
            </Button>
          </div>
        }
        open={addInvestorModal}
        onCancel={() => setAddInvestorModal(false)}
        footer={null}
        width={1200}
        style={{ top: 20 }}
      >
        <div className="p-4">
          {/* Form Headers */}
          <div className="grid grid-cols-4 gap-4 mb-4 font-semibold text-gray-700">
            <div>Partner Email</div>
            <div>Investor Name</div>
            <div>Partner Name</div>
            <div>Fund Focus (Sectors)</div>
          </div>
          
          {/* Form Rows */}
          <Form form={form} onFinish={handleAddInvestor}>
            {[1, 2, 3, 4].map((row) => (
              <div key={row} className="grid grid-cols-4 gap-4 mb-4">
                <Form.Item name={`partnerEmail_${row}`}>
                  <Input placeholder="Partner Email" />
                </Form.Item>
                <Form.Item name={`investorName_${row}`}>
                  <Input placeholder="Investor Name" />
                </Form.Item>
                <Form.Item name={`partnerName_${row}`}>
                  <Input placeholder="Partner Name" />
                </Form.Item>
                <Form.Item name={`fundFocus_${row}`}>
                  <Input placeholder="Fund Focus" />
                </Form.Item>
              </div>
            ))}
            
            {/* Add more field button */}
            <div className="text-center mb-6">
              <Button type="link" icon={<PlusOutlined />} className="text-blue-500">
                Add more field
              </Button>
            </div>
            
            {/* Progress bar */}
            <div className="mb-6">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-gray-400 h-2 rounded-full" style={{ width: '25%' }}></div>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-4">
              <Button 
                type="primary" 
                htmlType="submit"
                style={{
                  backgroundColor: "#ac6a1e",
                  color: "#fff",
                  borderColor: "#ac6a1e"
                }}
              >
                Submit
              </Button>
              <Button 
                onClick={() => setAddInvestorModal(false)}
                style={{
                  borderColor: "#dc2626",
                  color: "#dc2626"
                }}
              >
                Cancel
              </Button>
            </div>
          </Form>
        </div>
      </Modal>
    </div>
  );
}