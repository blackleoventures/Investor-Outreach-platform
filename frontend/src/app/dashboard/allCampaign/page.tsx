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
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();
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
      const localCampaigns = JSON.parse(localStorage.getItem('campaigns') || '[]');
      
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
          const idToken = currentUser ? await currentUser.getIdToken(true) : undefined;
          const headers: any = idToken ? { Authorization: `Bearer ${idToken}` } : {};
          await fetch(`${base}/api/campaign/${id}`, { method: 'DELETE', headers });
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
        extra={
          <div className="flex gap-2">
            <Button icon={<UserAddOutlined/>} onClick={() => router.push('/dashboard/add-client')}>Add Client</Button>
            <Button onClick={() => {
              sessionStorage.removeItem('currentCampaign');
              sessionStorage.removeItem('currentClient');
              localStorage.removeItem('campaigns');
              localStorage.removeItem('clients');
              loadCampaigns();
              message.success('All data cleared');
            }} size="small">Clear All</Button>
            <Button type="primary" icon={<PlusOutlined/>} onClick={() => setCreateOpen(true)} style={{backgroundColor:'#ac6a1e'}}>Create Campaign</Button>
          </div>
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
        okText="Create Campaign"
        okButtonProps={{ type: 'primary', style: { backgroundColor: '#1677ff' } }}
        title={<span className="text-lg font-semibold">Create Campaign</span>}
        width={720}
        style={{ top: 40 }}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto', paddingRight: 12 } }}
        maskClosable={false}
      >
        <Form form={createForm} layout="vertical" onValuesChange={(changed, all)=>{
          if (Object.prototype.hasOwnProperty.call(changed,'audience')) {
            console.log('[CreateForm] audience changed ->', all.audience);
          }
        }} onFinish={async (values) => {
          try {
            if (!currentUser) {
              message.error('Please sign in to create a campaign');
              try { await login?.(); } catch {}
              return;
            }
            const base = await getApiBase();
            const payload = {
              name: values.name,
              clientName: values.clientName,
              status: 'draft',
              type: 'Email',
            };
            console.log('[CreateCampaign] payload ->', payload);
            const idToken = currentUser ? await currentUser.getIdToken(true) : undefined;
            const headers: any = {
              'Content-Type': 'application/json',
              ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
            };
            const res = await fetch(`${base}/api/campaign`, {
              method: 'POST',
              headers,
              body: JSON.stringify(payload),
            });
            if (!res.ok) {
              const err = await res.json().catch(()=>({}));
              throw new Error(err?.error || `Failed to create (${res.status})`);
            }
            message.success('Campaign created');
            setCreateOpen(false);
            createForm.resetFields();
            // Store campaign data and navigate to workflow
            const campaignData = {
              id: Date.now().toString(),
              name: values.name,
              clientName: values.clientName,
              type: 'Email',
              status: 'Draft',
              recipients: 0,
              createdAt: new Date().toISOString(),
              subject: values.subject,
              body: values.body
            };
            
            // Save to both session and local storage
            sessionStorage.setItem('currentCampaign', JSON.stringify(campaignData));
            const existingCampaigns = JSON.parse(localStorage.getItem('campaigns') || '[]');
            existingCampaigns.unshift(campaignData);
            localStorage.setItem('campaigns', JSON.stringify(existingCampaigns));
            
            loadCampaigns(); // Refresh the list
            // Navigate to Investor Matching as step 2
            router.push('/dashboard/investor-management');
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
                value={investors.map(inv => inv.email)}
                onChange={(emails) => {
                  const investorData = emails.map(email => ({ email, name: 'Investor', score: 0 }));
                  setInvestors(investorData);
                }}
              />
              <Button onClick={() => setInvOpen(true)}>Select Investors ({investors.length})</Button>
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
          const current: string[] = (createForm.getFieldValue('audience') || []).filter(Boolean);
          const already = new Set(current.map((e:string)=> e.toLowerCase()));
          const additions = (selectedInvestorEmails || []).filter(e => e && !already.has(e.toLowerCase()));
          const allowed = Math.max(0, 10 - current.length);
          let next = current;
          if (additions.length > allowed) {
            message.warning(`Only ${allowed} more can be added (max 10)`);
            next = [...current, ...additions.slice(0, allowed)];
          } else {
            next = [...current, ...additions];
          }
          console.log('[SelectInvestors] onOk merge', { currentCount: current.length, selectedCount: (selectedInvestorEmails||[]).length, additions: additions.length, allowed, finalCount: next.length, next });
          createForm.setFieldsValue({ audience: next });
          // Force antd Select to refresh its tags immediately
          createForm.validateFields(['audience']).catch(() => {});
          if (additions.length === 0) {
            message.info('No new emails to add');
          } else {
            message.success(`Added ${Math.min(additions.length, allowed)} emails`);
          }
          setSelectedInvestorEmails([]);
          setInvOpen(false);
        }}
        okText={(
          () => {
            const current: string[] = (createForm.getFieldValue('audience') || []).filter(Boolean);
            const already = new Set(current.map((e:string)=> e.toLowerCase()));
            const additions = (selectedInvestorEmails || []).filter(e => e && !already.has(e.toLowerCase()));
            const allowed = Math.max(0, 10 - current.length);
            const count = Math.min(allowed, additions.length);
            return `Add Investors (${count})`;
          }
        )()}
        okButtonProps={(
          () => {
            const current: string[] = (createForm.getFieldValue('audience') || []).filter(Boolean);
            const already = new Set(current.map((e:string)=> e.toLowerCase()));
            const additions = (selectedInvestorEmails || []).filter(e => e && !already.has(e.toLowerCase()));
            const allowed = Math.max(0, 10 - current.length);
            const count = Math.min(allowed, additions.length);
            return {
              type: 'primary',
              style: { backgroundColor: '#1677ff', borderRadius: 6, padding: '0 16px' },
              disabled: count === 0,
            } as any;
          }
        )()}
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
              const current: string[] = (createForm.getFieldValue('audience') || []).filter(Boolean);
              const currentCount = current.length;
              const allowed = Math.max(0, 10 - currentCount);
              const emails = rows.map(r => r.displayEmail || r.partner_email || r.email).filter(Boolean);
              console.log('[SelectInvestors] rowSelection change', { currentCount, allowed, picked: emails.length });
              if (emails.length > allowed) {
                message.warning(`You can select ${allowed} more (max 10 in total)`);
                setSelectedInvestorEmails(emails.slice(0, allowed));
              } else {
                setSelectedInvestorEmails(emails);
              }
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

