"use client";

import { useState, useEffect } from "react";
import {
  Form,
  Input,
  Radio,
  Button,
  Card,
  Alert,
  Space,
  Typography,
  Modal,
  Spin,
  message,
} from "antd";
import {
  MailOutlined,
  LockOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import type { FormInstance } from "antd";
import { useAuth } from "@/contexts/AuthContext";

const { Text } = Typography;

// LocalStorage key for SMTP test status
const SMTP_TEST_STORAGE_KEY = "investor_reachout_smtp_test_status";

interface SmtpConfigurationSectionProps {
  form: FormInstance;
  disabled?: boolean;
  onTestSuccess?: (result: any) => void;
  onTestFailure?: (error: any) => void;
}

// Type for stored SMTP test data
interface StoredSmtpTestData {
  testStatus: "passed" | "failed";
  testRecipient: string;
  testDate: string;
  smtpConfig: {
    platformName: string;
    senderEmail: string;
    smtpHost: string;
    smtpPort: number;
    smtpSecurity: string;
    smtpUsername: string;
  };
}

export default function SmtpConfigurationSection({
  form,
  disabled = false,
  onTestSuccess,
  onTestFailure,
}: SmtpConfigurationSectionProps) {
  const { currentUser } = useAuth();
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<
    "idle" | "testing" | "passed" | "failed"
  >("idle");
  const [testError, setTestError] = useState<string | null>(null);
  const [testRecipientEmail, setTestRecipientEmail] = useState("");
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);

  // Load stored SMTP test status on mount
  useEffect(() => {
    if (!hasLoadedFromStorage) {
      loadStoredSmtpTestStatus();
      setHasLoadedFromStorage(true);
    }
  }, [hasLoadedFromStorage]);

  // Function to load stored SMTP test status from localStorage
  const loadStoredSmtpTestStatus = () => {
    try {
      const storedData = localStorage.getItem(SMTP_TEST_STORAGE_KEY);
      if (storedData) {
        const parsedData: StoredSmtpTestData = JSON.parse(storedData);

        // Check if the current SMTP config matches the tested one
        const currentValues = form.getFieldsValue();

        // If form values are empty, we might be loading for the first time
        const hasFormValues =
          currentValues.platformName || currentValues.senderEmail;

        if (!hasFormValues) {
          // Form is empty, load the config from storage
       //   console.log("[SMTP] Form empty, loading config from localStorage");
          return;
        }

        const configMatches =
          currentValues.platformName === parsedData.smtpConfig.platformName &&
          currentValues.senderEmail === parsedData.smtpConfig.senderEmail &&
          currentValues.smtpHost === parsedData.smtpConfig.smtpHost &&
          currentValues.smtpPort === parsedData.smtpConfig.smtpPort &&
          currentValues.smtpSecurity === parsedData.smtpConfig.smtpSecurity &&
          currentValues.smtpUsername === parsedData.smtpConfig.smtpUsername;

        if (configMatches && parsedData.testStatus === "passed") {
          setTestStatus("passed");
          form.setFieldValue("smtpTestStatus", "passed");
          form.setFieldValue("smtpTestRecipient", parsedData.testRecipient);
          form.setFieldValue("smtpTestDate", parsedData.testDate);
          // console.log(
          //   "[SMTP] Loaded stored test status from localStorage: PASSED"
          // );
        } else if (!configMatches && hasFormValues) {
          // Config changed, clear stored test status
          localStorage.removeItem(SMTP_TEST_STORAGE_KEY);
          setTestStatus("idle");
      //    console.log("[SMTP] Config changed, cleared stored test status");
        }
      }
    } catch (error) {
      console.error("[SMTP] Error loading stored test status:", error);
    }
  };

  // Function to save SMTP test status to localStorage
  const saveSmtpTestStatusToLocalStorage = (
    status: "passed" | "failed",
    recipient: string
  ) => {
    try {
      const values = form.getFieldsValue();
      const dataToStore: StoredSmtpTestData = {
        testStatus: status,
        testRecipient: recipient,
        testDate: new Date().toISOString(),
        smtpConfig: {
          platformName: values.platformName,
          senderEmail: values.senderEmail,
          smtpHost: values.smtpHost,
          smtpPort: values.smtpPort,
          smtpSecurity: values.smtpSecurity,
          smtpUsername: values.smtpUsername,
        },
      };

      localStorage.setItem(SMTP_TEST_STORAGE_KEY, JSON.stringify(dataToStore));
     // console.log("[SMTP] Saved test status to localStorage:", status);
    } catch (error) {
      console.error("[SMTP] Error saving test status to localStorage:", error);
    }
  };

  // Clear stored test status when SMTP config changes
  const handleSmtpConfigChange = () => {
    // Only clear if test was passed before
    if (testStatus === "passed") {
      localStorage.removeItem(SMTP_TEST_STORAGE_KEY);
      setTestStatus("idle");
      form.setFieldValue("smtpTestStatus", undefined);
      console.log("[SMTP] Config changed, cleared test status");
    }
  };

  // Auto-fill SMTP username when sender email changes
  const handleSenderEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    form.setFieldValue("smtpUsername", email);
    handleSmtpConfigChange();
  };

  // Auto-adjust port based on security type
  const handleSecurityChange = (value: string) => {
    if (value === "TLS") {
      form.setFieldValue("smtpPort", 587);
    } else if (value === "SSL") {
      form.setFieldValue("smtpPort", 465);
    } else {
      form.setFieldValue("smtpPort", 25);
    }
    handleSmtpConfigChange();
  };

  // Check if all SMTP fields are filled
  const validateSmtpFields = () => {
    const values = form.getFieldsValue();
    const missingFields = [];

    if (!values.platformName) missingFields.push("Platform Name");
    if (!values.senderEmail) missingFields.push("Sender Email");
    if (!values.smtpHost) missingFields.push("SMTP Host");
    if (!values.smtpPort) missingFields.push("SMTP Port");
    if (!values.smtpSecurity) missingFields.push("SMTP Security");
    if (!values.smtpUsername) missingFields.push("SMTP Username");
    if (!values.smtpPassword) missingFields.push("SMTP Password");

    return { isValid: missingFields.length === 0, missingFields };
  };

  // Open test modal
  const handleTestClick = () => {
    const { isValid, missingFields } = validateSmtpFields();

    if (!isValid) {
      message.error({
        content: `Please fill in the following fields: ${missingFields.join(
          ", "
        )}`,
        duration: 5,
      });
      return;
    }

    setTestModalVisible(true);
    setTestRecipientEmail("");
  };

  // Perform SMTP test
  const handleTestSubmit = async () => {
    if (!testRecipientEmail) {
      message.warning("Please enter a test recipient email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testRecipientEmail)) {
      message.error("Please enter a valid email address");
      return;
    }

    setTestLoading(true);
    setTestStatus("testing");
    setTestError(null);

    try {
      const values = form.getFieldsValue();
      const token = await currentUser?.getIdToken();
      const smtpConfig = {
        platformName: values.platformName,
        senderEmail: values.senderEmail,
        smtpHost: values.smtpHost,
        smtpPort: values.smtpPort,
        smtpSecurity: values.smtpSecurity,
        smtpUsername: values.smtpUsername,
        smtpPassword: values.smtpPassword,
      };

     // console.log("[SMTP Test] Testing connection...");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/client-submissions/test-smtp`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            smtpConfig,
            testRecipientEmail,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        console.log("[SMTP Test] Test successful:", data);
        setTestStatus("passed");
        setTestError(null);

        // Store test status in form - THIS IS CRITICAL
        const testDate = new Date().toISOString();
        form.setFieldValue("smtpTestStatus", "passed");
        form.setFieldValue("smtpTestRecipient", testRecipientEmail);
        form.setFieldValue("smtpTestDate", testDate);

        // Save to localStorage
        saveSmtpTestStatusToLocalStorage("passed", testRecipientEmail);

        if (onTestSuccess) {
          onTestSuccess(data);
        }

        Modal.success({
          title: "Test Email Sent!",
          content: (
            <div>
              <p>A test email has been sent to:</p>
              <p style={{ fontWeight: 600 }}>{testRecipientEmail}</p>
              <p style={{ marginTop: 12 }}>
                Please check your inbox (and spam folder) to verify you received
                the email.
              </p>
            </div>
          ),
          okText: "Got it",
          okButtonProps: {
            style: {
              backgroundColor: "#52c41a",
              borderColor: "#52c41a",
              color: "#fff",
              height: 40,
              fontSize: 16,
            },
          },
          onOk: () => setTestModalVisible(false),
        });
      } else {
        console.error("[SMTP Test] Test failed:", data);
        setTestStatus("failed");
        setTestError(data.error?.message || "Test failed");

        // Save failed status to localStorage (optional)
        saveSmtpTestStatusToLocalStorage("failed", testRecipientEmail);

        if (onTestFailure) {
          onTestFailure(data.error);
        }

        Modal.error({
          title: "Test Failed",
          content: (
            <div>
              <p>{data.error?.message || "Unable to send test email"}</p>
              {data.error?.details && (
                <p style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
                  Details: {data.error.details}
                </p>
              )}
            </div>
          ),
          okText: "Try Again",
          okButtonProps: {
            style: {
              backgroundColor: "#ff4d4f",
              borderColor: "#ff4d4f",
              color: "#fff",
              height: 40,
              fontSize: 16,
            },
          },
        });
      }
    } catch (error: any) {
      console.error("[SMTP Test] Error:", error);
      setTestStatus("failed");
      setTestError(error.message || "An error occurred");

      if (onTestFailure) {
        onTestFailure(error);
      }

      Modal.error({
        title: "Connection Error",
        content:
          "Unable to connect to the server. Please check your internet connection and try again.",
        okText: "Close",
        okButtonProps: {
          style: {
            backgroundColor: "#ff4d4f",
            borderColor: "#ff4d4f",
            color: "#fff",
            height: 40,
            fontSize: 16,
          },
        },
      });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 24 }}>
      {/* Section Header */}
      <div style={{ marginBottom: 24 }}>
        <Typography.Title level={4} style={{ marginBottom: 8 }}>
          Email Configuration for Campaigns
        </Typography.Title>
        <Text type="secondary">
          Configure your email settings to send campaign emails from your own
          email account.
        </Text>
      </div>

      {/* SMTP Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Platform Name */}
        <Form.Item
          name="platformName"
          label={
            <span style={{ fontSize: 16, fontWeight: 600 }}>
              Email Platform Name
            </span>
          }
          rules={[{ required: true, message: "Platform name is required" }]}
          extra={
            <Text type="secondary" style={{ fontSize: 13 }}>
              e.g., Google Workspace, Zoho Mail, Outlook, Custom
            </Text>
          }
        >
          <Input
            prefix={
              <MailOutlined
                style={{ color: disabled ? "#bfbfbf" : "#1890ff" }}
              />
            }
            placeholder="Enter your email provider name"
            style={{ height: 48 }}
            disabled={disabled}
            onChange={handleSmtpConfigChange}
          />
        </Form.Item>

        {/* Sender Email */}
        <Form.Item
          name="senderEmail"
          label={
            <span style={{ fontSize: 16, fontWeight: 600 }}>
              Sender Email Address
            </span>
          }
          rules={[
            { required: true, message: "Sender email is required" },
            { type: "email", message: "Please enter a valid email address" },
          ]}
          extra={
            <Text type="secondary" style={{ fontSize: 13 }}>
              This email will be used to send campaigns
            </Text>
          }
        >
          <Input
            prefix={
              <MailOutlined
                style={{ color: disabled ? "#bfbfbf" : "#1890ff" }}
              />
            }
            placeholder="founder@yourcompany.com"
            style={{ height: 48 }}
            onChange={handleSenderEmailChange}
            disabled={disabled}
          />
        </Form.Item>

        {/* SMTP Host */}
        <Form.Item
          name="smtpHost"
          label={
            <span style={{ fontSize: 16, fontWeight: 600 }}>SMTP Host</span>
          }
          rules={[{ required: true, message: "SMTP host is required" }]}
          extra={
            <Text type="secondary" style={{ fontSize: 13 }}>
              Examples: smtp.gmail.com, smtp.zoho.com, smtp.office365.com
            </Text>
          }
        >
          <Input
            placeholder="smtp.gmail.com"
            style={{ height: 48 }}
            disabled={disabled}
            onChange={handleSmtpConfigChange}
          />
        </Form.Item>

        {/* SMTP Port */}
        <Form.Item
          name="smtpPort"
          label={
            <span style={{ fontSize: 16, fontWeight: 600 }}>SMTP Port</span>
          }
          rules={[{ required: true, message: "SMTP port is required" }]}
          extra={
            <Text type="secondary" style={{ fontSize: 13 }}>
              Common: 587 (TLS), 465 (SSL), 25 (Not recommended)
            </Text>
          }
        >
          <Input
            type="number"
            placeholder="587"
            style={{ height: 48 }}
            disabled={disabled}
            onChange={handleSmtpConfigChange}
          />
        </Form.Item>

        {/* SMTP Security */}
        <Form.Item
          name="smtpSecurity"
          label={
            <span style={{ fontSize: 16, fontWeight: 600 }}>
              SMTP Security Type
            </span>
          }
          rules={[{ required: true, message: "Security type is required" }]}
          initialValue="TLS"
        >
          <Radio.Group
            onChange={(e) => handleSecurityChange(e.target.value)}
            disabled={disabled}
          >
            <Space direction="vertical">
              <Radio value="TLS">TLS (Port 587) - Recommended</Radio>
              <Radio value="SSL">SSL (Port 465)</Radio>
              <Radio value="None">None (Not recommended)</Radio>
            </Space>
          </Radio.Group>
        </Form.Item>

        {/* SMTP Username */}
        <Form.Item
          name="smtpUsername"
          label={
            <span style={{ fontSize: 16, fontWeight: 600 }}>SMTP Username</span>
          }
          rules={[{ required: true, message: "SMTP username is required" }]}
          extra={
            <Text type="secondary" style={{ fontSize: 13 }}>
              Usually same as your sender email
            </Text>
          }
        >
          <Input
            placeholder="founder@yourcompany.com"
            style={{ height: 48 }}
            disabled={disabled}
            onChange={handleSmtpConfigChange}
          />
        </Form.Item>

        {/* SMTP Password */}
        <Form.Item
          name="smtpPassword"
          label={
            <span style={{ fontSize: 16, fontWeight: 600 }}>
              SMTP Password / App Password
            </span>
          }
          rules={[{ required: true, message: "SMTP password is required" }]}
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
                <div
                  style={{ fontWeight: 600, marginBottom: 8, color: "#0050b3" }}
                >
                  How to get password?
                </div>
                <ul style={{ paddingLeft: 20, margin: 0 }}>
                  <li>
                    <strong>Gmail/Google Workspace:</strong> Use App Password
                    (not regular password)
                  </li>
                  <li>
                    <strong>Zoho:</strong> Use App Password or regular password
                  </li>
                  <li>
                    <strong>Outlook/Office365:</strong> Use App Password
                  </li>
                  <li>
                    <strong>Other:</strong> Use your email password or contact
                    provider
                  </li>
                </ul>
              </div>
            </Card>
          }
        >
          <Input.Password
            prefix={
              <LockOutlined
                style={{ color: disabled ? "#bfbfbf" : "#1890ff" }}
              />
            }
            placeholder="Enter your email password or app password"
            style={{ height: 48 }}
            disabled={disabled}
            onChange={handleSmtpConfigChange}
          />
        </Form.Item>
      </div>

      {/* Test Button and Status */}
      <div
        style={{
          marginTop: 32,
          paddingTop: 24,
          borderTop: "1px solid #f0f0f0",
        }}
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          {/* Test Status Alert */}
          {testStatus === "passed" && (
            <Alert
              message="Test Passed"
              description="Your email configuration has been successfully tested. You can proceed to the next step."
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
            />
          )}

          {testStatus === "failed" && (
            <Alert
              message="Test Failed"
              description={
                testError ||
                "Unable to send test email. Please check your settings and try again."
              }
              type="error"
              showIcon
              icon={<CloseCircleOutlined />}
            />
          )}

          {/* Test Button */}
          <Button
            type="primary"
            size="large"
            icon={<ThunderboltOutlined />}
            onClick={handleTestClick}
            disabled={disabled}
            style={{
              height: 48,
              paddingLeft: 32,
              paddingRight: 32,
              backgroundColor: testStatus === "passed" ? "#52c41a" : "#1890ff",
              borderColor: testStatus === "passed" ? "#52c41a" : "#1890ff",
            }}
          >
            {testStatus === "passed"
              ? "✓ Test Passed - Re-test?"
              : "Test Connection"}
          </Button>

          {testStatus === "idle" && (
            <Text type="secondary">
              Please fill in all email configuration fields above, then click
              "Test Connection" to verify your settings.
            </Text>
          )}
        </Space>
      </div>

      {/* Test Modal */}
      <Modal
        title="Test Email Connection"
        open={testModalVisible}
        onCancel={() => !testLoading && setTestModalVisible(false)}
        footer={null}
        maskClosable={!testLoading}
      >
        {testStatus === "testing" ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text style={{ fontSize: 16 }}>Sending test email...</Text>
            </div>
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">This may take a few seconds</Text>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text>Enter an email address to receive the test email:</Text>
            </div>
            <Input
              size="large"
              placeholder="testuser@example.com"
              value={testRecipientEmail}
              onChange={(e) => setTestRecipientEmail(e.target.value)}
              onPressEnter={handleTestSubmit}
              style={{ marginBottom: 16 }}
            />
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                A test email will be sent to this address. You can use your own
                email or any other email you have access to.
              </Text>
            </div>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button onClick={() => setTestModalVisible(false)} size="large">
                Cancel
              </Button>
              <Button
                type="primary"
                onClick={handleTestSubmit}
                disabled={!testRecipientEmail}
                size="large"
                style={{
                  backgroundColor: "#1890ff",
                  borderColor: "#1890ff",
                }}
              >
                Send Test Email
              </Button>
            </Space>
          </div>
        )}
      </Modal>

      {/* Hidden fields for test status */}
      <Form.Item name="smtpTestStatus" hidden>
        <Input />
      </Form.Item>
      <Form.Item name="smtpTestRecipient" hidden>
        <Input />
      </Form.Item>
      <Form.Item name="smtpTestDate" hidden>
        <Input />
      </Form.Item>
    </div>
  );
}
