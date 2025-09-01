"use client";

import React, { useState } from "react";
import { Select, Input, Button, message, Card, Tabs, Progress, Tag, Switch } from "antd";
import { RobotOutlined, SendOutlined, BulbOutlined, ThunderboltOutlined } from "@ant-design/icons";

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL as string) || "/api";

type SubjectOption = { subject: string; rationale?: string; predictedOpenRate?: number };
type EnhanceOption = { style: string; subject: string; body: string; score?: number; improvements?: string[] };

export default function EmailComposer() {
  const [sender, setSender] = useState("");
  const [recipients, setRecipients] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [tone, setTone] = useState("Professional");
  const [loading, setLoading] = useState(false);
  const [subjectOptions, setSubjectOptions] = useState<SubjectOption[]>([]);
  const [enhanceOptions, setEnhanceOptions] = useState<EnhanceOption[]>([]);
  const [enableFollowUp, setEnableFollowUp] = useState(false);
  const [activeTab, setActiveTab] = useState("compose");

  const optimizeSubject = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/ai/optimize-subject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: body || subject, tone }),
      });
      if (!res.ok) throw new Error("Failed to optimize subject");
      const json = await res.json();
      setSubjectOptions(json.options || []);
      message.success("Subject lines optimized!");
    } catch (e: any) {
      message.error(e.message || "Subject optimization failed");
    } finally {
      setLoading(false);
    }
  };

  const enhanceEmail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/ai/enhance-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalEmail: { subject, body } }),
      });
      if (!res.ok) throw new Error("Failed to enhance email");
      const json = await res.json();
      setEnhanceOptions(json.data?.options || []);
      message.success("Email enhanced with AI!");
    } catch (e: any) {
      message.error(e.message || "Enhancement failed");
    } finally {
      setLoading(false);
    }
  };

  const generateFollowUp = async () => {
    if (!subject || !body) {
      message.warning("Please write your initial email first");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/ai/generate-followup-sequence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          initialEmail: { subject, body },
          companyProfile: { sector: "tech", stage: "seed" },
          sequenceType: "standard"
        }),
      });
      if (!res.ok) throw new Error("Failed to generate sequence");
      const json = await res.json();
      message.success("Follow-up sequence generated!");
    } catch (e: any) {
      message.error(e.message || "Sequence generation failed");
    } finally {
      setLoading(false);
    }
  };

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
      const res = await fetch(`${BACKEND_URL}/email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          content: body,
          recipients: to,
          sender: sender || undefined,
          subject,
          type: "ai",
          enableFollowUp
        }),
      });
      if (!res.ok) throw new Error("Failed to send email");
      message.success(`Emails queued for ${to.length} recipients!`);
    } catch (e: any) {
      message.error(e.message || "Send failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
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

          <Input 
            placeholder="Recipients (comma separated emails)" 
            value={recipients} 
            onChange={(e) => setRecipients(e.target.value)} 
          />
          
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
              onClick={optimizeSubject} 
              loading={loading} 
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
                onClick={enhanceEmail} 
                loading={loading} 
                icon={<RobotOutlined />}
                type="dashed"
              >
                AI Enhance
              </Button>
              <Button 
                onClick={generateFollowUp} 
                loading={loading} 
                icon={<ThunderboltOutlined />}
                type="dashed"
              >
                Generate Follow-ups
              </Button>
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
              >
                Send Campaign
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* AI Suggestions */}
      {subjectOptions.length > 0 && (
        <Card title="AI Subject Line Suggestions" className="border-l-4 border-l-green-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjectOptions.map((opt, idx) => (
              <div 
                key={idx} 
                className="p-4 rounded-lg border-2 border-gray-200 hover:border-green-400 cursor-pointer transition-all duration-200 hover:shadow-md" 
                onClick={() => setSubject(opt.subject)}
              >
                <div className="font-medium text-gray-800 mb-2">{opt.subject}</div>
                {opt.predictedOpenRate && (
                  <div className="flex items-center gap-2 mb-2">
                    <Progress 
                      percent={opt.predictedOpenRate} 
                      size="small" 
                      strokeColor="#52c41a"
                      showInfo={false}
                    />
                    <span className="text-xs text-green-600 font-medium">{opt.predictedOpenRate}% open rate</span>
                  </div>
                )}
                {opt.rationale && (
                  <div className="text-xs text-gray-500">{opt.rationale}</div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Enhanced Email Options */}
      {enhanceOptions.length > 0 && (
        <Card title="AI-Enhanced Email Variants" className="border-l-4 border-l-purple-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {enhanceOptions.map((opt, idx) => (
              <div 
                key={idx} 
                className="p-4 rounded-lg border-2 border-gray-200 hover:border-purple-400 cursor-pointer transition-all duration-200 hover:shadow-md" 
                onClick={() => { setSubject(opt.subject); setBody(opt.body); }}
              >
                <div className="flex items-center justify-between mb-3">
                  <Tag color="purple">{opt.style}</Tag>
                  {opt.score && (
                    <div className="flex items-center gap-1">
                      <Progress 
                        type="circle" 
                        percent={opt.score} 
                        size={24} 
                        strokeColor="#722ed1"
                      />
                    </div>
                  )}
                </div>
                
                <div className="font-medium text-gray-800 mb-2 text-sm">{opt.subject}</div>
                <div className="text-xs text-gray-600 line-clamp-4 mb-3">{opt.body}</div>
                
                {opt.improvements && (
                  <div className="space-y-1">
                    {opt.improvements.slice(0, 2).map((improvement, i) => (
                      <div key={i} className="text-xs text-green-600 flex items-center gap-1">
                        <span className="text-green-500">✓</span>
                        {improvement}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

 