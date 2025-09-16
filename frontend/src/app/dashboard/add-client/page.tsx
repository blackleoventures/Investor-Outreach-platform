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
  const { token } = useAuth();
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
        revenue: values.revenue ? String(values.revenue) : undefined,
        investment: values.investment_ask ? String(values.investment_ask) : undefined,
        // Optional extras (kept for compatibility)
        address: undefined,
        position: undefined,
        website: undefined,
        state: undefined,
        city: undefined,
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
      form.resetFields();
      setEmailVerified(false);
      setShowManualForm(false);
      router.push("/dashboard/all-client");
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
        <Modal
          title={
            <div className="flex items-center gap-2">
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
                <Button type="text" icon={<SettingOutlined />} size="small">
                  Customize Columns
                </Button>
              </Dropdown>
            </div>
          }
          open={true}
          onCancel={() => router.push('/dashboard/all-client')}
          footer={null}
          width={900}
          style={{ top: 20 }}
          styles={{ body: { padding: 0, maxHeight: '70vh', overflowX: 'hidden', overflowY: 'auto' } }}
        >
          <div className="p-4" style={{ maxWidth: '100%', width: '100%', boxSizing: 'border-box' }}>
            <Form form={form} onFinish={onFinish} layout="vertical">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleColumns.company_name && (
                  <Form.Item name="company_name" label="Company Name" className="mb-3" rules={[{ required: true }]}> 
          <Input placeholder="Acme Inc" />
        </Form.Item>
                )}
                {visibleColumns.founder_name && (
                  <Form.Item name="founder_name" label="Founder Name" className="mb-3" rules={[{ required: true }]}> 
                    <Input placeholder="John Doe" />
                  </Form.Item>
                )}
                {visibleColumns.company_email && (
                  <Form.Item name="company_email" label="Company Email" className="mb-3" rules={[{ type: 'email', required: true }]}> 
                    <div className="flex gap-2">
                      <Input placeholder="founder@company.com" onChange={() => setEmailVerified(false)} />
                      <Button onClick={handleVerifyEmail} loading={verifying} disabled={emailVerified}>
                        {emailVerified ? 'Verified' : 'Verify'}
                      </Button>
                      <Button onClick={handleCheckVerification} loading={checking}>
                        Check
                      </Button>
                    </div>
                  </Form.Item>
                )}
                {visibleColumns.contact && (
                  <Form.Item name="contact" label="Contact" className="mb-3"> 
                    <Input placeholder="+1 555 000 000" />
                  </Form.Item>
                )}
                {visibleColumns.fund_stage && (
                  <Form.Item name="fund_stage" label="Fund Stage" className="mb-3"> 
                    <Select
                      options={[
                        { value: 'Pre-seed', label: 'Pre-seed' },
                        { value: 'Seed', label: 'Seed' },
                        { value: 'Series A', label: 'Series A' },
                        { value: 'Series B', label: 'Series B' },
                        { value: 'Growth', label: 'Growth' },
                      ]}
                      placeholder="Select stage"
                    />
                  </Form.Item>
                )}
                {visibleColumns.revenue && (
                  <Form.Item name="revenue" label="Revenue" className="mb-3"> 
                    <Input placeholder="$1.5M or 1500000" />
        </Form.Item>
                )}
                {visibleColumns.investment_ask && (
                  <Form.Item name="investment_ask" label="Investment Ask" className="mb-3"> 
                    <Input placeholder="$2M or 2000000" />
        </Form.Item>
                )}
                {visibleColumns.sector && (
                  <Form.Item name="sector" label="Sector" className="mb-3"> 
                    <Input placeholder="Fintech, SaaS, AI, ..." />
        </Form.Item>
                )}
              </div>

              <div className="flex gap-4 mt-4">
                <Button 
                  type="primary" 
                  htmlType="submit"
                  style={{ backgroundColor: '#1677ff', color: '#fff', borderColor: '#1677ff' }}
                  loading={loading}
                >
                  Add Client
                </Button>
                <Button onClick={() => router.push('/dashboard/all-client')}>Cancel</Button>
              </div>
      </Form>
          </div>
        </Modal>
      )}
    </div>
  );
}

