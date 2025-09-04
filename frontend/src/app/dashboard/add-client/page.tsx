// @ts-nocheck
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Form, Input, message } from "antd";

export default function Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      message.success("Client created (stub)");
      router.push("/dashboard/all-client");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Add Client</h1>
      <Form layout="vertical" onFinish={onFinish} style={{ maxWidth: 480 }}>
        <Form.Item name="company_name" label="Company Name" rules={[{ required: true }]}>
          <Input placeholder="Acme Inc" />
        </Form.Item>
        <Form.Item name="first_name" label="Founder First Name">
          <Input placeholder="John" />
        </Form.Item>
        <Form.Item name="last_name" label="Founder Last Name">
          <Input placeholder="Doe" />
        </Form.Item>
        <Form.Item name="email" label="Email" rules={[{ type: "email" }]}>
          <Input placeholder="john@acme.com" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>
          Save
        </Button>
      </Form>
    </div>
  );
}

