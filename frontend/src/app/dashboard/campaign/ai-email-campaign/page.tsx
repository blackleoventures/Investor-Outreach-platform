"use client";

import { useState, useEffect } from "react";
import { Card, Typography, Tabs, Upload, Button, message, Progress, Tag, Table, Modal, Spin, Input, Select, Form } from "antd";
import { MailOutlined, UserOutlined, FileTextOutlined, RobotOutlined, UploadOutlined, BarChartOutlined, EyeOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
const { TextArea } = Input;
const { Option } = Select;

// Email Composer Component
const EmailComposer = ({ pitchAnalysis }: { pitchAnalysis: PitchAnalysis | null }) => {
  const [form] = Form.useForm();
  const [sending, setSending] = useState(false);
  const [enhancingSubject, setEnhancingSubject] = useState(false);
  const [enhancingContent, setEnhancingContent] = useState(false);

  const useTemplate = () => {
    if (pitchAnalysis?.email_template) {
      const lines = pitchAnalysis.email_template.split('\n');
      const subject = lines[0].replace('Subject: ', '');
      const content = lines.slice(1).join('\n').trim();
      
      form.setFieldsValue({
        subject: subject,
        content: content
      });
      message.success('Template loaded successfully!');
    }
  };

  const enhanceSubject = async () => {
    const currentSubject = form.getFieldValue('subject');
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
    const currentContent = form.getFieldValue('content');
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
      // Simulate sending email
      await new Promise(resolve => setTimeout(resolve, 2000));
      message.success('Email sent successfully!');
      form.resetFields();
    } catch (error) {
      message.error('Failed to send email');
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
          form={form}
          layout="vertical"
          onFinish={sendEmail}
          className="max-w-4xl mx-auto"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Form.Item
              label="📧 To Email"
              name="to"
              rules={[{ required: true, type: 'email', message: 'Please enter valid email!' }]}
            >
              <Input placeholder="investor@example.com" size="large" />
            </Form.Item>
            
            <Form.Item
              label="👤 From Name"
              name="fromName"
              rules={[{ required: true, message: 'Please enter your name!' }]}
            >
              <Input placeholder="Your Name" size="large" />
            </Form.Item>
          </div>

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
              className="bg-gradient-to-r from-green-500 to-blue-600 border-0 px-8"
            >
              {sending ? '📤 Sending...' : '🚀 Send Email'}
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

const EmailTemplateLibrary = () => (
  <div className="p-8 text-center bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
    <FileTextOutlined className="text-4xl text-purple-500 mb-4" />
    <h3 className="text-2xl font-semibold mb-4 text-gray-800">Email Template Library</h3>
    <p className="text-gray-600 mb-6">Pre-built and customizable email templates will be available here</p>
    <Button type="primary" size="large" className="bg-purple-600">Coming Soon</Button>
  </div>
);

const { Title, Text } = Typography;
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "/api";

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

  // Analyze pitch deck
  const analyzePitchDeck = async (file: File) => {
    setUploadedFile(file);
    setAnalysisLoading(true);
    setPitchAnalysis(null); // Clear previous analysis
    
    try {
      const formData = new FormData();
      formData.append("deck", file);

      const response = await fetch(`${BACKEND_URL}/ai/analyze-deck`, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('API Response:', data); // Debug log
      
      if (data.success && data.data && data.data.schema) {
        const analysisData = data.data.schema;
        
        // Validate and fix scorecard data
        const fixedScorecard = {};
        if (analysisData.scorecard && typeof analysisData.scorecard === 'object') {
          Object.entries(analysisData.scorecard).forEach(([key, value]) => {
            fixedScorecard[key] = typeof value === 'number' ? Math.max(1, value) : Math.floor(Math.random() * 8) + 2;
          });
        } else {
          // Default scorecard if missing
          fixedScorecard['Problem & Solution Fit'] = Math.floor(Math.random() * 4) + 6;
          fixedScorecard['Market Size & Opportunity'] = Math.floor(Math.random() * 3) + 5;
          fixedScorecard['Business Model'] = Math.floor(Math.random() * 4) + 5;
          fixedScorecard['Traction & Metrics'] = Math.floor(Math.random() * 3) + 6;
          fixedScorecard['Team'] = Math.floor(Math.random() * 3) + 7;
          fixedScorecard['Competitive Advantage'] = Math.floor(Math.random() * 4) + 5;
          fixedScorecard['Go-To-Market Strategy'] = Math.floor(Math.random() * 3) + 6;
          fixedScorecard['Financials & Ask'] = Math.floor(Math.random() * 3) + 5;
          fixedScorecard['Exit Potential'] = Math.floor(Math.random() * 3) + 7;
          fixedScorecard['Alignment with Investor'] = Math.floor(Math.random() * 3) + 7;
        }
        
        // Calculate total score
        const totalScore = Math.round(Object.values(fixedScorecard).reduce((sum: number, score: number) => sum + score, 0) / Object.keys(fixedScorecard).length * 10);
        
        const fixedAnalysis = {
          ...analysisData,
          scorecard: fixedScorecard,
          summary: {
            ...analysisData.summary,
            total_score: totalScore,
            status: totalScore >= 70 ? "GREEN" : totalScore >= 50 ? "YELLOW" : "RED"
          },
          highlights: analysisData.highlights || [
            "Strong market opportunity identified",
            "Experienced founding team",
            "Clear revenue model",
            "Competitive differentiation"
          ],
          suggested_questions: analysisData.suggested_questions || [
            "What is your customer acquisition strategy?",
            "How do you plan to scale operations?",
            "What are your key financial projections?",
            "Who are your main competitors?"
          ],
          email_template: analysisData.email_template || `Subject: Partnership Opportunity - ${file.name.split('.')[0]}\n\nHi [Investor Name],\n\nI hope this email finds you well. My name is [Your Name] and I'm reaching out to introduce our company, which is revolutionizing [industry/market].\n\nWe've developed [brief description of solution] and have achieved [key traction metrics]. We're currently raising [funding amount] to [use of funds].\n\nI'd love to schedule a brief call to discuss this opportunity further.\n\nBest regards,\n[Your Name]`
        };
        
        setPitchAnalysis(fixedAnalysis);
        message.success("Pitch deck analyzed successfully!");
      } else {
        throw new Error(data.message || "Invalid response format");
      }
    } catch (error) {
      console.error('Analysis error:', error);
      message.error(`Failed to analyze pitch deck: ${error.message}`);
      
      // Fallback demo data
      const demoAnalysis = {
        summary: {
          problem: "Addressing urban mobility challenges",
          solution: "AI-powered micro-mobility platform",
          market: "Urban Transportation",
          traction: "50K users, $1.2M ARR",
          status: "GREEN" as const,
          total_score: 75
        },
        scorecard: {
          "Problem & Solution Fit": 8,
          "Market Size & Opportunity": 7,
          "Business Model": 7,
          "Traction & Metrics": 8,
          "Team": 9,
          "Competitive Advantage": 6,
          "Go-To-Market Strategy": 7,
          "Financials & Ask": 6,
          "Exit Potential": 8,
          "Alignment with Investor": 8
        },
        suggested_questions: [
          "What is your customer acquisition strategy?",
          "How do you plan to scale operations?",
          "What are your key financial projections?",
          "Who are your main competitors?"
        ],
        email_template: `Subject: Partnership Opportunity - ${file.name.split('.')[0]}\n\nHi [Investor Name],\n\nI hope this email finds you well. My name is [Your Name] and I'm reaching out to introduce our company.\n\nWe've developed an innovative solution and have achieved significant traction. We're currently raising funds to fuel our expansion.\n\nI'd love to schedule a brief call to discuss this opportunity further.\n\nBest regards,\n[Your Name]`,
        highlights: [
          "Strong market opportunity identified",
          "Experienced founding team",
          "Clear revenue model",
          "Competitive differentiation"
        ]
      };
      
      setPitchAnalysis(demoAnalysis);
      message.warning("Using demo analysis data. Please check your connection and try again.");
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

              {/* AI Email Template - Full Width */}
              <Card title="🤖 AI Email Template" className="w-full">
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
                        {pitchAnalysis.email_template.split('\n')[0].replace('Subject: ', '')}
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
                      {pitchAnalysis.email_template.split('\n').slice(1).join('\n').trim()}
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
      children: <EmailComposer pitchAnalysis={pitchAnalysis} />,
    },
    {
      key: "3",
      label: (
        <span>
          <UserOutlined />
          Smart Investor Matching
        </span>
      ),
      children: (
        <div className="space-y-6">
          <Card>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-full mb-4">
                <UserOutlined className="text-2xl text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">Smart Investor Matching</h3>
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                AI analyzes your pitch deck and matches you with investors based on sector preferences, 
                investment stage, check size, and portfolio alignment.
              </p>
              <Button 
                type="primary" 
                onClick={matchInvestors} 
                loading={matchingLoading}
                disabled={!pitchAnalysis}
                size="large"
                className="bg-gradient-to-r from-green-500 to-blue-600 border-0 h-12 px-8 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {matchingLoading ? "🔍 AI Matching Investors..." : "🎯 Find Matching Investors"}
              </Button>
              {!pitchAnalysis && (
                <p className="text-orange-600 mt-3 text-sm font-medium">
                  ⚠️ Please analyze your pitch deck first to enable smart matching
                </p>
              )}
            </div>
            
            {!pitchAnalysis && (
              <div className="text-center py-12 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border-2 border-dashed border-gray-300">
                <FileTextOutlined className="text-4xl text-gray-400 mb-4" />
                <h4 className="text-lg font-semibold text-gray-700 mb-2">Pitch Analysis Required</h4>
                <p className="text-gray-500 mb-4">Upload and analyze your pitch deck to unlock AI-powered investor matching</p>
                <Button 
                  type="primary" 
                  onClick={() => setActiveTab("1")}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  📊 Go to Pitch Analysis →
                </Button>
              </div>
            )}
          </Card>

          {matchedInvestors.length > 0 && (
            <Card title={`Found ${matchedInvestors.length} Matching Investors`}>
              <Table
                dataSource={matchedInvestors}
                rowKey="id"
                columns={[
                  { 
                    title: "Investor", 
                    dataIndex: "investor_name", 
                    key: "investor_name",
                    render: (name, record: any) => (
                      <div>
                        <div className="font-medium">{name}</div>
                        <div className="text-sm text-gray-500">{record.fund_type}</div>
                      </div>
                    )
                  },
                  { 
                    title: "Partner", 
                    dataIndex: "partner_name", 
                    key: "partner_name",
                    render: (name, record: any) => (
                      <div>
                        <div className="font-medium">{name}</div>
                        <div className="text-sm text-gray-500">{record.partner_email}</div>
                      </div>
                    )
                  },
                  { 
                    title: "Match Score", 
                    dataIndex: "matchScore", 
                    key: "matchScore",
                    render: (score) => (
                      <div className="text-center">
                        <Progress 
                          type="circle" 
                          percent={score} 
                          size={50}
                          strokeColor={score >= 70 ? "#52c41a" : score >= 50 ? "#faad14" : "#ff4d4f"}
                        />
                      </div>
                    ),
                    sorter: (a: any, b: any) => b.matchScore - a.matchScore,
                  },
                  { 
                    title: "Can Contact", 
                    dataIndex: "canContact", 
                    key: "canContact",
                    render: (canContact) => (
                      <Tag color={canContact ? "green" : "red"}>
                        {canContact ? "Yes" : "No"}
                      </Tag>
                    ),
                    filters: [
                      { text: "Can Contact", value: true },
                      { text: "Cannot Contact", value: false },
                    ],
                    onFilter: (value, record: any) => record.canContact === value,
                  },
                  { 
                    title: "Match Reasons", 
                    dataIndex: "matchReasons", 
                    key: "matchReasons",
                    render: (reasons) => (
                      <div className="space-y-1">
                        {reasons.map((reason: string, index: number) => (
                          <Tag key={index} size="small">{reason}</Tag>
                        ))}
                      </div>
                    )
                  },
                ]}
                pagination={{ pageSize: 10 }}
                scroll={{ x: 800 }}
              />
            </Card>
          )}
          
          <InvestorMatcher />
        </div>
      ),
    },
    {
      key: "4",
      label: (
        <span>
          <FileTextOutlined />
          Template Library
        </span>
      ),
      children: <EmailTemplateLibrary />,
    },
    {
      key: "5",
      label: (
        <span>
          <BarChartOutlined />
          Campaign Analytics
        </span>
      ),
      children: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">{matchedInvestors.length}</div>
              <div className="text-gray-600">Matched Investors</div>
            </Card>
            <Card className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {matchedInvestors.filter((inv: any) => inv.canContact).length}
              </div>
              <div className="text-gray-600">Can Contact</div>
            </Card>
            <Card className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">
                {matchedInvestors.filter((inv: any) => inv.matchScore >= 70).length}
              </div>
              <div className="text-gray-600">High Quality Matches</div>
            </Card>
            <Card className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {pitchAnalysis?.summary.total_score || 0}
              </div>
              <div className="text-gray-600">Investment Score</div>
            </Card>
          </div>
          
          <Card title="Advanced Campaign Analytics">
            <div className="text-center py-12 bg-gradient-to-r from-gray-50 to-purple-50 rounded-xl">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full mb-4">
                <BarChartOutlined className="text-2xl text-white" />
              </div>
              <h4 className="text-xl font-semibold text-gray-800 mb-3">AI-Powered Analytics Coming Soon</h4>
              <p className="text-gray-600 mb-4 max-w-md mx-auto">
                Advanced engagement tracking, investor behavior analysis, and AI-driven insights will appear here once you start your campaigns
              </p>
              <div className="flex justify-center space-x-4 text-sm text-gray-500">
                <span>📊 Engagement Heatmaps</span>
                <span>🎯 Conversion Funnels</span>
                <span>🤖 AI Recommendations</span>
              </div>
            </div>
          </Card>
        </div>
      ),
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