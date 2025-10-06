"use client";

import { useState } from "react";
import {
  Card,
  Typography,
  Button,
  Form,
  Input,
  Modal,
  message,
  Spin,
} from "antd";
import {
  UserOutlined,
  ArrowLeftOutlined,
  PlusOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";

const { Title, Text } = Typography;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function AddIncubatorPage() {
  const router = useRouter();
  const [showManualForm, setShowManualForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [pasteOpen, setPasteOpen] = useState(false);

  const handleManualEntry = () => {
    setShowManualForm(true);
  };

  // const handleFileUpload = async (file: File) => {
  //   const rawExt = file.name.split('.').pop();
  //   const fileExtension = (rawExt ? rawExt : '').toLowerCase();
  //   const formData = new FormData();
  //   setUploading(true);
  //   message.loading('Uploading file...', 0);
  //   try {
  //     formData.append('file', file);
  //     formData.append('excel', file);
  //     const base = process.env.NEXT_PUBLIC_BACKEND_URL || '/api';
  //     const response = await fetch(`${base}/api/incubators/upload`, {
  //       method: 'POST',
  //       body: formData,
  //     });

  //     message.destroy();

  //     if (response.ok) {
  //       const result = await response.json();
  //       Modal.success({
  //         title: '🎉 Upload Successful!',
  //         content: (
  //           <div>
  //             <p><strong>File:</strong> {file.name}</p>
  //             <p><strong>Type:</strong> {fileExtension ? fileExtension.toUpperCase() : ''}</p>
  //             <p><strong>Status:</strong> {result.message || 'Data imported successfully'}</p>
  //             <p className="text-green-600 font-medium">Redirecting to All Incubators...</p>
  //           </div>
  //         ),
  //         onOk: () => router.push('/dashboard/all-incubators'),
  //       });
  //       setTimeout(() => router.push('/dashboard/all-incubators'), 2000);
  //     } else {
  //       const error = await response.json();
  //       message.error(error.error || `Failed to upload ${fileExtension ? fileExtension.toUpperCase() : ''} file`);
  //     }
  //   } catch (error) {
  //     message.destroy();
  //     message.error(`Failed to upload ${fileExtension?.toUpperCase() || ''} file`);
  //   } finally {
  //     setUploading(false);
  //   }

  //   return false;
  // };

  const handleSubmit = async (values: any) => {
    setLoading(true);

    try {
      // Validate required fields
      if (!values.incubator_name || !values.incubator_name.trim()) {
        message.error("Please enter the Incubator Name");
        setLoading(false);
        return;
      }

      if (!values.partner_name || !values.partner_name.trim()) {
        message.error("Please enter the Partner Name");
        setLoading(false);
        return;
      }

      if (!values.partner_email || !values.partner_email.trim()) {
        message.error("Please enter the Partner Email");
        setLoading(false);
        return;
      }

      if (!values.phone_number || !values.phone_number.trim()) {
        message.error("Please enter the Phone Number");
        setLoading(false);
        return;
      }

      if (!values.sector_focus || !values.sector_focus.trim()) {
        message.error("Please enter the Sector Focus");
        setLoading(false);
        return;
      }

      if (!values.country || !values.country.trim()) {
        message.error("Please enter the Country");
        setLoading(false);
        return;
      }

      if (!values.state_city || !values.state_city.trim()) {
        message.error("Please enter the State/City");
        setLoading(false);
        return;
      }

      // Prepare payload
      const payload = {
        "Incubator Name": values.incubator_name.trim(),
        "Partner Name": values.partner_name.trim(),
        "Partner Email": values.partner_email.trim(),
        "Phone Number": values.phone_number.trim(),
        "Sector Focus": values.sector_focus.trim(),
        Country: values.country.trim(),
        "State/City": values.state_city.trim(),
        Website: values.website?.trim() || "",
      };

      const response = await fetch(`${API_BASE_URL}/incubators/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to add incubator" }));
        throw new Error(errorData.error || "Failed to add incubator");
      }

      const result = await response.json();

      message.success("Incubator added successfully");
      form.resetFields();
      setShowManualForm(false);

      setTimeout(() => {
        router.push("/dashboard/all-incubators");
      }, 1000);
    } catch (error) {
      console.error("Error adding incubator:", error);
      message.error("Unable to add incubator. Please try again.");
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
              <Title level={2} className="mb-2">
                Add Incubators
              </Title>
              <Text className="text-gray-600">
                Add incubator information to your database
              </Text>
            </div>
          </div>

          <div className="flex justify-center mt-12">
            <Card className="text-center p-8 hover:shadow-lg transition-shadow border-2 hover:border-blue-300 w-full max-w-md">
              <div className="mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserOutlined className="text-3xl text-blue-600" />
                </div>
                <Title level={3} className="mb-2">
                  Manual Entry
                </Title>
                <Text className="text-gray-600">
                  Add incubators individually with detailed information
                </Text>
              </div>
              <div className="flex justify-center">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleManualEntry}
                  size="large"
                  style={{
                    backgroundColor: "#1677ff",
                    borderColor: "#1677ff",
                    color: "#fff",
                  }}
                >
                  Add Incubator
                </Button>
              </div>
            </Card>
            {/* FILE IMPORT CARD - COMMENTED OUT
            <Card className="text-center p-0 hover:shadow-lg transition-shadow border-2 overflow-hidden">
              <div className="p-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileTextOutlined className="text-3xl text-green-600" />
                </div>
                <Title level={3} className="mb-2">File Import</Title>
                <Text className="text-gray-600 mb-4 block">
                  Upload CSV or Excel files - both formats supported
                </Text>
                <Upload.Dragger
                  accept=".csv,.xlsx,.xls"
                  beforeUpload={handleFileUpload}
                  showUploadList={false}
                  disabled={uploading}
                  multiple={false}
                >
                  <p className="ant-upload-drag-icon">
                    <UploadOutlined />
                  </p>
                  <p className="ant-upload-text">Click or drag file to this area to upload</p>
                  <p className="ant-upload-hint text-xs text-gray-500">Supports .csv, .xlsx, .xls</p>
                </Upload.Dragger>
              </div>
            </Card>
            */}
          </div>
        </div>
      ) : (
        <Modal
          title={
            <div className="flex items-center justify-between">
              <span className="font-semibold text-lg">Add New Incubator</span>
              <Button
                size="small"
                type="default"
                onClick={() => setPasteOpen(true)}
              >
                Paste Details
              </Button>
            </div>
          }
          open={true}
          onCancel={() => {
            if (!loading) {
              setShowManualForm(false);
              form.resetFields();
            }
          }}
          footer={null}
          width={1200}
          style={{ top: 20 }}
          styles={{
            body: {
              padding: 0,
              maxHeight: "70vh",
              overflowX: "hidden",
              overflowY: "auto",
            },
          }}
          maskClosable={!loading}
          closable={!loading}
        >
          <Spin
            spinning={loading}
            indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />}
            tip="Adding incubator..."
          >
            <div
              className="p-6"
              style={{
                maxWidth: "100%",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <Form form={form} onFinish={handleSubmit} layout="vertical">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Form.Item
                    name="incubator_name"
                    label="Incubator Name"
                    className="mb-3"
                    rules={[
                      { required: true, message: "Incubator name is required" },
                      {
                        whitespace: true,
                        message: "Incubator name cannot be empty",
                      },
                    ]}
                  >
                    <Input
                      placeholder="Enter incubator name"
                      disabled={loading}
                    />
                  </Form.Item>

                  <Form.Item
                    name="partner_name"
                    label="Partner Name"
                    className="mb-3"
                    rules={[
                      { required: true, message: "Partner name is required" },
                      {
                        whitespace: true,
                        message: "Partner name cannot be empty",
                      },
                    ]}
                  >
                    <Input
                      placeholder="Enter partner name"
                      disabled={loading}
                    />
                  </Form.Item>

                  <Form.Item
                    name="partner_email"
                    label="Partner Email"
                    className="mb-3"
                    rules={[
                      { required: true, message: "Partner email is required" },
                      {
                        type: "email",
                        message: "Please enter a valid email address",
                      },
                      { whitespace: true, message: "Email cannot be empty" },
                    ]}
                  >
                    <Input
                      placeholder="Enter partner email"
                      type="email"
                      disabled={loading}
                    />
                  </Form.Item>

                  <Form.Item
                    name="phone_number"
                    label="Phone Number"
                    className="mb-3"
                    rules={[
                      { required: true, message: "Phone number is required" },
                      {
                        whitespace: true,
                        message: "Phone number cannot be empty",
                      },
                    ]}
                  >
                    <Input
                      placeholder="Enter phone number"
                      disabled={loading}
                    />
                  </Form.Item>

                  <Form.Item
                    name="sector_focus"
                    label="Sector Focus"
                    className="mb-3"
                    rules={[
                      { required: true, message: "Sector focus is required" },
                      {
                        whitespace: true,
                        message: "Sector focus cannot be empty",
                      },
                    ]}
                  >
                    <Input
                      placeholder="e.g., FinTech, HealthTech"
                      disabled={loading}
                    />
                  </Form.Item>

                  <Form.Item
                    name="country"
                    label="Country"
                    className="mb-3"
                    rules={[
                      { required: true, message: "Country is required" },
                      { whitespace: true, message: "Country cannot be empty" },
                    ]}
                  >
                    <Input
                      placeholder="e.g., United States"
                      disabled={loading}
                    />
                  </Form.Item>

                  <Form.Item
                    name="state_city"
                    label="State/City"
                    className="mb-3"
                    rules={[
                      { required: true, message: "State/City is required" },
                      {
                        whitespace: true,
                        message: "State/City cannot be empty",
                      },
                    ]}
                  >
                    <Input
                      placeholder="e.g., San Francisco, CA"
                      disabled={loading}
                    />
                  </Form.Item>

                  <Form.Item
                    name="website"
                    label="Website (Optional)"
                    className="mb-3"
                    rules={[
                      { type: "url", message: "Please enter a valid URL" },
                    ]}
                  >
                    <Input
                      placeholder="e.g., https://example.com"
                      disabled={loading}
                    />
                  </Form.Item>
                </div>

                <div className="flex gap-4 mt-6">
             <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    disabled={loading}
                    style={{
                      backgroundColor: "#1677ff",
                      color: "#fff",
                      borderColor: "#1677ff",
                    }}
                  >
                    {loading ? "Adding..." : "Add Incubator"}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowManualForm(false);
                      form.resetFields();
                    }}
                    disabled={loading}
                    style={{
                      borderColor: "#dc2626",
                      color: "#dc2626",
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </Form>
            </div>
          </Spin>
        </Modal>
      )}

      <Modal
        title="Paste Incubator Details"
        open={pasteOpen}
        onCancel={() => setPasteOpen(false)}
        footer={null}
        width={600}
      >
        <PasteHelper
          onFill={(fields) => {
            form.setFieldsValue(fields);
            message.success("Fields filled from pasted text");
            setPasteOpen(false);
          }}
        />
      </Modal>
    </div>
  );
}

function PasteHelper({ onFill }: { onFill: (fields: any) => void }) {
  const [text, setText] = useState("");

  const fromClipboard = async () => {
    try {
      const t = await navigator.clipboard.readText();
      setText(t || "");
      message.success("Pasted from clipboard");
    } catch {
      message.warning("Clipboard access blocked. Please paste manually below.");
    }
  };

  const parseAndFill = () => {
    if (!text.trim()) {
      message.warning("Please enter some text first");
      return;
    }

    const src = (text || "").replace(/\r/g, "");
    const lines = src
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const getAfter = (label: string) => {
      const re = new RegExp(`${label}[:\-]?\s*(.+)`, "i");
      for (const l of lines) {
        const m = l.match(re);
        if (m) return m[1].trim();
      }
      return undefined;
    };

    const fields: any = {};

    // Extract email
    const emailMatch = src.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);
    if (emailMatch && emailMatch.length)
      fields["partner_email"] = emailMatch[0];

    // Extract URL
    const urlMatch = src.match(/https?:\/\/[^\s]+/gi);
    if (urlMatch && urlMatch.length) fields["website"] = urlMatch[0];

    // Extract phone number
    const phoneMatch = src.match(
      /(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/
    );
    if (phoneMatch) fields["phone_number"] = phoneMatch[0];

    // Extract labeled fields
    fields["incubator_name"] =
      getAfter("incubator name") ||
      getAfter("incubator") ||
      getAfter("name") ||
      getAfter("company");
    fields["partner_name"] =
      getAfter("partner name") ||
      getAfter("contact name") ||
      getAfter("contact") ||
      getAfter("partner");
    fields["sector_focus"] =
      getAfter("sector focus") ||
      getAfter("sector") ||
      getAfter("focus") ||
      getAfter("industry");
    fields["country"] = getAfter("country");
    fields["state_city"] =
      getAfter("state") ||
      getAfter("city") ||
      getAfter("location") ||
      getAfter("state/city");

    onFill(fields);
  };

  return (
    <div className="space-y-3">
      <Button onClick={fromClipboard} block>
        Paste from Clipboard
      </Button>
      <Input.TextArea
        rows={10}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste incubator details here..."
      />
      <div className="flex gap-2">
        <Button
          type="primary"
          onClick={parseAndFill}
          style={{
            backgroundColor: "#1677ff",
            borderColor: "#1677ff",
          }}
        >
          Fill Fields
        </Button>
        <Button onClick={() => setText("")}>Clear</Button>
      </div>
    </div>
  );
}
