"use client";

import { useState } from "react";
import { Card, Form, Input, Select, Button, message } from "antd";
import { useRouter } from "next/navigation";

const { Option } = Select;

export default function ClientOnboardingPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });

      const result = await response.json();
      
      if (result.success) {
        message.success('Client created successfully!');
        router.push(`/dashboard/campaign-flow/campaign-creation?clientId=${result.client.id}&clientName=${values.startupName}&stage=${values.stage}`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      message.error('Failed to create client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <Card title="🚀 Client Onboarding" className="max-w-2xl mx-auto">
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="startupName" label="Startup Name" rules={[{ required: true }]}>
            <Input placeholder="Enter startup name" />
          </Form.Item>

          <Form.Item name="founder" label="Founder Name" rules={[{ required: true }]}>
            <Input placeholder="Enter founder name" />
          </Form.Item>

          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="Enter email address" />
          </Form.Item>

          <Form.Item name="sector" label="Sector" rules={[{ required: true }]}>
            <Select placeholder="Select sector">
              <Option value="SaaS">SaaS</Option>
              <Option value="Fintech">Fintech</Option>
              <Option value="Healthcare">Healthcare</Option>
              <Option value="AI/ML">AI/ML</Option>
              <Option value="E-commerce">E-commerce</Option>
            </Select>
          </Form.Item>

          <Form.Item name="stage" label="Stage" rules={[{ required: true }]}>
            <Select placeholder="Select stage">
              <Option value="Pre-Seed">Pre-Seed</Option>
              <Option value="Seed">Seed</Option>
              <Option value="Series A">Series A</Option>
              <Option value="Series B">Series B</Option>
            </Select>
          </Form.Item>

          <Form.Item name="location" label="Location" rules={[{ required: true }]}>
            <Input placeholder="Enter location" />
          </Form.Item>

          <Form.Item name="revenue" label="Revenue (USD)" rules={[{ required: true }]}>
            <Input placeholder="Enter current revenue" />
          </Form.Item>

          <Form.Item name="fundingAsk" label="Funding Ask (USD)" rules={[{ required: true }]}>
            <Input placeholder="Enter funding amount needed" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} size="large" block>
              Save Client & Create Campaign
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}