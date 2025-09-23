/* eslint-disable */
// @ts-nocheck
"use client";

import React, { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { Card, Typography, Button, Input, Table, Tag, Space, message, Avatar, Modal, Form, Select, Dropdown, Checkbox, Alert, Spin } from "antd";
import { useRouter } from 'next/navigation';
import { UserOutlined, SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, SettingOutlined, FileTextOutlined, FileExcelOutlined, SyncOutlined, DownloadOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

export default function AllInvestorsPage() {
  const router = useRouter();
  const [investors, setInvestors] = useState([]);
  const [filteredInvestors, setFilteredInvestors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [addInvestorModal, setAddInvestorModal] = useState(false);
  const [editInvestorModal, setEditInvestorModal] = useState(false);
  const [viewInvestorModal, setViewInvestorModal] = useState(false);
  const [selectedInvestor, setSelectedInvestor] = useState(null);
  const [excelSyncStatus, setExcelSyncStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [visibleCount, setVisibleCount] = useState(10);
  const [userShowAll, setUserShowAll] = useState(false);
  const [dataSourceLabel, setDataSourceLabel] = useState<string>("");

  const [form] = Form.useForm();
  const [visibleColumns, setVisibleColumns] = useState({
    serialNumber: true,
    investorName: true,
    partnerName: true,
    partnerEmail: true,
    fundType: true,
    fundStage: true,
    fundFocusSectors: true,
    location: true,
    phoneNumber: true,
    ticketSize: true,
    website: false,
    foundedYear: false,
    portfolioCompanies: false,
    twitterLink: false,
    linkedinLink: false,
    facebookLink: false,
    numberOfInvestments: false,
    numberOfExits: false,
    fundDescription: false
  });

  // Simple function to get value from raw data using exact column names
  const getValue = (obj: any, key: string) => {
    return obj[key] || obj[key.toLowerCase()] || obj[key.replace(/\s+/g, '_')] || '';
  };

  // Fetch investors data from API
  const fetchInvestors = async () => {
    setLoading(true);
    try {
      // Add cache-busting parameter to ensure fresh data
      const cacheBuster = `_t=${Date.now()}`;
      const response = await apiFetch(`/api/investors?limit=100000&page=1&${cacheBuster}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (response.ok) {
        const result = await response.json();
        console.log('API Response:', { source: result.source, timestamp: result.timestamp, count: result.totalCount });
        const investorData = result.docs || result.data || [];
        // Use raw data directly from Excel
        setInvestors(investorData);
        setFilteredInvestors(investorData);
        setDataSourceLabel(result.source === 'google_sheets' ? 'Google Sheets' : (result.source || ''));
        
        if (investorData.length > 0) {
          console.log('=== DEBUGGING INVESTOR DATA ===');
          console.log('Sample investor data:', investorData[0]);
          console.log('All column names:', Object.keys(investorData[0]));
          console.log('First 3 records:', investorData.slice(0, 3));
          console.log('=== END DEBUG ===');
        }
      } else {
        console.error('API Error:', response.status);
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
      const response = await apiFetch(`/api/excel/sync/status`);
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
      const response = await apiFetch(`/api/excel/sync/firebase-to-excel`, {
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
      const response = await apiFetch(`/api/excel/download`);
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
    // Clear any existing data first
    setInvestors([]);
    setFilteredInvestors([]);
    
    // Fetch fresh data immediately
    fetchInvestors();
    fetchSyncStatus();
    // Removed auto-refresh polling; refresh happens only on button click
  }, []);

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();

    const candidateKeys = [
      'Investor Name', 'Partner Name', 'Partner Email', 'Phone number',
      'Fund Type', 'Fund Stage', 'Fund Focus (Sectors)', 'Location', 'Ticket Size'
    ];

    const stringIncludes = (value: unknown, query: string) => {
      if (value == null) return false;
      if (Array.isArray(value)) {
        return value.some(v => stringIncludes(v, query));
      }
      const str = value.toString().toLowerCase();
      return str.includes(query);
    };

    const filtered = q
      ? investors.filter((inv) => {
          // 1) Try known fields first
          for (const key of candidateKeys) {
            if (key in inv && stringIncludes((inv as any)[key], q)) return true;
          }
          // 2) Fallback: scan all primitive string/number fields
          for (const [k, v] of Object.entries(inv)) {
            if (v == null) continue;
            const isPrimitive = typeof v === 'string' || typeof v === 'number';
            if (isPrimitive && stringIncludes(v, q)) return true;
            if (Array.isArray(v) && stringIncludes(v, q)) return true;
          }
          return false;
        })
      : investors;

    // De-duplicate visible rows robustly using a stable hash of significant fields
    const toKey = (r: any) => {
      return JSON.stringify({
        id: r.id ?? r._id ?? null,
        email: (r['Partner Email'] ?? r.email ?? '').toString().toLowerCase(),
        name: (r['Investor Name'] ?? r.name ?? '').toString().toLowerCase(),
      });
    };
    const seen = new Set<string>();
    const uniqueFiltered = [] as any[];
    for (const row of filtered) {
      const k = toKey(row);
      if (!seen.has(k)) { seen.add(k); uniqueFiltered.push(row); }
    }

    setFilteredInvestors(uniqueFiltered);
    // Preserve user's current view size unless search text changed to a new query
    // If user selected "All", keep expanding to the full filtered length on refresh/polling
    setVisibleCount(prev => {
      const nextMax = uniqueFiltered.length;
      if (userShowAll) return nextMax;
      return Math.min(prev, nextMax);
    });
    setCurrentPage(1);
  }, [searchQuery, investors, userShowAll]);

  // Reset pagination only when the search query itself changes
  useEffect(() => {
    setVisibleCount(10);
    setUserShowAll(false);
  }, [searchQuery]);

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
      const id = selectedInvestor?.id ?? selectedInvestor?._id;
      if (!id) {
        message.error('Missing investor id');
        return;
      }

      // Remove undefined fields so we only send real updates
      const updates = Object.fromEntries(
        Object.entries(values || {}).filter(([, v]) => v !== undefined)
      );

      const response = await apiFetch(`/api/investors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (response.ok) {
        message.success("Investor updated successfully!");
        fetchInvestors(); // Refresh data
        // Excel sync not needed with file-based system
      } else {
        const err = await response.json().catch(() => ({} as any));
        message.error(err.error || 'Failed to update investor');
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
      okText: 'OK',
      okButtonProps: {
        style: { backgroundColor: '#1890ff', borderColor: '#1890ff', color: '#fff' }
      },
      onOk: async () => {
        try {
          const response = await apiFetch(`/api/investors/${investorId}`, {
            method: 'DELETE'
          });
          
          if (response.ok) {
            message.success("Investor deleted successfully!");
            fetchInvestors(); // Refresh data
            // Excel sync not needed with file-based system
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

  // Generate dynamic columns based on data
  const generateDynamicColumns = () => {
    if (investors.length === 0) return [];

    // Build a union of keys across all records so newly added fields appear
    const keySet = new Set<string>();
    for (const inv of investors) {
      Object.keys(inv || {}).forEach(k => {
        if (k !== 'id' && k !== 'createdAt' && k !== 'uploadedAt') keySet.add(k);
      });
    }

    // Preferred order for commonly used keys
    const preferredOrder = [
      'investor_name', 'partner_name', 'partner_email', 'phone_number',
      'fund_type', 'fund_stage', 'country', 'state', 'city', 'sector_focus',
      'ticket_size', 'website', 'location', 'founded_year',
      'portfolio_companies', 'number_of_investments', 'number_of_exits',
      'twitter_link', 'linkedIn_link', 'facebook_link'
    ];

    const keys = Array.from(keySet);
    keys.sort((a, b) => {
      const ai = preferredOrder.indexOf(a);
      const bi = preferredOrder.indexOf(b);
      if (ai !== -1 || bi !== -1) {
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      }
      return a.localeCompare(b);
    });

    const dynamicCols = keys.map(key => ({
      key,
      title: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      dataIndex: key,
      width: 150,
      render: (value: any) => {
        if (value == null || value === '') return 'N/A';
        if (Array.isArray(value)) return value.join(', ');
        if (typeof value === 'string' && value.length > 50) {
          return <span title={value}>{value.substring(0, 50)}...</span>;
        }
        return value.toString();
      },
    }));

    return dynamicCols;
  };
  
  const columnDefinitions = generateDynamicColumns();
  
  const staticColumnDefinitions = [
    {
      key: 'investorName',
      title: 'Investor Name',
      width: 180,
      render: (_, record) => {
        const name = record['Investor Name'];
        return (
          <div className="flex items-center space-x-2">
            <Avatar size="small" icon={<UserOutlined />} />
            <Text strong className="truncate">{name || 'N/A'}</Text>
          </div>
        );
      },
    },
    {
      key: 'partnerName',
      title: 'Partner Name',
      width: 140,
      render: (_, record) => {
        const name = record['Partner Name'];
        return name || 'N/A';
      },
    },
    {
      key: 'partnerEmail',
      title: 'Partner Email',
      width: 200,
      render: (_, record) => {
        const email = record['Partner Email'];
        return email ? <Text copyable ellipsis>{email}</Text> : 'N/A';
      },
    },
    {
      key: 'fundType',
      title: 'Fund Type',
      width: 120,
      render: (_, record) => {
        const type = record['Fund Type'];
        return type || 'N/A';
      },
    },
    {
      key: 'fundStage',
      title: 'Fund Stage',
      width: 140,
      render: (_, record) => {
        const stage = record['Fund Stage'];
        return stage ? <Tag color="blue">{stage}</Tag> : 'N/A';
      },
    },
    {
      key: 'fundFocusSectors',
      title: 'Fund Focus (Sectors)',
      width: 220,
      render: (_, record) => {
        const sectors = record['Fund Focus (Sectors)'];
        if (!sectors) return 'N/A';
        const sectorList = typeof sectors === 'string' ? sectors.split(',').map(s => s.trim()) : [sectors];
        return (
          <div className="flex flex-wrap gap-1">
            {sectorList.slice(0, 3).map((s, idx) => (
              <Tag key={idx} color="green">{String(s)}</Tag>
            ))}
            {sectorList.length > 3 && <Tag>+{sectorList.length - 3}</Tag>}
          </div>
        );
      }
    },
    {
      key: 'location',
      title: 'Location',
      width: 180,
      render: (_, record) => {
        const location = record['Location'];
        return location || 'N/A';
      },
    },
    {
      key: 'phoneNumber',
      title: 'Phone Number (Optional)',
      width: 140,
      render: (_, record) => {
        const phone = record['Phone number'];
        return phone || 'N/A';
      },
    },
    {
      key: 'ticketSize',
      title: 'Ticket Size (Optional)',
      width: 120,
      render: (_, record) => {
        const size = record['Ticket Size'];
        return size || 'N/A';
      },
    },
    // Keep any extra fields off by default for this view
  ];

  // Force fixed set/order of columns matching the add form
  const visibleColumnsArray = staticColumnDefinitions.filter(col => (visibleColumns as any)[col.key]);

  const actionsColumn = {
    title: 'Actions',
    key: 'actions',
    width: 120,
    render: (_, record) => (
      <Space size="small">
        <Button 
          size="small" 
          icon={<EyeOutlined />} 
          onClick={() => { setSelectedInvestor(record); setViewInvestorModal(true); }}
        />
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

  const serialColumn = {
    key: 'serialNumber',
    title: 'Sr. No.',
    width: 80,
    align: 'center' as const,
    render: (_: any, __: any, index: number) => (currentPage - 1) * pageSize + index + 1,
  };
  const finalColumns = [serialColumn, ...visibleColumnsArray, actionsColumn];

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
                  Investor name
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.partnerName}
                  onChange={(e) => handleColumnVisibilityChange('partnerName', e.target.checked)}
                >
                  Partner name
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.partnerEmail}
                  onChange={(e) => handleColumnVisibilityChange('partnerEmail', e.target.checked)}
                >
                  Email
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.phoneNumber}
                  onChange={(e) => handleColumnVisibilityChange('phoneNumber', e.target.checked)}
                >
                  Phone number
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.fundType}
                  onChange={(e) => handleColumnVisibilityChange('fundType', e.target.checked)}
                >
                  Fund type
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.fundStage}
                  onChange={(e) => handleColumnVisibilityChange('fundStage', e.target.checked)}
                >
                  Fund stage
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.fundFocusSectors}
                  onChange={(e) => handleColumnVisibilityChange('fundFocusSectors', e.target.checked)}
                >
                  Fund Focus (Sectors)
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
                  checked={visibleColumns.ticketSize}
                  onChange={(e) => handleColumnVisibilityChange('ticketSize', e.target.checked)}
                >
                  Ticket Size (Optional)
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
            <Button 
              icon={<SyncOutlined spin={loading} />} 
              onClick={() => {
                setInvestors([]);
                setFilteredInvestors([]);
                fetchInvestors();
              }}
              title="Refresh data from Excel files"
            >
              Refresh
            </Button>
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
                      <div className="flex items-center gap-3 p-3 rounded hover:bg-gray-50 transition-colors">
                        <div className="w-9 h-9 bg-blue-100 rounded flex items-center justify-center">
                          <UserOutlined className="text-blue-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">Add manually</div>
                          <div className="text-xs text-gray-500">Enter a single investor with full details</div>
                        </div>
                      </div>
                    ),
                    onClick: () => router.push('/dashboard/add-investor')
                  },
                  {
                    key: 'upload',
                    label: (
                      <div className="flex items-center gap-3 p-3 rounded hover:bg-gray-50 transition-colors">
                        <div className="w-9 h-9 bg-green-100 rounded flex items-center justify-center">
                          <FileExcelOutlined className="text-green-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">Upload file (CSV/Excel)</div>
                          <div className="text-xs text-gray-500">Bulk import multiple investors at once</div>
                        </div>
                      </div>
                    ),
                    onClick: () => router.push('/dashboard/add-investor')
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


        <div className="mb-6 space-y-4">
          <div className="flex justify-between items-center">
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
            <div className="text-sm text-gray-500">
              {dataSourceLabel ? `Data Source: ${dataSourceLabel}` : 'Data Source: —'} | Last Updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
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
            columns={[serialColumn, ...visibleColumnsArray, actionsColumn]}
            dataSource={filteredInvestors.slice((currentPage - 1) * pageSize, currentPage * pageSize)}
            rowKey={(record, index) => {
              const email = (record['Partner Email'] ?? '').toString().toLowerCase();
              const name = (record['Investor Name'] ?? '').toString().toLowerCase();
              return `${index}-${email || name || Math.random()}`;
            }}
            loading={loading}
            scroll={{ x: 'max-content' }}
            pagination={{
              position: ['bottomRight'],
              size: 'small',
              current: currentPage,
              pageSize,
              total: filteredInvestors.length,
              onChange: (p, ps) => { setCurrentPage(p); setPageSize(ps || 10); },
              showSizeChanger: true,
              pageSizeOptions: ['10','20','50','100'],
              showQuickJumper: true,
              locale: { jump_to: '', page: '' } as any,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
            }}
          />
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-600">Total: {filteredInvestors.length} investors</div>
          </div>
        </div>
      </Card>

      {/* View Investor Modal */}
      <Modal
        title="Investor Details"
        open={viewInvestorModal}
        onCancel={() => setViewInvestorModal(false)}
        footer={<Button onClick={() => setViewInvestorModal(false)}>Close</Button>}
        width={800}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {selectedInvestor && Object.entries({
            'Investor Name': (selectedInvestor as any)['Investor Name'],
            'Partner Name': (selectedInvestor as any)['Partner Name'],
            'Partner Email': (selectedInvestor as any)['Partner Email'],
            'Phone Number': (selectedInvestor as any)['Phone number'],
            'Fund Type': (selectedInvestor as any)['Fund Type'],
            'Fund Stage': (selectedInvestor as any)['Fund Stage'],
            'Fund Focus (Sectors)': (selectedInvestor as any)['Fund Focus (Sectors)'],
            'Location': (selectedInvestor as any)['Location'],
            'Ticket Size': (selectedInvestor as any)['Ticket Size'],
          }).map(([label, value]) => (
            <div key={label} className="border rounded p-2">
              <div className="text-xs text-gray-500">{label}</div>
              <div className="font-medium break-words">{value || 'N/A'}</div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Edit Investor Modal */}
      <Modal
        title="Edit Investor"
        open={editInvestorModal}
        onCancel={() => { setEditInvestorModal(false); setSelectedInvestor(null); }}
        footer={null}
        width={800}
      >
        <div className="p-2">
          <Form form={form} onFinish={handleEditInvestor} layout="vertical" initialValues={selectedInvestor || {}}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Form.Item name="Investor Name" label="Investor Name">
                <Input placeholder="Investor Name" />
              </Form.Item>
              <Form.Item name="Partner Name" label="Partner Name">
                <Input placeholder="Partner Name" />
              </Form.Item>
              <Form.Item name="Partner Email" label="Partner Email" rules={[{ type: 'email', message: 'Enter a valid email' }]}>
                <Input placeholder="Partner Email" />
              </Form.Item>
              <Form.Item name="Phone number" label="Phone Number">
                <Input placeholder="Phone Number" />
              </Form.Item>
              <Form.Item name="Fund Type" label="Fund Type">
                <Input placeholder="Fund Type" />
              </Form.Item>
              <Form.Item name="Fund Stage" label="Fund Stage">
                <Input placeholder="Fund Stage" />
              </Form.Item>
              <Form.Item name="Location" label="Location">
                <Input placeholder="Location" />
              </Form.Item>
              <Form.Item name="Fund Focus (Sectors)" label="Fund Focus (Sectors)">
                <Input placeholder="Fund Focus (Sectors)" />
              </Form.Item>
              <Form.Item name="Ticket Size" label="Ticket Size (Optional)">
                <Input placeholder="Ticket Size" />
              </Form.Item>
            </div>
            <div className="flex gap-3 mt-2">
              <Button type="primary" htmlType="submit" style={{ backgroundColor: '#1890ff', borderColor: '#1890ff', color: '#fff' }}>Save</Button>
              <Button onClick={() => { setEditInvestorModal(false); setSelectedInvestor(null); }}>Cancel</Button>
            </div>
          </Form>
        </div>
      </Modal>

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