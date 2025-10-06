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

export default function AddInvestorPage() {
  const router = useRouter();
  const [showManualForm, setShowManualForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [pasteOpen, setPasteOpen] = useState(false);

  const handleManualEntry = () => {
    setShowManualForm(true);
  };

  /* 
  // FILE UPLOAD SECTION - COMMENTED OUT FOR NOW
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (file: File) => {
    const rawExt = file.name.split('.').pop();
    const fileExtension = (rawExt ? rawExt : '').toLowerCase();
    const formData = new FormData();
    
    setUploading(true);
    message.loading('Uploading file...', 0);
    
    try {
      formData.append('excel', file);
      const response = await fetch(`${API_BASE_URL}/excel/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      message.destroy();
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      
      Modal.success({
        title: 'Upload Successful',
        content: (
          <div>
            <p><strong>File:</strong> {file.name}</p>
            <p><strong>Type:</strong> {fileExtension ? fileExtension.toUpperCase() : ''}</p>
            <p><strong>Status:</strong> {result.message || 'Data imported successfully'}</p>
            <p className="text-green-600 font-medium">Redirecting to All Investors...</p>
          </div>
        ),
        onOk: () => router.push('/dashboard/all-investors'),
      });
      
      setTimeout(() => router.push('/dashboard/all-investors'), 2000);
    } catch (error) {
      message.destroy();
      message.error('Unable to process the file. Please check the file format and try again.');
    } finally {
      setUploading(false);
    }
    
    return false;
  };
  */

  const handleSubmit = async (values: any) => {
    setLoading(true);

    try {
      // Validate required fields
      if (!values.investor_name || !values.investor_name.trim()) {
        message.error("Please enter the Investor Name");
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

      if (!values.fund_type || !values.fund_type.trim()) {
        message.error("Please enter the Fund Type");
        setLoading(false);
        return;
      }

      if (!values.fund_stage || !values.fund_stage.trim()) {
        message.error("Please enter the Fund Stage");
        setLoading(false);
        return;
      }

      if (!values.location || !values.location.trim()) {
        message.error("Please enter the Location");
        setLoading(false);
        return;
      }

      if (!values.fund_focus_sectors || !values.fund_focus_sectors.trim()) {
        message.error("Please enter the Fund Focus Sectors");
        setLoading(false);
        return;
      }

      // Prepare payload
      const payload = {
        "Investor Name": values.investor_name.trim(),
        "Partner Name": values.partner_name.trim(),
        "Partner Email": values.partner_email.trim(),
        "Phone number": values.phone_number.trim(),
        "Fund Type": values.fund_type.trim(),
        "Fund Stage": values.fund_stage.trim(),
        Location: values.location.trim(),
        "Ticket Size": values.ticket_size?.trim() || "",
        "Fund Focus (Sectors)": values.fund_focus_sectors.trim(),
        Website: values.website?.trim() || "",
      };

      const response = await fetch(`${API_BASE_URL}/investors/create`, {
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
          .catch(() => ({ error: "Failed to add investor" }));
        throw new Error(errorData.error || "Failed to add investor");
      }

      const result = await response.json();

      message.success("Investor added successfully");
      form.resetFields();
      setShowManualForm(false);

      setTimeout(() => {
        router.push("/dashboard/all-investors");
      }, 1000);
    } catch (error) {
      console.error("Error adding investor:", error);
      message.error("Unable to add investor. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {!showManualForm ? (
        <div>
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
                Add Investors
              </Title>
              <Text className="text-gray-600">
                Add investor information to your database
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
                  Add investors individually with detailed information
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
                  Add Investor
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
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg">Add New Investor</span>
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
            tip="Adding investor..."
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
                    name="investor_name"
                    label="Investor Name"
                    className="mb-3"
                    rules={[
                      { required: true, message: "Investor name is required" },
                      {
                        whitespace: true,
                        message: "Investor name cannot be empty",
                      },
                    ]}
                  >
                    <Input
                      placeholder="Enter investor name"
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
                    name="fund_type"
                    label="Fund Type"
                    className="mb-3"
                    rules={[
                      { required: true, message: "Fund type is required" },
                      {
                        whitespace: true,
                        message: "Fund type cannot be empty",
                      },
                    ]}
                  >
                    <Input
                      placeholder="e.g., VC, PE, Angel"
                      disabled={loading}
                    />
                  </Form.Item>

                  <Form.Item
                    name="fund_stage"
                    label="Fund Stage"
                    className="mb-3"
                    rules={[
                      { required: true, message: "Fund stage is required" },
                      {
                        whitespace: true,
                        message: "Fund stage cannot be empty",
                      },
                    ]}
                  >
                    <Input
                      placeholder="e.g., Seed, Series A"
                      disabled={loading}
                    />
                  </Form.Item>

                  <Form.Item
                    name="location"
                    label="Location"
                    className="mb-3"
                    rules={[
                      { required: true, message: "Location is required" },
                      { whitespace: true, message: "Location cannot be empty" },
                    ]}
                  >
                    <Input
                      placeholder="e.g., Boston, MA, USA"
                      disabled={loading}
                    />
                  </Form.Item>

                  <Form.Item
                    name="ticket_size"
                    label="Ticket Size (Optional)"
                    className="mb-3"
                  >
                    <Input placeholder="e.g., $500K - $2M" disabled={loading} />
                  </Form.Item>

                  <Form.Item
                    name="fund_focus_sectors"
                    label="Fund Focus Sectors"
                    className="mb-3"
                    rules={[
                      {
                        required: true,
                        message: "Fund focus sectors is required",
                      },
                      {
                        whitespace: true,
                        message: "Fund focus sectors cannot be empty",
                      },
                    ]}
                  >
                    <Input
                      placeholder="e.g., FinTech, SaaS, AI"
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
                    {loading ? "Adding..." : "Add Investor"}
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
        title="Paste Investor Details"
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

    // Extract phone number (various formats)
    const phoneMatch = src.match(
      /(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/
    );
    if (phoneMatch) fields["phone_number"] = phoneMatch[0];

    // Extract labeled fields
    fields["investor_name"] =
      getAfter("investor name") ||
      getAfter("investor") ||
      getAfter("firm") ||
      getAfter("company");
    fields["partner_name"] =
      getAfter("partner name") ||
      getAfter("contact name") ||
      getAfter("name") ||
      getAfter("partner");
    fields["fund_type"] = getAfter("fund type") || getAfter("type");
    fields["fund_stage"] = getAfter("fund stage") || getAfter("stage");
    fields["location"] =
      getAfter("location") || getAfter("city") || getAfter("address");
    fields["ticket_size"] =
      getAfter("ticket size") ||
      getAfter("cheque size") ||
      getAfter("investment size");
    fields["fund_focus_sectors"] =
      getAfter("fund focus") ||
      getAfter("sector focus") ||
      getAfter("sectors") ||
      getAfter("focus");

    // Heuristic detection for fund stage
    if (!fields["fund_stage"]) {
      if (/(pre\s*seed|preseed)/i.test(src)) fields["fund_stage"] = "Pre-Seed";
      else if (/\bseed\b/i.test(src)) fields["fund_stage"] = "Seed";
      else if (/series\s*a/i.test(src)) fields["fund_stage"] = "Series A";
      else if (/series\s*b/i.test(src)) fields["fund_stage"] = "Series B";
      else if (/series\s*c/i.test(src)) fields["fund_stage"] = "Series C";
    }

    // Heuristic detection for fund type
    if (!fields["fund_type"]) {
      if (/\bvc\b|venture\s*capital/i.test(src)) fields["fund_type"] = "VC";
      else if (/\bpe\b|private\s*equity/i.test(src)) fields["fund_type"] = "PE";
      else if (/angel/i.test(src)) fields["fund_type"] = "Angel";
    }

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
        placeholder="Paste investor details here..."
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
