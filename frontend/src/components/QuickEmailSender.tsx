'use client';

import { useState } from 'react';
import { Button, Input, message, Card, Form } from 'antd';
import { SendOutlined } from '@ant-design/icons';

const { TextArea } = Input;

export default function QuickEmailSender() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const sendEmail = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/email/send-direct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: values.to,
          subject: values.subject,
          html: `<div style="font-family: Arial, sans-serif;">${values.message.replace(/\n/g, '<br>')}</div>`,
          from: 'priyanshusingh99p@gmail.com'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          message.success('Email sent successfully!');
          form.resetFields();
        } else {
          message.error(`Failed to send email: ${result.error || 'Unknown error'}`);
        }
      } else {
        const errorText = await response.text();
        message.error(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      message.error('Failed to send email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Quick Email Sender" className="max-w-md">
      <Form form={form} onFinish={sendEmail} layout="vertical">
        <Form.Item
          name="to"
          label="To"
          rules={[
            { required: true, message: 'Please enter recipient email' },
            { type: 'email', message: 'Please enter a valid email' }
          ]}
        >
          <Input placeholder="priyanshuchouhan185@gmail.com" />
        </Form.Item>

        <Form.Item
          name="subject"
          label="Subject"
          rules={[{ required: true, message: 'Please enter email subject' }]}
        >
          <Input placeholder="Email subject" />
        </Form.Item>

        <Form.Item
          name="message"
          label="Message"
          rules={[{ required: true, message: 'Please enter email message' }]}
        >
          <TextArea rows={4} placeholder="Your message here..." />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<SendOutlined />}
            block
          >
            Send Email
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}