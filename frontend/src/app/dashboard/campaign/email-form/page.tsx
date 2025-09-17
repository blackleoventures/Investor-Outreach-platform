"use client";

import { useState, useEffect } from "react";
import { Card, Form, Input, Button, message, List, Typography } from "antd";
import { useRouter, useSearchParams } from "next/navigation";

const { TextArea } = Input;
const { Text } = Typography;

export default function EmailTemplatePage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [audience, setAudience] = useState<any[]>([]);
  const [campaignId, setCampaignId] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const cId = searchParams.get('campaignId') || '';
    const cName = searchParams.get('clientName') || '';
    const cLocation = searchParams.get('location') || '';
    setCampaignId(cId);
    setClientName(cName);
    setLocation(cLocation);
    
    // Auto-fill template
    form.setFieldsValue({
      subject: `Investment Opportunity in ${cName} - Seed Funding`,
      content: `Dear [Investor Name],\n\nI hope this email finds you well.\n\nI'm reaching out to share an exciting investment opportunity in ${cName}, a promising startup in the SaaS sector.\n\nKey Highlights:\n- Strong market opportunity\n- Experienced founding team\n- Early traction and customer validation\n- Seeking $1M in seed funding\n\nWould you be interested in learning more about this opportunity?\n\nBest regards,\n[Your Name]`
    });
    
    // Mock audience data
    setAudience([
      { name: 'TechVentures Capital', email: 'invest@techventures.com' },
      { name: 'Innovation Partners', email: 'deals@innovation.com' }
    ]);
  }, [searchParams, form]);

  const handleNext = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/campaign/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailTemplate: {
            subject: values.subject,
            content: values.content
          }
        })
      });

      if (response.ok) {
        // Update campaign with email template in localStorage
        const campaigns = JSON.parse(localStorage.getItem('campaigns') || '[]');
        const index = campaigns.findIndex(c => c.id === campaignId);
        if (index !== -1) {
          campaigns[index].subject = values.subject;
          campaigns[index].body = values.content;
          campaigns[index].emailTemplate = { subject: values.subject, content: values.content };
          localStorage.setItem('campaigns', JSON.stringify(campaigns));
        }
        
        message.success('Email template saved!');
        router.push(`/dashboard/send-email?campaignId=${campaignId}&clientName=${clientName}&location=${location}`);
      }
    } catch (error) {
      message.error('Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card title="✉️ Email Template">
            <Form form={form} layout="vertical" onFinish={handleNext}>
              <Form.Item name="subject" label="Subject Line" rules={[{ required: true }]}>
                <Input placeholder="Enter email subject" />
              </Form.Item>
              
              <Form.Item name="content" label="Email Content" rules={[{ required: true }]}>
                <TextArea rows={12} placeholder="Enter email content" />
              </Form.Item>
              
              <div className="flex justify-between items-center">
                <Button onClick={() => router.push('/dashboard/allCampaign')}>All Campaigns</Button>
                <Button type="primary" htmlType="submit" loading={loading} size="large">
                  Next: Schedule & Send →
                </Button>
              </div>
            </Form>
          </Card>
        </div>
        
        <div>
          <Card title="🎯 Selected Audience" size="small">
            <List
              dataSource={audience}
              renderItem={(item: any) => (
                <List.Item>
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <Text type="secondary" className="text-sm">{item.email}</Text>
                  </div>
                </List.Item>
              )}
            />
            <div className="mt-4 text-center">
              <Text>Total Recipients: <strong>{audience.length}</strong></Text>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}