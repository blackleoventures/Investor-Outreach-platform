"use client";

import React, { useState, useEffect } from "react";
import { Card, Typography, Button, Input, Table, Tag, Space, message, Avatar, Modal, Form, Select, Dropdown, Checkbox, Alert, Spin } from "antd";
import { UserOutlined, SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, SettingOutlined, FileTextOutlined, FileExcelOutlined, SyncOutlined, DownloadOutlined } from "@ant-design/icons";

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
  const [excelSyncStatus, setExcelSyncStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);

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

  // Fetch investors data from API
  const fetchInvestors = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/investors`);
      if (response.ok) {
        const data = await response.json();
        setInvestors(data.data || []);
        setFilteredInvestors(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching investors:', error);
      message.error('Failed to fetch investors data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Excel sync status
  const fetchSyncStatus = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/excel/sync/status`);
      if (response.ok) {
        const data = await response.json();
        setExcelSyncStatus(data);
      }
    } catch (error) {
      console.error('Error fetching sync status:', error);
    }
  };

  // Sync Firebase to Excel
  const handleSyncToExcel = async () => {
    setSyncing(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/excel/sync/firebase-to-excel`, {
        method: 'POST'
      });
      if (response.ok) {
        message.success('Data synced to Excel successfully!');
        fetchSyncStatus();
      } else {
        message.error('Failed to sync data to Excel');
      }
    } catch (error) {
      console.error('Sync error:', error);
      message.error('Failed to sync data to Excel');
    } finally {
      setSyncing(false);
    }
  };

  // Download Excel file
  const handleDownloadExcel = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/excel/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'investors.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        message.success('Excel file downloaded successfully!');
      } else {
        message.error('Failed to download Excel file');
      }
    } catch (error) {
      console.error('Download error:', error);
      message.error('Failed to download Excel file');
    }
  };

  // Initialize data and sync status
  useEffect(() => {
    fetchInvestors();
    fetchSyncStatus();
    
    // Set up polling for real-time updates
    const interval = setInterval(() => {
      fetchInvestors();
      fetchSyncStatus();
    }, 5000); // Poll every 5 seconds
    
    return () => clearInterval(interval);
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
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/investors/${selectedInvestor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      
      if (response.ok) {
        message.success("Investor updated successfully!");
        fetchInvestors(); // Refresh data
        // Sync changes to Excel
        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/excel/sync/firebase-to-excel`, { method: 'POST' });
      } else {
        message.error('Failed to update investor');
      }
    } catch (error) {
      message.error('Failed to update investor');
    }
    
    setEditInvestorModal(false);
    setSelectedInvestor(null);
    form.resetFields();
  };

  const handleDeleteInvestor = (investorId) => {
    Modal.confirm({
      title: "Delete Investor",
      content: "Are you sure you want to delete this investor?",
      onOk: async () => {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/investors/${investorId}`, {
            method: 'DELETE'
          });
          
          if (response.ok) {
            message.success("Investor deleted successfully!");
            fetchInvestors(); // Refresh data
            // Sync changes to Excel
            await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/excel/sync/firebase-to-excel`, { method: 'POST' });
          } else {
            message.error('Failed to delete investor');
          }
        } catch (error) {
          message.error('Failed to delete investor');
        }
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
      width: 70,
      align: 'center',
      render: (_, __, index) => index + 1,
    },
    {
      key: 'investorName',
      title: 'Investor Name',
      dataIndex: 'investor_name',
      width: 180,
      render: (name) => (
        <div className="flex items-center space-x-2">
          <Avatar size="small" icon={<UserOutlined />} />
          <Text strong className="truncate">{name}</Text>
        </div>
      ),
    },
    {
      key: 'fundStage',
      title: 'Fund Stage',
      dataIndex: 'fund_stage',
      width: 140,
      render: (stage) => <Tag color="blue">{stage}</Tag>,
    },
    {
      key: 'fundType',
      title: 'Fund Type',
      dataIndex: 'fund_type',
      width: 120,
    },
    {
      key: 'fundFocus',
      title: 'Fund Focus (Sectors)',
      dataIndex: 'sector_focus',
      width: 200,
      render: (focus) => (
        <div className="flex flex-wrap gap-1">
          {focus.split(', ').slice(0, 2).map(sector => (
            <Tag key={sector} color="green" size="small">{sector}</Tag>
          ))}
          {focus.split(', ').length > 2 && <Tag size="small">+{focus.split(', ').length - 2}</Tag>}
        </div>
      ),
    },
    {
      key: 'partnerName',
      title: 'Partner Name',
      dataIndex: 'partner_name',
      width: 140,
      ellipsis: true,
    },
    {
      key: 'partnerEmail',
      title: 'Partner Email',
      dataIndex: 'partner_email',
      width: 180,
      render: (email) => <Text copyable ellipsis>{email}</Text>,
    },
    {
      key: 'fundDescription',
      title: 'Fund Description',
      dataIndex: 'fund_description',
      width: 200,
      ellipsis: true,
    },
    {
      key: 'portfolioCompanies',
      title: 'Portfolio Companies',
      dataIndex: 'portfolio_companies',
      width: 200,
      ellipsis: true,
    },
    {
      key: 'numberOfInvestments',
      title: 'Investments',
      dataIndex: 'number_of_investments',
      width: 100,
      align: 'center',
    },
    {
      key: 'numberOfExits',
      title: 'Exits',
      dataIndex: 'number_of_exits',
      width: 80,
      align: 'center',
    },
    {
      key: 'location',
      title: 'Location',
      dataIndex: 'location',
      width: 120,
      ellipsis: true,
    },
    {
      key: 'foundingYear',
      title: 'Founded',
      dataIndex: 'founded_year',
      width: 80,
      align: 'center',
    },
    {
      key: 'website',
      title: 'Website',
      dataIndex: 'website',
      width: 120,
      ellipsis: true,
      render: (website) => website ? (
        <a href={`https://${website}`} target="_blank" rel="noreferrer">
          {website}
        </a>
      ) : 'N/A',
    },
    {
      key: 'twitterLink',
      title: 'Twitter',
      dataIndex: 'twitter_link',
      width: 100,
      render: (twitter) => twitter ? (
        <a href={`https://twitter.com/${twitter.replace('@', '')}`} target="_blank" rel="noreferrer">
          {twitter}
        </a>
      ) : 'N/A',
    },
    {
      key: 'linkedinLink',
      title: 'LinkedIn',
      dataIndex: 'linkedIn_link',
      width: 100,
      render: (linkedin) => linkedin ? (
        <a href={`https://${linkedin}`} target="_blank" rel="noreferrer">
          LinkedIn
        </a>
      ) : 'N/A',
    },
    {
      key: 'facebookLink',
      title: 'Facebook',
      dataIndex: 'facebook_link',
      width: 100,
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
    width: 120,
    fixed: 'right',
    render: (_, record) => (
      <Space size="small">
        <Button size="small" icon={<EyeOutlined />} />
        <Button 
          size="small" 
          icon={<EditOutlined />} 
          onClick={() => {
            setSelectedInvestor(record);
            form.setFieldsValue(record);
            setEditInvestorModal(true);
          }}
        />
        <Button 
          size="small" 
          icon={<DeleteOutlined />} 
          danger 
          onClick={() => handleDeleteInvestor(record.id)}
        />
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
        {/* Excel Sync Status */}
        {excelSyncStatus && (
          <Alert
            message={
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileExcelOutlined className="text-green-600" />
                  <span>
                    Excel Database: {excelSyncStatus.excelRecords} records | 
                    Status: {excelSyncStatus.isWatching ? 'Watching for changes' : 'Not watching'}
                  </span>
                </div>
                <Space>
                  <Button 
                    size="small" 
                    icon={syncing ? <Spin size="small" /> : <SyncOutlined />}
                    onClick={handleSyncToExcel}
                    disabled={syncing}
                  >
                    {syncing ? 'Syncing...' : 'Sync to Excel'}
                  </Button>
                  <Button 
                    size="small" 
                    icon={<DownloadOutlined />}
                    onClick={handleDownloadExcel}
                  >
                    Download Excel
                  </Button>
                </Space>
              </div>
            }
            type="info"
            className="mb-4"
          />
        )}

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

        <Table
          columns={finalColumns}
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