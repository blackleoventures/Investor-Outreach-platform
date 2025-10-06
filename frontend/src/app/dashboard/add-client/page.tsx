"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Form, Input, message, Select } from "antd";
import {
  ArrowLeftOutlined,
  PlusOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { auth } from "@/lib/firebase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

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

interface ApiErrorResponse {
  success: boolean;
  error?: {
    code: string;
    message: string;
    field?: string;
  };
  message?: string;
}

const FUNDING_STAGES = [
  { value: "Pre-seed", label: "Pre-seed" },
  { value: "Seed", label: "Seed" },
  { value: "Series A", label: "Series A" },
  { value: "Series B", label: "Series B" },
  { value: "Series C", label: "Series C" },
  { value: "Growth", label: "Growth Stage" },
] as const;

const ERROR_MESSAGES: Record<string, string> = {
  DUPLICATE_EMAIL:
    "A client with this email already exists. Please use a different email.",
  VALIDATION_ERROR: "Please check all required fields and try again.",
  UNAUTHORIZED: "Your session has expired. Please log in again.",
  TOKEN_EXPIRED: "Your session has expired. Please log in again.",
  TOKEN_REVOKED: "Your session is no longer valid. Please log in again.",
  SERVER_ERROR: "Something went wrong on our end. Our team has been notified.",
  NETWORK_ERROR: "Unable to connect. Please check your internet connection.",
  AUTH_REQUIRED: "Please log in to continue.",
  DEFAULT:
    "Unable to create client. Please try again or contact support if the issue persists.",
};

export default function AddClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showManualForm, setShowManualForm] = useState(true);
  const [form] = Form.useForm<ClientFormValues>();

  const getUserFriendlyError = (errorCode?: string): string => {
    if (!navigator.onLine) {
      return ERROR_MESSAGES.NETWORK_ERROR;
    }
    return ERROR_MESSAGES[errorCode || "DEFAULT"] || ERROR_MESSAGES.DEFAULT;
  };

  const handleSubmit = async (values: ClientFormValues) => {
    setLoading(true);

    try {
      const user = auth.currentUser;

      if (!user) {
        message.error(ERROR_MESSAGES.AUTH_REQUIRED);
        router.push("/login");
        return;
      }

      const token = await user.getIdToken(true);

      const payload = {
        companyName: values.companyName,
        founderName: values.founderName,
        email: values.email,
        phone: values.phone,
        fundingStage: values.fundingStage,
        revenue: values.revenue,
        investment: values.investment,
        industry: values.industry,
        city: values.city,
        gmailAppPassword: values.gmailAppPassword.replace(/\s/g, ""),
      };

      const response = await fetch(`${API_BASE_URL}/clients/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data: ApiErrorResponse = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          const errorCode = data.error?.code;
          if (errorCode === "TOKEN_EXPIRED" || errorCode === "TOKEN_REVOKED") {
            message.error(getUserFriendlyError(errorCode));
            router.push("/login");
            return;
          }
        }

        const userMessage = getUserFriendlyError(data.error?.code);

        console.error("[Client Creation Error]:", {
          status: response.status,
          errorCode: data.error?.code,
          errorMessage: data.error?.message,
          timestamp: new Date().toISOString(),
        });

        throw new Error(userMessage);
      }

      message.success(
        "Client added successfully! You can now manage their profile."
      );
      form.resetFields();
      router.push("/dashboard/all-client");
    } catch (error) {
      const userMessage =
        error instanceof Error ? error.message : ERROR_MESSAGES.DEFAULT;

      console.error("[Client Creation Error]:", {
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });

      message.error(userMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {!showManualForm ? (
        <div className="mx-auto">
          <div className="mb-6">
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => router.back()}
              className="mb-4"
            >
              Back to Previous Page
            </Button>

            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2">Add Client</h2>
              <p className="text-gray-600">
                Choose your preferred method to add clients
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
            <div className="text-center p-8 hover:shadow-lg transition-shadow border-2 hover:border-blue-300 rounded-md">
              <div className="mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserOutlined className="text-3xl text-blue-600" />
                </div>
                <h3 className="text-lg font-medium mb-2">Manual Entry</h3>
                <p className="text-gray-600">
                  Add clients individually with detailed information
                </p>
              </div>
              <div className="flex justify-center">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setShowManualForm(true)}
                  style={{
                    backgroundColor: "#1677ff",
                    borderColor: "#1677ff",
                    color: "#fff",
                  }}
                >
                  Add Client
                </Button>
              </div>
            </div>

            <div className="text-center p-8 border-2 rounded-md opacity-60">
              <h3 className="text-lg font-medium mb-2">
                File Import (Coming Soon)
              </h3>
              <p className="text-gray-600">
                CSV/Excel upload support will be available soon
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto">
          <div className="mb-8">
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => router.back()}
              className="mb-6 text-gray-600 hover:text-gray-800"
            >
              Back to Previous Page
            </Button>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Add New Client
                </h1>
                <p className="text-base text-gray-600">
                  Fill in the client details to create a new client profile
                </p>
              </div>
            </div>
          </div>

          <div>
            <Form
              form={form}
              onFinish={handleSubmit}
              layout="vertical"
              size="large"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Form.Item
                  name="companyName"
                  label={
                    <span className="text-base font-semibold text-gray-800">
                      Company Name
                    </span>
                  }
                  rules={[
                    { required: true, message: "Company name is required" },
                    {
                      min: 2,
                      message: "Company name must be at least 2 characters",
                    },
                  ]}
                  className="mb-6"
                >
                  <Input placeholder="Acme Inc" className="h-14 text-base" />
                </Form.Item>

                <Form.Item
                  name="founderName"
                  label={
                    <span className="text-base font-semibold text-gray-800">
                      Founder Name
                    </span>
                  }
                  rules={[
                    { required: true, message: "Founder name is required" },
                    {
                      min: 2,
                      message: "Founder name must be at least 2 characters",
                    },
                  ]}
                  className="mb-6"
                >
                  <Input placeholder="John Doe" className="h-14 text-base" />
                </Form.Item>

                <Form.Item
                  name="email"
                  label={
                    <span className="text-base font-semibold text-gray-800">
                      Email
                    </span>
                  }
                  rules={[
                    { required: true, message: "Email is required" },
                    {
                      type: "email",
                      message: "Please enter a valid email address",
                    },
                  ]}
                  className="mb-6"
                >
                  <Input
                    placeholder="founder@company.com"
                    className="h-14 text-base"
                  />
                </Form.Item>

                <Form.Item
                  name="phone"
                  label={
                    <span className="text-base font-semibold text-gray-800">
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
                  className="mb-6"
                >
                  <Input
                    placeholder="+1 555 000 000"
                    className="h-14 text-base"
                  />
                </Form.Item>

                <Form.Item
                  name="fundingStage"
                  label={
                    <span className="text-base font-semibold text-gray-800">
                      Funding Stage
                    </span>
                  }
                  rules={[
                    { required: true, message: "Funding stage is required" },
                  ]}
                  className="mb-6"
                >
                  <Select
                    options={[...FUNDING_STAGES]}
                    placeholder="Select funding stage"
                    size="large"
                    className="h-14"
                  />
                </Form.Item>

                <Form.Item
                  name="revenue"
                  label={
                    <span className="text-base font-semibold text-gray-800">
                      Revenue
                    </span>
                  }
                  rules={[{ required: true, message: "Revenue is required" }]}
                  className="mb-6"
                >
                  <Input
                    placeholder="$1.5M or 1500000"
                    className="h-14 text-base"
                  />
                </Form.Item>

                <Form.Item
                  name="investment"
                  label={
                    <span className="text-base font-semibold text-gray-800">
                      Investment Ask
                    </span>
                  }
                  rules={[
                    { required: true, message: "Investment ask is required" },
                  ]}
                  className="mb-6"
                >
                  <Input
                    placeholder="$2M or 2000000"
                    className="h-14 text-base"
                  />
                </Form.Item>

                <Form.Item
                  name="industry"
                  label={
                    <span className="text-base font-semibold text-gray-800">
                      Industry
                    </span>
                  }
                  rules={[
                    { required: true, message: "Industry is required" },
                    {
                      min: 2,
                      message: "Industry must be at least 2 characters",
                    },
                  ]}
                  className="mb-6"
                >
                  <Input
                    placeholder="Fintech, SaaS, AI, etc."
                    className="h-14 text-base"
                  />
                </Form.Item>

                <Form.Item
                  name="city"
                  label={
                    <span className="text-base font-semibold text-gray-800">
                      City
                    </span>
                  }
                  rules={[
                    { required: true, message: "City is required" },
                    { min: 2, message: "City must be at least 2 characters" },
                  ]}
                  className="mb-6"
                >
                  <Input
                    placeholder="Boston, MA, USA"
                    className="h-14 text-base"
                  />
                </Form.Item>

                <Form.Item
                  name="gmailAppPassword"
                  label={
                    <span className="text-base font-semibold text-gray-800">
                      Gmail App Password
                    </span>
                  }
                  className="mb-6"
                  rules={[
                    {
                      required: true,
                      message: "Gmail App Password is required",
                    },
                    {
                      validator: (_, value) => {
                        if (!value) return Promise.resolve();
                        const cleanValue = value.replace(/\s/g, "");
                        if (cleanValue.length !== 16) {
                          return Promise.reject(
                            "App Password must be exactly 16 characters"
                          );
                        }
                        if (!/^[a-zA-Z0-9]{16}$/.test(cleanValue)) {
                          return Promise.reject(
                            "App Password must contain only letters and numbers"
                          );
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                  help={
                    <div className="mt-2 p-3 bg-blue-50 rounded border">
                      <div className="text-sm space-y-1">
                        <div className="font-semibold text-blue-800">
                          How to Generate Gmail App Password:
                        </div>
                        <div>
                          1. Go to{" "}
                          <a
                            href="https://myaccount.google.com/security"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline"
                          >
                            Google Account Security
                          </a>
                        </div>
                        <div>2. Enable "2-Step Verification" first</div>
                        <div>3. Find "App passwords" section</div>
                        <div>
                          4. Select app: "Mail" → Select device: "Other (custom
                          name)"
                        </div>
                        <div>
                          5. Type "Email Marketing" as name → Click "Generate"
                        </div>
                        <div>
                          6. Copy the 16-character password (format: abcd efgh
                          ijkl mnop)
                        </div>
                      </div>
                    </div>
                  }
                >
                  <Input.Password
                    placeholder="abcd efgh ijkl mnop (16 characters)"
                    className="h-14 text-base"
                    maxLength={19}
                  />
                </Form.Item>
              </div>

              <div className="flex gap-6 mt-10 pt-8 border-t border-gray-200">
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  size="large"
                  className="bg-blue-600 hover:bg-blue-700 border-blue-600 h-14 px-10 font-semibold text-base"
                >
                  Save Client
                </Button>
                <Button
                  onClick={() => router.push("/dashboard/all-client")}
                  size="large"
                  className="h-14 px-8 text-base border-gray-300 hover:border-gray-400"
                >
                  Cancel
                </Button>
              </div>
            </Form>
          </div>
        </div>
      )}
    </div>
  );
}
