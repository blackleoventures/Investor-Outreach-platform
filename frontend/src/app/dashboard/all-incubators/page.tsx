/* eslint-disable */
// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { Table, Button, Card, message, Space, Tabs, Popconfirm, Input } from 'antd';
import { PlusOutlined, UploadOutlined, TableOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import IncubatorFileUpload from '@/components/IncubatorFileUpload';



export default function AllIncubators() {
  const [incubators, setIncubators] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeKey, setActiveKey] = useState('1');
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(10);
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

  const columns = [
    {
      key: 'serialNumber',
      title: 'Sr. No.',
      width: 80,
      align: 'center',
      render: (_: any, __: any, index: number) => index + 1,
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
      fixed: 'right',
      render: (_: any, record: any) => (
        <Space>
          <Popconfirm title="Delete this row?" onConfirm={() => handleDelete(record.id)}>
            <Button danger icon={<DeleteOutlined />} size="small">Delete</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

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

  useEffect(() => {
    fetchIncubators();
  }, []);

  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      setFiltered(incubators);
      setVisibleCount(10);
      return;
    }
    const next = incubators.filter(r => (
      (r.incubatorName || '').toLowerCase().includes(q) ||
      (r.partnerName || '').toLowerCase().includes(q) ||
      (r.partnerEmail || '').toLowerCase().includes(q) ||
      (r.phoneNumber || '').toLowerCase().includes(q)
    ));
    setFiltered(next);
    setVisibleCount(10);
  }, [search, incubators]);

  const handleUploadSuccess = () => {
    // After successful upload, switch to table tab and refresh
    setActiveKey('1');
    fetchIncubators();
  };

  return (
    <div className="p-6">
      <Card 
        title="Incubator Management" 
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => router.push('/dashboard/add-incubator')}
          >
            Add Incubator
          </Button>
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
                    <Input
                      size="large"
                      placeholder="Search by name, email, or phone..."
                      prefix={<SearchOutlined />}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      style={{ maxWidth: 400 }}
                    />
                  </div>
                  <Table
                    columns={columns}
                    dataSource={filtered.slice(0, visibleCount)}
                    loading={loading}
                    rowKey={(r) => `${r.id ?? 'noid'}-${(r.partnerEmail ?? r.incubatorName ?? '').toLowerCase()}`}
                    scroll={{ x: 1200 }}
                    pagination={false}
                  />
                  <div className="flex justify-between items-center mt-4">
                    <div className="text-sm text-gray-600">Total: {filtered.length} incubators • Showing {Math.min(visibleCount, filtered.length)}</div>
                    <div className="space-x-2">
                      <Button onClick={() => setVisibleCount(filtered.length)}>All</Button>
                      <Button type="primary" style={{ backgroundColor: '#1890ff', borderColor: '#1890ff', color: '#fff' }} disabled={visibleCount >= filtered.length} onClick={() => setVisibleCount(c => Math.min(c + 10, filtered.length))}>Show more</Button>
                    </div>
                  </div>
                </>
              ),
            },
            {
              key: '2',
              label: (
                <span>
                  <UploadOutlined />
                  Upload File
                </span>
              ),
              children: <IncubatorFileUpload onSuccess={handleUploadSuccess} />,
            },
          ]}
        />
      </Card>
    </div>
  );
}