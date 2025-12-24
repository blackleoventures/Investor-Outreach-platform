"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Button,
  Form,
  Input,
  message,
  Select,
  Steps,
  Card,
  Spin,
  Modal,
  Progress,
  Divider,
  Alert,
  Space,
  Typography,
  Radio,
  Upload,
} from "antd";
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  SaveOutlined,
  MailOutlined,
  LockOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UploadOutlined,
  FileTextOutlined,
  LoadingOutlined,
  InfoCircleOutlined,
  BulbOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import { auth } from "@/lib/firebase";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// LocalStorage keys
const STORAGE_KEYS = {
  CLIENT_INFO: "admin_add_client_info",
  EMAIL_CONFIG: "admin_add_email_config",
  PITCH_ANALYSIS: "admin_add_pitch_analysis",
  CURRENT_STEP: "admin_add_current_step",
};

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
  platformName: string;
  senderEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecurity: "TLS" | "SSL" | "None";
  smtpUsername: string;
  smtpPassword: string;
}

interface PitchAnalysis {
  fileName?: string;
  analyzedAt?: string;
  summary: {
    problem: string;
    solution: string;
    market: string;
    traction: string;
    status: "RED" | "YELLOW" | "GREEN";
    total_score: number;
  };
  scorecard: Record<string, number>;
  suggested_questions: string[];
  highlights: string[];
  email_subject?: string;
  email_body?: string;
}

const FUNDING_STAGES = [
  { value: "Pre-seed", label: "Pre-seed" },
  { value: "Seed", label: "Seed" },
  { value: "Series A", label: "Series A" },
  { value: "Series B", label: "Series B" },
  { value: "Series C", label: "Series C" },
  { value: "Growth", label: "Growth Stage" },
];

const ERROR_MESSAGES: Record<string, string> = {
  DUPLICATE_EMAIL: "A client with this email already exists.",
  VALIDATION_ERROR: "Please check all required fields.",
  UNAUTHORIZED: "Your session has expired. Please log in again.",
  TOKEN_EXPIRED: "Your session has expired. Please log in again.",
  SERVER_ERROR: "Something went wrong. Please try again.",
  NETWORK_ERROR: "Unable to connect. Please check your internet.",
  SMTP_TEST_FAILED: "Email configuration test failed.",
  PITCH_DECK_REQUIRED: "Pitch deck analysis is required.",
  DEFAULT: "Unable to create client. Please try again.",
};

export default function AddClient() {
  const router = useRouter();
  const [form] = Form.useForm<ClientFormValues>();

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // SMTP Test state
  const [smtpTestStatus, setSmtpTestStatus] = useState<
    "idle" | "testing" | "passed" | "failed"
  >("idle");
  const [smtpTestError, setSmtpTestError] = useState<string | null>(null);
  const [smtpTestModalVisible, setSmtpTestModalVisible] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [testEmailLoading, setTestEmailLoading] = useState(false);

  // Pitch analysis state
  const [pitchAnalysis, setPitchAnalysis] = useState<PitchAnalysis | null>(
    null
  );
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");

  // Load data from localStorage on mount
  useEffect(() => {
    loadFromLocalStorage();
  }, []);

  const loadFromLocalStorage = () => {
    try {
      // Load current step
      const savedStep = localStorage.getItem(STORAGE_KEYS.CURRENT_STEP);
      if (savedStep) {
        setCurrentStep(parseInt(savedStep));
      }

      // Load client info (Step 1)
      const savedClientInfo = localStorage.getItem(STORAGE_KEYS.CLIENT_INFO);
      if (savedClientInfo) {
        const clientInfo = JSON.parse(savedClientInfo);
        form.setFieldsValue(clientInfo);
      }

      // Load email config (Step 2)
      const savedEmailConfig = localStorage.getItem(STORAGE_KEYS.EMAIL_CONFIG);
      if (savedEmailConfig) {
        const emailConfig = JSON.parse(savedEmailConfig);
        form.setFieldsValue(emailConfig);
        if (emailConfig.testPassed) {
          setSmtpTestStatus("passed");
        }
      }

      // Load pitch analysis (Step 3)
      const savedPitchAnalysis = localStorage.getItem(
        STORAGE_KEYS.PITCH_ANALYSIS
      );
      if (savedPitchAnalysis) {
        const analysis = JSON.parse(savedPitchAnalysis);
        setPitchAnalysis(analysis);
        setUploadedFileName(analysis.fileName || "");
      }

      console.log("[AddClient] Data loaded from localStorage");
    } catch (error) {
      console.error("[AddClient] Error loading from localStorage:", error);
    }
  };

  const clearLocalStorage = () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.CLIENT_INFO);
      localStorage.removeItem(STORAGE_KEYS.EMAIL_CONFIG);
      localStorage.removeItem(STORAGE_KEYS.PITCH_ANALYSIS);
      localStorage.removeItem(STORAGE_KEYS.CURRENT_STEP);
      //  console.log("[AddClient] LocalStorage cleared");
    } catch (error) {
      console.error("[AddClient] Error clearing localStorage:", error);
    }
  };

  const getUserFriendlyError = (errorCode?: string): string => {
    if (!navigator.onLine) {
      return ERROR_MESSAGES.NETWORK_ERROR;
    }
    return ERROR_MESSAGES[errorCode || "DEFAULT"] || ERROR_MESSAGES.DEFAULT;
  };

  const getAuthToken = async (): Promise<string | null> => {
    try {
      const user = auth.currentUser;
      if (!user) {
        message.error(ERROR_MESSAGES.UNAUTHORIZED);
        router.push("/login");
        return null;
      }
      return await user.getIdToken(true);
    } catch (error) {
      console.error("[Get Token Error]:", error);
      message.error(ERROR_MESSAGES.UNAUTHORIZED);
      router.push("/login");
      return null;
    }
  };

  // Step 1: Client Information
  const handleStep1Next = async () => {
    try {
      const values = await form.validateFields([
        "companyName",
        "founderName",
        "email",
        "phone",
        "fundingStage",
        "revenue",
        "investment",
        "industry",
        "city",
      ]);

      // Save to localStorage
      localStorage.setItem(STORAGE_KEYS.CLIENT_INFO, JSON.stringify(values));
      localStorage.setItem(STORAGE_KEYS.CURRENT_STEP, "1");

      setCurrentStep(1);
      message.success("Client information saved!");
    } catch (error) {
      message.error("Please fill in all required fields");
    }
  };

  // Step 2: Email Configuration
  const handleSenderEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    form.setFieldValue("smtpUsername", email);
  };

  const handleSecurityChange = (value: string) => {
    if (value === "TLS") {
      form.setFieldValue("smtpPort", 587);
    } else if (value === "SSL") {
      form.setFieldValue("smtpPort", 465);
    } else {
      form.setFieldValue("smtpPort", 25);
    }
  };

  const handleOpenTestModal = async () => {
    try {
      await form.validateFields([
        "platformName",
        "senderEmail",
        "smtpHost",
        "smtpPort",
        "smtpSecurity",
        "smtpUsername",
        "smtpPassword",
      ]);

      setTestEmailAddress("");
      setSmtpTestModalVisible(true);
    } catch (error) {
      message.error("Please fill in all SMTP configuration fields first");
    }
  };

  const handleSubmitTest = async () => {
    if (!testEmailAddress) {
      message.warning("Please enter an email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmailAddress)) {
      message.error("Please enter a valid email address");
      return;
    }

    setTestEmailLoading(true);
    setSmtpTestStatus("testing");
    setSmtpTestError(null);

    try {
      const values = form.getFieldsValue();
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/clients/test-smtp-admin`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          smtpConfig: {
            platformName: values.platformName,
            senderEmail: values.senderEmail,
            smtpHost: values.smtpHost,
            smtpPort: values.smtpPort,
            smtpSecurity: values.smtpSecurity,
            smtpUsername: values.smtpUsername,
            smtpPassword: values.smtpPassword,
          },
          testRecipientEmail: testEmailAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Test failed");
      }

      setSmtpTestStatus("passed");
      setSmtpTestModalVisible(false);

      // Save email config to localStorage ONLY after successful test
      const emailConfig = {
        platformName: values.platformName,
        senderEmail: values.senderEmail,
        smtpHost: values.smtpHost,
        smtpPort: values.smtpPort,
        smtpSecurity: values.smtpSecurity,
        smtpUsername: values.smtpUsername,
        smtpPassword: values.smtpPassword,
        testPassed: true,
      };
      localStorage.setItem(
        STORAGE_KEYS.EMAIL_CONFIG,
        JSON.stringify(emailConfig)
      );

      Modal.success({
        title: "Test Email Sent Successfully!",
        content: (
          <div>
            <p>A test email has been sent to:</p>
            <p style={{ fontWeight: 600, color: "#1890ff" }}>
              {testEmailAddress}
            </p>
            <p style={{ marginTop: 12 }}>
              Email configuration has been saved. Please check the inbox to
              verify receipt.
            </p>
          </div>
        ),
        okText: "Got it",
        okButtonProps: {
          style: {
            backgroundColor: "#52c41a",
            borderColor: "#52c41a",
            color: "#fff",
          },
        },
      });
    } catch (error: any) {
      console.error("[SMTP Test Error]:", error);
      setSmtpTestStatus("failed");
      setSmtpTestError(error.message || "Test failed");

      Modal.error({
        title: "Test Failed",
        content: (
          <div>
            <p>{error.message || "Unable to send test email"}</p>
            <p style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
              Please check your SMTP configuration and try again.
            </p>
          </div>
        ),
        okText: "Close",
        okButtonProps: {
          style: {
            backgroundColor: "#ff4d4f",
            borderColor: "#ff4d4f",
            color: "#fff",
          },
        },
      });
    } finally {
      setTestEmailLoading(false);
    }
  };

  const handleStep2Next = () => {
    if (smtpTestStatus !== "passed") {
      message.error("Please test email configuration before proceeding");
      return;
    }

    localStorage.setItem(STORAGE_KEYS.CURRENT_STEP, "2");
    setCurrentStep(2);
    message.success("Email configuration validated!");
  };

  // Step 3: Pitch Analysis
  const parseTextFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (!text || text.trim().length === 0) {
          reject(new Error("The text file appears to be empty."));
          return;
        }
        resolve(text);
      };
      reader.onerror = () => reject(new Error("Failed to read the text file."));
      reader.readAsText(file, "UTF-8");
    });
  };

  const parsePDFFile = async (file: File): Promise<string> => {
    try {
      const { default: pdfToText } = await import("react-pdftotext");
      const text = await pdfToText(file);
      if (!text || text.trim().length === 0) {
        throw new Error("We couldn't extract any text from this PDF.");
      }
      return text.trim();
    } catch (error: any) {
      throw new Error("Unable to process the PDF file.");
    }
  };

  const parseWordFile = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const { default: mammoth } = await import("mammoth");
      const result = await mammoth.extractRawText({ arrayBuffer });
      if (!result.value || result.value.trim().length === 0) {
        throw new Error("The Word document appears to be empty.");
      }
      return result.value.trim();
    } catch (error: any) {
      throw new Error("We couldn't read the Word document.");
    }
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    const maxSizeInBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      throw new Error(
        "File size is too large. Please use a file smaller than 10MB."
      );
    }

    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    let extractedText = "";

    if (fileExtension === "txt") {
      extractedText = await parseTextFile(file);
    } else if (fileExtension === "pdf") {
      extractedText = await parsePDFFile(file);
    } else if (fileExtension === "doc" || fileExtension === "docx") {
      extractedText = await parseWordFile(file);
    } else {
      throw new Error(`Unsupported file type: .${fileExtension}`);
    }

    if (!extractedText || extractedText.trim().length < 10) {
      throw new Error("The file doesn't contain enough readable text.");
    }

    return extractedText;
  };

  const callAnalysisAPI = async (
    extractedText: string,
    fileName: string
  ): Promise<PitchAnalysis> => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/analyze-pitch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, textContent: extractedText }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message || "Failed to analyze the pitch deck."
        );
      }

      const result = await response.json();
      if (!result.success || !result.data) {
        throw new Error("Failed to receive analysis data from the server.");
      }

      return result.data as PitchAnalysis;
    } catch (error: any) {
      throw error;
    }
  };

  const handleFileUpload = async (file: File) => {
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    const allowedExtensions = ["pdf", "doc", "docx", "txt"];

    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      message.error(
        "Unsupported file type. Please upload PDF, Word, or Text files only."
      );
      return false;
    }

    const maxSizeInBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      message.error("File is too large. Please use a file smaller than 10MB.");
      return false;
    }

    setAnalysisLoading(true);
    setUploadedFileName(file.name);
    setPitchAnalysis(null);

    try {
      message.loading("Processing file...", 0);
      const extractedText = await extractTextFromFile(file);

      message.destroy();
      message.success(`File processed successfully!`);

      message.loading(
        "Analyzing content with AI... This may take a moment.",
        0
      );
      const analysis = await callAnalysisAPI(extractedText, file.name);

      const analysisWithMetadata = {
        ...analysis,
        fileName: file.name,
        analyzedAt: new Date().toISOString(),
      };

      setPitchAnalysis(analysisWithMetadata);

      // Save to localStorage ONLY after successful analysis
      localStorage.setItem(
        STORAGE_KEYS.PITCH_ANALYSIS,
        JSON.stringify(analysisWithMetadata)
      );

      message.destroy();
      message.success("Analysis completed and saved successfully!");
    } catch (error: any) {
      console.error("File processing error:", error);
      message.destroy();
      message.error(error.message || "Something went wrong.");
      setPitchAnalysis(null);
    } finally {
      setAnalysisLoading(false);
    }

    return false;
  };

  const getProgressColor = (score: number) => {
    if (score >= 70) return "#52c41a";
    if (score >= 40) return "#faad14";
    return "#ff4d4f";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "GREEN":
        return "success";
      case "YELLOW":
        return "warning";
      case "RED":
        return "error";
      default:
        return "info";
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case "GREEN":
        return "Investment Ready";
      case "YELLOW":
        return "Promising, needs refinement";
      case "RED":
        return "Not Ready";
      default:
        return "";
    }
  };

  // Final Submit
  const handleFinalSubmit = async () => {
    // Pitch analysis is now optional for admin

    setLoading(true);

    try {
      const token = await getAuthToken();
      if (!token) return;

      // Get all data from localStorage for reliability
      const clientInfo = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.CLIENT_INFO) || "{}"
      );
      const emailConfig = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.EMAIL_CONFIG) || "{}"
      );
      const pitchData = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.PITCH_ANALYSIS) || "{}"
      );

      // Validate all data is present (pitch analysis is optional)
      if (!clientInfo.companyName || !emailConfig.smtpPassword) {
        message.error(
          "Some data is missing. Please go through all steps again."
        );
        setLoading(false);
        return;
      }

      const payload = {
        companyName: clientInfo.companyName,
        founderName: clientInfo.founderName,
        email: clientInfo.email,
        phone: clientInfo.phone,
        fundingStage: clientInfo.fundingStage,
        revenue: clientInfo.revenue,
        investment: clientInfo.investment,
        industry: clientInfo.industry,
        city: clientInfo.city,
        platformName: emailConfig.platformName,
        senderEmail: emailConfig.senderEmail,
        smtpHost: emailConfig.smtpHost,
        smtpPort: emailConfig.smtpPort,
        smtpSecurity: emailConfig.smtpSecurity,
        smtpUsername: emailConfig.smtpUsername,
        smtpPassword: emailConfig.smtpPassword.replace(/\s/g, ""),
        // Only include pitchAnalysis if it exists
        ...(pitchData.summary ? { pitchAnalysis: pitchData } : {}),
      };

      const response = await fetch(`${API_BASE_URL}/clients/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const userMessage = getUserFriendlyError(data.error?.code);
        throw new Error(userMessage);
      }

      // Clear localStorage on successful submission
      clearLocalStorage();

      Modal.success({
        title: "Client Created Successfully!",
        content: (
          <div>
            <p>The client has been created and automatically approved.</p>
            <p style={{ marginTop: 8 }}>
              <strong>Submission ID:</strong> {data.data?.submissionId}
            </p>
            <p style={{ marginTop: 8 }}>
              You can now manage this client from the clients list.
            </p>
          </div>
        ),
        okText: "Go to Clients",
        okButtonProps: {
          style: {
            backgroundColor: "#52c41a",
            borderColor: "#52c41a",
            color: "#fff",
          },
        },
        onOk: () => {
          form.resetFields();
          setPitchAnalysis(null);
          setSmtpTestStatus("idle");
          setCurrentStep(0);
          router.push("/dashboard/all-client");
        },
      });
    } catch (error) {
      const userMessage =
        error instanceof Error ? error.message : ERROR_MESSAGES.DEFAULT;
      console.error("[Client Creation Error]:", error);
      message.error(userMessage);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: "Client Information",
      icon: <FileTextOutlined />,
      description: "Company details",
    },
    {
      title: "Email Configuration",
      icon: <MailOutlined />,
      description: "SMTP setup & test",
    },
    {
      title: "Pitch Analysis",
      icon: <UploadOutlined />,
      description: "Upload & analyze",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.back()}
          className="mb-6"
        >
          Back
        </Button>

        <Title level={2}>Add New Client</Title>
        <Text type="secondary">
          Create a new client profile with complete information and email
          configuration
        </Text>
      </div>

      <Card className="mb-6">
        <Steps current={currentStep} items={steps} />
      </Card>

      <Form form={form} layout="vertical" size="large">
        {/* Step 1: Client Information */}
        {currentStep === 0 && (
          <Card
            title={
              <span>
                <FileTextOutlined /> Client Information
              </span>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Form.Item
                name="companyName"
                label="Company Name"
                rules={[
                  { required: true, message: "Company name is required" },
                ]}
              >
                <Input placeholder="e.g., Acme Inc, TechStart Solutions" />
              </Form.Item>

              <Form.Item
                name="founderName"
                label="Founder Name"
                rules={[
                  { required: true, message: "Founder name is required" },
                ]}
              >
                <Input placeholder="e.g., John Doe, Sarah Smith" />
              </Form.Item>

              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: "Email is required" },
                  { type: "email", message: "Invalid email" },
                ]}
              >
                <Input placeholder="e.g., founder@company.com" />
              </Form.Item>

              <Form.Item
                name="phone"
                label="Phone"
                rules={[{ required: true, message: "Phone is required" }]}
              >
                <Input placeholder="e.g., +1 555 000 0000" />
              </Form.Item>

              <Form.Item
                name="fundingStage"
                label="Funding Stage"
                rules={[
                  { required: true, message: "Funding stage is required" },
                ]}
              >
                <Select
                  options={FUNDING_STAGES}
                  placeholder="Select current stage"
                />
              </Form.Item>

              <Form.Item
                name="revenue"
                label="Revenue"
                rules={[{ required: true, message: "Revenue is required" }]}
              >
                <Input placeholder="e.g., $1.5M, 1500000, 1.5 million" />
              </Form.Item>

              <Form.Item
                name="investment"
                label="Investment Ask"
                rules={[
                  { required: true, message: "Investment ask is required" },
                ]}
              >
                <Input placeholder="e.g., $2M, 2000000, 2 million" />
              </Form.Item>

              <Form.Item
                name="industry"
                label="Industry"
                rules={[{ required: true, message: "Industry is required" }]}
              >
                <Input placeholder="e.g., Fintech, SaaS, AI, E-commerce" />
              </Form.Item>

              <Form.Item
                name="city"
                label="City"
                rules={[{ required: true, message: "City is required" }]}
              >
                <Input placeholder="e.g., San Francisco, CA, USA" />
              </Form.Item>
            </div>

            <div className="mt-6">
              <Button
                type="primary"
                onClick={handleStep1Next}
                icon={<ArrowRightOutlined />}
                style={{ backgroundColor: "#1890ff", borderColor: "#1890ff" }}
              >
                Save & Continue to Email Setup
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Email Configuration */}
        {currentStep === 1 && (
          <Card
            title={
              <span>
                <MailOutlined /> Email Configuration
              </span>
            }
          >
            <Alert
              message="Important: SMTP Configuration Guide"
              description={
                <div>
                  <p>
                    <strong>What is SMTP?</strong>
                  </p>
                  <p>
                    SMTP (Simple Mail Transfer Protocol) allows the client to
                    send emails from their own email account for investor
                    outreach campaigns.
                  </p>
                  <Divider style={{ margin: "12px 0" }} />
                  <p>
                    <strong>Client needs to provide:</strong>
                  </p>
                  <ul style={{ paddingLeft: 20, marginBottom: 8 }}>
                    <li>
                      <strong>Platform Name:</strong> Their email provider
                      (e.g., Google Workspace, Zoho Mail)
                    </li>
                    <li>
                      <strong>Sender Email:</strong> The email they want to send
                      from
                    </li>
                    <li>
                      <strong>SMTP Host:</strong> Mail server address (e.g.,
                      smtp.gmail.com)
                    </li>
                    <li>
                      <strong>SMTP Port:</strong> Usually 587 for TLS or 465 for
                      SSL
                    </li>
                    <li>
                      <strong>Username:</strong> Usually same as sender email
                    </li>
                    <li>
                      <strong>App Password:</strong> Special password from email
                      provider (NOT regular password)
                    </li>
                  </ul>
                </div>
              }
              type="info"
              showIcon
              icon={<InfoCircleOutlined />}
              style={{ marginBottom: 24 }}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Form.Item
                name="platformName"
                label="Platform Name"
                rules={[{ required: true, message: "Required" }]}
                tooltip="Email provider name"
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="e.g., Google Workspace, Zoho Mail, Outlook"
                />
              </Form.Item>

              <Form.Item
                name="senderEmail"
                label="Sender Email"
                rules={[
                  { required: true, message: "Required" },
                  { type: "email", message: "Invalid email" },
                ]}
                tooltip="The email address from which campaigns will be sent"
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="e.g., campaigns@company.com"
                  onChange={handleSenderEmailChange}
                />
              </Form.Item>

              <Form.Item
                name="smtpHost"
                label="SMTP Host"
                rules={[{ required: true, message: "Required" }]}
                tooltip="Mail server address - check provider's documentation"
              >
                <Input placeholder="e.g., smtp.gmail.com, smtp.zoho.com" />
              </Form.Item>

              <Form.Item
                name="smtpPort"
                label="SMTP Port"
                rules={[{ required: true, message: "Required" }]}
                tooltip="Port number for secure connection"
                initialValue={587}
              >
                <Input type="number" placeholder="e.g., 587, 465" />
              </Form.Item>

              <Form.Item
                name="smtpSecurity"
                label="Security Type"
                rules={[{ required: true, message: "Required" }]}
                initialValue="TLS"
                tooltip="TLS (587) is recommended for most email providers"
              >
                <Radio.Group
                  onChange={(e) => handleSecurityChange(e.target.value)}
                >
                  <Radio value="TLS">TLS (Port 587) - Recommended</Radio>
                  <Radio value="SSL">SSL (Port 465)</Radio>
                  <Radio value="None">None (Not recommended)</Radio>
                </Radio.Group>
              </Form.Item>

              <Form.Item
                name="smtpUsername"
                label="SMTP Username"
                rules={[{ required: true, message: "Required" }]}
                tooltip="Usually same as sender email"
              >
                <Input placeholder="e.g., campaigns@company.com" />
              </Form.Item>

              <Form.Item
                name="smtpPassword"
                label="SMTP Password / App Password"
                rules={[{ required: true, message: "Required" }]}
                tooltip="Must be App Password, not regular email password"
                extra={
                  <Card
                    size="small"
                    style={{
                      marginTop: 8,
                      backgroundColor: "#fffbe6",
                      borderColor: "#ffe58f",
                    }}
                  >
                    <Text
                      strong
                      style={{
                        color: "#faad14",
                        display: "block",
                        marginBottom: 8,
                      }}
                    >
                      ⚠️ IMPORTANT: Use App Password, NOT Regular Password
                    </Text>
                    <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                      <p style={{ marginBottom: 8 }}>
                        <strong>For Gmail/Google Workspace:</strong>
                      </p>
                      <ol style={{ paddingLeft: 20, margin: 0 }}>
                        <li>Go to Google Account Security</li>
                        <li>Enable "2-Step Verification" first</li>
                        <li>Search for "App passwords"</li>
                        <li>Select app: "Mail" → Device: "Other"</li>
                        <li>Type name: "Email Marketing"</li>
                        <li>Click "Generate" → Copy 16-character password</li>
                      </ol>
                      <Divider style={{ margin: "8px 0" }} />
                      <p style={{ margin: 0 }}>
                        <strong>Example format:</strong> abcd efgh ijkl mnop (16
                        characters)
                      </p>
                    </div>
                  </Card>
                }
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="e.g., abcd efgh ijkl mnop"
                />
              </Form.Item>
            </div>

            {smtpTestStatus === "passed" && (
              <Alert
                message="✓ Email Configuration Tested & Saved Successfully"
                description="The SMTP configuration has been verified and saved. You can proceed to the next step."
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
                style={{ marginTop: 16 }}
              />
            )}

            {smtpTestStatus === "failed" && (
              <Alert
                message="✗ Email Configuration Test Failed"
                description={smtpTestError}
                type="error"
                showIcon
                icon={<CloseCircleOutlined />}
                style={{ marginTop: 16 }}
              />
            )}

            <div className="mt-6 flex gap-4">
              <Button
                onClick={() => {
                  setCurrentStep(0);
                  localStorage.setItem(STORAGE_KEYS.CURRENT_STEP, "0");
                }}
              >
                <ArrowLeftOutlined /> Back
              </Button>
              <Button
                type="default"
                onClick={handleOpenTestModal}
                icon={<ThunderboltOutlined />}
                style={{
                  backgroundColor:
                    smtpTestStatus === "passed" ? "#52c41a" : "#1890ff",
                  borderColor:
                    smtpTestStatus === "passed" ? "#52c41a" : "#1890ff",
                  color: "#fff",
                }}
              >
                {smtpTestStatus === "passed"
                  ? "✓ Test Passed - Retest?"
                  : "Test Email Configuration"}
              </Button>
              <Button
                type="primary"
                onClick={handleStep2Next}
                disabled={smtpTestStatus !== "passed"}
                icon={<ArrowRightOutlined />}
                style={{ backgroundColor: "#1890ff", borderColor: "#1890ff" }}
              >
                Continue to Pitch Analysis
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: Pitch Analysis */}
        {currentStep === 2 && (
          <Card
            title={
              <span>
                <UploadOutlined /> Pitch Deck Analysis
              </span>
            }
          >
            <Alert
              message="Upload Client's Pitch Deck (Optional)"
              description="Optionally upload the client's pitch deck to analyze their investment readiness. The AI will evaluate 10 key criteria and provide a comprehensive scorecard. You can skip this step if not needed."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Dragger
              accept=".pdf,.doc,.docx,.txt"
              beforeUpload={handleFileUpload}
              showUploadList={false}
              disabled={analysisLoading}
              style={{ marginBottom: 24 }}
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined style={{ color: "#1890ff", fontSize: 48 }} />
              </p>
              <p className="ant-upload-text">Click or drag file to upload</p>
              <p className="ant-upload-hint">
                Supported formats: PDF, Word (.doc, .docx), Text (.txt) |
                Maximum size: 10MB
              </p>
            </Dragger>

            {analysisLoading && (
              <div
                style={{ textAlign: "center", marginTop: 24, marginBottom: 24 }}
              >
                <Spin
                  indicator={<LoadingOutlined style={{ fontSize: 48 }} />}
                />
                <Paragraph style={{ marginTop: 16, fontSize: 16 }}>
                  Analyzing pitch deck with AI...
                </Paragraph>
                <Text type="secondary">
                  This may take 10-30 seconds depending on content length
                </Text>
              </div>
            )}

            {pitchAnalysis && (
              <Card
                style={{
                  marginTop: 24,
                  border: "2px solid #1890ff",
                  borderRadius: 8,
                }}
              >
                <Title level={4} style={{ marginBottom: 24 }}>
                  <CheckCircleOutlined style={{ color: "#52c41a" }} /> Analysis
                  Complete & Saved
                </Title>

                <div style={{ textAlign: "center", marginBottom: 32 }}>
                  <Title level={1} style={{ fontSize: 64, marginBottom: 8 }}>
                    {pitchAnalysis.summary.total_score}/100
                  </Title>
                  <Text style={{ fontSize: 18 }}>
                    Investment Readiness Score
                  </Text>
                  <div style={{ marginTop: 16 }}>
                    <Progress
                      percent={pitchAnalysis.summary.total_score}
                      strokeColor={getProgressColor(
                        pitchAnalysis.summary.total_score
                      )}
                      strokeWidth={20}
                    />
                  </div>
                </div>

                <Alert
                  message={
                    <span style={{ fontSize: 16, fontWeight: 600 }}>
                      Status: {pitchAnalysis.summary.status}
                    </span>
                  }
                  description={
                    <span style={{ fontSize: 14 }}>
                      {getStatusMessage(pitchAnalysis.summary.status)}
                    </span>
                  }
                  type={getStatusColor(pitchAnalysis.summary.status)}
                  showIcon
                  style={{ marginBottom: 24 }}
                />

                <Divider />

                <Title level={5}>
                  <FileTextOutlined /> Executive Summary
                </Title>
                <Space
                  direction="vertical"
                  size="large"
                  style={{ width: "100%", marginBottom: 24 }}
                >
                  <div>
                    <Text strong style={{ fontSize: 15 }}>
                      Problem:
                    </Text>
                    <Paragraph style={{ marginTop: 8, fontSize: 14 }}>
                      {pitchAnalysis.summary.problem}
                    </Paragraph>
                  </div>
                  <div>
                    <Text strong style={{ fontSize: 15 }}>
                      Solution:
                    </Text>
                    <Paragraph style={{ marginTop: 8, fontSize: 14 }}>
                      {pitchAnalysis.summary.solution}
                    </Paragraph>
                  </div>
                  <div>
                    <Text strong style={{ fontSize: 15 }}>
                      Market:
                    </Text>
                    <Paragraph style={{ marginTop: 8, fontSize: 14 }}>
                      {pitchAnalysis.summary.market}
                    </Paragraph>
                  </div>
                  <div>
                    <Text strong style={{ fontSize: 15 }}>
                      Traction:
                    </Text>
                    <Paragraph style={{ marginTop: 8, fontSize: 14 }}>
                      {pitchAnalysis.summary.traction}
                    </Paragraph>
                  </div>
                </Space>

                <Divider />

                <Title level={5}>
                  <BarChartOutlined /> Detailed Scorecard
                </Title>
                <Space
                  direction="vertical"
                  size="middle"
                  style={{ width: "100%", marginBottom: 24 }}
                >
                  {Object.entries(pitchAnalysis.scorecard).map(
                    ([criteria, score]) => (
                      <div key={criteria}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 8,
                          }}
                        >
                          <Text strong style={{ fontSize: 14 }}>
                            {criteria}
                          </Text>
                          <Text
                            strong
                            style={{
                              fontSize: 16,
                              color: getProgressColor(score * 10),
                            }}
                          >
                            {score}/10
                          </Text>
                        </div>
                        <Progress
                          percent={score * 10}
                          strokeColor={getProgressColor(score * 10)}
                          trailColor="#f0f0f0"
                          strokeWidth={12}
                          showInfo={false}
                        />
                      </div>
                    )
                  )}
                </Space>

                <Divider />

                <Title level={5}>
                  <BulbOutlined /> Key Highlights
                </Title>
                <Space
                  direction="vertical"
                  size="small"
                  style={{ width: "100%", marginBottom: 16 }}
                >
                  {pitchAnalysis.highlights.map((highlight, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: 12,
                        backgroundColor: "#f0f0f0",
                        borderRadius: 6,
                        borderLeft: "4px solid #52c41a",
                      }}
                    >
                      <Space align="start">
                        <CheckCircleOutlined
                          style={{
                            color: "#52c41a",
                            fontSize: 16,
                            marginTop: 2,
                          }}
                        />
                        <Text style={{ fontSize: 14 }}>{highlight}</Text>
                      </Space>
                    </div>
                  ))}
                </Space>
              </Card>
            )}

            <div className="mt-6 flex gap-4">
              <Button
                onClick={() => {
                  setCurrentStep(1);
                  localStorage.setItem(STORAGE_KEYS.CURRENT_STEP, "1");
                }}
              >
                <ArrowLeftOutlined /> Back
              </Button>
              {!pitchAnalysis && (
                <Button
                  type="default"
                  onClick={handleFinalSubmit}
                  loading={loading}
                  icon={<SaveOutlined />}
                  style={{
                    height: 48,
                    fontSize: 16,
                    fontWeight: 600,
                  }}
                >
                  Skip & Create Client
                </Button>
              )}
              <Button
                type="primary"
                onClick={handleFinalSubmit}
                disabled={!pitchAnalysis}
                loading={loading}
                icon={<SaveOutlined />}
                style={{
                  backgroundColor: "#52c41a",
                  borderColor: "#52c41a",
                  height: 48,
                  fontSize: 16,
                  fontWeight: 600,
                }}
              >
                {pitchAnalysis
                  ? "Create Client & Auto-Approve"
                  : "Upload Pitch First"}
              </Button>
            </div>
          </Card>
        )}
      </Form>

      {/* Test Email Modal */}
      <Modal
        title={
          <Space>
            <ThunderboltOutlined style={{ color: "#1890ff" }} />
            <span>Test Email Configuration</span>
          </Space>
        }
        open={smtpTestModalVisible}
        onCancel={() => !testEmailLoading && setSmtpTestModalVisible(false)}
        footer={[
          <Button
            key="cancel"
            onClick={() => setSmtpTestModalVisible(false)}
            disabled={testEmailLoading}
          >
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={handleSubmitTest}
            loading={testEmailLoading}
            disabled={!testEmailAddress}
            style={{
              backgroundColor: "#1890ff",
              borderColor: "#1890ff",
            }}
          >
            Send Test Email
          </Button>,
        ]}
        maskClosable={!testEmailLoading}
      >
        <div style={{ padding: "16px 0" }}>
          <Text style={{ display: "block", marginBottom: 16 }}>
            Enter the email address where you want to receive the test email:
          </Text>
          <Input
            size="large"
            prefix={<MailOutlined />}
            placeholder="e.g., admin@company.com or your-email@example.com"
            value={testEmailAddress}
            onChange={(e) => setTestEmailAddress(e.target.value)}
            onPressEnter={handleSubmitTest}
          />
          <Alert
            message="Test email will be sent to verify SMTP configuration"
            description="You can use your own email or the client's email to verify that the configuration is working correctly. The email will be saved only after a successful test."
            type="info"
            showIcon
            style={{ marginTop: 16 }}
          />
        </div>
      </Modal>
    </div>
  );
}
