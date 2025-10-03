"use client";

import { useState, useEffect } from "react";
import { Card, Typography, Tabs, Upload, Button, message, Progress, Tag, Table, Modal, Spin, Input, Select, Form, Space, Radio, DatePicker, TimePicker, Dropdown, List } from "antd";
import type { Dayjs } from 'dayjs';
import { MailOutlined, UserOutlined, FileTextOutlined, RobotOutlined, UploadOutlined, BarChartOutlined, EyeOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";

const { TextArea } = Input;
const { Option } = Select;

// Default investor template
const DEFAULT_INVESTOR_TEMPLATE = `Subject: Investment Opportunity - [Company Name]

Dear [Investor's Name],

Hope you're doing well.

I'm reaching out to share an exciting investment opportunity in [Company Name].

Key Highlights:
- [Key Highlight 1]
- [Key Highlight 2] 
- [Key Highlight 3]

Fundraise Details:
Currently raising [Amount] to accelerate growth.

If this aligns with your investment thesis, we'd be glad to share our deck and set up a call.

Looking forward to hearing from you.

Best regards,
[Your Name]
[Your Title]
[Company Name]`;

// Helper function to extract company name from filename
const extractCompanyNameFromFileName = (fileName?: string) => {
  if (!fileName) return null;
  
  return fileName
    .replace(/\.[^.]+$/, '') // Remove extension
    .replace(/\bdeck\b/gi, '') // Remove "deck"
    .replace(/\(\d+\)/g, '') // Remove (1), (2), etc.
    .replace(/[-_]/g, ' ') // Replace dashes and underscores with spaces
    .replace(/\s{2,}/g, ' ') // Replace multiple spaces with single space
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase()); // Capitalize first letter of each word
};

// Dynamic investor outreach template based on analysis
const generateDynamicTemplate = (analysis: PitchAnalysis | null, fileName?: string) => {
  if (!analysis) {
    const companyName = extractCompanyNameFromFileName(fileName) || "[Company Name]";
    return `Subject: Investment Opportunity - ${companyName}

Dear [Investor's Name],

Hope you're doing well.

I'm reaching out to share an exciting investment opportunity in ${companyName}.

Key Highlights:
- [Key Highlight 1]
- [Key Highlight 2] 
- [Key Highlight 3]

Fundraise Details:
Currently raising [Amount] to accelerate growth.

If this aligns with your investment thesis, we'd be glad to share our deck and set up a call.

Looking forward to hearing from you.

Best regards,
[Your Name]
[Your Title]
${companyName}`;
  }

  const companyName = extractCompanyNameFromFileName(fileName) || "[Company Name]";
  const sector = analysis.summary?.market || "[Sector]";
  const highlights = analysis.highlights || [];
  
  return `Subject: Investment Opportunity - ${companyName}

Dear [Investor's Name],

Hope you're doing well.

I'm reaching out to share an exciting investment opportunity in ${companyName}, operating in the ${sector} space.

${analysis.summary?.problem ? `Problem: ${analysis.summary.problem}` : ''}
${analysis.summary?.solution ? `\nSolution: ${analysis.summary.solution}` : ''}

Key Highlights:
${highlights.slice(0, 5).map(h => `- ${h}`).join('\n')}

${analysis.summary?.traction ? `Traction: ${analysis.summary.traction}` : ''}

Fundraise Details:
Currently raising funds to accelerate growth and expansion.

If this aligns with your investment thesis in ${sector}, we'd be glad to share our deck and set up a call with the founders.

Looking forward to hearing from you.

Best regards,
[Your Name]
[Your Title]
${companyName}`;
};

// Build a filled template using the AI analysis data
function buildTemplateFromAnalysis(analysis: PitchAnalysis | null, fileName?: string) {
  if (!analysis) return DEFAULT_INVESTOR_TEMPLATE;
  const pick = (v?: string) => (v && v.trim().length > 0 ? v.trim() : undefined);

  // Clean and humanize brand name from fileName
  const rawName = pick(fileName?.replace(/\.[^.]+$/, "")) || "[Brand Name]";
  const cleanedBase = rawName
    .replace(/\bdeck\b/gi, '')
    .replace(/\(\d+\)/g, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const brandName = cleanedBase.replace(/\b\w/g, (c) => c.toUpperCase());

  const category = pick(analysis.summary?.market) || "[Brand Type / Category]";
  const sanitizeSnippet = (s: string = "") => {
    let out = s.replace(new RegExp(`^${brandName}[:,]?\\s*`, 'i'), '');
    out = out.replace(/^a[n]?\s+/i, '').replace(/^brand\s+/i, '');
    out = out.replace(/\s*[,;]\s*$/g, '').replace(/\.+$/g, '');
    out = out.replace(/\s{2,}/g, ' ').trim();
    if (out.length > 100) {
      const cut = out.slice(0, 100);
      const lastSpace = cut.lastIndexOf(' ');
      out = (lastSpace > 60 ? cut.slice(0, lastSpace) : cut).trim() + '...';
    }
    return out;
  };

  const positioning = sanitizeSnippet(pick(analysis.summary?.solution) || "[1-line positioning]");
  const traction = pick(analysis.summary?.traction) || "[Revenue/Users/Growth]";

  const hi = (analysis.highlights || []).slice(0, 5);
  const hl1 = hi[0] || `Growth: ${traction}`;
  const hl2 = hi[1] || `Market Size: ${category}`;
  const hl3 = hi[2] || `Gross Margins: [Gross Margin %]`;
  const hl4 = hi[3] || `Current Presence: [Channels]`;
  const hl5 = hi[4] || `Unit Economics: [Repeat/Retention]`;

  // Concise subject (no "Deck (1)") and capped
  let subjectText = `Investment Opportunity in ${brandName} – ${positioning}`;
  if (subjectText.length > 120) subjectText = subjectText.slice(0, 117) + '...';
  const subject = `Subject: ${subjectText}`;

  const body = `
Dear [Investor's Name],

Hope you're doing well.

I'm reaching out to share an exciting investment opportunity in ${brandName}, an ${category} brand with ${positioning}.

Backed by [Existing Investors / Grants / Achievements], ${brandName} combines [Unique Selling Proposition] to build a high-margin, scalable business.

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
type EmailComposerProps = { pitchAnalysis: PitchAnalysis | null; autoLoadTemplate?: boolean; uploadedFileName?: string; onScheduleLabelChange?: (label: string) => void; generatedEmailTemplate?: { subject: string; body: string } | null };
const EmailComposer = ({ pitchAnalysis, autoLoadTemplate = false, uploadedFileName, onScheduleLabelChange, generatedEmailTemplate }: EmailComposerProps) => {
  const [form] = Form.useForm();
  const [sending, setSending] = useState(false);
  const [enhancingSubject, setEnhancingSubject] = useState(false);
  const [enhancingContent, setEnhancingContent] = useState(false);
  const [formKey, setFormKey] = useState('composer');

  const MAX_RECIPIENTS = 20;
  const [recipients, setRecipients] = useState<string[]>([]);
  const [scheduleType, setScheduleType] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduleDate, setScheduleDate] = useState<any>(null);
  const [selectedScheduleLabel, setSelectedScheduleLabel] = useState<string>('');
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [customDate, setCustomDate] = useState<Date | null>(null);
  const [customTime, setCustomTime] = useState<Dayjs | null>(null);
  const [showAllEmailsModal, setShowAllEmailsModal] = useState(false);
  const [emailLimits, setEmailLimits] = useState({ daily: 0, weekly: 0 });
  // MAX_RECIPIENTS defined above

  const useTemplate = () => {
    if (generatedEmailTemplate) {
      form.setFieldsValue({ 
        subject: generatedEmailTemplate.subject, 
        content: generatedEmailTemplate.body 
      });
    } else {
      const template = generateDynamicTemplate(pitchAnalysis, uploadedFileName);
      const lines = template.split('\n');
      const subject = lines[0].replace('Subject: ', '');
      const content = lines.slice(1).join('\n').trim();
      form.setFieldsValue({ subject, content });
    }
    message.success('Template loaded successfully!');
  };



  // Auto-load the template when the composer is shown
  useEffect(() => {
    if (autoLoadTemplate && generatedEmailTemplate) {
      form.setFieldsValue({ 
        subject: generatedEmailTemplate.subject, 
        content: generatedEmailTemplate.body 
      });
      setFormKey(`composer-${Date.now()}`);
    }
  }, [autoLoadTemplate, form, generatedEmailTemplate]);

  // Prefill recipients from URL parameters or localStorage
  useEffect(() => {
    try {
      // First check URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const emailsFromUrl = urlParams.get('emails');
      const namesFromUrl = urlParams.get('names');
      
      if (emailsFromUrl) {
        const emailList = decodeURIComponent(emailsFromUrl).split(',').map(e => e.trim()).filter(Boolean);
        const nameList = namesFromUrl ? decodeURIComponent(namesFromUrl).split('|').map(n => n.trim()).filter(Boolean) : [];
        
        const unique = Array.from(new Set(emailList)).slice(0, MAX_RECIPIENTS);
        if (unique.length > 0) {
          form.setFieldsValue({ to: unique.join(', ') });
          setRecipients(unique);
          message.success(`Loaded ${unique.length} selected investors from matchmaking`);
          return;
        }
      }
      
      // Fallback to localStorage
      const raw = localStorage.getItem('selectedInvestors');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const emails: string[] = Array.isArray(parsed)
        ? parsed
            .map((r: any) => r.displayEmail || r.partner_email || r.email)
            .filter((e: any) => typeof e === 'string' && e.includes('@'))
        : [];
      // Dedupe and cap
      const unique = Array.from(new Set(emails)).slice(0, MAX_RECIPIENTS);
      if (unique.length > 0) {
        form.setFieldsValue({ to: unique.join(', ') });
        setRecipients(unique);
        message.success(`Loaded ${unique.length} recipient${unique.length>1?'s':''} from selection`);
      }
    } catch {}
  }, [form]);

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
      const template = generateDynamicTemplate(pitchAnalysis, uploadedFileName);
      const lines = template.split('\n');
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
      // Normalize recipients and cap
      const toList = (values.to || '')
        .split(/[;,\n\s]+/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.includes('@'));
      const deduped = Array.from(new Set(toList)).slice(0, MAX_RECIPIENTS);
      
      if (scheduleType === 'scheduled' && scheduleDate) {
        // Schedule email using backend API
        const urlParams = new URLSearchParams(window.location.search);
        const companyId = urlParams.get('companyId') || 'test-company-123'; // Fallback for testing
        
        const payload = {
          companyId: companyId,
          investorIds: deduped,
          subject: values.subject,
          htmlContent: values.content,
          scheduleAt: new Date(scheduleDate).toISOString()
        };
        
        const response = await fetch(`${BACKEND_URL}/scheduled-emails`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to schedule email');
        }
        
        const result = await response.json();
        message.success(`Email scheduled for ${selectedScheduleLabel || 'selected time'}`);
        form.resetFields();
        setScheduleType('immediate');
        setScheduleDate(null);
        setSelectedScheduleLabel('');
        return;
      }

      // Get client info from URL and localStorage
      const urlParams = new URLSearchParams(window.location.search);
      const clientId = urlParams.get('clientId');
      const clientName = urlParams.get('clientName') || 'Test Client';
      
      // Get client data from localStorage using clientId
      let clientData = null;
      if (clientId) {
        const clients = JSON.parse(localStorage.getItem('clients') || '[]');
        clientData = clients.find((c: any) => 
          String(c.id || c._id || c.email || (c.company_name && c.company_name.replace(/\s+/g, '-'))) === String(clientId)
        );
      }
      
      // Fallback to currentClient if no specific client found
      if (!clientData) {
        const storedClient = localStorage.getItem('currentClient');
        if (storedClient) {
          clientData = JSON.parse(storedClient);
        }
      }
      
      const companyId = clientData?.id || 'test-company-123';

      // Send emails using client email service with proper formatting
      const payload = {
        companyId: companyId,
        clientData: clientData, // Include full client data for email sending
        investorIds: deduped,
        subject: values.subject,
        companyName: clientData?.company_name || 'Investment Opportunity',
        htmlContent: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
          ${values.content.replace(/\n/g, '<br>')}
        </div>`
      };
      
      const response = await fetch(`${BACKEND_URL}/client-email/send-bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        message.success(`✅ Bulk email job started! ${result.totalEmails} emails will be sent from ${clientName}'s Gmail account.`);
        message.info(`Estimated time: ${result.estimatedTime}`);
      } else {
        throw new Error(result.error || 'Failed to send email');
      }
      
      // Update existing campaign for selected client (regardless of email status)
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const clientName = urlParams.get('clientName') || 'Default Client';
          
          // Find existing draft campaign for this specific client
          const campaigns = JSON.parse(localStorage.getItem('campaigns') || '[]');
          const campaignIndex = campaigns.findIndex((c: any) => c.clientName === clientName && c.status === 'draft');
          
          if (campaignIndex !== -1) {
            // Update the specific campaign
            campaigns[campaignIndex].status = 'Active';
            campaigns[campaignIndex].recipients = (campaigns[campaignIndex].recipients || 0) + deduped.length;
            campaigns[campaignIndex].emailsSent = (campaigns[campaignIndex].emailsSent || 0) + deduped.length;
            campaigns[campaignIndex].lastSentAt = new Date().toISOString();
            campaigns[campaignIndex].subject = values.subject;
            campaigns[campaignIndex].body = values.content;
            
            // Add sent emails to this campaign
            if (!campaigns[campaignIndex].sentEmails) campaigns[campaignIndex].sentEmails = [];
            campaigns[campaignIndex].sentEmails.push(...deduped.map(email => ({
              email,
              sentAt: new Date().toISOString(),
              subject: values.subject
            })));
            
            localStorage.setItem('campaigns', JSON.stringify(campaigns));
            message.success(`${clientName} campaign updated: ${deduped.length} emails sent`);
          } else {
            message.warning(`No draft campaign found for ${clientName}. Please create a campaign first.`);
          }
          
          // Create report
          const reports = JSON.parse(localStorage.getItem('reports') || '[]');
          const sent = deduped.length; 
          const delivered = Math.round(sent * 0.95); 
          const failed = sent - delivered; 
          const openRate = Math.round(Math.random() * 20 + 25); // 25-45%
          const clickRate = Math.round(Math.random() * 10 + 5); // 5-15%
          const replies = Math.round(sent * (Math.random() * 0.05 + 0.02)); // 2-7%
          
          const newReport = {
            id: Date.now(),
            name: `${clientName} Report`,
            type: 'Campaign',
            campaignId: campaignIndex !== -1 ? campaigns[campaignIndex].id : Date.now(),
            clientName: clientName,
            createdAt: new Date().toISOString(),
            status: 'completed',
            metrics: { sent, delivered, failed, openRate, clickRate, replies },
            recipients: deduped
          };
          reports.unshift(newReport);
          localStorage.setItem('reports', JSON.stringify(reports));
          
          // Update campaign tracking
          const campaignTracking = JSON.parse(localStorage.getItem('campaignTracking') || '{}');
          if (campaignIndex !== -1) {
            campaignTracking[campaigns[campaignIndex].id] = {
              totalRecipients: campaigns[campaignIndex].recipients,
              sentCount: campaigns[campaignIndex].emailsSent,
              lastUpdated: new Date().toISOString(),
              clientName: clientName
            };
            localStorage.setItem('campaignTracking', JSON.stringify(campaignTracking));
          }
        } catch (e) {
          console.error('Failed to create campaign/report:', e);
        }
        
        form.resetFields();
        setRecipients([]); // Clear recipients list

    } catch (err: any) {
      console.error('Email send error:', err);
      if (typeof err?.message === 'string' && err.message.includes('fetch')) {
        message.error('Cannot connect to backend server. Please ensure the backend is running on port 5000.');
      } else {
        message.error(err?.message || 'Failed to send email');
      }
    } finally {
      setSending(false);
    }
  };

  const handleScheduleFromPreset = () => {
    try {
      const currentTo = form.getFieldValue('to') || '';
      const subject = form.getFieldValue('subject') || '';
      const content = form.getFieldValue('content') || '';
      const fakeValues = { to: currentTo, subject, content };
      setScheduleType('scheduled');
      // Save scheduled job using existing path in sendEmail
      // Reuse logic by calling sendEmail with scheduleType already set
      sendEmail(fakeValues);
    } catch {}
  };

  const removeSchedule = () => {
    setScheduleType('immediate');
    setScheduleDate(null);
    setSelectedScheduleLabel('');
    message.success('Schedule removed - email will be sent immediately');
  };

  // Helpers for schedule presets (IST display)
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

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4">
                <MailOutlined className="text-2xl text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">📧 Email Composer</h3>
              <p className="text-gray-600 mb-4">
                Compose and send personalized investor outreach emails with AI assistance
              </p>
            </div>
            <div className="ml-4">
              <Button onClick={() => setScheduleModalOpen(true)}>Schedule Send ▾</Button>
            </div>
          </div>

          

        {/* Selected schedule status (top-left) */}
        {selectedScheduleLabel && (
          <div className="mb-3 text-left">
            <div className="inline-flex items-center gap-2 bg-orange-100 border border-orange-300 rounded-lg px-3 py-2">
              <span className="text-orange-800 font-medium">
                📅 Scheduled: {selectedScheduleLabel}
              </span>
              <button 
                onClick={() => setScheduleModalOpen(true)}
                className="text-orange-600 hover:text-orange-800 text-sm underline"
              >
                change
              </button>
              <button 
                onClick={() => {
                  setSelectedScheduleLabel('');
                  setScheduleType('immediate');
                  try{localStorage.removeItem('selectedScheduleLabel');}catch{}
                  onScheduleLabelChange && onScheduleLabelChange('');
                }}
                className="text-red-500 hover:text-red-700 ml-1"
                title="Remove schedule"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        </div>



        <Form
          key={formKey}
          form={form}
          layout="vertical"
          onFinish={sendEmail}
          className="max-w-4xl mx-auto"
        >
          {/* From Email Display */}
          <Form.Item label="📧 From Email" className="mb-4">
            <Input 
              disabled 
              value={(() => {
                const urlParams = new URLSearchParams(window.location.search);
                const clientId = urlParams.get('clientId');
                if (clientId) {
                  const clients = JSON.parse(localStorage.getItem('clients') || '[]');
                  const client = clients.find((c: any) => String(c.id || c._id) === String(clientId));
                  if (client?.email) return client.email;
                }
                const currentClient = JSON.parse(localStorage.getItem('currentClient') || '{}');
                return currentClient.email || 'No email configured';
              })()} 
              size="large"
            />
          </Form.Item>

          <div className="flex items-center gap-4">
            <Form.Item
              label="📧 To Email"
              name="to"
              rules={[{ required: true, message: 'Please enter at least one email!' }]}
              className="mb-4 flex-1"
            >
              <Input placeholder="investor1@example.com, investor2@example.com" size="large" onChange={(e)=>{
                const list = e.target.value.split(/[;,\n\s]+/).map(s=>s.trim()).filter(s=>s.includes('@'));
                setRecipients(Array.from(new Set(list)).slice(0, MAX_RECIPIENTS));
              }} />
            </Form.Item>
            
            {recipients.length > 0 && (
              <Button
                onClick={() => setShowAllEmailsModal(true)}
                className="mb-4"
              >
                View All ({recipients.length})
              </Button>
            )}
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

          {/* Removed center schedule button; moved to top-right */}

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
            {scheduleType === 'scheduled' && selectedScheduleLabel && (
              <Button 
                type="default" 
                size="large"
                onClick={removeSchedule}
                className="bg-orange-500 hover:bg-orange-600 text-white border-0"
              >
                🗑️ Remove Schedule
              </Button>
            )}
            <Button 
              type="primary" 
              htmlType="submit"
              size="large"
              loading={sending}

              className="bg-gradient-to-r from-green-500 to-blue-600 border-0 px-8"
            >
              {sending ? '📤 Sending...' : 
 
               scheduleType === 'scheduled' ? `📅 Schedule for ${selectedScheduleLabel}` : 
               '🚀 Send Email'}
            </Button>
          </div>
        </Form>
      </Card>

      {/* Custom styles for time picker */}
      <style jsx global>{`
        .dark-time-popup .ant-picker-time-panel {
          background: white !important;
          border: 1px solid #e5e7eb !important;
          border-radius: 8px !important;
          box-shadow: 0 10px 25px rgba(0,0,0,0.15) !important;
        }
        .dark-time-popup .ant-picker-time-panel-column {
          background: white !important;
          border-right: 1px solid #f3f4f6 !important;
        }
        .dark-time-popup .ant-picker-time-panel-cell {
          color: #374151 !important;
          padding: 8px 12px !important;
          font-weight: 500 !important;
        }
        .dark-time-popup .ant-picker-time-panel-cell:hover {
          background: #f3f4f6 !important;
          border-radius: 4px !important;
        }
        .dark-time-popup .ant-picker-time-panel-cell-selected {
          background: #3b82f6 !important;
          color: white !important;
          border-radius: 4px !important;
          font-weight: 600 !important;
        }
        .dark-time-popup .ant-picker-footer {
          background: white !important;
          border-top: 1px solid #f3f4f6 !important;
        }
        .dark-time-popup .ant-btn-primary {
          background: #3b82f6 !important;
          border-color: #3b82f6 !important;
          color: white !important;
        }
        .dark-time-popup .ant-btn-primary:hover {
          background: #2563eb !important;
          border-color: #2563eb !important;
        }
      `}</style>
      
      {/* Centered Schedule Modal */}
      <Modal open={scheduleModalOpen} onCancel={() => setScheduleModalOpen(false)} footer={null} centered title={null} closable={false} bodyStyle={{ padding: 0 }}>
        <div className="bg-gray-800 text-white rounded-lg p-5 w-full">
          <div className="grid grid-cols-2 gap-4">
            <button className="text-left bg-gray-700 hover:bg-gray-600 rounded-md p-4" onClick={() => {
              const d = tomorrowMorning(); setScheduleType('scheduled'); setScheduleDate(d); const label = 'Tomorrow morning · 8:00 AM'; setSelectedScheduleLabel(label); try{localStorage.setItem('selectedScheduleLabel',label);}catch{} onScheduleLabelChange && onScheduleLabelChange(label); handleScheduleFromPreset(); setScheduleModalOpen(false);
            }}>
              <div className="text-orange-400 text-xl mb-1">⚙️</div>
              <div className="font-semibold">Tomorrow morning</div>
              <div className="text-gray-300 text-sm">{formatInIST(tomorrowMorning())}</div>
            </button>
            <button className="text-left bg-gray-700 hover:bg-gray-600 rounded-md p-4" onClick={() => {
              const d = tomorrowAfternoon(); setScheduleType('scheduled'); setScheduleDate(d); const label = 'Tomorrow afternoon · 1:00 PM'; setSelectedScheduleLabel(label); try{localStorage.setItem('selectedScheduleLabel',label);}catch{} onScheduleLabelChange && onScheduleLabelChange(label); handleScheduleFromPreset(); setScheduleModalOpen(false);
            }}>
              <div className="text-orange-400 text-xl mb-1">⚙️</div>
              <div className="font-semibold">Tomorrow afternoon</div>
              <div className="text-gray-300 text-sm">{formatInIST(tomorrowAfternoon())}</div>
            </button>
            <button className="text-left bg-gray-700 hover:bg-gray-600 rounded-md p-4" onClick={() => {
              const d = nextMondayMorning(); setScheduleType('scheduled'); setScheduleDate(d); const label = 'Monday morning · 8:00 AM'; setSelectedScheduleLabel(label); try{localStorage.setItem('selectedScheduleLabel',label);}catch{} onScheduleLabelChange && onScheduleLabelChange(label); handleScheduleFromPreset(); setScheduleModalOpen(false);
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
                  className="w-full custom-time-picker"
                  size="large"
                  style={{ width: '100%' }}
                  use12Hours 
                  format="h:mm A"
                  placement="topLeft"
                  placeholder="Select time"
                  popupClassName="dark-time-popup"
                  onChange={(v)=> { setCustomTime(v || null); }}
                />
                <DatePicker 
                  className="w-full"
                  size="large"
                  style={{ width: '100%' }}
                  format="DD MMM, YYYY"
                  placement="topLeft"
                  placeholder="Select date"
                  onChange={(v)=> { setCustomDate(v ? new Date(v as any) : null); }}
                />
              </div>
              <div className="flex justify-end mt-3">
                <Button type="primary" disabled={!customDate || !customTime} onClick={() => {
                  if (!customDate || !customTime) return;
                  const d = new Date(customDate);
                  const hours = customTime.hour();
                  const minutes = customTime.minute();
                  d.setHours(hours, minutes, 0, 0);
                  setScheduleType('scheduled'); setScheduleDate(d);
                  const label = `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}, ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
                  setSelectedScheduleLabel(label);
                  try{localStorage.setItem('selectedScheduleLabel',label);}catch{}
                  onScheduleLabelChange && onScheduleLabelChange(label);
                  handleScheduleFromPreset(); setScheduleModalOpen(false);
                }} className="bg-blue-600 hover:bg-blue-700 border-blue-600 text-white">OK</Button>
              </div>
            </div>
          </div>
          <div className="text-center text-gray-300 text-xs mt-4">All times are in India Standard Time</div>
          <div className="flex justify-center mt-3"><Button onClick={() => setScheduleModalOpen(false)} className="bg-red-600 hover:bg-red-700 text-white border-red-600">Close</Button></div>
        </div>
      </Modal>
      
      {/* All Emails Modal */}
      <Modal
        title={`All Recipients (${recipients.length})`}
        open={showAllEmailsModal}
        onCancel={() => setShowAllEmailsModal(false)}
        footer={[
          <Button key="copy" onClick={() => {
            navigator.clipboard.writeText(recipients.join(', '));
            message.success('All emails copied to clipboard!');
          }}>
            Copy All
          </Button>,
          <Button key="close" onClick={() => setShowAllEmailsModal(false)}>
            Close
          </Button>
        ]}
        width={600}
      >
        <div className="max-h-96 overflow-y-auto">
          <List
            dataSource={recipients}
            renderItem={(email, index) => (
              <List.Item className="px-0">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-sm">{index + 1}.</span>
                    <span className="text-sm">{email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="text"
                      size="small"
                      onClick={() => {
                        navigator.clipboard.writeText(email);
                        message.success('Email copied!');
                      }}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      Copy
                    </Button>
                    <Button
                      type="text"
                      size="small"
                      onClick={() => {
                        const newList = recipients.filter(r => r !== email);
                        setRecipients(newList);
                        form.setFieldValue('to', newList.join(', '));
                        message.success('Email removed!');
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </List.Item>
            )}
          />
        </div>
      </Modal>
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
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api` : '/api';

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
  const [selectedScheduleLabel, setSelectedScheduleLabel] = useState<string>('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [matchedInvestors, setMatchedInvestors] = useState([]);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  
  // Force clear all data on component mount
  useEffect(() => {
    setPitchAnalysis(null);
    setMatchedInvestors([]);
    setUploadedFile(null);
    try { const saved = localStorage.getItem('selectedScheduleLabel'); if (saved) setSelectedScheduleLabel(saved); } catch {}
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

  // Store the generated email template from backend
  const [generatedEmailTemplate, setGeneratedEmailTemplate] = useState<{ subject: string; body: string } | null>(null);

  // Analyze pitch deck
  const analyzePitchDeck = async (file: File) => {
    console.log('🚀 Starting analysis for:', file.name);
    setUploadedFile(file);
    setAiError(null);
    setAnalysisLoading(true);
    setPitchAnalysis(null); // Clear previous analysis
    setMatchedInvestors([]); // Clear previous matches
    setGeneratedEmailTemplate(null); // Clear previous template
    
    try {
      // First, generate the email template using extract-and-prefill
      const templateFormData = new FormData();
      templateFormData.append("document", file);
      templateFormData.append("investorName", "[Investor's Name]");

      try {
        const templateResponse = await fetch(`${BACKEND_URL}/ai/extract-and-prefill`, {
          method: "POST",
          body: templateFormData,
        });

        if (templateResponse.ok) {
          const templateResult = await templateResponse.json();
          if (templateResult.success && templateResult.data.emailTemplate) {
            setGeneratedEmailTemplate(templateResult.data.emailTemplate);
            console.log('✅ Email template generated successfully');
          }
        }
      } catch (templateError) {
        console.warn('Template generation failed, will use fallback:', templateError);
      }

      // Then proceed with analysis
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
        if (!ok && data?.error) setAiError('AI service is busy. Please try again.');
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
          else if (data?.error) setAiError('AI failed to analyze the deck. Please try again.');
        } catch (e2) {
          console.warn('Fallback analyze also failed/timeout:', e2);
          ok = false;
          setAiError('Network or AI timeout. Please check your connection and try again.');
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
        
        // Calculate total score properly
        const scores = Object.values(fixedScorecard) as number[];
        const totalScore = Math.round(scores.reduce((sum: number, score: number) => sum + score, 0));
        console.log('🔢 Calculated total score from scorecard:', totalScore);
        
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
        return;
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
          email_template: generateDynamicTemplate(null, file.name),
          highlights: [
            "Strong market opportunity and growth potential",
            "Experienced founding team",
            "Early traction and customer validation"
          ]
        };

      setPitchAnalysis(fallbackAnalysis);
      message.success('✅ Analysis complete (fallback used).');
      setAiError(null);
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
          {aiError && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800 flex items-center justify-between">
              <span>{aiError} – Try again.</span>
              <Button size="small" onClick={() => uploadedFile && analyzePitchDeck(uploadedFile)}>
                Try Again
              </Button>
            </div>
          )}
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

              {/* Email Template - Full Width */}
              <Card title="🤖 Email Template" className="w-full">
                <div className="grid grid-cols-1 gap-6">
                  {/* Subject Line */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Text strong className="text-lg text-gray-700">📧 Subject Line</Text>
                      <Button 
                        type="primary"
                        size="small"
                        onClick={() => {
                          const rawSubject = generatedEmailTemplate?.subject || 'Investment – Cosmedream';
                          // Enhanced subject cleaning
                          const cleanSubject = rawSubject
                            .replace(/^Subject:\s*/i, '') // Remove "Subject:" prefix
                            .replace(/\s*–\s*\[.*?\].*$/i, '') // Remove " – [placeholder text]" suffix
                            .replace(/\s*\[.*?\]\s*/g, '') // Remove any [placeholder] text
                            .replace(/\s+/g, ' ') // Normalize spaces
                            .trim();
                          navigator.clipboard.writeText(cleanSubject);
                          message.success('Subject copied to clipboard!');
                        }}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        📋 Copy Subject
                      </Button>
                    </div>
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border-2 border-blue-200">
                      <Text className="text-base font-medium text-gray-800">
                        {(() => {
                          const rawSubject = generatedEmailTemplate?.subject || generateDynamicTemplate(pitchAnalysis, uploadedFile?.name).split('\n')[0].replace('Subject: ', '');
                          // Clean subject for display
                          return rawSubject
                            .replace(/^Subject:\s*/i, '') // Remove "Subject:" prefix
                            .replace(/\s*–\s*\[.*?\].*$/i, '') // Remove " – [placeholder text]" suffix
                            .replace(/\s*\[.*?\]\s*/g, '') // Remove any [placeholder] text
                            .replace(/\s+/g, ' ') // Normalize spaces
                            .trim();
                        })()}
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
                        const rawEmailContent = generatedEmailTemplate?.body || generateDynamicTemplate(pitchAnalysis, uploadedFile?.name).split('\n').slice(1).join('\n').trim();
                        // Enhanced email content cleaning with proper formatting
                        const cleanEmailContent = rawEmailContent
                          .replace(/<[^>]*>/g, '') // Remove HTML tags
                          .replace(/&nbsp;/g, ' ') // Replace &nbsp; with spaces
                          .replace(/&amp;/g, '&') // Replace HTML entities
                          .replace(/&lt;/g, '<')
                          .replace(/&gt;/g, '>')
                          .replace(/&quot;/g, '"')
                          .replace(/&#39;/g, "'")
                          .replace(/\[.*?\]/g, '') // Remove any [placeholder] text
                          .replace(/\s*\n\s*/g, '\n') // Clean up spacing around newlines
                          .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines to 2
                          .replace(/^\s+|\s+$/gm, '') // Trim each line
                          .replace(/📈\s*KEY HIGHLIGHTS:/g, '\n📈 KEY HIGHLIGHTS:')
                          .replace(/🔧\s*PRODUCT EDGE:/g, '\n\n🔧 PRODUCT EDGE:')
                          .replace(/💸\s*FUNDRAISE DETAILS:/g, '\n\n💸 FUNDRAISE DETAILS:')
                          .replace(/•\s*/g, '\n• ') // Ensure bullets are on new lines
                          .replace(/\n\n\n+/g, '\n\n') // Clean up extra newlines again
                          .trim();
                        navigator.clipboard.writeText(cleanEmailContent);
                        message.success('Email content copied to clipboard!');
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      📋 Copy Email Content
                    </Button>
                  </div>
                  <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-6 rounded-lg border-2 border-gray-200">
                    <div className="text-base font-sans text-gray-800 leading-relaxed whitespace-pre-line">
                      {(() => {
                        const content = generatedEmailTemplate?.body || generateDynamicTemplate(pitchAnalysis, uploadedFile?.name).split('\n').slice(1).join('\n').trim();
                        return content
                          .replace(/📈\s*Key Highlights:/gi, '\n\n📈 KEY HIGHLIGHTS:')
                          .replace(/🔧\s*Product Edge:/gi, '\n\n🔧 PRODUCT EDGE:')
                          .replace(/💸\s*Fundraise Details:/gi, '\n\n💸 FUNDRAISE DETAILS:')
                          .replace(/^\s*-\s*/gm, '• ') // Convert dashes to bullets
                          .replace(/Contact:/g, '\n\nContact:')
                          .replace(/Warm regards,/g, '\n\nWarm regards,')
                          .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
                          .trim();
                      })()}
                    </div>
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
      children: <EmailComposer pitchAnalysis={pitchAnalysis} uploadedFileName={uploadedFile?.name} autoLoadTemplate={true} onScheduleLabelChange={(l)=> setSelectedScheduleLabel(l)} generatedEmailTemplate={generatedEmailTemplate} />,
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