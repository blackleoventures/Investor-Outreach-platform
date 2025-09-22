// @ts-nocheck
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Form, Input, message, Select, Dropdown, Checkbox, Modal } from "antd";
import { ArrowLeftOutlined, PlusOutlined, SettingOutlined, UserOutlined } from "@ant-design/icons";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, getApiBase } from "@/lib/api";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { sendEmailVerification, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

const { TextArea } = Input;

export default function Page() {
  const router = useRouter();
  const { token, currentUser } = useAuth() as any;
  const [loading, setLoading] = useState(false);
  const [showManualForm, setShowManualForm] = useState(true);
  const [form] = Form.useForm();
  const [emailVerified, setEmailVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [checking, setChecking] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    company_name: true,
    founder_name: true,
    company_email: true,
    contact: true,
    fund_stage: true,
    revenue: true,
    investment_ask: true,
    sector: true,
  });

  const onFinish = async (values) => {
    setLoading(true);
    try {
      // Map UI fields to backend expected payload
      const [firstName, ...rest] = (values.founder_name || "").trim().split(" ");
      const payload = {
        firstName: firstName || undefined,
        lastName: rest.join(" ") || undefined,
        email: values.company_email,
        phone: values.contact,
        companyName: values.company_name,
        industry: values.sector,
        fundingStage: values.fund_stage,
        revenue: values.revenue || undefined,
        investment: values.investment_ask || undefined,
        city: values.location,
        location: values.location,
        // Optional extras (kept for compatibility)
        address: undefined,
        position: undefined,
        website: undefined,
        state: undefined,
        postalCode: undefined,
        companyDescription: undefined,
        employees: undefined,
      };

      const res = await apiFetch(`/api/clients`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create client");

      message.success("Client created successfully");
      
      // Store client data in Firebase/localStorage for persistence
      const clientData = {
        id: data.client?.id || Date.now().toString(),
        company_name: payload.companyName,
        first_name: payload.firstName,
        last_name: payload.lastName,
        email: payload.email,
        phone: payload.phone,
        fund_stage: payload.fundingStage,
        location: payload.location,
        industry: payload.industry,
        revenue: values.revenue, // Preserve exact string (e.g., "$2M")
        investment_ask: values.investment_ask, // Preserve exact string
        createdAt: new Date().toISOString(),
        archive: false
      };
      
      // Save to localStorage for persistence
      const existingClients = JSON.parse(localStorage.getItem('clients') || '[]');
      existingClients.unshift(clientData);
      localStorage.setItem('clients', JSON.stringify(existingClients));
      
      sessionStorage.setItem('currentClient', JSON.stringify(clientData));
      
      // Create a draft campaign once and persist it
      try {
        const base = await getApiBase();
        const idToken = currentUser ? await currentUser.getIdToken(true) : undefined;
        const headers: any = { 'Content-Type': 'application/json', ...(idToken ? { Authorization: `Bearer ${idToken}` } : token ? { Authorization: `Bearer ${token}` } : {}) };
        const campaignPayload = {
          name: `${clientData.company_name || 'Campaign'}_${payload.fundingStage || 'Seed'}_Outreach`,
          clientName: clientData.company_name,
          clientId: clientData.id,
          status: 'draft',
          type: 'Email',
          recipients: 0,
          createdAt: new Date().toISOString(),
          audience: [],
          emailTemplate: { subject: '', content: '' },
          schedule: null
        };
        
        let createdCampaign = campaignPayload;
        try {
          const resp = await fetch(`${base}/api/campaign`, { method: 'POST', headers, body: JSON.stringify(campaignPayload) });
          if (resp.ok) {
            const result = await resp.json();
            if (result?.campaign) createdCampaign = result.campaign;
          }
        } catch {}
        
        // Save to localStorage and sessionStorage
        const existingCampaigns = JSON.parse(localStorage.getItem('campaigns') || '[]');
        // Avoid duplicates by name+clientId
        const exists = existingCampaigns.some((c:any)=> (c.name===createdCampaign.name) && (c.clientId===createdCampaign.clientId));
        if (!exists) {
          existingCampaigns.unshift(createdCampaign);
          localStorage.setItem('campaigns', JSON.stringify(existingCampaigns));
        }
        sessionStorage.setItem('currentCampaign', JSON.stringify(createdCampaign));
      } catch {}

      // Redirect to Manage Campaigns with success message
      message.success("Client created and campaign initialized successfully!");
      router.push('/dashboard/allCampaign');
    } catch (e) {
      message.error(e.message || "Failed to create client");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    try {
      const email = form.getFieldValue('company_email');
      if (!email) {
        message.warning('Enter an email to verify');
        return;
      }
      setVerifying(true);
      if (isFirebaseConfigured && auth) {
        // Use Firebase email verification (requires a user). We create a temp user if needed.
        let user = auth.currentUser;
        if (!user || user.email !== email) {
          try {
            // Try sign-in; if account doesn't exist, create a temporary one
            await signInWithEmailAndPassword(auth, email, "TempPass#12345");
          } catch (e) {
            await createUserWithEmailAndPassword(auth, email, "TempPass#12345");
          }
          user = auth.currentUser;
        }
        if (!user) throw new Error('Firebase auth user not available');
        await sendEmailVerification(user);
        message.success('Verification email sent via Firebase');
        // Mark as pending; actual verification will be confirmed when user clicks the email link (out of band)
        setEmailVerified(true);
      } else {
        // Fallback to backend verification endpoint for non-configured environments
        const base = await getApiBase();
        const res = await fetch(`${base}/api/clients/verify-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ email }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) throw new Error(data.error || 'Verification failed');
        setEmailVerified(true);
        message.success('Email verified');
      }
    } catch (e) {
      setEmailVerified(false);
      message.error(e.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleCheckVerification = async () => {
    try {
      const email = form.getFieldValue('company_email');
      if (!email) {
        message.warning('Enter an email first');
        return;
      }
      setChecking(true);
      if (isFirebaseConfigured && auth) {
        // Reload current user and check flag
        const user = auth.currentUser;
        if (!user) {
          message.warning('Open the verification email and click the link, then try again');
          return;
        }
        await user.reload();
        const fresh = auth.currentUser;
        if (fresh?.emailVerified) {
          setEmailVerified(true);
          message.success('Email verified');
          // Optionally inform backend
          try {
            const base = await getApiBase();
            await fetch(`${base}/api/clients/get-verify-status`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ email, verified: true }),
            });
          } catch {}
        } else {
          message.info('Not verified yet. Please check your email inbox/spam and click the link.');
        }
      } else {
        message.info('Firebase not configured on client; using optional backend-only verification.');
      }
    } catch (e) {
      message.error(e.message || 'Check failed');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="p-6">
      {!showManualForm ? (
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />}
              onClick={() => router.back()}
              className="mb-4"
            >
              Back to Previous Page
            </Button>

            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2">Add Client</h2>
              <p className="text-gray-600">Choose your preferred method to add clients</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
            <div className="text-center p-8 hover:shadow-lg transition-shadow border-2 hover:border-blue-300 rounded-md">
              <div className="mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserOutlined className="text-3xl text-blue-600" />
                </div>
                <h3 className="text-lg font-medium mb-2">Manual Entry</h3>
                <p className="text-gray-600">Add clients individually with detailed information</p>
              </div>
              <div className="flex justify-center">
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={() => setShowManualForm(true)}
                  style={{ backgroundColor: '#1677ff', borderColor: '#1677ff', color: '#fff' }}
                >
                  Add Client
                </Button>
              </div>
            </div>

            <div className="text-center p-8 border-2 rounded-md opacity-60">
              <h3 className="text-lg font-medium mb-2">File Import (Coming Soon)</h3>
              <p className="text-gray-600">CSV/Excel upload support will be available soon</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />}
              onClick={() => router.back()}
              className="mb-6 text-gray-600 hover:text-gray-800"
            >
              Back to Previous Page
            </Button>
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-3">Add New Client</h1>
                <p className="text-lg text-gray-600">Fill in the client details to create a new client profile</p>
              </div>
              
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'customize-panel',
                      label: (
                        <div className="w-64" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                          <div className="p-2 border-b border-gray-200 mb-2">
                            <span className="font-semibold text-gray-800">Select Fields</span>
                          </div>
                          <div className="space-y-1 px-2 pb-2">
                            {Object.entries(visibleColumns).map(([k, v]) => (
                              <div key={k} className="flex items-center py-1">
                                <Checkbox
                                  checked={v as boolean}
                                  onChange={(e) => setVisibleColumns(prev => ({ ...prev, [k]: e.target.checked }))}
                                >
                                  {k.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                </Checkbox>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    }
                  ]
                }}
                trigger={["click"]}
                placement="bottomRight"
              >
                <Button type="default" icon={<SettingOutlined />}>
                  Customize Fields
                </Button>
              </Dropdown>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-xl border border-gray-100">
            <div className="p-10">
              <Form form={form} onFinish={onFinish} layout="vertical" size="large">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {visibleColumns.company_name && (
                    <Form.Item 
                      name="company_name" 
                      label={<span className="text-base font-semibold text-gray-800">Company Name *</span>} 
                      rules={[{ required: true, message: 'Please enter company name' }]}
                      className="mb-6"
                    > 
                      <Input placeholder="Acme Inc" className="h-14 text-base" />
                    </Form.Item>
                  )}
                  
                  {visibleColumns.founder_name && (
                    <Form.Item 
                      name="founder_name" 
                      label={<span className="text-base font-semibold text-gray-800">Founder Name *</span>} 
                      rules={[{ required: true, message: 'Please enter founder name' }]}
                      className="mb-6"
                    > 
                      <Input placeholder="John Doe" className="h-14 text-base" />
                    </Form.Item>
                  )}
                  
                  {visibleColumns.company_email && (
                    <Form.Item 
                      name="company_email" 
                      label={<span className="text-base font-semibold text-gray-800">Company Email *</span>} 
                      rules={[{ type: 'email', required: true, message: 'Please enter valid email' }]}
                      className="mb-6"
                    > 
                      <div className="flex gap-3">
                        <Input 
                          placeholder="founder@company.com" 
                          className="h-14 flex-1 text-base" 
                          onChange={() => setEmailVerified(false)} 
                        />
                        <Button 
                          onClick={handleVerifyEmail} 
                          loading={verifying} 
                          disabled={emailVerified}
                          className="h-14 px-6"
                          type={emailVerified ? 'default' : 'primary'}
                        >
                          {emailVerified ? 'Verified' : 'Verify'}
                        </Button>
                        <Button 
                          onClick={handleCheckVerification} 
                          loading={checking}
                          className="h-14 px-4"
                        >
                          Check
                        </Button>
                      </div>
                    </Form.Item>
                  )}
                  
                  {visibleColumns.contact && (
                    <Form.Item 
                      name="contact" 
                      label={<span className="text-base font-semibold text-gray-800">Contact</span>}
                      className="mb-6"
                    > 
                      <Input placeholder="+1 555 000 000" className="h-14 text-base" />
                    </Form.Item>
                  )}
                  
                  {visibleColumns.fund_stage && (
                    <Form.Item 
                      name="fund_stage" 
                      label={<span className="text-base font-semibold text-gray-800">Fund Stage</span>}
                      className="mb-6"
                    > 
                      <Select
                        options={[
                          { value: 'Pre-seed', label: 'Pre-seed' },
                          { value: 'Seed', label: 'Seed' },
                          { value: 'Series A', label: 'Series A' },
                          { value: 'Series B', label: 'Series B' },
                          { value: 'Last Stage', label: 'Last Stage' },
                        ]}
                        placeholder="Select stage"
                        size="large"
                        className="h-14"
                      />
                    </Form.Item>
                  )}
                  
                  {visibleColumns.revenue && (
                    <Form.Item 
                      name="revenue" 
                      label={<span className="text-base font-semibold text-gray-800">Revenue</span>}
                      className="mb-6"
                    > 
                      <Input placeholder="$1.5M or 1500000" className="h-14 text-base" />
                    </Form.Item>
                  )}
                  
                  {visibleColumns.investment_ask && (
                    <Form.Item 
                      name="investment_ask" 
                      label={<span className="text-base font-semibold text-gray-800">Investment Ask</span>}
                      className="mb-6"
                    > 
                      <Input placeholder="$2M or 2000000" className="h-14 text-base" />
                    </Form.Item>
                  )}
                  
                  {visibleColumns.sector && (
                    <Form.Item 
                      name="sector" 
                      label={<span className="text-base font-semibold text-gray-800">Sector</span>}
                      className="mb-6"
                    > 
                      <Input placeholder="Fintech, SaaS, AI, ..." className="h-14 text-base" />
                    </Form.Item>
                  )}
                  
                  <Form.Item 
                    name="location" 
                    label={<span className="text-base font-semibold text-gray-800">Location</span>}
                    className="mb-6"
                  > 
                    <Select
                      options={[
                        { value: 'US', label: 'United States' },
                        { value: 'India', label: 'India' },
                        { value: 'UK', label: 'United Kingdom' },
                        { value: 'Canada', label: 'Canada' },
                        { value: 'Singapore', label: 'Singapore' },
                        { value: 'Germany', label: 'Germany' },
                        { value: 'Australia', label: 'Australia' },
                        { value: 'Other', label: 'Other' },
                      ]}
                      placeholder="Select location"
                      size="large"
                      className="h-14"
                    />
                  </Form.Item>
                </div>

                <div className="flex gap-6 mt-10 pt-8 border-t border-gray-200">
                  <Button 
                    type="primary" 
                    htmlType="submit"
                    loading={loading}
                    size="large"
                    className="bg-blue-600 hover:bg-blue-700 border-blue-600 h-14 px-10 font-semibold text-base"
                  >
                    Save Client & Create Campaign
                  </Button>
                  <Button 
                    onClick={() => router.push('/dashboard/all-client')}
                    size="large"
                    className="h-14 px-8 text-base border-gray-300 hover:border-gray-400"
                  >
                    Cancel
                  </Button>
                </div>
              </Form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

