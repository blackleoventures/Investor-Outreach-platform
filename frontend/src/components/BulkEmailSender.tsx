'use client';

import { useState } from 'react';
import { Button, Input, message, Card, Form, Progress } from 'antd';
import { SendOutlined, UserAddOutlined } from '@ant-design/icons';

const { TextArea } = Input;

export default function BulkEmailSender() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [form] = Form.useForm();

  const sendBulkEmails = async (values: any) => {
    setLoading(true);
    setProgress(0);
    
    try {
      const emails = values.recipients.split('\n').filter((email: string) => email.trim());
      const total = emails.length;
      let sent = 0;

      for (let i = 0; i < emails.length; i++) {
        const email = emails[i].trim();
        if (!email) continue;

        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/email/send-direct`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: email,
              subject: values.subject,
              html: `<div style="font-family: Arial, sans-serif;">${values.message.replace(/\n/g, '<br>')}</div>`,
              from: 'priyanshusingh99p@gmail.com'
            }),
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success) sent++;
          } else {
            const errorText = await response.text();
            console.error(`HTTP ${response.status}: ${errorText}`);
          }
          setProgress(Math.round(((i + 1) / total) * 100));
          
          // Small delay to avoid overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Failed to send to ${email}:`, error);
        }
      }

      message.success(`Bulk email completed! Sent ${sent}/${total} emails successfully.`);
      form.resetFields();
    } catch (error) {
      message.error('Failed to send bulk emails.');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <Card title="Bulk Email Sender" className="max-w-2xl">
      <Form form={form} onFinish={sendBulkEmails} layout="vertical">
        <Form.Item
          name="fromEmail"
          label="From Email"
          initialValue="priyanshusingh99p@gmail.com"
        >
          <Input disabled value="priyanshusingh99p@gmail.com" />
        </Form.Item>

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

        {loading && (
          <div className="mb-4">
            <Progress percent={progress} status="active" />
            <p className="text-sm text-gray-600 mt-2">Sending emails... {progress}%</p>
          </div>
        )}

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<SendOutlined />}
            size="large"
            block
          >
            Send to All Recipients
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}