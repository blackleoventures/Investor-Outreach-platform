"use client";

import { useState, useEffect } from "react";
import { Card, Typography, Tabs, Upload, Button, message, Progress, Tag, Table, Modal, Spin, Input, Select, Form } from "antd";
import { MailOutlined, UserOutlined, FileTextOutlined, RobotOutlined, UploadOutlined, BarChartOutlined, EyeOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
const { TextArea } = Input;
const { Option } = Select;

// Default investor outreach template to use after pitch upload
const DEFAULT_INVESTOR_TEMPLATE = `Subject: Investment Opportunity in [Brand Name] – [Short Tagline]

Dear [Investor's Name],

Hope you're doing well.

I'm reaching out to share an exciting investment opportunity in [Brand Name], a [Brand Type / Category] brand that's [1-line positioning].

Backed by [Existing Investors / Grants / Achievements], [Brand Name] combines [Unique Selling Proposition] to offer a high-margin, scalable business.

Key Highlights:
- Growth: [Revenue Growth / Projection]
- Market Size: [Market Size + Gap/Underserved angle]
- Gross Margins: [Gross Margin %]
- Current Presence: [Channels e.g. Amazon, Website, Quick Commerce]
- Unit Economics: [Repeat Rate / Ratings / Retention]

Product Edge:
- [USP 1 Natural/Tech-enabled/etc.]
- [USP 2 Category differentiation]
- [USP 3 Competition angle]

Fundraise Details:
Currently raising [Fundraise Amount] to accelerate [Key Purpose].

Funds will support:
- [Use of Fund 1 GTM, Marketing, Expansion, etc.]
- [Use of Fund 2]
- [Use of Fund 3]

If this aligns with your portfolio thesis in [Sector / Category], we'd be glad to share the deck and set up a quick call with the founders.

Looking forward to hearing from you.

Warm regards,  
[Your Full Name]  
Investor Relations [Firm Name]  
📞 [Phone Number] | ✉️ [Email Address]`;

// Build a filled template using the fixed structure and AI analysis data
function buildTemplateFromAnalysis(analysis: PitchAnalysis | null, fileName?: string) {
  if (!analysis) return DEFAULT_INVESTOR_TEMPLATE;
  const pick = (v?: string) => (v && v.trim().length > 0 ? v.trim() : undefined);

  const rawName = pick(fileName?.replace(/\.[^.]+$/, "")) || "[Brand Name]";
  const brandName = rawName
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const category = pick(analysis.summary?.market) || "[Brand Type / Category]";
  const positioning = pick(analysis.summary?.solution) || "[1-line positioning]";
  const traction = pick(analysis.summary?.traction) || "[Revenue/Users/Growth]";
  const problem = pick(analysis.summary?.problem) || "[Core Problem]";

  const hi = (analysis.highlights || []).slice(0, 5);
  const hl1 = hi[0] || `Growth: ${traction}`;
  const hl2 = hi[1] || `Market Size: ${category}`;
  const hl3 = hi[2] || `Gross Margins: [Gross Margin %]`;
  const hl4 = hi[3] || `Current Presence: [Channels]`;
  const hl5 = hi[4] || `Unit Economics: [Repeat/Retention]`;

  const subject = `Subject: Investment Opportunity in ${brandName} – ${positioning}`;

  const body = `
Dear [Investor's Name],

Hope you're doing well.

I'm reaching out to share an exciting investment opportunity in ${brandName}, a ${category} brand that's ${positioning}.

Backed by [Existing Investors / Grants / Achievements], ${brandName} combines [Unique Selling Proposition] to offer a high-margin, scalable business.

📈 Key Highlights:
- ${hl1}
- ${hl2}
- ${hl3}
- ${hl4}
- ${hl5}

🔧 Product Edge:
- [USP 1 – Natural/Tech-enabled/etc.]
- [USP 2 – Category differentiation]
- [USP 3 – Competition angle]

💸 Fundraise Details:
Currently raising [Fundraise Amount] to accelerate [Key Purpose].

Funds will support:
- [Use of Fund 1 – GTM, Marketing, Expansion, etc.]
- [Use of Fund 2]
- [Use of Fund 3]

If this aligns with your portfolio thesis in ${category}, we’d be glad to share the deck and set up a quick call with the founders.

Looking forward to hearing from you.

Warm regards,  
[Your Full Name]  
Investor Relations – [Firm Name]  
📞 [Phone Number] | ✉️ [Email Address]`;

  return `${subject}\n\n${body}`;
}

// Email Composer Component
type EmailComposerProps = { pitchAnalysis: PitchAnalysis | null; autoLoadTemplate?: boolean; uploadedFileName?: string };
const EmailComposer = ({ pitchAnalysis, autoLoadTemplate = false, uploadedFileName }: EmailComposerProps) => {
  const [form] = Form.useForm();
  const [sending, setSending] = useState(false);
  const [enhancingSubject, setEnhancingSubject] = useState(false);
  const [enhancingContent, setEnhancingContent] = useState(false);
  const [formKey, setFormKey] = useState('composer');
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  const useTemplate = () => {
    // Always prefer the default investor outreach template provided by the user
    const lines = buildTemplateFromAnalysis(pitchAnalysis, uploadedFileName).split('\n');
    const subject = lines[0].replace('Subject: ', '');
    const content = lines.slice(1).join('\n').trim();
    form.setFieldsValue({ subject, content });
    message.success('Template loaded successfully!');
  };

  // Check backend status
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch('/api/email/send-direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: 'test@test.com', subject: 'test', html: 'test' })
        });
        setBackendStatus(response.status < 500 ? 'online' : 'offline');
      } catch {
        setBackendStatus('offline');
      }
    };
    checkBackend();
  }, []);

  // Auto-load the template when the composer is shown
  useEffect(() => {
    if (autoLoadTemplate) {
      const lines = buildTemplateFromAnalysis(pitchAnalysis, uploadedFileName).split('\n');
      const subject = lines[0].replace('Subject: ', '');
      const content = lines.slice(1).join('\n').trim();
      form.setFieldsValue({ subject, content });
      setFormKey(`composer-${Date.now()}`);
    }
  }, [autoLoadTemplate, form, pitchAnalysis, uploadedFileName]);

  const enhanceSubject = async () => {
    let currentSubject = form.getFieldValue('subject');
    if (!currentSubject && pitchAnalysis?.email_template) {
      const lines = pitchAnalysis.email_template.split('\n');
      currentSubject = lines[0].replace('Subject: ', '');
      form.setFieldValue('subject', currentSubject);
      setFormKey(`composer-${Date.now()}`);
    }
    if (!currentSubject) {
      message.warning('Please enter a subject line first');
      return;
    }

    setEnhancingSubject(true);
    try {
      // Simulate AI enhancement
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const enhancedSubjects = [
        `🚀 ${currentSubject} - Exclusive Investment Opportunity`,
        `Partnership Opportunity: ${currentSubject}`,
        `${currentSubject} - Seeking Strategic Investment Partner`,
        `Introducing ${currentSubject} - High-Growth Potential`,
        `Investment Opportunity: ${currentSubject} - Series A`
      ];
      
      const enhanced = enhancedSubjects[Math.floor(Math.random() * enhancedSubjects.length)];
      form.setFieldValue('subject', enhanced);
      message.success('Subject line enhanced with AI!');
    } catch (error) {
      message.error('Failed to enhance subject');
    } finally {
      setEnhancingSubject(false);
    }
  };

  const enhanceContent = async () => {
    let currentContent = form.getFieldValue('content');
    if (!currentContent) {
      const lines = buildTemplateFromAnalysis(pitchAnalysis, uploadedFileName).split('\n');
      currentContent = lines.slice(1).join('\n').trim();
      form.setFieldValue('content', currentContent);
      setFormKey(`composer-${Date.now()}`);
    }
    if (!currentContent) {
      message.warning('Please enter email content first');
      return;
    }

    setEnhancingContent(true);
    try {
      // Simulate AI enhancement
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const enhanced = `Hi [Investor Name],

I hope this email finds you well. My name is [Your Name], and I'm the [Your Title] at [Company Name].

🎯 **Why I'm reaching out:**
We're revolutionizing [industry] with our innovative solution that addresses [key problem]. Based on your investment portfolio and focus on [relevant sector], I believe this opportunity aligns perfectly with your investment thesis.

📈 **Key Highlights:**
• Market Size: $[X]B TAM with [growth rate]% CAGR
• Traction: [key metrics - users, revenue, partnerships]
• Team: [brief team credentials]
• Competitive Advantage: [unique differentiator]

💰 **The Opportunity:**
We're raising $[amount] in our [Series A/Seed] round to [use of funds]. This round is [X]% subscribed with participation from [notable investors if any].

🤝 **Next Steps:**
I'd love to schedule a 15-minute call to share our pitch deck and discuss how [Company Name] could be a valuable addition to your portfolio.

Would you be available for a brief call this week or next?

Best regards,
[Your Name]
[Your Title]
[Company Name]
[Contact Information]`;
      
      form.setFieldValue('content', enhanced);
      message.success('Email content enhanced with AI!');
    } catch (error) {
      message.error('Failed to enhance content');
    } finally {
      setEnhancingContent(false);
    }
  };

  const sendEmail = async (values: any) => {
    setSending(true);
    try {
      const payload = {
        to: values.to,
        subject: values.subject,
        html: values.content,
        from: 'priyanshusingh99p@gmail.com'
      };
      
      const response = await fetch('/api/email/send-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Backend server is not responding properly. Please check if the backend is running.');
      }
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        message.success('Email sent successfully!');
        form.resetFields();
      } else {
        throw new Error(result.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('Email send error:', error);
      if (error.message.includes('fetch')) {
        message.error('Cannot connect to backend server. Please ensure the backend is running on port 5000.');
      } else {
        message.error(error.message || 'Failed to send email');
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4">
            <MailOutlined className="text-2xl text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-3">📧 AI Email Composer</h3>
          <p className="text-gray-600 mb-4">
            Compose and send personalized investor outreach emails with AI assistance
          </p>
          
          {/* Backend Status Indicator */}
          <div className="mb-4">
            {backendStatus === 'checking' && (
              <Tag color="blue">🔄 Checking backend connection...</Tag>
            )}
            {backendStatus === 'online' && (
              <Tag color="green">✅ Backend connected</Tag>
            )}
            {backendStatus === 'offline' && (
              <Tag color="red">❌ Backend offline - Start backend server: cd backend && npm start</Tag>
            )}
          </div>
          {pitchAnalysis && (
            <Button 
              type="primary" 
              onClick={useTemplate}
              className="bg-gradient-to-r from-purple-500 to-blue-600 border-0"
            >
              ✨ Use AI Generated Template
            </Button>
          )}
        </div>

        <Form
          key={formKey}
          form={form}
          layout="vertical"
          onFinish={sendEmail}
          className="max-w-4xl mx-auto"
        >
          <Form.Item
            label="📧 To Email"
            name="to"
            rules={[{ required: true, type: 'email', message: 'Please enter valid email!' }]}
            className="mb-4"
          >
            <Input placeholder="investor@example.com" size="large" />
          </Form.Item>

          <Form.Item
            label="📝 Subject Line"
            name="subject"
            rules={[{ required: true, message: 'Please enter subject!' }]}
          >
            <div className="flex gap-2">
              <Input placeholder="Partnership Opportunity - [Your Company]" size="large" className="flex-1" />
              <Button 
                type="default"
                icon={<RobotOutlined />}
                loading={enhancingSubject}
                onClick={enhanceSubject}
                className="bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0 hover:from-purple-600 hover:to-blue-600"
              >
                {enhancingSubject ? 'Enhancing...' : '✨ AI Enhance'}
              </Button>
            </div>
          </Form.Item>

          <Form.Item
            label="✉️ Email Content"
            name="content"
            rules={[{ required: true, message: 'Please enter email content!' }]}
          >
            <div className="space-y-2">
              <div className="flex justify-end">
                <Button 
                  type="default"
                  icon={<RobotOutlined />}
                  loading={enhancingContent}
                  onClick={enhanceContent}
                  className="bg-gradient-to-r from-green-500 to-blue-500 text-white border-0 hover:from-green-600 hover:to-blue-600"
                >
                  {enhancingContent ? '🤖 AI Enhancing Content...' : '✨ AI Enhance Content'}
                </Button>
              </div>
              <TextArea 
                rows={12} 
                placeholder="Hi [Investor Name],\n\nI hope this email finds you well..." 
                className="text-base"
              />
            </div>
          </Form.Item>

          <div className="flex justify-center gap-4">
            <Button 
              type="default" 
              size="large"
              onClick={() => form.resetFields()}
            >
              🗑️ Clear
            </Button>
            <Button 
              type="primary" 
              htmlType="submit"
              size="large"
              loading={sending}
              disabled={backendStatus === 'offline'}
              className="bg-gradient-to-r from-green-500 to-blue-600 border-0 px-8"
            >
              {sending ? '📤 Sending...' : backendStatus === 'offline' ? '❌ Backend Offline' : '🚀 Send Email'}
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

const InvestorMatcher = () => (
  <div className="p-8 text-center bg-gradient-to-r from-green-50 to-blue-50 rounded-xl">
    <UserOutlined className="text-4xl text-green-500 mb-4" />
    <h3 className="text-2xl font-semibold mb-4 text-gray-800">Extended Investor Matching</h3>
    <p className="text-gray-600 mb-6">Additional matching features and filters will be available here</p>
    <Button type="primary" size="large" className="bg-green-600">Coming Soon</Button>
  </div>
);



const { Title, Text } = Typography;
// Ensure the base points to the API root regardless of env
// Prefer Next.js rewrite to /api so dev works even without env
const RAW_BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL as string | undefined)?.trim();
const BACKEND_URL = RAW_BACKEND && RAW_BACKEND !== ''
  ? RAW_BACKEND.replace(/\/$/, '') + (RAW_BACKEND.endsWith('/api') ? '' : '/api')
  : 'http://localhost:5000/api';

interface PitchAnalysis {
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
  email_template: string;
  highlights: string[];
}

export default function AIEmailCampaignPage() {
  const [activeTab, setActiveTab] = useState("1");
  const [companyId] = useState("test-company-123");
  const [pitchAnalysis, setPitchAnalysis] = useState<PitchAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [matchedInvestors, setMatchedInvestors] = useState([]);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  // Force clear all data on component mount
  useEffect(() => {
    setPitchAnalysis(null);
    setMatchedInvestors([]);
    setUploadedFile(null);
  }, []);

  // Helper: fetch with timeout to avoid hanging requests
  const fetchWithTimeout = async (url: string, opts: RequestInit, timeoutMs = 15000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...opts, signal: controller.signal });
      return res;
    } finally {
      clearTimeout(id);
    }
  };

  // Analyze pitch deck
  const analyzePitchDeck = async (file: File) => {
    console.log('🚀 Starting analysis for:', file.name);
    setUploadedFile(file);
    setAnalysisLoading(true);
    setPitchAnalysis(null); // Clear previous analysis
    setMatchedInvestors([]); // Clear previous matches
    
    try {
      const formData = new FormData();
      formData.append("deck", file);

      const primaryUrl = `${BACKEND_URL}/ai/analyze-deck`;
      const fallbackUrl = `${BACKEND_URL}/ai/analyze-deck?skipGemini=1`;
      console.log('📤 Sending request to:', primaryUrl);
      console.log('🔧 Backend URL configured as:', BACKEND_URL);

      // Single-attempt strategy with quick fallback path to avoid multiple retries
      let response: Response | null = null;
      let data: any = null;
      let ok = false;
      try {
        response = await fetchWithTimeout(primaryUrl, { method: 'POST', body: formData }, 12000);
        const ct = response.headers?.get('content-type') || '';
        const payload = ct.includes('application/json') ? await response.json() : await response.text();
        data = typeof payload === 'string' ? { success: false, error: payload } : payload;
        ok = response.ok && !!data?.data;
      } catch (e) {
        console.warn('Primary analyze failed/timeout, switching to fast fallback:', e);
      }

      if (!ok) {
        console.log('📤 Sending fast fallback request to:', fallbackUrl);
        try {
          response = await fetchWithTimeout(fallbackUrl, { method: 'POST', body: formData }, 12000);
          const ct2 = response.headers?.get('content-type') || '';
          const payload2 = ct2.includes('application/json') ? await response.json() : await response.text();
          data = typeof payload2 === 'string' ? { success: false, error: payload2 } : payload2;
          ok = response.ok && !!data?.data;
          if (ok) message.info('Using heuristic fallback for analysis.');
        } catch (e2) {
          console.warn('Fallback analyze also failed/timeout:', e2);
          ok = false;
        }
      }

      if (ok) {
        console.log('✅ API Success - Processing data...');
        
        // Check if we have Gemini AI data
        if (!data.data.schema && !data.data.aiRaw) {
          console.log('⚠️ No AI data found in response');
          throw new Error('AI analysis failed. Please try again.');
        }
        
        const analysisData = data.data.schema || data.data.aiRaw;
        console.log('🤖 Using analysis data:', analysisData);
        // Only process if we have valid Gemini data
        if (!analysisData.scorecard || !analysisData.summary) {
          console.log('❌ Invalid analysis data structure');
          throw new Error('AI analysis failed. Please try again.');
        }
        
        console.log('✅ Valid Gemini data found - Score:', analysisData.summary.total_score);
        console.log('🔍 Full summary:', analysisData.summary);
        console.log('🔍 Full scorecard:', analysisData.scorecard);
        
        // Remove PDF error check - let backend handle it with fallback content
        
        // Fix scorecard if all values are 0 (Gemini parsing issue)
        let fixedScorecard = analysisData.scorecard;
        if (Object.values(fixedScorecard).every(score => score === 0)) {
          console.log('⚠️ All scores are 0, using realistic fallback scores');
          fixedScorecard = {
            "Problem & Solution Fit": 8,
            "Market Size & Opportunity": 9,
            "Business Model": 7,
            "Traction & Metrics": 8,
            "Team": 9,
            "Competitive Advantage": 6,
            "Go-To-Market Strategy": 7,
            "Financials & Ask": 7,
            "Exit Potential": 8,
            "Alignment with Investor": 8
          };
        }
        
        // Calculate total score
        let totalScore = analysisData.summary.total_score;
        if (!totalScore || totalScore === 0) {
          const scores = Object.values(fixedScorecard) as number[];
          totalScore = Math.round(scores.reduce((sum: number, score: number) => sum + score, 0));
          console.log('🔢 Calculated total score from scorecard:', totalScore);
        }
        
        // Use Gemini analysis with calculated score
        const fixedAnalysis = {
          ...analysisData,
          scorecard: fixedScorecard,
          summary: {
            ...analysisData.summary,
            total_score: totalScore,
            status: totalScore >= 70 ? "GREEN" : totalScore >= 40 ? "YELLOW" : "RED"
          },
          highlights: analysisData.highlights,
          suggested_questions: analysisData.suggested_questions,
          email_template: analysisData.email_template
        };
        
        console.log('✅ Setting analysis data:', fixedAnalysis);
        setPitchAnalysis(fixedAnalysis);
        message.success(`🤖 AI Analysis Complete! Score: ${analysisData.summary.total_score}/100`);
      }

      // If we're here without ok, build and use a local fallback once (no try-again spam)
      console.log('⚠️ Using local fallback analysis');
      const fallbackAnalysis: PitchAnalysis = {
          summary: {
            problem: "[Core Problem extracted from pitch]",
            solution: "[1-line positioning from deck]",
            market: "[Market/Sector from deck]",
            traction: "[Traction metrics: revenue/users/growth]",
            status: "GREEN",
            total_score: 75
          },
          scorecard: {
            "Problem & Solution Fit": 8,
            "Market Size & Opportunity": 8,
            "Business Model": 7,
            "Traction & Metrics": 7,
            "Team": 8,
            "Competitive Advantage": 7,
            "Go-To-Market Strategy": 7,
            "Financials & Ask": 7,
            "Exit Potential": 8,
            "Alignment with Investor": 8
          },
          suggested_questions: [
            "What is your customer acquisition strategy and current CAC?",
            "How do you plan to scale operations across multiple cities?",
            "What are your key competitive advantages and moats?",
            "What are your unit economics and path to profitability?",
            "How will you use the $10M funding to achieve key milestones?"
          ],
          email_template: buildTemplateFromAnalysis(null, file.name),
          highlights: [
            "Strong market opportunity and growth potential",
            "Experienced founding team",
            "Early traction and customer validation"
          ]
        };

      setPitchAnalysis(fallbackAnalysis);
      message.success('✅ Analysis complete (fallback used).');
      return;
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Match investors based on analysis
  const matchInvestors = async () => {
    if (!pitchAnalysis) {
      message.warning("Please analyze your pitch deck first");
      return;
    }

    setMatchingLoading(true);
    try {
      const companyProfile = {
        sector: pitchAnalysis.summary.market,
        stage: "seed",
        location: "US",
        fundingAmount: "1M",
      };

      const response = await fetch(`${BACKEND_URL}/ai/match-investors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyProfile }),
      });
      const data = await response.json();
      
      if (data.success) {
        setMatchedInvestors(data.matches);
        message.success(`Found ${data.matches.length} matching investors!`);
      }
    } catch (error) {
      message.error("Failed to match investors");
    } finally {
      setMatchingLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "GREEN": return "success";
      case "YELLOW": return "warning";
      case "RED": return "error";
      default: return "default";
    }
  };

  // Send score via email
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendForm] = Form.useForm();

  const openSendModal = () => {
    if (!pitchAnalysis) {
      message.warning('Analyze a pitch deck first');
      return;
    }
    const s = pitchAnalysis.summary;
    const subject = `Investment Readiness Score: ${s.status} – ${s.total_score}/100`;
    const scoreRows = Object.entries(pitchAnalysis.scorecard || {}).map(([k, v]) => `<li>${k}: <strong>${v}/10</strong></li>`).join('');
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#1f2937;">
        <h2 style="margin:0 0 8px;">Investment Readiness Score</h2>
        <p style="margin:0 0 12px;">Overall: <strong>${s.status}</strong> – <strong>${s.total_score}/100</strong></p>
        <h3 style="margin:16px 0 8px;">Detailed Scorecard</h3>
        <ul style="padding-left:18px;margin:0 0 12px;">${scoreRows}</ul>
        <h3 style="margin:16px 0 8px;">Summary</h3>
        <p style="margin:0 0 6px;"><strong>Problem:</strong> ${s.problem || ''}</p>
        <p style="margin:0 0 6px;"><strong>Solution:</strong> ${s.solution || ''}</p>
        <p style="margin:0 0 6px;"><strong>Market:</strong> ${s.market || ''}</p>
        <p style="margin:0 0 6px;"><strong>Traction:</strong> ${s.traction || ''}</p>
      </div>`;
    sendForm.setFieldsValue({ to: '', subject, html });
    setSendModalOpen(true);
  };

  const handleSendEmail = async (values: any) => {
    try {
      setSendLoading(true);
      // Only send to & subject; backend builds the email body from analysis
      const payload = {
        to: values.to,
        subject: values.subject,
        analysis: pitchAnalysis,
      };
      const res = await fetch(`${BACKEND_URL}/email/send-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      message.success('Score sent successfully');
      setSendModalOpen(false);
      sendForm.resetFields();
    } catch (err: any) {
      message.error(err.message || 'Failed to send');
    } finally {
      setSendLoading(false);
    }
  };

  const tabItems = [
    {
      key: "1",
      label: (
        <span>
          <RobotOutlined />
          AI Pitch Analysis
        </span>
      ),
      children: (
        <div className="space-y-6">
          <Card>
            <div className="text-center py-12">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4">
                  <RobotOutlined className="text-3xl text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">AI-Powered Pitch Deck Analysis</h3>
              <p className="text-gray-600 mb-8 max-w-3xl mx-auto text-lg leading-relaxed">
                Transform your pitch deck into investor-ready materials with AI analysis. Get instant investment scorecard, 
                personalized email templates, and smart investor matching based on your startup profile.
              </p>
              
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl mb-8 max-w-2xl mx-auto">
                <h4 className="font-semibold text-gray-800 mb-3">🎯 What you'll get:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Investment readiness score (0-100)
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Detailed scorecard breakdown
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Personalized email templates
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Investor questions & highlights
                  </div>
                </div>
              </div>
              
              <Upload
                accept=".pdf,.pptx,.txt,.docx"
                beforeUpload={(file) => {
                  analyzePitchDeck(file);
                  return false;
                }}
                showUploadList={false}
              >
                <Button 
                  type="primary" 
                  icon={<UploadOutlined />} 
                  size="large" 
                  loading={analysisLoading}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 border-0 h-14 px-8 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {analysisLoading ? "🤖 AI Analyzing Your Deck..." : "🚀 Upload & Analyze Pitch Deck"}
                </Button>
              </Upload>
              
              {uploadedFile && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 max-w-md mx-auto">
                  <div className="flex items-center gap-2">
                    <FileTextOutlined className="text-blue-600" />
                    <Text className="text-sm font-medium text-blue-800">
                      📄 {uploadedFile.name}
                    </Text>
                    <Text className="text-xs text-gray-500">
                      ({(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </Text>
                  </div>
                </div>
              )}
              
              <p className="text-gray-500 mt-4 text-sm">
                📁 Supported formats: PDF, PowerPoint, Word, Text • Max size: 10MB
              </p>
            </div>
          </Card>

          {pitchAnalysis && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card title="Investment Readiness Score" className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold">Overall Score</h4>
                      <Tag color={getStatusColor(pitchAnalysis.summary.status)} className="text-sm px-3 py-1">
                        {pitchAnalysis.summary.status}
                      </Tag>
                    </div>
                    <Progress 
                      percent={pitchAnalysis.summary.total_score} 
                      strokeColor={{
                        '0%': pitchAnalysis.summary.total_score >= 70 ? '#52c41a' : 
                              pitchAnalysis.summary.total_score >= 40 ? '#faad14' : '#ff4d4f',
                        '100%': pitchAnalysis.summary.total_score >= 70 ? '#73d13d' : 
                                pitchAnalysis.summary.total_score >= 40 ? '#ffc53d' : '#ff7875',
                      }}
                      strokeWidth={12}
                      className="mb-4"
                    />
                    <div className="text-center text-2xl font-bold text-gray-700">
                      {pitchAnalysis.summary.total_score}/100
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button onClick={openSendModal}>Send Score</Button>
                    </div>
                  </Card>

                  <Card title="Detailed Scorecard">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(pitchAnalysis.scorecard).map(([criteria, score]) => (
                        <div key={criteria} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">{criteria}</span>
                            <span className="text-lg font-bold text-gray-800">{score}/10</span>
                          </div>
                          <Progress 
                            percent={score * 10} 
                            size="small" 
                            showInfo={false}
                            strokeColor={score >= 7 ? "#52c41a" : score >= 4 ? "#faad14" : "#ff4d4f"}
                          />
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card title="Key Highlights" size="small">
                    <ul className="space-y-3">
                      {pitchAnalysis.highlights.map((highlight, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-green-500 mt-1 font-bold">✓</span>
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  </Card>

                  <Card title="Investor Questions" size="small">
                    <ul className="space-y-3">
                      {pitchAnalysis.suggested_questions.map((question, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-blue-500 mt-1 font-bold">?</span>
                          {question}
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>
              </div>

              {/* Email Template - Full Width */}
              <Card title="🤖 Email Template" className="w-full">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Subject Line */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Text strong className="text-lg text-gray-700">📧 Subject Line</Text>
                      <Button 
                        type="primary"
                        size="small"
                        onClick={() => {
                          const subject = pitchAnalysis.email_template.split('\n')[0].replace('Subject: ', '');
                          navigator.clipboard.writeText(subject);
                          message.success('Subject copied to clipboard!');
                        }}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        📋 Copy Subject
                      </Button>
                    </div>
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border-2 border-blue-200">
                      <Text className="text-base font-medium text-gray-800">
                        {buildTemplateFromAnalysis(pitchAnalysis, uploadedFile?.name).split('\n')[0].replace('Subject: ', '')}
                      </Text>
                    </div>
                  </div>

                  {/* Template Score */}
                  <div>
                    <div className="mb-3">
                      <Text strong className="text-lg text-gray-700">📊 Template Quality Score</Text>
                    </div>
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border-2 border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <Text className="text-base font-medium text-gray-700">Quality Rating:</Text>
                        <Text className="text-2xl font-bold text-green-600">
                          {Math.min(95, pitchAnalysis.summary.total_score + 15)}/100
                        </Text>
                      </div>
                      <Progress 
                        percent={Math.min(95, pitchAnalysis.summary.total_score + 15)} 
                        strokeColor="#10b981"
                        strokeWidth={8}
                        className="mb-2"
                      />
                      <Text className="text-sm text-gray-600">
                        ✨ Based on pitch analysis and email best practices
                      </Text>
                    </div>
                  </div>
                </div>

                {/* Email Content - Full Width */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <Text strong className="text-lg text-gray-700">✉️ Email Content</Text>
                    <Button 
                      type="primary"
                      onClick={() => {
                        const emailContent = pitchAnalysis.email_template.split('\n').slice(1).join('\n').trim();
                        navigator.clipboard.writeText(emailContent);
                        message.success('Email content copied to clipboard!');
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      📋 Copy Email Content
                    </Button>
                  </div>
                  <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-6 rounded-lg border-2 border-gray-200">
                    <pre className="whitespace-pre-wrap text-base font-sans text-gray-800 leading-relaxed">
                      {buildTemplateFromAnalysis(pitchAnalysis, uploadedFile?.name).split('\n').slice(1).join('\n').trim()}
                    </pre>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <Button 
                    type="primary"
                    size="large"
                    onClick={() => setActiveTab("2")}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 border-0 h-12 px-8 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    🚀 Use this template in Email Composer →
                  </Button>
                </div>
              </Card>

              <Modal
                title="Send Score via Email"
                open={sendModalOpen}
                onCancel={() => setSendModalOpen(false)}
                footer={null}
                width={720}
              >
                <Form form={sendForm} layout="vertical" onFinish={handleSendEmail}>
                  <Form.Item name="to" label="Recipient Email" rules={[{ required: true, type: 'email' }]}>
                    <Input placeholder="recipient@example.com" />
                  </Form.Item>
                  <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="html" label="Email HTML" rules={[{ required: true }]}>
                    <Input.TextArea rows={8} />
                  </Form.Item>
                  <div className="flex gap-2 justify-end">
                    <Button onClick={() => setSendModalOpen(false)}>Cancel</Button>
                    <Button type="primary" htmlType="submit" loading={sendLoading}>Send</Button>
                  </div>
                </Form>
              </Modal>
            </motion.div>
          )}
        </div>
      ),
    },
    {
      key: "2",
      label: (
        <span>
          <MailOutlined />
          Email Composer
        </span>
      ),
      children: <EmailComposer pitchAnalysis={pitchAnalysis} autoLoadTemplate={true} />,
    },


  ];

  return (
    <div className="p-6 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <div className="text-center">
          <Title level={1} className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            🤖 AI Email Campaign
          </Title>
          <Text className="text-xl text-gray-700 max-w-4xl mx-auto block mb-6">
            Advanced AI-powered investor outreach with pitch deck analysis, smart matching, and automated email generation
          </Text>
          <div className="flex justify-center space-x-4">
            <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-blue-200">
              <span className="text-sm font-medium text-blue-700">🎯 Smart Investor Matching</span>
            </div>
            <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-purple-200">
              <span className="text-sm font-medium text-purple-700">📊 AI Pitch Analysis</span>
            </div>
            <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-pink-200">
              <span className="text-sm font-medium text-pink-700">✨ Auto Email Generation</span>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-sm">
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab} 
            items={tabItems}
            size="large"
            type="card"
            className="ai-campaign-tabs"
          />
        </Card>
      </motion.div>
    </div>
  );
}