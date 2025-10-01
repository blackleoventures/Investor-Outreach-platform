// @ts-nocheck
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Form, Input, message, Select } from "antd";
import { ArrowLeftOutlined, PlusOutlined, UserOutlined } from "@ant-design/icons";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

const { TextArea } = Input;

export default function Page() {
  const router = useRouter();
  const { token } = useAuth() as any;
  const [loading, setLoading] = useState(false);
  const [showManualForm, setShowManualForm] = useState(true);
  const [form] = Form.useForm();

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
        gmailAppPassword: values.gmail_app_password ? values.gmail_app_password.replace(/\s/g, '') : undefined,
        // Optional extras (kept for compatibility)
        address: undefined,
        position: undefined,
        website: undefined,
        state: undefined,
        postalCode: undefined,
        companyDescription: undefined,
        employees: undefined,
      };

      // Try API first, fallback to offline mode
      let data = {};
      try {
        const res = await apiFetch(`/api/clients`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        
        data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "API failed");
      } catch (apiError) {
        console.log('API failed, using offline mode:', apiError.message);
        // Create offline client data
        data = {
          client: {
            id: Date.now().toString(),
            ...payload
          }
        };
      }

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
      
      // Create a draft campaign automatically
      try {
        const campaignPayload = {
          id: `campaign_${Date.now()}`,
          name: `${clientData.company_name || 'Campaign'}_${payload.fundingStage || 'Seed'}_Outreach`,
          clientName: clientData.company_name,
          clientId: clientData.id,
          status: 'draft',
          type: 'Email',
          recipients: 0,
          emailsSent: 0,
          createdAt: new Date().toISOString(),
          audience: [],
          sentEmails: [],
          emailTemplate: { subject: '', content: '' },
          schedule: null,
          fundingStage: payload.fundingStage,
          sector: payload.industry
        };
        
        // Save to localStorage and sessionStorage
        const existingCampaigns = JSON.parse(localStorage.getItem('campaigns') || '[]');
        // Remove any existing draft for this client to avoid duplicates
        const filtered = existingCampaigns.filter((c:any) => !(c.clientName === clientData.company_name && c.status === 'draft'));
        filtered.unshift(campaignPayload);
        localStorage.setItem('campaigns', JSON.stringify(filtered));
        
        sessionStorage.setItem('currentCampaign', JSON.stringify(campaignPayload));
        
        message.success(`Draft campaign created for ${clientData.company_name}`);
      } catch (e) {
        console.error('Campaign creation failed:', e);
      }

      // Redirect to Manage Campaigns
      router.push('/dashboard/allCampaign');
    } catch (e) {
      message.error(e.message || "Failed to create client");
    } finally {
      setLoading(false);
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
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-xl border border-gray-100">
            <div className="p-10">
              <Form form={form} onFinish={onFinish} layout="vertical" size="large">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Form.Item 
                    name="company_name" 
                    label={<span className="text-base font-semibold text-gray-800">Company Name *</span>} 
                    rules={[{ required: true, message: 'Please enter company name' }]}
                    className="mb-6"
                  > 
                    <Input placeholder="Acme Inc" className="h-14 text-base" />
                  </Form.Item>
                  
                  <Form.Item 
                    name="founder_name" 
                    label={<span className="text-base font-semibold text-gray-800">Founder Name *</span>} 
                    rules={[{ required: true, message: 'Please enter founder name' }]}
                    className="mb-6"
                  > 
                    <Input placeholder="John Doe" className="h-14 text-base" />
                  </Form.Item>
                  
                  <Form.Item 
                    name="company_email" 
                    label={<span className="text-base font-semibold text-gray-800">Company Email *</span>} 
                    rules={[{ type: 'email', required: true, message: 'Please enter valid email' }]}
                    className="mb-6"
                  > 
                    <Input 
                      placeholder="founder@company.com" 
                      className="h-14 text-base" 
                    />
                  </Form.Item>
                  
                  <Form.Item 
                    name="contact" 
                    label={<span className="text-base font-semibold text-gray-800">Contact</span>}
                    className="mb-6"
                  > 
                    <Input placeholder="+1 555 000 000" className="h-14 text-base" />
                  </Form.Item>
                  
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
                  
                  <Form.Item 
                    name="revenue" 
                    label={<span className="text-base font-semibold text-gray-800">Revenue</span>}
                    className="mb-6"
                  > 
                    <Input placeholder="$1.5M or 1500000" className="h-14 text-base" />
                  </Form.Item>
                  
                  <Form.Item 
                    name="investment_ask" 
                    label={<span className="text-base font-semibold text-gray-800">Investment Ask</span>}
                    className="mb-6"
                  > 
                    <Input placeholder="$2M or 2000000" className="h-14 text-base" />
                  </Form.Item>
                  
                  <Form.Item 
                    name="sector" 
                    label={<span className="text-base font-semibold text-gray-800">Sector</span>}
                    className="mb-6"
                  > 
                    <Input placeholder="Fintech, SaaS, AI, ..." className="h-14 text-base" />
                  </Form.Item>
                  
                  <Form.Item 
                    name="location" 
                    label={<span className="text-base font-semibold text-gray-800">Location</span>}
                    className="mb-6"
                  > 
                    <Input placeholder="e.g. Boston, MA, USA" className="h-14 text-base" />
                  </Form.Item>
                  
                  <Form.Item 
                    name="gmail_app_password" 
                    label={<span className="text-base font-semibold text-gray-800">Gmail App Password *</span>}
                    className="mb-6"
                    rules={[
                      { required: true, message: 'Gmail App Password is required for email sending' },
                      { 
                        validator: (_, value) => {
                          if (!value) return Promise.resolve();
                          const cleanValue = value.replace(/\s/g, '');
                          if (cleanValue.length !== 16) {
                            return Promise.reject('App Password must be exactly 16 characters');
                          }
                          return Promise.resolve();
                        }
                      }
                    ]}
                    help={
                      <div className="mt-2 p-3 bg-blue-50 rounded border">
                        <div className="text-sm space-y-1">
                          <div className="font-semibold text-blue-800">How to Generate Gmail App Password:</div>
                          <div>1. Go to <a href="https://myaccount.google.com/security" target="_blank" className="text-blue-600 underline">Google Account Security</a></div>
                          <div>2. Enable "2-Step Verification" first</div>
                          <div>3. Find "App passwords" section</div>
                          <div>4. Select app: "Mail" → Select device: "Other (custom name)"</div>
                          <div>5. Type "Email Marketing" as name → Click "Generate"</div>
                          <div>6. Copy the 16-character password (format: abcd efgh ijkl mnop)</div>
                        </div>
                      </div>
                    }
                  > 
                    <Input.Password 
                      placeholder="abcd efgh ijkl mnop (16 characters)" 
                      className="h-14 text-base" 
                      maxLength={19}
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