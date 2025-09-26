"use client";

import React, { useState } from "react";
import { Select, Input, Button, message, Card, Tag, Switch, Upload, Alert, Space, Typography, List, Divider } from "antd";
import { RobotOutlined, SendOutlined, BulbOutlined, ThunderboltOutlined, UploadOutlined, CheckCircleOutlined, CloseOutlined, PlusOutlined, UserOutlined } from "@ant-design/icons";

const { Text } = Typography;

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL as string) || "/api";

export default function OrganizedEmailComposer() {
  const [sender, setSender] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newRecipient, setNewRecipient] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [tone, setTone] = useState("Professional");
  const [loading, setLoading] = useState(false);
  const [enableFollowUp, setEnableFollowUp] = useState(false);
  const [documentUploaded, setDocumentUploaded] = useState(false);

  const addRecipient = () => {
    if (!newRecipient.trim()) return;
    const email = newRecipient.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      message.error("Please enter a valid email address");
      return;
    }
    if (recipients.includes(email)) {
      message.warning("Email already added");
      return;
    }
    setRecipients([...recipients, email]);
    setNewRecipient("");
  };

  const removeRecipient = (email: string) => {
    setRecipients(recipients.filter(r => r !== email));
  };

  const handleDocumentUpload = async (file: File) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("document", file);
      formData.append("investorName", "[Investor Name]");

      const res = await fetch(`${BACKEND_URL}/ai/extract-and-prefill`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to process document");
      }

      const result = await res.json();
      
      if (result.success) {
        setSubject(result.data.emailTemplate.subject);
        setBody(result.data.emailTemplate.body);
        setDocumentUploaded(true);
        message.success("Document processed! Email pre-filled with extracted data.");
      } else {
        throw new Error("Failed to extract data from document");
      }
    } catch (error: any) {
      message.error(error.message || "Failed to process document");
    } finally {
      setLoading(false);
    }
  };

  const sendEmail = async () => {
    if (!campaignId || recipients.length === 0 || !subject || !body) {
      message.warning("Campaign ID, recipients, subject, and body are required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          content: body,
          recipients,
          sender: sender || undefined,
          subject,
          type: "ai",
          enableFollowUp
        }),
      });
      if (!res.ok) throw new Error("Failed to send email");
      message.success(`Emails queued for ${recipients.length} recipients!`);
    } catch (e: any) {
      message.error(e.message || "Send failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-6 h-screen">
      {/* Left Sidebar - Recipients */}
      <div className="w-80 bg-white border-r border-gray-200 p-4">
        <div className="mb-4">
          <Text strong className="text-lg">Recipients ({recipients.length})</Text>
        </div>
        
        {/* Add Recipient */}
        <div className="mb-4">
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="Enter email address"
              value={newRecipient}
              onChange={(e) => setNewRecipient(e.target.value)}
              onPressEnter={addRecipient}
            />
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={addRecipient}
            >
              Add
            </Button>
          </Space.Compact>
        </div>

        <Divider />

        {/* Recipients List */}
        <div className="flex-1 overflow-y-auto">
          {recipients.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <UserOutlined className="text-2xl mb-2" />
              <div>No recipients added</div>
            </div>
          ) : (
            <List
              dataSource={recipients}
              renderItem={(email) => (
                <List.Item className="px-0">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <UserOutlined className="text-gray-400" />
                      <Text className="text-sm">{email}</Text>
                    </div>
                    <Button
                      type="text"
                      size="small"
                      icon={<CloseOutlined />}
                      onClick={() => removeRecipient(email)}
                      className="text-red-500 hover:text-red-700"
                    />
                  </div>
                </List.Item>
              )}
            />
          )}
        </div>
      </div>

      {/* Main Content - Email Composer */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-800">AI-Powered Email Composer</h3>
              <p className="text-gray-600">Create personalized investor outreach emails with AI assistance</p>
            </div>
          </div>

          <Card className="shadow-lg border-0">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                  placeholder="Sender Email (optional)" 
                  value={sender} 
                  onChange={(e) => setSender(e.target.value)} 
                />
                <Input 
                  placeholder="Campaign ID" 
                  value={campaignId} 
                  onChange={(e) => setCampaignId(e.target.value)} 
                />
              </div>
              
              {/* Document Upload Section */}
              <Card size="small" className="bg-blue-50 border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <Text strong>Quick Start: Upload Document</Text>
                    <div className="text-sm text-gray-600">Upload your pitch deck or business document to auto-fill email content</div>
                  </div>
                  <Upload
                    accept=".pdf,.pptx,.docx,.txt,.md"
                    beforeUpload={(file) => {
                      handleDocumentUpload(file);
                      return false;
                    }}
                    showUploadList={false}
                  >
                    <Button icon={<UploadOutlined />} loading={loading}>
                      Upload Document
                    </Button>
                  </Upload>
                </div>
                {documentUploaded && (
                  <Alert
                    message="Document processed successfully!"
                    description="Email content has been pre-filled with extracted company information."
                    type="success"
                    showIcon
                    icon={<CheckCircleOutlined />}
                    className="mt-3"
                  />
                )}
              </Card>

              <div className="flex items-center gap-4">
                <Input 
                  placeholder="Email Subject" 
                  value={subject} 
                  onChange={(e) => setSubject(e.target.value)}
                  className="flex-1"
                />
                <Select
                  value={tone}
                  onChange={setTone}
                  style={{ width: 140 }}
                  options={[
                    { value: "Professional", label: "Professional" },
                    { value: "Persuasive", label: "Persuasive" },
                    { value: "Friendly", label: "Friendly" },
                    { value: "Casual", label: "Casual" }
                  ]}
                />
                <Button 
                  icon={<BulbOutlined />}
                  type="dashed"
                >
                  Optimize
                </Button>
              </div>
              
              <Input.TextArea 
                placeholder="Email Body (HTML or plain text)" 
                autoSize={{ minRows: 8, maxRows: 16 }} 
                value={body} 
                onChange={(e) => setBody(e.target.value)}
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button 
                    icon={<RobotOutlined />}
                    type="dashed"
                  >
                    AI Enhance
                  </Button>
                  <Button 
                    icon={<ThunderboltOutlined />}
                    type="dashed"
                  >
                    Generate Follow-ups
                  </Button>
                  {documentUploaded && (
                    <Tag color="green" icon={<CheckCircleOutlined />}>
                      Auto-filled from document
                    </Tag>
                  )}
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={enableFollowUp} 
                      onChange={setEnableFollowUp}
                      size="small"
                    />
                    <span className="text-sm text-gray-600">Auto Follow-up</span>
                  </div>
                  <Button 
                    type="primary" 
                    onClick={sendEmail} 
                    loading={loading}
                    icon={<SendOutlined />}
                    size="large"
                    className="bg-gradient-to-r from-blue-500 to-purple-600 border-0"
                    disabled={recipients.length === 0}
                  >
                    Send to {recipients.length} Recipients
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}