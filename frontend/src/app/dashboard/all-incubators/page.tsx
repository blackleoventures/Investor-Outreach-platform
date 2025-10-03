/* eslint-disable */
// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { Table, Button, Card, message, Space, Popconfirm, Input, Typography, Dropdown, Checkbox, Modal, Form, Avatar, Tag, Tabs } from 'antd';
import { PlusOutlined, DeleteOutlined, SearchOutlined, SettingOutlined, FileExcelOutlined, EyeOutlined, EditOutlined, UserOutlined, SyncOutlined, TableOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
 



export default function AllIncubators() {
  const [incubators, setIncubators] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeKey, setActiveKey] = useState('1');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [visibleColumns, setVisibleColumns] = useState({
    serialNumber: true,
    incubatorName: true,
    partnerName: true,
    partnerEmail: true,
    phoneNumber: true,
    sectorFocus: true,
    country: true,
    stateCity: true,
    actions: true,
  } as any);
  const [columnsModalOpen, setColumnsModalOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [form] = Form.useForm();
  const router = useRouter();

  const handleDelete = async (id: number) => {
    try {
      const response = await apiFetch(`/api/incubators/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        message.success('Deleted');
        fetchIncubators();
      } else {
        message.error('Failed to delete');
      }
    } catch (e: any) {
      message.error('Failed to delete');
    }
  };

  const allColumns = [
    {
      key: 'serialNumber',
      title: 'Sr. No.',
      width: 80,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (currentPage - 1) * pageSize + index + 1,
    },
    {
      key: 'incubatorName',
      title: 'Incubator Name',
      width: 180,
      render: (_: any, record: any) => {
        const name = record['Incubator Name'];
        return (
          <div className="flex items-center space-x-2">
            <Avatar size="small" icon={<UserOutlined />} />
            <span className="font-medium">{name || 'N/A'}</span>
          </div>
        );
      },
    },
    {
      key: 'partnerName',
      title: 'Partner Name',
      width: 140,
      render: (_: any, record: any) => record['Partner Name'] || 'N/A',
    },
    {
      key: 'partnerEmail',
      title: 'Partner Email',
      width: 200,
      render: (_: any, record: any) => {
        const email = record['Partner Email'];
        return email ? <span className="text-blue-600">{email}</span> : 'N/A';
      },
    },
    {
      key: 'phoneNumber',
      title: 'Phone Number',
      width: 140,
      render: (_: any, record: any) => record['Phone Number'] || 'N/A',
    },
    {
      key: 'sectorFocus',
      title: 'Sector Focus',
      width: 160,
      render: (_: any, record: any) => {
        const sector = record['Sector Focus'];
        return sector ? <Tag color="green">{sector}</Tag> : 'N/A';
      },
    },
    {
      key: 'country',
      title: 'Country',
      width: 120,
      render: (_: any, record: any) => record['Country'] || 'N/A',
    },
    {
      key: 'stateCity',
      title: 'State/City',
      width: 140,
      render: (_: any, record: any) => record['State/City'] || 'N/A',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button size="small" icon={<EyeOutlined />} onClick={() => { setSelected(record); setViewOpen(true); }} />
          <Button size="small" icon={<EditOutlined />} onClick={() => { setSelected(record); form.setFieldsValue(record); setEditOpen(true); }} />
          <Popconfirm title="Delete this row?" onConfirm={() => handleDelete(record.id)} okButtonProps={{ type: 'primary', danger: true }}>
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      )
    }
  ];

  const columns = allColumns.filter((col: any) => visibleColumns[col.key ?? 'serialNumber']);

  const fetchIncubators = async () => {
    setLoading(true);
    try {
      const cacheBuster = `_t=${Date.now()}`;
      const response = await apiFetch(`/api/incubators?limit=100000&${cacheBuster}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        const incubatorData = result.docs || result.data || [];
        
        // Format data similar to investors
        const formattedData = incubatorData.map((incubator: any) => ({
          ...incubator,
          'Incubator Name': incubator['Incubator Name'] || incubator.incubatorName || incubator.incubator_name || incubator.name || 'Unknown',
          'Partner Name': incubator['Partner Name'] || incubator.partnerName || incubator.partner_name || incubator.contact || 'Unknown',
          'Partner Email': incubator['Partner Email'] || incubator.partnerEmail || incubator.partner_email || incubator.email || '',
          'Phone Number': incubator['Phone Number'] || incubator.phoneNumber || incubator.phone_number || '',
          'Sector Focus': incubator['Sector Focus'] || incubator.sectorFocus || incubator.sector_focus || incubator.focus || 'Unknown',
          'Country': incubator['Country'] || incubator.country || 'Unknown',
          'State/City': incubator['State/City'] || incubator.stateCity || incubator.state_city || incubator.location || 'Unknown'
        }));
        
        // De-duplicate
        const seen = new Set();
        const unique: any[] = [];
        for (const r of formattedData) {
          const key = JSON.stringify({ 
            id: r.id ?? null, 
            email: (r['Partner Email'] ?? '').toLowerCase(), 
            name: (r['Incubator Name'] ?? '').toLowerCase() 
          });
          if (!seen.has(key)) { seen.add(key); unique.push(r); }
        }
        setIncubators(unique);
        setFiltered(unique);
      } else {
        message.error('Failed to fetch incubators');
      }
    } catch (error: any) {
      message.error('Failed to fetch incubators');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchIncubators(); 
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchIncubators, 30000);
    return () => clearInterval(interval);
  }, []);

  // Immediate refresh when coming back to this page
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchIncubators();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const q = search.trim().toLowerCase();
    const next = q
      ? incubators.filter(r => (
          (r['Incubator Name'] || '').toLowerCase().includes(q) ||
          (r['Partner Name'] || '').toLowerCase().includes(q) ||
          (r['Partner Email'] || '').toLowerCase().includes(q) ||
          (r['Phone Number'] || '').toLowerCase().includes(q) ||
          (r['Sector Focus'] || '').toLowerCase().includes(q)
        ))
      : incubators;
    setFiltered(next);
    setCurrentPage(1);
  }, [search, incubators]);

  const handleSaveEdit = async () => {
    try {
      const values = await form.validateFields();
      if (!selected?.id) {
        message.error('Invalid record');
        return;
      }
      
      // Transform field names to match backend expectations
      const transformedValues = {
        incubator_name: values['Incubator Name'],
        partner_name: values['Partner Name'],
        partner_email: values['Partner Email'],
        phone_number: values['Phone Number'],
        sector_focus: values['Sector Focus'],
        country: values['Country'],
        state_city: values['State/City']
      };
      
      const response = await apiFetch(`/api/incubators/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transformedValues)
      });
      
      if (!response.ok) {
        throw new Error('Update failed');
      }
      message.success('Updated successfully');
      setEditOpen(false);
      setSelected(null);
      fetchIncubators();
    } catch (e: any) {
      if (e?.errorFields) return; // validation error already shown
      message.error('Failed to update');
    }
  };

  const menuItems = {
    items: [
      {
        key: 'add',
        label: (
          <div className="flex items-center gap-3 p-3 rounded hover:bg-gray-50 transition-colors">
            <div className="w-9 h-9 bg-blue-100 rounded flex items-center justify-center">
              <PlusOutlined className="text-blue-600" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">Add incubator</div>
              <div className="text-xs text-gray-500">Create a single incubator manually</div>
            </div>
          </div>
        ),
        onClick: () => router.push('/dashboard/add-incubator')
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
              <div className="text-xs text-gray-500">Bulk import multiple incubators</div>
            </div>
          </div>
        ),
        onClick: () => router.push('/dashboard/add-incubator')
      }
    ]
  } as any;

  return (
    <div className="p-6">
      <Card 
        title={
          <div>
            <Typography.Title level={4} style={{ marginBottom: 0 }}>All Incubators</Typography.Title>
            <Typography.Text type="secondary">Browse, search and manage incubators</Typography.Text>
          </div>
        }
        extra={
          <Space>
            <Button 
              icon={<SyncOutlined spin={loading} />} 
              onClick={() => {
                setIncubators([]);
                setFiltered([]);
                fetchIncubators();
              }}
              title="Refresh data"
            >
              Refresh
            </Button>
            <Button icon={<SettingOutlined />} onClick={() => setColumnsModalOpen(true)}>Customize Columns</Button>
            <Dropdown menu={menuItems} placement="bottomRight">
              <Button type="primary" style={{ backgroundColor: '#ac6a1e', color: '#fff' }} icon={<PlusOutlined />}>Add Incubators</Button>
            </Dropdown>
          </Space>
        }
      >
        <Tabs 
          activeKey={activeKey}
          onChange={(key) => setActiveKey(key as string)}
          items={[
            {
              key: '1',
              label: (
                <span>
                  <TableOutlined />
                  All Incubators
                </span>
              ),
              children: (
                <>
                  <div className="mb-4">
                    <Input size="large" placeholder="Search by name, email, or phone..." prefix={<SearchOutlined />} value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 400 }} />
                  </div>
                  <Table
                    columns={columns}
                    dataSource={filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)}
                    loading={loading}
                    rowKey={(r) => `${r.id ?? 'noid'}-${(r.partnerEmail ?? r.incubatorName ?? '').toLowerCase()}`}
                    scroll={{ x: 1200 }}
                    pagination={{
                      position: ['bottomRight'],
                      size: 'small',
                      current: currentPage,
                      pageSize,
                      total: filtered.length,
                      onChange: (p, ps) => { setCurrentPage(p); setPageSize(ps || 10); },
                      showSizeChanger: true,
                      pageSizeOptions: ['10','20','50','100'],
                      showQuickJumper: true,
                      locale: { jump_to: '', page: '' } as any,
                      showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
                    }}
                  />
                </>
              ),
            },
          ]}
        />
        <Modal title="Customize columns" open={columnsModalOpen} onOk={() => setColumnsModalOpen(false)} onCancel={() => setColumnsModalOpen(false)} okText="Done" okButtonProps={{ type: 'primary' }}>
          <Space direction="vertical">
            {allColumns.map((col: any) => (
              <Checkbox key={col.key ?? 'serialNumber'} checked={visibleColumns[col.key ?? 'serialNumber']} onChange={(e) => setVisibleColumns((prev: any) => ({ ...prev, [col.key ?? 'serialNumber']: e.target.checked }))} disabled={(col.key ?? 'serialNumber') === 'serialNumber'}>
                {col.title || 'Sr. No.'}
              </Checkbox>
            ))}
          </Space>
        </Modal>

        <Modal title="Incubator details" open={viewOpen} onCancel={() => { setViewOpen(false); setSelected(null); }} footer={null} width={800}>
          {selected && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="border rounded p-2">
                <div className="text-xs text-gray-500">Incubator Name</div>
                <div className="font-medium">{selected['Incubator Name'] || 'N/A'}</div>
              </div>
              <div className="border rounded p-2">
                <div className="text-xs text-gray-500">Partner Name</div>
                <div className="font-medium">{selected['Partner Name'] || 'N/A'}</div>
              </div>
              <div className="border rounded p-2">
                <div className="text-xs text-gray-500">Partner Email</div>
                <div className="font-medium">{selected['Partner Email'] || 'N/A'}</div>
              </div>
              <div className="border rounded p-2">
                <div className="text-xs text-gray-500">Phone Number</div>
                <div className="font-medium">{selected['Phone Number'] || 'N/A'}</div>
              </div>
              <div className="border rounded p-2">
                <div className="text-xs text-gray-500">Sector Focus</div>
                <div className="font-medium">{selected['Sector Focus'] || 'N/A'}</div>
              </div>
              <div className="border rounded p-2">
                <div className="text-xs text-gray-500">Country</div>
                <div className="font-medium">{selected['Country'] || 'N/A'}</div>
              </div>
              <div className="border rounded p-2">
                <div className="text-xs text-gray-500">State/City</div>
                <div className="font-medium">{selected['State/City'] || 'N/A'}</div>
              </div>
            </div>
          )}
        </Modal>

        <Modal title="Edit incubator" open={editOpen} onCancel={() => { setEditOpen(false); setSelected(null); }} footer={[<Button key="cancel" onClick={() => { setEditOpen(false); setSelected(null); }}>Cancel</Button>, <Button key="save" type="primary" onClick={handleSaveEdit}>Save</Button>]} width={800}>
          <Form layout="vertical" form={form}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Form.Item label="Incubator Name" name="Incubator Name">
                <Input placeholder="e.g. StartHub" />
              </Form.Item>
              <Form.Item label="Partner Name" name="Partner Name" rules={[{ required: true, message: 'Partner name is required' }]}>
                <Input placeholder="e.g. Alice Brown" />
              </Form.Item>
              <Form.Item label="Partner Email" name="Partner Email" rules={[{ type: 'email', message: 'Enter valid email' }]}>
                <Input placeholder="name@example.com" />
              </Form.Item>
              <Form.Item label="Phone Number" name="Phone Number">
                <Input placeholder="+1 555 123 4567" />
              </Form.Item>
              <Form.Item label="Sector Focus" name="Sector Focus">
                <Input placeholder="e.g. FinTech" />
              </Form.Item>
              <Form.Item label="Country" name="Country">
                <Input placeholder="e.g. United States" />
              </Form.Item>
              <Form.Item label="State/City" name="State/City">
                <Input placeholder="e.g. San Francisco, CA" />
              </Form.Item>
            </div>
          </Form>
        </Modal>
      </Card>
    </div>
  );
}