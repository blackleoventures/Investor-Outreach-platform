"use client";

import React, { useState } from "react";
import { 
  Upload, Input, Button, message, Card, Tabs, Progress, Tag, 
  Switch, Spin, Alert, Divider, Space, Typography, Row, Col, 
  Modal, DatePicker, TimePicker 
} from "antd";
import { 
  UploadOutlined, RobotOutlined, SendOutlined, BulbOutlined, 
  ThunderboltOutlined, FileTextOutlined, CheckCircleOutlined 
} from "@ant-design/icons";
import { getApiBase } from "@/lib/api";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { Dragger } = Upload;

interface ExtractedData {
  companyName?: string;
  founderName?: string;
  founderTitle?: string;
  problem?: string;
  solution?: string;
  market?: string;
  marketSize?: string;
  businessModel?: string;
  traction?: string;
  fundingAmount?: string;
  fundingStage?: string;
  useOfFunds?: string;
  teamBackground?: string;
  competitiveAdvantage?: string;
  revenue?: string;
  customers?: string;
  growth?: string;
  location?: string;
  website?: string;
  email?: string;
  phone?: string;
  sector?: string;
  stage?: string;
}

interface EmailTemplate {
  subject: string;
  body: string;
}

export default function DocumentEmailComposer() {
  const [sender, setSender] = useState("");
  const [recipients, setRecipients] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [investorName, setInvestorName] = useState("[Investor Name]");
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [documentUploaded, setDocumentUploaded] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");
  
  // Scheduling state
  const [scheduleType, setScheduleType] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduleDate, setScheduleDate] = useState<any>(null);
  const [selectedScheduleLabel, setSelectedScheduleLabel] = useState<string>('');
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [customDate, setCustomDate] = useState<Date | null>(null);
  const [customTime, setCustomTime] = useState<any>(null);

  // Handle document upload and extraction
  const handleDocumentUpload = async (file: File) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("document", file);
      formData.append("investorName", investorName);

      const apiBase = await getApiBase();
      const response = await fetch(`${apiBase}/api/ai/extract-and-prefill`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process document");
      }

      const result = await response.json();
      
      if (result.success) {
        setExtractedData(result.data.extractedData);
        setSubject(result.data.emailTemplate.subject);
        setBody(result.data.emailTemplate.body);
        setDocumentUploaded(true);
        setActiveTab("preview"); // Switch to preview tab to show the generated email
        
        message.success("Document processed successfully! Email pre-filled with extracted data.");
      } else {
        throw new Error("Failed to extract data from document");
      }
    } catch (error: any) {
      message.error(error.message || "Failed to process document");
      console.error("Document upload error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Regenerate email with updated investor name using backend template
  const regenerateEmail = async () => {
    if (!extractedData) {
      message.warning("Please upload a document first");
      return;
    }

    setLoading(true);
    try {
      // Call backend to regenerate with the comprehensive template
      const formData = new FormData();
      formData.append("extractedData", JSON.stringify(extractedData));
      formData.append("investorName", investorName);
      formData.append("regenerate", "true");

      const apiBase = await getApiBase();
      const response = await fetch(`${apiBase}/api/ai/regenerate-template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extractedData,
          investorName,
          originalName: "document" // placeholder since we don't have original filename
        })
      });

      if (!response.ok) {
        throw new Error("Failed to regenerate email template");
      }

      const result = await response.json();
      
      if (result.success && result.data.emailTemplate) {
        setSubject(result.data.emailTemplate.subject);
        setBody(result.data.emailTemplate.body);
        message.success("Email regenerated with updated investor name!");
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error: any) {
      message.error(error.message || "Failed to regenerate email");
      console.error("Regeneration error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Send email
  const sendEmail = async () => {
    const to = recipients
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    
    if (!campaignId || to.length === 0 || !subject || !body) {
      message.warning("Campaign ID, recipients, subject, and body are required");
      return;
    }
    
    setLoading(true);
    try {
      const apiBase = await getApiBase();
      
      if (scheduleType === 'scheduled' && scheduleDate) {
        // Schedule email using backend API
        const payload = {
          to: to,
          subject: subject,
          html: body,
          scheduleAt: new Date(scheduleDate).toISOString(),
          from: sender || process.env.NEXT_PUBLIC_SYSTEM_FROM_EMAIL || 'no-reply@example.com'
        };
        
        const response = await fetch(`${apiBase}/api/scheduled-emails`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to schedule email');
        }
        
        message.success(`Email scheduled for ${selectedScheduleLabel || 'selected time'}`);
        setScheduleType('immediate');
        setScheduleDate(null);
        setSelectedScheduleLabel('');
      } else {
        // Send immediately
        const response = await fetch(`${apiBase}/api/email/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId,
            content: body,
            recipients: to,
            sender: sender || undefined,
            subject,
            type: "document-based",
          }),
        });
        
        if (!response.ok) {
          throw new Error("Failed to send email");
        }
        
        message.success(`Emails queued for ${to.length} recipients!`);
      }
    } catch (error: any) {
      message.error(error.message || "Send failed");
    } finally {
      setLoading(false);
    }
  };

  // Scheduling helper functions
  const removeSchedule = () => {
    setScheduleType('immediate');
    setScheduleDate(null);
    setSelectedScheduleLabel('');
    message.success('Schedule removed - email will be sent immediately');
  };

  const formatInIST = (d: Date) => {
    try {
      return new Intl.DateTimeFormat('en-IN', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
        timeZone: 'Asia/Kolkata'
      }).format(d).replace(', ', ', ');
    } catch {
      return d.toLocaleString('en-IN');
    }
  };

  const tomorrowMorning = () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(8,0,0,0); return d; };
  const tomorrowAfternoon = () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(13,0,0,0); return d; };
  const nextMondayMorning = () => { const d = new Date(); const day = d.getDay(); const add = (8 - day) % 7 || 7; d.setDate(d.getDate() + add); d.setHours(8,0,0,0); return d; };

  const uploadProps = {
    name: "document",
    multiple: false,
    accept: ".pdf,.pptx,.docx,.txt,.md",
    beforeUpload: (file: File) => {
      handleDocumentUpload(file);
      return false; // Prevent default upload
    },
    showUploadList: false,
  };

  const tabItems = [
    {
      key: "upload",
      label: (
        <span>
          <UploadOutlined />
          Upload Document
        </span>
      ),
      children: (
        <div className="space-y-6">
          <div className="text-center">
            <Title level={4}>Upload Your Pitch Deck or Business Document</Title>
            <Text type="secondary">
              Upload your PDF, PowerPoint, Word document, or text file to automatically extract company information and generate a personalized investor email.
            </Text>
          </div>

          <Row gutter={16} className="mb-4">
            <Col span={12}>
              <Input
                placeholder="Investor Name (e.g., John Smith)"
                value={investorName}
                onChange={(e) => setInvestorName(e.target.value)}
                size="large"
              />
            </Col>
            <Col span={12}>
              <Button 
                onClick={regenerateEmail}
                disabled={!extractedData}
                loading={loading}
                size="large"
                block
              >
                Regenerate Email
              </Button>
            </Col>
          </Row>

          <Dragger {...uploadProps} className="border-2 border-dashed border-blue-300 hover:border-blue-500">
            <div className="p-8">
              <p className="ant-upload-drag-icon">
                <FileTextOutlined className="text-4xl text-blue-500" />
              </p>
              <p className="ant-upload-text text-lg font-medium">
                Click or drag your document here to upload
              </p>
              <p className="ant-upload-hint text-gray-500">
                Supports PDF, PowerPoint (PPTX), Word (DOCX), Text (TXT), and Markdown (MD) files
              </p>
              <p className="ant-upload-hint text-sm text-gray-400">
                Maximum file size: 10MB
              </p>
            </div>
          </Dragger>

          {loading && (
            <div className="text-center py-8">
              <Spin size="large" />
              <div className="mt-4">
                <Text>Processing document and extracting company information...</Text>
              </div>
            </div>
          )}

          {documentUploaded && extractedData && (
            <Alert
              message="Document Processed Successfully!"
              description="Company information extracted and email template generated. Switch to the Preview tab to review and copy."
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
              action={
                <Button size="small" onClick={() => setActiveTab("preview")}>
                  View Email
                </Button>
              }
            />
          )}
        </div>
      ),
    },
    {
      key: "preview",
      label: (
        <span>
          <SendOutlined />
          Preview & Copy
        </span>
      ),
      children: (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Text strong className="text-lg">Subject</Text>
            <Button 
              size="small" 
              onClick={() => { 
                // Clean subject by removing any prefix
                const cleanSubject = (subject || "")
                  .replace(/^Subject:\s*/i, '') // Remove "Subject:" prefix
                  .trim();
                navigator.clipboard.writeText(cleanSubject);
                message.success('Subject copied to clipboard!');
              }}
            >
              📋 Copy Subject
            </Button>
          </div>
          <Input value={subject?.replace(/^Subject:\s*/i, '').trim()} readOnly size="large" />

          <div className="flex items-center justify-between">
            <Text strong className="text-lg">Email Body</Text>
            <Button 
              size="small" 
              onClick={() => { 
                // Clean body by removing any HTML tags and normalizing whitespace
                const cleanBody = (body || "")
                  .replace(/<[^>]*>/g, '') // Remove HTML tags
                  .replace(/&nbsp;/g, ' ') // Replace &nbsp; with spaces
                  .replace(/\s+/g, ' ') // Normalize multiple spaces
                  .replace(/\n\s*\n/g, '\n\n') // Clean up extra newlines
                  .trim();
                navigator.clipboard.writeText(cleanBody);
                message.success('Email body copied to clipboard!');
              }}
            >
              📋 Copy Body
            </Button>
          </div>
          <Input.TextArea 
            value={body?.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()} 
            readOnly 
            autoSize={{ minRows: 12, maxRows: 20 }} 
          />
          <Alert type="info" showIcon message="Note" description="Sending is disabled here. Use the Email Composer page to send or schedule emails." />
        </div>
      ),
    },
    {
      key: "data",
      label: (
        <span>
          <RobotOutlined />
          Extracted Data
        </span>
      ),
      children: (
        <div className="space-y-4">
          {extractedData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(extractedData).map(([key, value]) => (
                value && (
                  <Card key={key} size="small" className="border-l-4 border-l-blue-500">
                    <div>
                      <Text strong className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</Text>
                      <div className="mt-1">
                        <Text>{value}</Text>
                      </div>
                    </div>
                  </Card>
                )
              ))}
            </div>
          ) : (
            <Alert
              message="No Data Extracted"
              description="Upload a document first to see extracted company information here."
              type="info"
              showIcon
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <Title level={2} className="text-gray-800">
          Document-Based Email Composer
        </Title>
        <Text type="secondary" className="text-lg">
          Upload your pitch deck or business document to automatically generate personalized investor outreach emails
        </Text>
      </div>

      <Card className="shadow-lg border-0">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
        />
      </Card>

      {/* Schedule Modal */}
      <Modal 
        open={scheduleModalOpen} 
        onCancel={() => setScheduleModalOpen(false)} 
        footer={null} 
        centered 
        title={null} 
        closable={false} 
        bodyStyle={{ padding: 0 }}
      >
        <div className="bg-gray-800 text-white rounded-lg p-5 w-full">
          <div className="grid grid-cols-2 gap-4">
            <button className="text-left bg-gray-700 hover:bg-gray-600 rounded-md p-4" onClick={() => {
              const d = tomorrowMorning(); 
              setScheduleType('scheduled'); 
              setScheduleDate(d); 
              const label = 'Tomorrow morning · 8:00 AM'; 
              setSelectedScheduleLabel(label); 
              setScheduleModalOpen(false);
            }}>
              <div className="text-orange-400 text-xl mb-1">⚙️</div>
              <div className="font-semibold">Tomorrow morning</div>
              <div className="text-gray-300 text-sm">{formatInIST(tomorrowMorning())}</div>
            </button>
            <button className="text-left bg-gray-700 hover:bg-gray-600 rounded-md p-4" onClick={() => {
              const d = tomorrowAfternoon(); 
              setScheduleType('scheduled'); 
              setScheduleDate(d); 
              const label = 'Tomorrow afternoon · 1:00 PM'; 
              setSelectedScheduleLabel(label); 
              setScheduleModalOpen(false);
            }}>
              <div className="text-orange-400 text-xl mb-1">⚙️</div>
              <div className="font-semibold">Tomorrow afternoon</div>
              <div className="text-gray-300 text-sm">{formatInIST(tomorrowAfternoon())}</div>
            </button>
            <button className="text-left bg-gray-700 hover:bg-gray-600 rounded-md p-4" onClick={() => {
              const d = nextMondayMorning(); 
              setScheduleType('scheduled'); 
              setScheduleDate(d); 
              const label = 'Monday morning · 8:00 AM'; 
              setSelectedScheduleLabel(label); 
              setScheduleModalOpen(false);
            }}>
              <div className="text-orange-400 text-xl mb-1">🧳</div>
              <div className="font-semibold">Monday morning</div>
              <div className="text-gray-300 text-sm">{formatInIST(nextMondayMorning())}</div>
            </button>
            <div className="bg-gray-700 rounded-md p-4">
              <div className="text-orange-400 text-xl mb-1">📅</div>
              <div className="font-semibold mb-2">Pick date & time</div>
              <div className="grid grid-cols-1 gap-3">
                <TimePicker 
                  className="w-full"
                  size="large"
                  style={{ width: '100%' }}
                  use12Hours 
                  format="h:mm A"
                  placeholder="Select time"
                  onChange={(v) => setCustomTime(v)}
                />
                <DatePicker 
                  className="w-full"
                  size="large"
                  style={{ width: '100%' }}
                  format="DD MMM, YYYY"
                  placeholder="Select date"
                  onChange={(v) => setCustomDate(v ? new Date(v as any) : null)}
                />
              </div>
              <div className="flex justify-end mt-3">
                <Button 
                  type="primary" 
                  disabled={!customDate || !customTime} 
                  onClick={() => {
                    if (!customDate || !customTime) return;
                    const d = new Date(customDate);
                    const hours = customTime.hour();
                    const minutes = customTime.minute();
                    d.setHours(hours, minutes, 0, 0);
                    setScheduleType('scheduled'); 
                    setScheduleDate(d);
                    const label = `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}, ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
                    setSelectedScheduleLabel(label);
                    setScheduleModalOpen(false);
                  }} 
                  className="bg-blue-600 hover:bg-blue-700 border-blue-600 text-white"
                >
                  OK
                </Button>
              </div>
            </div>
          </div>
          <div className="text-center text-gray-300 text-xs mt-4">All times are in India Standard Time</div>
          <div className="flex justify-center mt-3">
            <Button 
              onClick={() => setScheduleModalOpen(false)} 
              className="bg-red-600 hover:bg-red-700 text-white border-red-600"
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}