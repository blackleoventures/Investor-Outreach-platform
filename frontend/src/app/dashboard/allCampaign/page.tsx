// @ts-nocheck
"use client";

import { Card, Table, Typography, Button, Space, Tag, Tooltip, Modal, Descriptions, message, Form, Input, Select, Switch } from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined, PlusOutlined, MailOutlined, UserAddOutlined } from "@ant-design/icons";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getApiBase, apiFetch } from "@/lib/api";

const { Title, Text } = Typography;

const Campaigns = () => {
  const { currentUser, login } = useAuth();
  const router = useRouter();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editForm] = Form.useForm();
  const [selectedClient, setSelectedClient] = useState('all');
  const [campaignStats, setCampaignStats] = useState({});




  useEffect(() => { 
    loadCampaigns(); 

    
    // Real-time campaign tracking
    const interval = setInterval(() => {
      loadCampaigns();
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      // Load campaign tracking stats
      const tracking = JSON.parse(localStorage.getItem('campaignTracking') || '{}');
      setCampaignStats(tracking);
      
      // Load from localStorage first (real campaigns)
      let localCampaigns = JSON.parse(localStorage.getItem('campaigns') || '[]');

      // Strip any previously-seeded demo/placeholder items
      if (Array.isArray(localCampaigns)) {
        const cleaned = localCampaigns.filter((c:any) => {
          const name = (c?.name || '').toString();
          const isKnownDemo = (c?.id === '1' && name === 'TechStartup_Seed_Outreach')
            || (name === 'TechStartup_Seed_Outreach' && (c?.recipients === 15 || c?.stats));
          return !isKnownDemo;
        });
        if (cleaned.length !== localCampaigns.length) {
          localCampaigns = cleaned;
          try { localStorage.setItem('campaigns', JSON.stringify(localCampaigns)); } catch {}
        }
      }
      
      // Load from sessionStorage for current campaign
      const savedCampaign = sessionStorage.getItem('currentCampaign');
      if (savedCampaign) {
        try {
          const campaignData = JSON.parse(savedCampaign);
          // Add to campaigns if not already present
          const exists = localCampaigns.find(c => c.id === campaignData.id);
          if (!exists) {
            localCampaigns.unshift(campaignData);
          }
        } catch (e) {
          console.error('Failed to load saved campaign:', e);
        }
      }
      
      // If nothing in local, attempt restore from backup
      if (!Array.isArray(localCampaigns) || localCampaigns.length === 0) {
        try {
          const backup = JSON.parse(localStorage.getItem('campaigns_backup') || '[]');
          if (Array.isArray(backup) && backup.length > 0) {
            // Also strip demo from backup
            const cleanedBackup = backup.filter((c:any) => (c?.id !== '1' && (c?.name || '') !== 'TechStartup_Seed_Outreach'));
            localCampaigns = cleanedBackup;
            try { localStorage.setItem('campaigns', JSON.stringify(localCampaigns)); } catch {}
            if (localCampaigns.length > 0) message.success('Restored campaigns from backup');
          }
        } catch {}
      }

      setCampaigns(localCampaigns);
    } catch (e) {
      console.error('Failed to load campaigns:', e);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (campaign) => {
    setSelected(campaign);
    setViewOpen(true);
  };

  const handleEdit = (campaign, index) => {
    setSelected(campaign);
    setEditIndex(index);
    try {
      editForm.setFieldsValue({
        name: campaign.name,
        type: campaign.type || 'Email',
        status: campaign.status || 'draft',
        recipients: campaign.recipients ?? (campaign.audience?.length || 0),
      });
    } catch {}
    setEditOpen(true);
  };

  const handleDelete = (campaign, index) => {
    Modal.confirm({
      title: 'Delete this campaign?',
      content: 'This action cannot be undone.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const id = campaign.id || campaign._id;
          // Create a backup before mutating
          try { localStorage.setItem('campaigns_backup', localStorage.getItem('campaigns') || '[]'); } catch {}
          if (id) {
            // Use Next.js API route to avoid CORS and attach auth implicitly from browser
            const idToken = currentUser ? await currentUser.getIdToken(true) : undefined;
            const headers: any = idToken ? { Authorization: `Bearer ${idToken}` } : {};
            await fetch(`/api/campaign/${id}`, { method: 'DELETE', headers });
          }
          setCampaigns(prev => {
            const updated = id
              ? prev.filter(c => (c.id || c._id) !== id)
              : prev.filter((_, i) => i !== index);
            try {
              localStorage.setItem('campaigns', JSON.stringify(updated));
              const current = sessionStorage.getItem('currentCampaign');
              if (current) {
                const parsed = JSON.parse(current);
                if (id && (parsed?.id || parsed?._id) === id) {
                  sessionStorage.removeItem('currentCampaign');
                }
              }
            } catch {}
            return updated;
          });
          message.success('Campaign deleted');
        } catch {
          message.error('Delete failed');
        }
      }
    });
  };

  // Filter campaigns by client
  const filteredCampaigns = selectedClient === 'all' 
    ? campaigns 
    : campaigns.filter(c => c.clientName === selectedClient);
    
  // Get unique clients
  const clients = ['all', ...new Set(campaigns.map(c => c.clientName).filter(Boolean))];
  
  const columns = [
    { title: 'S.No.', key: 'serial', width: 60, render: (_, __, idx) => idx + 1 },
    { title: 'Campaign Name', dataIndex: 'name', key: 'name' },
    { title: 'Client', dataIndex: 'clientName', key: 'clientName', render: (c) => c || '-' },
    { title: 'Type', dataIndex: 'type', key: 'type', render: (t) => <Tag color="blue">{t || 'Email'}</Tag> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={(s||'draft').toLowerCase()==='active'?'green':'orange'}>{s || 'draft'}</Tag> },
    { title: 'Recipients', dataIndex: 'recipients', key: 'recipients', render: (r, rec) => {
      const sentEmails = rec?.sentEmails?.length ?? rec?.emailsSent ?? 0;
      const isDraft = (rec.status || 'draft').toLowerCase() === 'draft';
      
      return (
        <div className="font-medium">
          {isDraft ? (
            <span>{sentEmails}</span>
          ) : (
            <span className="text-green-600">{sentEmails}</span>
          )}
        </div>
      );
    }},
    { title: 'Created Date', dataIndex: 'createdAt', key: 'createdAt', render: (d) => d ? new Date(d.seconds ? d.seconds*1000 : d).toLocaleDateString() : '-' },
    {
      title: 'Actions', key: 'actions', render: (_, record, index) => (
        <Space>
          <Tooltip title="View">
            <Button size="small" type="text" icon={<EyeOutlined style={{ color: '#1677ff' }} />} onClick={() => handleView(record)} />
          </Tooltip>
          <Tooltip title={(record.status||'').toLowerCase()==='draft'? 'Edit Campaign' : 'Edit (Draft only)'}>
            <Button size="small" icon={<EditOutlined/>} onClick={() => handleEdit(record, index)} />
          </Tooltip>
          <Tooltip title="Delete"><Button size="small" danger icon={<DeleteOutlined/>} onClick={() => handleDelete(record, index)} /></Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div className="p-6">
      <Card
        title={<Title level={4} className="!mb-0"><MailOutlined className="mr-2"/>Campaign Management</Title>}
        extra={
          <Select
            value={selectedClient}
            onChange={setSelectedClient}
            style={{ width: 200 }}
            placeholder="Filter by client"
          >
            <Select.Option value="all">All Clients</Select.Option>
            {clients.filter(c => c !== 'all').map(client => (
              <Select.Option key={client} value={client}>{client}</Select.Option>
            ))}
          </Select>
        }
      >

        <Table
          columns={columns}
          dataSource={filteredCampaigns}
          loading={loading}
          rowKey={(r, idx)=> r.id || r._id || `${r.name||'campaign'}-${idx}`}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: t=>`Total ${t} campaigns` }}
        />
      </Card>

      <Modal
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        okText="Save"
        okButtonProps={{ type: 'primary', style: { backgroundColor: '#1677ff' } }}
        onOk={async () => {
          try {
            const values = await editForm.validateFields();
            setCampaigns(prev => {
              const list = [...prev];
              if (editIndex !== null) {
                list[editIndex] = { ...list[editIndex], ...values };
              }
              try { localStorage.setItem('campaigns', JSON.stringify(list)); } catch {}
              return list;
            });
            setEditOpen(false);
            message.success('Campaign updated');
          } catch {}
        }}
        title={<span className="text-lg font-semibold">Edit Campaign</span>}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="name" label="Campaign Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="Type">
            <Select options={[{ value: 'Email', label: 'Email' }]} />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select options={[{ value: 'draft', label: 'draft' }, { value: 'active', label: 'active' }]} />
          </Form.Item>
          <Form.Item name="recipients" label="Recipients">
            <Input type="number" min={0} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal open={viewOpen} onCancel={()=>setViewOpen(false)} footer={null} width={1200} title={<span className="text-lg font-semibold">Campaign Details - Sent Emails</span>} style={{ top: 20 }} bodyStyle={{ maxHeight: '80vh', overflowY: 'auto', padding: '16px' }}>
        {selected && (
          <div className="space-y-6" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
            {/* Campaign Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Text className="text-sm text-gray-600">Campaign</Text>
                  <div className="font-semibold">{selected.name}</div>
                </div>
                <div>
                  <Text className="text-sm text-gray-600">Client</Text>
                  <div className="font-semibold">{selected.clientName || '-'}</div>
                </div>
                <div>
                  <Text className="text-sm text-gray-600">Status</Text>
                  <div><Tag color={(selected.status||'draft').toLowerCase()==='active'?'green':'orange'}>{selected.status || 'draft'}</Tag></div>
                </div>
                <div>
                  <Text className="text-sm text-gray-600">Total Sent</Text>
                  <div className="font-semibold text-green-600">{selected?.sentEmails?.length || selected?.emailsSent || 0}</div>
                </div>
              </div>
            </div>

            {/* Sent Emails List */}
            <div>
              <Title level={5} className="!mb-3">📧 Sent Emails ({selected?.sentEmails?.length || 0})</Title>
              {selected?.sentEmails && selected.sentEmails.length > 0 ? (
                <Table
                  dataSource={selected.sentEmails}
                  rowKey={(record, index) => record.email + index}
                  pagination={{ pageSize: 10, showSizeChanger: true }}
                  columns={[
                    {
                      title: 'S.No.',
                      key: 'serial',
                      width: 60,
                      render: (_, __, index) => index + 1
                    },
                    {
                      title: 'Investor Email',
                      dataIndex: 'email',
                      key: 'email',
                      render: (email) => (
                        <Text copyable className="text-blue-600">{email}</Text>
                      )
                    },
                    {
                      title: 'Subject',
                      dataIndex: 'subject',
                      key: 'subject',
                      render: (subject) => (
                        <Tooltip title={subject}>
                          <Text className="max-w-xs truncate block">{subject || selected.subject || '-'}</Text>
                        </Tooltip>
                      )
                    },
                    {
                      title: 'Sent At',
                      dataIndex: 'sentAt',
                      key: 'sentAt',
                      render: (sentAt) => (
                        <Text className="text-sm text-gray-600">
                          {sentAt ? new Date(sentAt).toLocaleString() : '-'}
                        </Text>
                      )
                    },
                    {
                      title: 'Status',
                      key: 'status',
                      render: () => (
                        <Tag color="green">Sent</Tag>
                      )
                    }
                  ]}
                />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <MailOutlined className="text-4xl mb-2" />
                  <div>No emails sent yet</div>
                  <Text className="text-sm">Emails will appear here once the campaign is executed</Text>
                </div>
              )}
            </div>

            {/* Campaign Details */}
            <div>
              <Title level={5} className="!mb-3">📋 Campaign Details</Title>
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="Subject">{selected.subject || '-'}</Descriptions.Item>
                <Descriptions.Item label="Email Body">
                  <div className="max-h-32 overflow-y-auto text-sm" style={{ whiteSpace: 'pre-wrap' }}>
                    {selected.body || selected.emailBody || '-'}
                  </div>
                </Descriptions.Item>
                <Descriptions.Item label="Schedule">{selected.schedule || selected.scheduleType || 'Immediate'}</Descriptions.Item>
              </Descriptions>
            </div>
          </div>
        )}
      </Modal>




    </div>
  );
};

export default function Page() { return <Campaigns />; }

