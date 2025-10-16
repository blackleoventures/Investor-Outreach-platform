"use client";

import { useState, useEffect } from "react";
import {
  Button,
  Form,
  Input,
  Select,
  Divider,
  Typography,
  Space,
  message,
} from "antd";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  DollarOutlined,
  BankOutlined,
  EnvironmentOutlined,
  ArrowRightOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import SmtpConfigurationSection from "./SmtpConfigurationSection";

const { Title, Text } = Typography;

interface ClientFormValues {
  // Company information
  companyName: string;
  founderName: string;
  email: string;
  phone: string;
  fundingStage: string;
  revenue: string;
  investment: string;
  industry: string;
  city: string;

  // SMTP configuration
  platformName: string;
  senderEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecurity: "TLS" | "SSL" | "None";
  smtpUsername: string;
  smtpPassword: string;
  smtpTestStatus?: string;
  smtpTestRecipient?: string;
  smtpTestDate?: string;
}

// Extended interface for initial data that might come from backend
interface ClientDataWithEmailConfig extends ClientFormValues {
  emailConfiguration?: {
    platformName: string;
    senderEmail: string;
    smtpHost: string;
    smtpPort: number;
    smtpSecurity: "TLS" | "SSL" | "None";
    smtpUsername: string;
    smtpPassword: string;
    testStatus?: string;
    testRecipient?: string;
  };
}

interface ClientInformationFormProps {
  onSave: (values: ClientFormValues) => void;
  initialData?: ClientDataWithEmailConfig | null;
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

// SMTP test storage key - must match SmtpConfigurationSection
const SMTP_TEST_STORAGE_KEY = "investor_reachout_smtp_test_status";

export default function ClientInformationForm({
  onSave,
  initialData,
  disabled = false,
  isEditing = false,
  loading = false,
  isFirstTime = false,
}: ClientInformationFormProps) {
  const [form] = Form.useForm<ClientFormValues>();
  const [smtpTestPassed, setSmtpTestPassed] = useState(false);

  // Check SMTP test status from multiple sources on mount
  useEffect(() => {
    checkSmtpTestStatus();
  }, []);

  // Load initial data when provided
  useEffect(() => {
    if (initialData) {
      loadInitialData();
    }
  }, [initialData]);

  const loadInitialData = () => {
    if (!initialData) return;

    // Extract email configuration from nested structure if it exists
    let formData: Partial<ClientFormValues> = { ...initialData };

    // Check if emailConfiguration exists (data from backend)
    if ("emailConfiguration" in initialData && initialData.emailConfiguration) {
      formData = {
        ...initialData,
        platformName: initialData.emailConfiguration.platformName,
        senderEmail: initialData.emailConfiguration.senderEmail,
        smtpHost: initialData.emailConfiguration.smtpHost,
        smtpPort: initialData.emailConfiguration.smtpPort,
        smtpSecurity: initialData.emailConfiguration.smtpSecurity,
        smtpUsername: initialData.emailConfiguration.smtpUsername,
        smtpPassword: initialData.emailConfiguration.smtpPassword,
        smtpTestStatus: initialData.emailConfiguration.testStatus,
      };
    }

    form.setFieldsValue(formData as ClientFormValues);

    // Check if SMTP test was already passed
    if (formData.smtpTestStatus === "passed") {
      setSmtpTestPassed(true);
      // console.log(
      //   "[ClientForm] SMTP test status loaded as PASSED from initialData"
      // );
    }
  };

  const checkSmtpTestStatus = () => {
    try {
      // Check 1: Form values
      const formTestStatus = form.getFieldValue("smtpTestStatus");
      if (formTestStatus === "passed") {
        setSmtpTestPassed(true);
      //  console.log("[ClientForm] SMTP test PASSED - from form values");
        return;
      }

      // Check 2: localStorage
      const storedData = localStorage.getItem(SMTP_TEST_STORAGE_KEY);
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        if (parsedData.testStatus === "passed") {
          // Verify config matches current form values
          const currentValues = form.getFieldsValue();
          const configMatches =
            currentValues.platformName === parsedData.smtpConfig.platformName &&
            currentValues.senderEmail === parsedData.smtpConfig.senderEmail &&
            currentValues.smtpHost === parsedData.smtpConfig.smtpHost &&
            currentValues.smtpPort === parsedData.smtpConfig.smtpPort &&
            currentValues.smtpSecurity === parsedData.smtpConfig.smtpSecurity &&
            currentValues.smtpUsername === parsedData.smtpConfig.smtpUsername;

          if (configMatches) {
            setSmtpTestPassed(true);
            // Update form with test status
            form.setFieldValue("smtpTestStatus", "passed");
            form.setFieldValue("smtpTestRecipient", parsedData.testRecipient);
            form.setFieldValue("smtpTestDate", parsedData.testDate);
          //  console.log("[ClientForm] SMTP test PASSED - from localStorage");
            return;
          } else {
            console.log(
              "[ClientForm] SMTP config changed, test status invalid"
            );
          }
        }
      }

      // No valid test status found
     // console.log("[ClientForm] SMTP test NOT passed or not found");
      setSmtpTestPassed(false);
    } catch (error) {
      console.error("[ClientForm] Error checking SMTP test status:", error);
      setSmtpTestPassed(false);
    }
  };

  // Watch for SMTP test status changes from SmtpConfigurationSection
  useEffect(() => {
    const interval = setInterval(() => {
      const testStatus = form.getFieldValue("smtpTestStatus");
      const newTestPassed = testStatus === "passed";

      if (newTestPassed !== smtpTestPassed) {
        setSmtpTestPassed(newTestPassed);
      //  console.log("[ClientForm] SMTP test status changed to:", testStatus);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [form, smtpTestPassed]);

  const handleSubmit = async (values: ClientFormValues) => {
    try {
      await form.validateFields();

      // For first-time users, check if SMTP test passed
      if (isFirstTime && values.smtpTestStatus !== "passed") {
        message.error("Please test your email configuration before proceeding");
        return;
      }

      // Clean and prepare data
      const cleanedValues = {
        ...values,
        smtpPassword: values.smtpPassword?.replace(/\s/g, ""),
      };

      onSave(cleanedValues);
    } catch (error) {
      console.error("Form validation failed:", error);
    }
  };

  const handleSmtpTestSuccess = (result: any) => {
  //  console.log("[ClientForm] SMTP test passed:", result);
    setSmtpTestPassed(true);
    message.success("Email configuration tested successfully!");
  };

  const handleSmtpTestFailure = (error: any) => {
    console.error("[ClientForm] SMTP test failed:", error);
    setSmtpTestPassed(false);
  };

  useEffect(() => {
    if (initialData) {
      // Small delay to ensure form values are set
      const timer = setTimeout(() => {
        checkSmtpTestStatus();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [initialData]);

  return (
    <div>
      <Form
        form={form}
        onFinish={handleSubmit}
        layout="vertical"
        size="large"
        disabled={disabled}
      >
        {/* ========== SECTION 1: COMPANY INFORMATION ========== */}
        <div style={{ marginBottom: 32 }}>
          <Title level={4} style={{ marginBottom: 16 }}>
            Company Information
          </Title>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Form.Item
              name="companyName"
              label={
                <span style={{ fontSize: 16, fontWeight: 600 }}>
                  Company Name
                </span>
              }
              rules={[
                { required: true, message: "Company name is required" },
                {
                  min: 2,
                  message: "Company name must be at least 2 characters",
                },
                {
                  max: 100,
                  message: "Company name must not exceed 100 characters",
                },
              ]}
            >
              <Input
                prefix={
                  <BankOutlined
                    style={{ color: disabled ? "#bfbfbf" : "#1890ff" }}
                  />
                }
                placeholder="e.g., Acme Inc, TechStart Solutions"
                style={{ height: 48 }}
              />
            </Form.Item>

            <Form.Item
              name="founderName"
              label={
                <span style={{ fontSize: 16, fontWeight: 600 }}>
                  Founder Name
                </span>
              }
              rules={[
                { required: true, message: "Founder name is required" },
                {
                  min: 2,
                  message: "Founder name must be at least 2 characters",
                },
                {
                  max: 100,
                  message: "Founder name must not exceed 100 characters",
                },
              ]}
            >
              <Input
                prefix={
                  <UserOutlined
                    style={{ color: disabled ? "#bfbfbf" : "#1890ff" }}
                  />
                }
                placeholder="e.g., John Doe"
                style={{ height: 48 }}
              />
            </Form.Item>

            <Form.Item
              name="email"
              label={
                <span style={{ fontSize: 16, fontWeight: 600 }}>
                  Email Address
                </span>
              }
              rules={[
                { required: true, message: "Email is required" },
                {
                  type: "email",
                  message: "Please enter a valid email address",
                },
              ]}
            >
              <Input
                prefix={
                  <MailOutlined
                    style={{ color: disabled ? "#bfbfbf" : "#1890ff" }}
                  />
                }
                placeholder="founder@company.com"
                style={{ height: 48 }}
              />
            </Form.Item>

            <Form.Item
              name="phone"
              label={
                <span style={{ fontSize: 16, fontWeight: 600 }}>
                  Phone Number
                </span>
              }
              rules={[
                { required: true, message: "Phone number is required" },
                {
                  pattern:
                    /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/,
                  message: "Please enter a valid phone number",
                },
              ]}
            >
              <Input
                prefix={
                  <PhoneOutlined
                    style={{ color: disabled ? "#bfbfbf" : "#1890ff" }}
                  />
                }
                placeholder="+1 555 000 0000"
                style={{ height: 48 }}
              />
            </Form.Item>

            <Form.Item
              name="fundingStage"
              label={
                <span style={{ fontSize: 16, fontWeight: 600 }}>
                  Funding Stage
                </span>
              }
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
              label={
                <span style={{ fontSize: 16, fontWeight: 600 }}>
                  Annual Revenue
                </span>
              }
              rules={[{ required: true, message: "Revenue is required" }]}
              extra={
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Enter amount in any format (e.g., $1.5M, 1500000, 1.5 million)
                </Text>
              }
            >
              <Input
                prefix={
                  <DollarOutlined
                    style={{ color: disabled ? "#bfbfbf" : "#1890ff" }}
                  />
                }
                placeholder="e.g., $1.5M or 1500000"
                style={{ height: 48 }}
              />
            </Form.Item>

            <Form.Item
              name="investment"
              label={
                <span style={{ fontSize: 16, fontWeight: 600 }}>
                  Investment Ask
                </span>
              }
              rules={[
                { required: true, message: "Investment ask is required" },
              ]}
              extra={
                <Text type="secondary" style={{ fontSize: 13 }}>
                  How much funding are you seeking?
                </Text>
              }
            >
              <Input
                prefix={
                  <DollarOutlined
                    style={{ color: disabled ? "#bfbfbf" : "#1890ff" }}
                  />
                }
                placeholder="e.g., $2M or 2000000"
                style={{ height: 48 }}
              />
            </Form.Item>

            <Form.Item
              name="industry"
              label={
                <span style={{ fontSize: 16, fontWeight: 600 }}>Industry</span>
              }
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
                prefix={
                  <BankOutlined
                    style={{ color: disabled ? "#bfbfbf" : "#1890ff" }}
                  />
                }
                placeholder="Enter your industry"
                style={{ height: 48 }}
              />
            </Form.Item>

            <Form.Item
              name="city"
              label={
                <span style={{ fontSize: 16, fontWeight: 600 }}>
                  City/Location
                </span>
              }
              rules={[
                { required: true, message: "City is required" },
                { min: 2, message: "City must be at least 2 characters" },
              ]}
            >
              <Input
                prefix={
                  <EnvironmentOutlined
                    style={{ color: disabled ? "#bfbfbf" : "#1890ff" }}
                  />
                }
                placeholder="e.g., San Francisco, CA, USA"
                style={{ height: 48 }}
              />
            </Form.Item>
          </div>
        </div>

        {/* ========== DIVIDER ========== */}
        <Divider style={{ margin: "48px 0" }} />

        {/* ========== SECTION 2: SMTP CONFIGURATION ========== */}
        <SmtpConfigurationSection
          form={form}
          disabled={disabled}
          onTestSuccess={handleSmtpTestSuccess}
          onTestFailure={handleSmtpTestFailure}
        />

        {/* ========== SUBMIT BUTTON ========== */}
        <div
          style={{
            marginTop: 48,
            paddingTop: 24,
            borderTop: "1px solid #f0f0f0",
          }}
        >
          {isFirstTime ? (
            <div>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                disabled={disabled || !smtpTestPassed}
                icon={<ArrowRightOutlined />}
                style={{
                  height: 56,
                  paddingLeft: 40,
                  paddingRight: 40,
                  fontSize: 16,
                  fontWeight: 600,
                  backgroundColor: smtpTestPassed ? "#1890ff" : undefined,
                  borderColor: smtpTestPassed ? "#1890ff" : undefined,
                }}
              >
                {smtpTestPassed ? "Next" : "Test Email Configuration First"}
              </Button>

              {/* Debug Info - Remove in production */}
              {process.env.NODE_ENV === "development" && (
                <div style={{ marginTop: 16, fontSize: 12, color: "#999" }}>
                  Debug: Test Status ={" "}
                  {form.getFieldValue("smtpTestStatus") || "not set"} | Button
                  Enabled = {smtpTestPassed ? "Yes" : "No"}
                </div>
              )}
            </div>
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
