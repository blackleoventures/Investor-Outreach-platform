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


  const [invOpen, setInvOpen] = useState(false);
  const [invLoading, setInvLoading] = useState(false);
  const [investors, setInvestors] = useState([]);
  const [selectedInvestorEmails, setSelectedInvestorEmails] = useState<string[]>([]);
  const [invPageCurrent, setInvPageCurrent] = useState(1);
  const invPageSize = 10;

  useEffect(() => { 
    loadCampaigns(); 
    // Load selected investors from localStorage
    const saved = localStorage.getItem('selectedInvestors');
    if (saved) {
      try {
        const investors = JSON.parse(saved);
        setInvestors(investors);
        message.info(`${investors.length} investors loaded from matching`);
      } catch (e) {
        console.error('Failed to load saved investors:', e);
      }
    }
  }, []);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
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

  const columns = [
    { title: 'S.No.', key: 'serial', width: 60, render: (_, __, idx) => idx + 1 },
    { title: 'Campaign Name', dataIndex: 'name', key: 'name' },
    { title: 'Type', dataIndex: 'type', key: 'type', render: (t) => <Tag color="blue">{t || 'Email'}</Tag> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={(s||'draft').toLowerCase()==='active'?'green':'orange'}>{s || 'draft'}</Tag> },
    { title: 'Recipients', dataIndex: 'recipients', key: 'recipients', render: (r, rec) => r ?? rec?.audience?.length ?? 0 },
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
          <Button type="primary" icon={<PlusOutlined/>} onClick={() => router.push('/dashboard/campaign/ai-email-campaign')} style={{backgroundColor:'#ac6a1e'}}>Create Campaign</Button>
        }
      >
        {investors.length > 0 && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-blue-800">Selected Investors ({investors.length})</span>
              <Button size="small" onClick={() => {
                localStorage.removeItem('selectedInvestors');
                setInvestors([]);
                message.success('Investors cleared');
              }}>Clear</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {investors.slice(0, 6).map((inv, idx) => (
                <div key={idx} className="text-sm bg-white p-2 rounded border">
                  <div className="font-medium">{inv.name}</div>
                  <div className="text-gray-600">{inv.email}</div>
                  <div className="text-xs text-blue-600">Score: {inv.score}</div>
                </div>
              ))}
              {investors.length > 6 && (
                <div className="text-sm text-gray-500 p-2">+{investors.length - 6} more...</div>
              )}
            </div>
          </div>
        )}
        <Table
          columns={columns}
          dataSource={campaigns}
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

      <Modal open={viewOpen} onCancel={()=>setViewOpen(false)} footer={null} width={980} title={<span className="text-lg font-semibold">Campaign Details</span>}>
        {selected && (
          <Descriptions bordered column={2} size="middle" labelStyle={{ width: 200 }}>
            <Descriptions.Item label="Campaign Name" span={2}>{selected.name}</Descriptions.Item>
            <Descriptions.Item label="Client/Startup" span={2}>{selected.clientName || '-'}</Descriptions.Item>
            <Descriptions.Item label="Type"><Tag color="blue">{selected.type || 'Email'}</Tag></Descriptions.Item>
            <Descriptions.Item label="Status"><Tag color={(selected.status||'draft').toLowerCase()==='active'?'green':'orange'}>{selected.status || 'draft'}</Tag></Descriptions.Item>
            <Descriptions.Item label="Recipients" span={2}>{selected.recipients ?? selected?.audience?.length ?? 0}</Descriptions.Item>
            <Descriptions.Item label="Subject" span={2}>{selected.subject || '-'}</Descriptions.Item>
            <Descriptions.Item label="Email Body" span={2}><div style={{ whiteSpace: 'pre-wrap' }}>{selected.body || selected.emailBody || '-'}</div></Descriptions.Item>
            {Array.isArray(selected.attachments) && selected.attachments.length > 0 && (
              <Descriptions.Item label="Attachments" span={2}>
                {selected.attachments.map((a, i) => (
                  <div key={i}><a href={a.url || a} target="_blank" rel="noreferrer">{a.name || a.url || `Attachment ${i+1}`}</a></div>
                ))}
              </Descriptions.Item>
            )}
            {Array.isArray(selected.audience) && selected.audience.length > 0 && (
              <Descriptions.Item label="Audience List" span={2}>
                {selected.audience.slice(0, 10).map((p, i) => (
                  <div key={i}><Text>{p.name || p.fullName || '-'}</Text> &lt;<Text>{p.email}</Text>&gt; {typeof p.score !== 'undefined' && <Tag>{p.score}</Tag>}</div>
                ))}
                {selected.audience.length > 10 && <div className="text-xs text-gray-500">+{selected.audience.length - 10} more…</div>}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Schedule" span={2}>{selected.schedule || selected.scheduleType || 'Immediate'}</Descriptions.Item>
            {selected.reports && (
              <Descriptions.Item label="Reports" span={2}>
                <Space>
                  <Tag>Sent: {selected.reports.sent ?? 0}</Tag>
                  <Tag>Opened: {selected.reports.opened ?? 0}</Tag>
                  <Tag>Clicked: {selected.reports.clicked ?? 0}</Tag>
                  <Tag>Replied: {selected.reports.replied ?? 0}</Tag>
                </Space>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>



      <Modal
        open={invOpen}
        onCancel={() => setInvOpen(false)}
        onOk={() => {
          message.success(`Selected ${selectedInvestorEmails.length} investors`);
          setSelectedInvestorEmails([]);
          setInvOpen(false);
        }}
        okText={`Add Investors (${selectedInvestorEmails.length})`}
        okButtonProps={{
          type: 'primary',
          style: { backgroundColor: '#1677ff', borderRadius: 6, padding: '0 16px' },
          disabled: selectedInvestorEmails.length === 0,
        }}
        title={
          <div className="flex items-center justify-between w-full">
            <span className="text-lg font-semibold">Select Investors</span>
            <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
              Total: {investors.length} · Selected: {selectedInvestorEmails.length}
            </span>
          </div>
        }
        width={900}
        style={{ top: 40 }}
        styles={{ body: { maxHeight: '65vh', overflowY: 'auto' } }}
      >
        <Table
          loading={invLoading}
          dataSource={investors}
          rowKey={(r:any)=> r.id || r._id || r.displayEmail || r.partner_email || r.email}
          rowSelection={{
            onChange: (_keys, rows:any[]) => {
              const emails = rows.map(r => r.displayEmail || r.partner_email || r.email).filter(Boolean);
              setSelectedInvestorEmails(emails);
            },
            getCheckboxProps: (record:any) => ({ disabled: !(record.displayEmail || record.partner_email || record.email) })
          }}
          columns={[
            { title: 'S.No.', key: 'serial', width: 70, align: 'center' as const, render: (_:any, __:any, idx:number)=> (idx + 1) + (invPageCurrent - 1) * invPageSize },
            { title: 'Investor Name', key: 'name', render: (_:any, r:any)=> r.name || r.investor_name || r.displayName || r.fullName || `${r.first_name||''} ${r.last_name||''}`.trim() || '-' },
            { title: 'Investor Email', key: 'email', render: (_:any, r:any)=> r.email || r.displayEmail || r.partner_email || '-' },
            { title: 'Score', key: 'score', render: (_:any, r:any)=> (r.score ?? r.matchScore ?? '-') },
          ]}
          pagination={{ 
            pageSize: invPageSize, 
            current: invPageCurrent, 
            onChange: (p)=> setInvPageCurrent(p), 
            showSizeChanger: false, 
            total: investors.length, 
            showTotal: (total, range)=> `${range[0]}-${range[1]} of ${total}`,
            showQuickJumper: true
          }}
        />
      </Modal>
    </div>
  );
};

export default function Page() { return <Campaigns />; }

