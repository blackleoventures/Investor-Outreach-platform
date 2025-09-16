// @ts-nocheck
"use client";

import { Card, Table, Typography, Button, Space, Tag, Tooltip, Modal, Descriptions, message, Form, Input, Select, Switch } from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined, PlusOutlined, MailOutlined } from "@ant-design/icons";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getApiBase, apiFetch } from "@/lib/api";

const { Title, Text } = Typography;

const Campaigns = () => {
  const { token } = useAuth();
  const router = useRouter();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [invOpen, setInvOpen] = useState(false);
  const [invLoading, setInvLoading] = useState(false);
  const [investors, setInvestors] = useState([]);
  const [selectedInvestorEmails, setSelectedInvestorEmails] = useState<string[]>([]);
  const [invPageCurrent, setInvPageCurrent] = useState(1);
  const invPageSize = 10;

  useEffect(() => { loadCampaigns(); }, []);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const base = await getApiBase();
      const res = await fetch(`${base}/api/campaign`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setCampaigns(Array.isArray(data.campaigns) ? data.campaigns : []);
    } catch (e) {
      message.error('Failed to load campaigns');
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (campaign) => {
    setSelected(campaign);
    setViewOpen(true);
  };

  const handleEdit = (campaign) => {
    if ((campaign.status || '').toLowerCase() !== 'draft') return;
    const id = campaign.id || campaign._id;
    router.push(`/dashboard/campaign/email-form?id=${id}`);
  };

  const handleDelete = (campaign) => {
    Modal.confirm({
      title: 'Delete this campaign?',
      content: 'This action cannot be undone.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const base = await getApiBase();
          const id = campaign.id || campaign._id;
          await fetch(`${base}/api/campaign/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
          setCampaigns(prev => prev.filter(c => (c.id || c._id) !== id));
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
      title: 'Actions', key: 'actions', render: (_, record) => (
        <Space>
          <Tooltip title="View"><Button size="small" type="primary" icon={<EyeOutlined/>} onClick={() => handleView(record)} /></Tooltip>
          <Tooltip title={(record.status||'').toLowerCase()==='draft'? 'Edit Campaign' : 'Edit (Draft only)'}>
            <Button size="small" icon={<EditOutlined/>} disabled={(record.status||'').toLowerCase()!=='draft'} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Tooltip title="Delete"><Button size="small" danger icon={<DeleteOutlined/>} onClick={() => handleDelete(record)} /></Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div className="p-6">
      <Card
        title={<Title level={4} className="!mb-0"><MailOutlined className="mr-2"/>Campaign Management</Title>}
        extra={<Button type="primary" icon={<PlusOutlined/>} onClick={() => setCreateOpen(true)} style={{backgroundColor:'#ac6a1e'}}>Create Campaign</Button>}
      >
        <Table
          columns={columns}
          dataSource={campaigns}
          loading={loading}
          rowKey={(r)=> r.id || r._id}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: t=>`Total ${t} campaigns` }}
        />
      </Card>

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
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => createForm.submit()}
        okText="Create"
        okButtonProps={{ type: 'primary', style: { backgroundColor: '#1677ff' } }}
        title={<span className="text-lg font-semibold">Create Campaign</span>}
        width={720}
        style={{ top: 40 }}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto', paddingRight: 12 } }}
        maskClosable={false}
      >
        <Form form={createForm} layout="vertical" onFinish={async (values) => {
          try {
            const base = await getApiBase();
            const payload = {
              name: values.name,
              clientName: values.clientName,
              audience: (values.audience || []).map((v: string) => ({ email: v })),
              subject: values.subject,
              body: values.body,
              schedule: values.schedule,
              status: values.launchNow ? 'active' : 'draft',
              type: 'Email',
              recipients: (values.audience || []).length,
              attachments: values.pitchDeckUrl ? [{ url: values.pitchDeckUrl, name: 'Pitch Deck' }] : undefined,
            };
            const res = await fetch(`${base}/api/campaign`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error('Failed to create');
            message.success('Campaign created');
            setCreateOpen(false);
            createForm.resetFields();
            loadCampaigns();
          } catch (e) {
            message.error(e.message || 'Create failed');
          }
        }}>
          <Form.Item name="name" label="Campaign Name" rules={[{ required: true }]}>
            <Input placeholder="Q4 Investor Outreach" />
          </Form.Item>
          <Form.Item name="clientName" label="Client/Startup Name" rules={[{ required: true }]}>
            <Input placeholder="Acme Inc." />
          </Form.Item>
          <Form.Item name="audience" label="Audience Emails">
            <div className="flex gap-2">
              <Select
                mode="tags"
                style={{ flex: 1 }}
                placeholder="Type emails or use Select Investors"
                tokenSeparators={[',', ' ']}
              />
              <Button onClick={async () => {
                setInvOpen(true);
                setInvLoading(true);
                try {
                  const response = await apiFetch(`/api/investors?limit=100000&page=1`);
                  const result = await response.json();
                  const investorData = result.docs || result.data || [];
                  console.log('Raw investor data:', investorData.slice(0, 3));
                  
                  // Use same normalization as all-investors page
                  const seen = new Set();
                  const unique = [];
                  for (const item of investorData) {
                    const key = `${item.id ?? ''}-${(item.partner_email ?? '').toString().toLowerCase()}`;
                    if (!seen.has(key)) { seen.add(key); unique.push(item); }
                  }
                  
                  const normalized = unique.map((r:any) => ({
                    ...r,
                    id: r.id ?? r._id ?? undefined,
                    investor_name: r.investor_name || r.firm_name || r.investorName || r.name || r.investor || r.investor_name || r.company || r.fund_name || r.organization || r.fund || 'Investor',
                    partner_name: r.partner_name || r.partnerName || r.partner || r.contact_name || r.name || r.first_name || r.contact || r.person || 'Partner',
                    partner_email: r.partner_email || r.email || r.partnerEmail || r.email_id || r.emailId || r.emailAddress || r.contact_email || r.primary_email,
                  }));
                  
                  console.log('Normalized data:', normalized.slice(0, 3));
                  setInvestors(normalized);
                  message.success(`Loaded ${normalized.length} investors`);
                } catch (e) {
                  console.error('Load error:', e);
                  message.error('Failed to load investors');
                } finally { setInvLoading(false); }
              }}>Select Investors</Button>
            </div>
          </Form.Item>
          <Form.Item name="subject" label="Email Subject" rules={[{ required: true }]}>
            <Input placeholder="Intro: Seed round for Acme Inc" />
          </Form.Item>
          <Form.Item name="body" label="Email Body" rules={[{ required: true }]}>
            <Input.TextArea rows={6} placeholder="Pitch, highlights, USP, fundraise, CTA" />
          </Form.Item>
          <Form.Item name="pitchDeckUrl" label="Pitch Deck URL">
            <Input placeholder="https://drive.google.com/... or https://your-site.com/deck.pdf" />
          </Form.Item>
          <Form.Item name="schedule" label="Schedule Options" initialValue="Immediate">
            <Select
              options={[
                { value: 'Immediate', label: 'Immediate' },
                { value: 'Daily', label: 'Daily' },
                { value: 'Weekly', label: 'Weekly' },
                { value: 'Custom', label: 'Custom' },
              ]}
            />
          </Form.Item>
          <Form.Item name="launchNow" label="Activate after create" valuePropName="checked" initialValue={false}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={invOpen}
        onCancel={() => setInvOpen(false)}
        onOk={() => {
          const current: string[] = createForm.getFieldValue('audience') || [];
          const merged = Array.from(new Set([...(current||[]), ...selectedInvestorEmails]));
          createForm.setFieldsValue({ audience: merged });
          setInvOpen(false);
        }}
        okText={`Add Selected (${selectedInvestorEmails.length})`}
        okButtonProps={{ type: 'primary', style: { backgroundColor: '#1677ff' } }}
        title={
          <div className="flex items-center justify-between w-full">
            <span className="text-lg font-semibold">Select Investors</span>
            <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">Total: {investors.length}</span>
          </div>
        }
        width={900}
        style={{ top: 40 }}
        styles={{ body: { maxHeight: '65vh', overflowY: 'auto' } }}
      >
        <Table
          loading={invLoading}
          dataSource={investors}
          rowKey={(r:any)=> r.id || r._id || r.partner_email || r.email}
          rowSelection={{
            onChange: (_keys, rows:any[]) => {
              const emails = rows.map(r => r.partner_email || r.email).filter(Boolean);
              if (emails.length > 10) {
                message.warning('You can select up to 10 investors');
                setSelectedInvestorEmails(emails.slice(0,10));
              } else {
                setSelectedInvestorEmails(emails);
              }
            },
            getCheckboxProps: (record:any) => ({ disabled: !(record.partner_email || record.email) })
          }}
          columns={[
            { title: 'S.No.', key: 'serial', width: 70, align: 'center' as const, render: (_:any, __:any, idx:number)=> (idx + 1) + (invPageCurrent - 1) * invPageSize },
            { title: 'Name', key: 'name', render: (_:any, r:any)=> r.partner_name || r.name || r.fullName || `${r.first_name||''} ${r.last_name||''}`.trim() || '-' },
            { title: 'Email', key: 'email', render: (_:any, r:any)=> r.partner_email || r.email || '-' },
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

