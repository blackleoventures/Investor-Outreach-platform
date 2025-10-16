'use client';

import { useState, useEffect } from 'react';
import { Button, Input, message, Card, Form, Progress, Select, Alert, Modal, Typography } from 'antd';
import { SendOutlined, UserAddOutlined, MailOutlined, SettingOutlined } from '@ant-design/icons';
import { api } from '@/lib/api';

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

interface BulkEmailSenderProps {
  companyId?: string;
}

export default function BulkEmailSender({ companyId }: BulkEmailSenderProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [form] = Form.useForm();
  const [investors, setInvestors] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [emailSetupComplete, setEmailSetupComplete] = useState(false);
  const [sendingMethod, setSendingMethod] = useState<'client' | 'system'>('system');
  const [currentJob, setCurrentJob] = useState<any>(null);
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [investorsRes, companiesRes] = await Promise.all([
        api.get('/investors'),
        api.get('/clients')
      ]);
      
      const investorData = (investorsRes as any).data?.data || (investorsRes as any).data?.docs || [];
      console.log('Loaded investors:', investorData.length, investorData.slice(0, 2));
      setInvestors(investorData);
      setCompanies((companiesRes as any).data?.data || []);
      
      if (companyId) {
        const company = ((companiesRes as any).data?.data || []).find((c: any) => c._id === companyId);
        if (company) {
          setSelectedCompany(company);
          setEmailSetupComplete(company.email_sending_enabled || false);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // Poll job status for client emails
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (currentJob && currentJob.status === 'running') {
      interval = setInterval(async () => {
        try {
          const response = await api.get(`/client-email/job-status/${currentJob.jobId}`);
          const responseData = (response as any).data;
          if (responseData.success) {
            setCurrentJob(responseData);
            setProgress(Math.round(((responseData.sent + responseData.failed) / responseData.total) * 100));
            
            if (responseData.status === 'completed') {
              message.success(`Email sending completed! Sent: ${responseData.sent}, Failed: ${responseData.failed}`);
              clearInterval(interval);
              setLoading(false);
            }
          }
        } catch (error) {
          console.error('Error polling job status:', error);
        }
      }, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentJob]);

  const sendClientEmails = async (values: any) => {
    // Get company from URL params or localStorage
    let company = selectedCompany;
    if (!company) {
      // Check URL for clientId first
      const urlParams = new URLSearchParams(window.location.search);
      const clientId = urlParams.get('clientId');
      
      if (clientId) {
        const clients = JSON.parse(localStorage.getItem('clients') || '[]');
        const clientData = clients.find((c: any) => String(c.id || c._id) === String(clientId));
        if (clientData) {
          company = {
            _id: clientData.id,
            company_name: clientData.company_name,
            email: clientData.email,
            gmail_app_password: clientData.gmail_app_password,
            email_sending_enabled: !!clientData.gmail_app_password
          };
        }
      }
      
      // Fallback to currentClient
      if (!company) {
        const storedClient = localStorage.getItem('currentClient');
        if (storedClient) {
          const clientData = JSON.parse(storedClient);
          company = {
            _id: clientData.id,
            company_name: clientData.company_name,
            email: clientData.email,
            gmail_app_password: clientData.gmail_app_password,
            email_sending_enabled: !!clientData.gmail_app_password
          };
        } else {
          // Final fallback
          message.error('No company selected and no cached client found. Please select a company.');
          return;
        }
      }
    }
    
    const selectedInvestors = values.selectedInvestors || [];
    if (selectedInvestors.length === 0) {
      message.error('Please select investors');
      return;
    }

    // Convert investor IDs to emails for testing
    const investorEmails = selectedInvestors.map((investorId: string) => {
      const investor = investors.find((inv: any) => {
        const id = inv.id || inv._id || `investor_${investors.indexOf(inv)}`;
        return id === investorId;
      });
      return investor ? (investor['Partner Email'] || investor.partner_email || investor.email) : investorId;
    }).filter(Boolean);

    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL || '/api';
      const response = await fetch(`${base}/api/client-email/send-bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyId: company._id,
          investorIds: investorEmails, // Send emails directly
          subject: values.subject,
          htmlContent: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">${values.message.replace(/\n/g, '<br><br>')}</div>`
        })
      });
      
      const data = await response.json();

      if (data.success) {
        setCurrentJob({
          jobId: data.jobId,
          total: data.totalEmails,
          sent: 0,
          failed: 0,
          status: 'running'
        });
        setShowProgress(true);
        message.success('Client email job started!');
        
        // Clear selected investors after successful send
        form.setFieldValue('selectedInvestors', []);
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to start sending');
    }
  };

  const sendSystemEmails = async (values: any) => {
    const emails = values.recipients.split('\n').filter((email: string) => email.trim());
    const total = emails.length;
    let sent = 0;

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i].trim();
      if (!email) continue;

      try {
        const base = process.env.NEXT_PUBLIC_BACKEND_URL || '/api';
        const response = await fetch(`${base}/api/email/send-direct`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: email,
            subject: values.subject,
            html: `<div style="font-family: Arial, sans-serif;">${values.message.replace(/\n/g, '<br>')}</div>`,
            from: process.env.NEXT_PUBLIC_SYSTEM_FROM_EMAIL || 'no-reply@example.com'
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) sent++;
        }
        setProgress(Math.round(((i + 1) / total) * 100));
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to send to ${email}:`, error);
      }
    }

    message.success(`System email completed! Sent ${sent}/${total} emails.`);
    form.resetFields();
  };

  const sendBulkEmails = async (values: any) => {
    setLoading(true);
    setProgress(0);
    
    try {
      if (sendingMethod === 'client') {
        await sendClientEmails(values);
      } else {
        await sendSystemEmails(values);
      }
    } catch (error) {
      message.error('Failed to send bulk emails.');
    } finally {
      if (sendingMethod === 'system') {
        setLoading(false);
        setProgress(0);
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card title="Bulk Email Sender" className="max-w-4xl">
        {/* Sending Method Selection */}
        <div className="mb-6">
          <Text strong>Sending Method:</Text>
          <Select
            value={sendingMethod}
            onChange={setSendingMethod}
            className="w-full mt-2"
            size="large"
          >
            <Option value="system">System Email (Fixed Sender)</Option>
            <Option value="client">Client Gmail (Your Email)</Option>
          </Select>
        </div>

        {/* Company Selection for Client Method */}
        {sendingMethod === 'client' && (
          <div className="mb-6">
            <Text strong>Select Company:</Text>
            <Select
              value={selectedCompany?._id}
              onChange={(value) => {
                const company = companies.find((c: any) => c._id === value);
                setSelectedCompany(company);
                setEmailSetupComplete(company?.email_sending_enabled || false);
              }}
              className="w-full mt-2"
              size="large"
              placeholder="Choose company"
            >
              {companies.map((company: any) => (
                <Option key={company._id} value={company._id}>
                  {company.company_name} ({company.email})
                </Option>
              ))}
            </Select>
            
            {selectedCompany && !emailSetupComplete && (
              <Alert
                message="Gmail Setup Required"
                description="Please setup Gmail App Password for this company first."
                type="warning"
                showIcon
                className="mt-2"
              />
            )}
          </div>
        )}

        <Form form={form} onFinish={sendBulkEmails} layout="vertical">
          {/* From Email Display */}
          <Form.Item label="From Email">
            <Input 
              disabled 
              value={sendingMethod === 'client' ? (() => {
                const urlParams = new URLSearchParams(window.location.search);
                const clientId = urlParams.get('clientId');
                if (clientId) {
                  const clients = JSON.parse(localStorage.getItem('clients') || '[]');
                  const client = clients.find((c: any) => String(c.id || c._id) === String(clientId));
                  if (client?.email) return client.email;
                }
                return selectedCompany?.email || JSON.parse(localStorage.getItem('currentClient') || '{}').email || 'No email configured';
              })() : (process.env.NEXT_PUBLIC_SYSTEM_FROM_EMAIL || 'no-reply@example.com')} 
            />
          </Form.Item>

          {/* Recipients - Different for each method */}
          {sendingMethod === 'system' ? (
            <Form.Item
              name="recipients"
              label="Recipients (one email per line)"
              rules={[{ required: true, message: 'Enter recipient emails' }]}
            >
              <TextArea 
                rows={6} 
                placeholder={`investor1@example.com\ninvestor2@example.com\ninvestor3@example.com`}
              />
            </Form.Item>
          ) : (
            <Form.Item
              name="selectedInvestors"
              label="Select Investors"
              rules={[{ required: true, message: 'Select at least one investor' }]}
            >
              <Select
                mode="multiple"
                placeholder="Choose investors"
                className="w-full"
                showSearch
                filterOption={(input, option) =>
                  option?.children?.toString().toLowerCase().includes(input.toLowerCase()) || false
                }
              >
                {investors.map((investor: any, index: number) => {
                  const name = investor['Investor Name'] || investor.investor_name || investor.name || 'Unknown';
                  const email = investor['Partner Email'] || investor.partner_email || investor.email || 'No email';
                  const id = investor.id || investor._id || `investor_${index}`;
                  
                  return (
                    <Option key={id} value={id}>
                      {name} ({email})
                    </Option>
                  );
                })}
              </Select>
            </Form.Item>
          )}

          <Form.Item
            name="subject"
            label="Subject"
            rules={[{ required: true }]}
          >
            <Input placeholder="Investment Opportunity" />
          </Form.Item>

          <Form.Item
            name="message"
            label="Message"
            rules={[{ required: true }]}
          >
            <TextArea rows={8} placeholder="Dear Investor,\n\nWe have an exciting investment opportunity..." />
          </Form.Item>

          {/* Progress Display */}
          {(loading || showProgress) && (
            <div className="mb-4">
              <Progress 
                percent={progress} 
                status={currentJob?.status === 'completed' ? 'success' : 'active'} 
              />
              <p className="text-sm text-gray-600 mt-2">
                {sendingMethod === 'client' && currentJob ? 
                  `Sending emails sequentially... ${currentJob.sent + currentJob.failed}/${currentJob.total}` :
                  `Sending emails... ${progress}%`
                }
              </p>
            </div>
          )}

          {/* Send Button */}
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={<SendOutlined />}
              size="large"
              block
              disabled={sendingMethod === 'client' && !emailSetupComplete}
            >
              {sendingMethod === 'client' ? 'Send from Your Gmail' : 'Send from System'}
            </Button>
          </Form.Item>
        </Form>

        {/* Method Info */}
        <Alert
          message={sendingMethod === 'client' ? 'Client Gmail Method' : 'System Email Method'}
          description={
            sendingMethod === 'client' ? 
              'Emails will be sent from your Gmail account with 1-minute intervals. Only you and each recipient will see the email.' :
              'Emails will be sent from system email address quickly.'
          }
          type="info"
          showIcon
        />
      </Card>
    </div>
  );
}