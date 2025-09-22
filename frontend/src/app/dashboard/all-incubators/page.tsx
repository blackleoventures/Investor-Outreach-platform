/* eslint-disable */
// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { Table, Button, Card, message, Space, Popconfirm, Input, Typography, Dropdown, Checkbox, Modal, Tabs, Form } from 'antd';
import { PlusOutlined, TableOutlined, DeleteOutlined, SearchOutlined, SettingOutlined, FileExcelOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import axios from 'axios';
 



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
      await axios.delete(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/incubators/${id}`);
      message.success('Deleted');
      fetchIncubators();
    } catch (e: any) {
      message.error('Failed to delete');
    }
  };

  const allColumns = [
    {
      key: 'serialNumber',
      title: 'Sr. No.',
      width: 80,
      align: 'center',
      render: (_: any, __: any, index: number) => (currentPage - 1) * pageSize + index + 1,
    },
    {
      title: 'Incubator Name',
      dataIndex: 'incubatorName',
      key: 'incubatorName',
    },
    {
      title: 'Partner Name',
      dataIndex: 'partnerName',
      key: 'partnerName',
    },
    {
      title: 'Partner Email',
      dataIndex: 'partnerEmail',
      key: 'partnerEmail',
    },
    {
      title: 'Phone Number',
      dataIndex: 'phoneNumber',
      key: 'phoneNumber',
    },
    {
      title: 'Sector Focus',
      dataIndex: 'sectorFocus',
      key: 'sectorFocus',
    },
    {
      title: 'Country',
      dataIndex: 'country',
      key: 'country',
    },
    {
      title: 'State/City',
      dataIndex: 'stateCity',
      key: 'stateCity',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space size="small">
          <Button size="small" icon={<EyeOutlined style={{ fontSize: 14 }} />} onClick={() => { setSelected(record); setViewOpen(true); }} />
          <Button size="small" icon={<EditOutlined style={{ fontSize: 14 }} />} onClick={() => { setSelected(record); form.setFieldsValue(record); setEditOpen(true); }} />
          <Popconfirm title="Delete this row?" onConfirm={() => handleDelete(record.id)} okButtonProps={{ type: 'primary', danger: true }}>
            <Button icon={<DeleteOutlined style={{ fontSize: 14 }} />} size="small" danger />
          </Popconfirm>
        </Space>
      )
    }
  ];

  const columns = allColumns.filter((col: any) => visibleColumns[col.key ?? 'serialNumber']);

  const fetchIncubators = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/incubators`);
      const rows = response.data.data || [];
      // de-dupe by id/email/name similar to investors
      const seen = new Set();
      const unique: any[] = [];
      for (const r of rows) {
        const key = JSON.stringify({ id: r.id ?? null, email: (r.partnerEmail ?? '').toLowerCase(), name: (r.incubatorName ?? '').toLowerCase() });
        if (!seen.has(key)) { seen.add(key); unique.push(r); }
      }
      setIncubators(unique);
      setFiltered(unique);
    } catch (error: any) {
      message.error('Failed to fetch incubators');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIncubators(); }, []);

  useEffect(() => {
    const q = search.trim().toLowerCase();
    const next = q
      ? incubators.filter(r => (
          (r.incubatorName || '').toLowerCase().includes(q) ||
          (r.partnerName || '').toLowerCase().includes(q) ||
          (r.partnerEmail || '').toLowerCase().includes(q) ||
          (r.phoneNumber || '').toLowerCase().includes(q)
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
      await axios.put(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/incubators/${selected.id}`, values);
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
            <Dropdown menu={menuItems} placement="bottomRight">
              <Button type="primary" style={{ backgroundColor: '#ac6a1e', color: '#fff' }} icon={<PlusOutlined />}>Add Incubators</Button>
            </Dropdown>
            <Button icon={<SettingOutlined />} onClick={() => setColumnsModalOpen(true)}>Customize Columns</Button>
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
              <div><b>Incubator Name</b><div className="text-gray-700">{selected.incubatorName || '-'}</div></div>
              <div><b>Partner Name</b><div className="text-gray-700">{selected.partnerName || '-'}</div></div>
              <div><b>Partner Email</b><div className="text-gray-700">{selected.partnerEmail || '-'}</div></div>
              <div><b>Phone Number</b><div className="text-gray-700">{selected.phoneNumber || '-'}</div></div>
              <div><b>Sector Focus</b><div className="text-gray-700">{selected.sectorFocus || '-'}</div></div>
              <div><b>Country</b><div className="text-gray-700">{selected.country || '-'}</div></div>
              <div><b>State/City</b><div className="text-gray-700">{selected.stateCity || '-'}</div></div>
            </div>
          )}
        </Modal>

        <Modal title="Edit incubator" open={editOpen} onCancel={() => { setEditOpen(false); setSelected(null); }} footer={[<Button key="cancel" onClick={() => { setEditOpen(false); setSelected(null); }}>Cancel</Button>, <Button key="save" type="primary" onClick={handleSaveEdit}>Save</Button>]} width={800}>
          <Form layout="vertical" form={form}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Form.Item label="Incubator Name" name="incubatorName" rules={[{ required: true, message: 'Please enter incubator name' }]}>
                <Input placeholder="e.g. StartHub" />
              </Form.Item>
              <Form.Item label="Partner Name" name="partnerName" rules={[{ required: true, message: 'Please enter partner name' }]}>
                <Input placeholder="e.g. Alice Brown" />
              </Form.Item>
              <Form.Item label="Partner Email" name="partnerEmail" rules={[{ type: 'email', message: 'Enter valid email' }]}>
                <Input placeholder="name@example.com" />
              </Form.Item>
              <Form.Item label="Phone Number" name="phoneNumber">
                <Input placeholder="+1 555 123 4567" />
              </Form.Item>
              <Form.Item label="Sector Focus" name="sectorFocus">
                <Input placeholder="e.g. FinTech" />
              </Form.Item>
              <Form.Item label="Country" name="country">
                <Input placeholder="e.g. United States" />
              </Form.Item>
              <Form.Item label="State/City" name="stateCity">
                <Input placeholder="e.g. San Francisco, CA" />
              </Form.Item>
            </div>
          </Form>
        </Modal>
      </Card>
    </div>
  );
}