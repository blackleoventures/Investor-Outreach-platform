"use client";

import { useState, useEffect } from "react";
import { Button, Form, Input, Select, Card, Typography, Space } from "antd";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  DollarOutlined,
  BankOutlined,
  EnvironmentOutlined,
  LockOutlined,
  ArrowRightOutlined,
  SaveOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

interface ClientFormValues {
  companyName: string;
  founderName: string;
  email: string;
  phone: string;
  fundingStage: string;
  revenue: string;
  investment: string;
  industry: string;
  city: string;
  gmailAppPassword: string;
}

interface ClientInformationFormProps {
  onSave: (values: ClientFormValues) => void;
  initialData?: ClientFormValues | null;
  disabled?: boolean;
  isEditing?: boolean;
  loading?: boolean;
  isFirstTime?: boolean;
}

const FUNDING_STAGES = [
  { value: "Pre-seed", label: "Pre-seed" },
  { value: "Seed", label: "Seed" },
  { value: "Series A", label: "Series A" },
  { value: "Series B", label: "Series B" },
  { value: "Series C", label: "Series C" },
  { value: "Growth", label: "Growth Stage" },
];

export default function ClientInformationForm({
  onSave,
  initialData,
  disabled = false,
  isEditing = false,
  loading = false,
  isFirstTime = false,
}: ClientInformationFormProps) {
  const [form] = Form.useForm<ClientFormValues>();

  useEffect(() => {
    if (initialData) {
      form.setFieldsValue(initialData);
    }
  }, [initialData, form]);

  const handleSubmit = async (values: ClientFormValues) => {
    try {
      await form.validateFields();
      
      const cleanedValues = {
        ...values,
        gmailAppPassword: values.gmailAppPassword.replace(/\s/g, ""),
      };

      onSave(cleanedValues);
    } catch (error) {
      console.error("Form validation failed:", error);
    }
  };

  return (
    <div>
      <Form
        form={form}
        onFinish={handleSubmit}
        layout="vertical"
        size="large"
        disabled={disabled}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Form.Item
            name="companyName"
            label={<span style={{ fontSize: 16, fontWeight: 600 }}>Company Name</span>}
            rules={[
              { required: true, message: "Company name is required" },
              { min: 2, message: "Company name must be at least 2 characters" },
              { max: 100, message: "Company name must not exceed 100 characters" },
            ]}
          >
            <Input
              prefix={<BankOutlined style={{ color: disabled ? "#bfbfbf" : "#1890ff" }} />}
              placeholder="e.g., Acme Inc, TechStart Solutions"
              style={{ height: 48 }}
            />
          </Form.Item>

          <Form.Item
            name="founderName"
            label={<span style={{ fontSize: 16, fontWeight: 600 }}>Founder Name</span>}
            rules={[
              { required: true, message: "Founder name is required" },
              { min: 2, message: "Founder name must be at least 2 characters" },
              { max: 100, message: "Founder name must not exceed 100 characters" },
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: disabled ? "#bfbfbf" : "#1890ff" }} />}
              placeholder="e.g., John Doe"
              style={{ height: 48 }}
            />
          </Form.Item>

          <Form.Item
            name="email"
            label={<span style={{ fontSize: 16, fontWeight: 600 }}>Email Address</span>}
            rules={[
              { required: true, message: "Email is required" },
              { type: "email", message: "Please enter a valid email address" },
            ]}
          >
            <Input
              prefix={<MailOutlined style={{ color: disabled ? "#bfbfbf" : "#1890ff" }} />}
              placeholder="founder@company.com"
              style={{ height: 48 }}
            />
          </Form.Item>

          <Form.Item
            name="phone"
            label={<span style={{ fontSize: 16, fontWeight: 600 }}>Phone Number</span>}
            rules={[
              { required: true, message: "Phone number is required" },
              {
                pattern: /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/,
                message: "Please enter a valid phone number",
              },
            ]}
          >
            <Input
              prefix={<PhoneOutlined style={{ color: disabled ? "#bfbfbf" : "#1890ff" }} />}
              placeholder="+1 555 000 0000"
              style={{ height: 48 }}
            />
          </Form.Item>

          <Form.Item
            name="fundingStage"
            label={<span style={{ fontSize: 16, fontWeight: 600 }}>Funding Stage</span>}
            rules={[{ required: true, message: "Funding stage is required" }]}
          >
            <Select
              options={FUNDING_STAGES}
              placeholder="Select your current funding stage"
              style={{ height: 48 }}
            />
          </Form.Item>

          <Form.Item
            name="revenue"
            label={<span style={{ fontSize: 16, fontWeight: 600 }}>Annual Revenue</span>}
            rules={[{ required: true, message: "Revenue is required" }]}
            extra={
              <Text type="secondary" style={{ fontSize: 13 }}>
                Enter amount in any format (e.g., $1.5M, 1500000, 1.5 million)
              </Text>
            }
          >
            <Input
              prefix={<DollarOutlined style={{ color: disabled ? "#bfbfbf" : "#1890ff" }} />}
              placeholder="e.g., $1.5M or 1500000"
              style={{ height: 48 }}
            />
          </Form.Item>

          <Form.Item
            name="investment"
            label={<span style={{ fontSize: 16, fontWeight: 600 }}>Investment Ask</span>}
            rules={[{ required: true, message: "Investment ask is required" }]}
            extra={
              <Text type="secondary" style={{ fontSize: 13 }}>
                How much funding are you seeking?
              </Text>
            }
          >
            <Input
              prefix={<DollarOutlined style={{ color: disabled ? "#bfbfbf" : "#1890ff" }} />}
              placeholder="e.g., $2M or 2000000"
              style={{ height: 48 }}
            />
          </Form.Item>

          <Form.Item
            name="industry"
            label={<span style={{ fontSize: 16, fontWeight: 600 }}>Industry</span>}
            rules={[
              { required: true, message: "Industry is required" },
              { min: 2, message: "Industry must be at least 2 characters" },
            ]}
            extra={
              <Text type="secondary" style={{ fontSize: 13 }}>
                e.g., Fintech, SaaS, AI, E-commerce
              </Text>
            }
          >
            <Input
              prefix={<BankOutlined style={{ color: disabled ? "#bfbfbf" : "#1890ff" }} />}
              placeholder="Enter your industry"
              style={{ height: 48 }}
            />
          </Form.Item>

          <Form.Item
            name="city"
            label={<span style={{ fontSize: 16, fontWeight: 600 }}>City/Location</span>}
            rules={[
              { required: true, message: "City is required" },
              { min: 2, message: "City must be at least 2 characters" },
            ]}
          >
            <Input
              prefix={<EnvironmentOutlined style={{ color: disabled ? "#bfbfbf" : "#1890ff" }} />}
              placeholder="e.g., San Francisco, CA, USA"
              style={{ height: 48 }}
            />
          </Form.Item>

          <Form.Item
            name="gmailAppPassword"
            label={<span style={{ fontSize: 16, fontWeight: 600 }}>Gmail App Password</span>}
            rules={[
              { required: true, message: "Gmail App Password is required" },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  const cleanValue = value.replace(/\s/g, "");
                  if (cleanValue.length !== 16) {
                    return Promise.reject("App Password must be exactly 16 characters");
                  }
                  if (!/^[a-zA-Z0-9]{16}$/.test(cleanValue)) {
                    return Promise.reject("App Password must contain only letters and numbers");
                  }
                  return Promise.resolve();
                },
              },
            ]}
            extra={
              <Card
                size="small"
                style={{
                  marginTop: 8,
                  backgroundColor: "#e6f7ff",
                  borderColor: "#91d5ff",
                }}
              >
                <div style={{ fontSize: 13 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8, color: "#0050b3" }}>
                    📝 How to Generate Gmail App Password:
                  </div>
                  <ol style={{ paddingLeft: 20, margin: 0 }}>
                    <li>
                      Go to{" "}
                      <a
                        href="https://myaccount.google.com/security"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#1890ff", fontWeight: 600 }}
                      >
                        Google Account Security
                      </a>
                    </li>
                    <li>Enable "2-Step Verification" first</li>
                    <li>Search for "App passwords" section</li>
                    <li>Select app: "Mail" → Device: "Other (custom name)"</li>
                    <li>Type "Email Marketing" → Click "Generate"</li>
                    <li>Copy the 16-character password (format: abcd efgh ijkl mnop)</li>
                  </ol>
                </div>
              </Card>
            }
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: disabled ? "#bfbfbf" : "#1890ff" }} />}
              placeholder="abcd efgh ijkl mnop (16 characters)"
              style={{ height: 48 }}
              maxLength={19}
            />
          </Form.Item>
        </div>

        {/* Submit Button */}
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid #f0f0f0" }}>
          {isFirstTime ? (
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              disabled={disabled}
              icon={<ArrowRightOutlined />}
              style={{
                height: 56,
                paddingLeft: 40,
                paddingRight: 40,
                fontSize: 16,
                fontWeight: 600,
                backgroundColor: "#1890ff",
                borderColor: "#1890ff",
              }}
            >
              Next
            </Button>
          ) : isEditing ? (
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={loading}
                icon={<SaveOutlined />}
                style={{
                  height: 48,
                  paddingLeft: 32,
                  paddingRight: 32,
                  backgroundColor: "#1890ff",
                  borderColor: "#1890ff",
                }}
              >
                Update
              </Button>
            </Space>
          ) : null}
        </div>
      </Form>
    </div>
  );
}
