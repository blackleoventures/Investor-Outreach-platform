"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { message } from "antd";

const BACKEND_URL = "http://localhost:5000/api";

interface EmailComposerProps {
  emailTemplate: { subject: string; body: string } | null;
}

// Custom Modal Component
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  width = "max-w-2xl",
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: string;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm animate-fade-in">
      <div
        className={`bg-white rounded-2xl shadow-2xl ${width} w-full max-h-[90vh] overflow-hidden animate-scale-in`}
      >
        {title && (
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-white">
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none"
            >
              ×
            </button>
          </div>
        )}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {children}
        </div>
      </div>
    </div>
  );
};

// Custom Button Component
const Button = ({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  className = "",
  icon,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost" | "gradient";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  icon?: React.ReactNode;
}) => {
  const baseStyles =
    "font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800",
    danger: "bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg",
    ghost:
      "bg-transparent hover:bg-gray-100 text-gray-700 border border-gray-300",
    gradient:
      "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && (
        <svg
          className="animate-spin h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      {icon && !loading && icon}
      {children}
    </button>
  );
};

// Custom Input Component
const Input = ({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  type = "text",
  icon,
}: {
  label?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
  icon?: string;
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-bold mb-2 text-gray-800">
          {icon && <span className="mr-2">{icon}</span>}
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
    </div>
  );
};

// Custom Textarea Component
const Textarea = ({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  icon,
}: {
  label?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  icon?: string;
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-bold mb-2 text-gray-800">
          {icon && <span className="mr-2">{icon}</span>}
          {label}
        </label>
      )}
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none"
      />
    </div>
  );
};

// Custom Time Picker
const TimePicker = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (time: string) => void;
  placeholder?: string;
}) => {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 text-base text-gray-900 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
    />
  );
};

// Custom Date Picker
const DatePicker = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
}) => {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 text-base text-gray-900 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
    />
  );
};

export default function EmailComposer({ emailTemplate }: EmailComposerProps) {
  // Form state - replacing Ant Design Form
  const [formData, setFormData] = useState({
    to: "",
    subject: "",
    content: "",
  });

  const [sending, setSending] = useState(false);
  const [enhancingSubject, setEnhancingSubject] = useState(false);
  const [enhancingContent, setEnhancingContent] = useState(false);

  const MAX_RECIPIENTS = 20;
  const [recipients, setRecipients] = useState<string[]>([]);
  const [scheduleType, setScheduleType] = useState<"immediate" | "scheduled">(
    "immediate"
  );
  const [scheduleDate, setScheduleDate] = useState<any>(null);
  const [selectedScheduleLabel, setSelectedScheduleLabel] =
    useState<string>("");
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [customDate, setCustomDate] = useState<string>("");
  const [customTime, setCustomTime] = useState<string>("");
  const [showAllEmailsModal, setShowAllEmailsModal] = useState(false);

  // Load template when prop changes - THIS NOW WORKS!
  useEffect(() => {
    // console.log("=== TEMPLATE UPDATED ===");
    // console.log("emailTemplate:", emailTemplate);

    if (emailTemplate?.subject && emailTemplate?.body) {
      console.log(" Setting form data");
      setFormData((prev) => ({
        ...prev,
        subject: emailTemplate.subject,
        content: emailTemplate.body,
      }));
    //   message.success(" Template loaded successfully!");
    //   console.log(" Done!");
    }
  }, [emailTemplate]);

  // Load recipients from URL or localStorage
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const emailsFromUrl = urlParams.get("emails");

      if (emailsFromUrl) {
        const emailList = decodeURIComponent(emailsFromUrl)
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean);
        const unique = Array.from(new Set(emailList)).slice(0, MAX_RECIPIENTS);
        if (unique.length > 0) {
          setFormData((prev) => ({ ...prev, to: unique.join(", ") }));
          setRecipients(unique);
          message.success(
            `Loaded ${unique.length} selected investors from matchmaking`
          );
          return;
        }
      }

      const raw = localStorage.getItem("selectedInvestors");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const emails: string[] = Array.isArray(parsed)
        ? parsed
            .map((r: any) => r.displayEmail || r.partner_email || r.email)
            .filter((e: any) => typeof e === "string" && e.includes("@"))
        : [];
      const unique = Array.from(new Set(emails)).slice(0, MAX_RECIPIENTS);
      if (unique.length > 0) {
        setFormData((prev) => ({ ...prev, to: unique.join(", ") }));
        setRecipients(unique);
        message.success(
          `Loaded ${unique.length} recipient${
            unique.length > 1 ? "s" : ""
          } from selection`
        );
      }
    } catch {}
  }, []);

const enhanceSubject = async () => {
  if (!formData.subject) {
    message.warning("Please enter a subject line first");
    return;
  }

  setEnhancingSubject(true);
  try {
    const response = await fetch(`${BACKEND_URL}/ai/optimize-subject`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        currentSubject: formData.subject,
        context: "Investment opportunity outreach",
        tone: "professional"
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to optimize subject line");
    }

    if (data.success && data.optimized_subject) {
      setFormData((prev) => ({ ...prev, subject: data.optimized_subject }));
      message.success("Subject line enhanced with AI!");
    } else {
      throw new Error("Invalid response from AI service");
    }
  } catch (error) {
    console.error("Subject enhancement error:", error);
    message.error( "Failed to enhance subject line. Please try again.");
  } finally {
    setEnhancingSubject(false);
  }
};

const enhanceContent = async () => {
  if (!formData.content) {
    message.warning("Please enter email content first");
    return;
  }

  setEnhancingContent(true);
  try {
    const response = await fetch(`${BACKEND_URL}/ai/enhance-email-body`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        emailBody: formData.content,
        tone: "professional",
        context: "Investment opportunity outreach"
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to enhance email content");
    }

    if (data.success && data.enhanced_body) {
      setFormData((prev) => ({ ...prev, content: data.enhanced_body }));
      
      // Show improvements in a success message if available
      if (data.improvements && data.improvements.length > 0) {
        message.success(`Email enhanced!`);
      } else {
        message.success("Email content enhanced with AI!");
      }
    } else {
      throw new Error("Invalid response from AI service");
    }
  } catch (error) {
    console.error("Content enhancement error:", error);
    message.error("Failed to enhance email content. Please try again.");
  } finally {
    setEnhancingContent(false);
  }
};


  const sendEmail = async () => {
    // Validation
    if (!formData.to || !formData.subject || !formData.content) {
      message.error("Please fill in all required fields!");
      return;
    }

    setSending(true);
    try {
      const toList = formData.to
        .split(/[;,\n\s]+/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.includes("@"));
      const deduped = Array.from(new Set(toList)).slice(0, MAX_RECIPIENTS);

      if (scheduleType === "scheduled" && scheduleDate) {
        const urlParams = new URLSearchParams(window.location.search);
        const companyId = urlParams.get("companyId") || "test-company-123";

        const payload = {
          companyId: companyId,
          investorIds: deduped,
          subject: formData.subject,
          htmlContent: formData.content,
          scheduleAt: new Date(scheduleDate).toISOString(),
        };

        const response = await fetch(`${BACKEND_URL}/scheduled-emails`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to schedule email");
        }

        message.success(
          `Email scheduled for ${selectedScheduleLabel || "selected time"}`
        );
        setFormData({ to: "", subject: "", content: "" });
        setScheduleType("immediate");
        setScheduleDate(null);
        setSelectedScheduleLabel("");
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const clientId = urlParams.get("clientId");
      const clientName = urlParams.get("clientName") || "Test Client";

      let clientData = null;
      if (clientId) {
        const clients = JSON.parse(localStorage.getItem("clients") || "[]");
        clientData = clients.find(
          (c: any) =>
            String(
              c.id ||
                c._id ||
                c.email ||
                (c.company_name && c.company_name.replace(/\s+/g, "-"))
            ) === String(clientId)
        );
      }

      if (!clientData) {
        const storedClient = localStorage.getItem("currentClient");
        if (storedClient) {
          clientData = JSON.parse(storedClient);
        }
      }

      const companyId = clientData?.id || "test-company-123";

      const payload = {
        companyId: companyId,
        clientData: clientData,
        investorIds: deduped,
        subject: formData.subject,
        companyName: clientData?.company_name || "Investment Opportunity",
        htmlContent: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
          ${formData.content.replace(/\n/g, "<br>")}
        </div>`,
      };

      const response = await fetch(`${BACKEND_URL}/client-email/send-bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        message.success(
          ` Bulk email job started! ${result.totalEmails} emails will be sent from ${clientName}'s Gmail account.`
        );
        message.info(`Estimated time: ${result.estimatedTime}`);
      } else {
        throw new Error(result.error || "Failed to send email");
      }

      try {
        const campaigns = JSON.parse(localStorage.getItem("campaigns") || "[]");
        const campaignIndex = campaigns.findIndex(
          (c: any) => c.clientName === clientName && c.status === "draft"
        );

        if (campaignIndex !== -1) {
          campaigns[campaignIndex].status = "Active";
          campaigns[campaignIndex].recipients =
            (campaigns[campaignIndex].recipients || 0) + deduped.length;
          campaigns[campaignIndex].emailsSent =
            (campaigns[campaignIndex].emailsSent || 0) + deduped.length;
          campaigns[campaignIndex].lastSentAt = new Date().toISOString();
          campaigns[campaignIndex].subject = formData.subject;
          campaigns[campaignIndex].body = formData.content;

          if (!campaigns[campaignIndex].sentEmails)
            campaigns[campaignIndex].sentEmails = [];
          campaigns[campaignIndex].sentEmails.push(
            ...deduped.map((email) => ({
              email,
              sentAt: new Date().toISOString(),
              subject: formData.subject,
            }))
          );

          localStorage.setItem("campaigns", JSON.stringify(campaigns));
          message.success(
            `${clientName} campaign updated: ${deduped.length} emails sent`
          );
        }
      } catch (e) {
        console.error("Failed to create campaign/report:", e);
      }

      setFormData({ to: "", subject: "", content: "" });
      setRecipients([]);
    } catch (err: any) {
      console.error("Email send error:", err);
      if (typeof err?.message === "string" && err.message.includes("fetch")) {
        message.error(
          "Cannot connect to backend server. Please ensure the backend is running on port 5000."
        );
      } else {
        message.error(err?.message || "Failed to send email");
      }
    } finally {
      setSending(false);
    }
  };

  const handleScheduleFromPreset = () => {
    try {
      setScheduleType("scheduled");
      sendEmail();
    } catch {}
  };

  const removeSchedule = () => {
    setScheduleType("immediate");
    setScheduleDate(null);
    setSelectedScheduleLabel("");
    message.success("Schedule removed - email will be sent immediately");
  };

  const formatInIST = (d: Date) => {
    try {
      return new Intl.DateTimeFormat("en-IN", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      })
        .format(d)
        .replace(", ", ", ");
    } catch {
      return d.toLocaleString("en-IN");
    }
  };

  const tomorrowMorning = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(8, 0, 0, 0);
    return d;
  };
  const tomorrowAfternoon = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(13, 0, 0, 0);
    return d;
  };
  const nextMondayMorning = () => {
    const d = new Date();
    const day = d.getDay();
    const add = (8 - day) % 7 || 7;
    d.setDate(d.getDate() + add);
    d.setHours(8, 0, 0, 0);
    return d;
  };

  return (
    <>
      <div className="min-h-screen bg-white">
        <div className="max-w-5xl mx-auto">
          {/* Header Section */}
          <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-lg p-8 mb-8 text-white">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl mb-4 shadow-lg">
                  <svg
                    className="w-10 h-10 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-3">
                  Email Composer
                </h1>
                <p className="text-blue-100 text-lg">
                  Compose and send personalized investor outreach emails with AI
                  assistance
                </p>
              </div>
              <div>
                <Button
                  onClick={() => setScheduleModalOpen(true)}
                  variant="ghost"
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white border-2 border-white border-opacity-40 backdrop-blur-sm"
                  icon={
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  }
                >
                  Schedule Send
                </Button>
              </div>
            </div>

            {/* Schedule Badge */}
            {selectedScheduleLabel && (
              <div className="mt-6 inline-flex items-center gap-3 bg-white bg-opacity-20 backdrop-blur-sm border-2 border-white border-opacity-30 rounded-xl px-5 py-3">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-white font-semibold">
                  Scheduled: {selectedScheduleLabel}
                </span>
                <button
                  onClick={() => setScheduleModalOpen(true)}
                  className="text-white hover:text-blue-200 text-sm underline font-medium"
                >
                  change
                </button>
                <button
                  onClick={() => {
                    setSelectedScheduleLabel("");
                    setScheduleType("immediate");
                    try {
                      localStorage.removeItem("selectedScheduleLabel");
                    } catch {}
                  }}
                  className="text-white hover:text-red-200 ml-1 font-bold text-xl"
                  title="Remove schedule"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          {/* Main Form Card */}
          <div className="bg-white border-gray-100">
            <div className="space-y-6">
              {/* From Email */}
              <Input
                label="From Email"
                icon="📧"
                type="email"
                disabled
                value={(() => {
                  const urlParams = new URLSearchParams(window.location.search);
                  const clientId = urlParams.get("clientId");
                  if (clientId) {
                    const clients = JSON.parse(
                      localStorage.getItem("clients") || "[]"
                    );
                    const client = clients.find(
                      (c: any) => String(c.id || c._id) === String(clientId)
                    );
                    if (client?.email) return client.email;
                  }
                  const currentClient = JSON.parse(
                    localStorage.getItem("currentClient") || "{}"
                  );
                  return currentClient.email || "No email configured";
                })()}
                onChange={() => {}}
              />

              {/* To Email */}
              <div>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      label="To Email"
                      icon="📧"
                      value={formData.to}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setFormData((prev) => ({ ...prev, to: newValue }));
                        const list = newValue
                          .split(/[;,\n\s]+/)
                          .map((s) => s.trim())
                          .filter((s) => s.includes("@"));
                        setRecipients(
                          Array.from(new Set(list)).slice(0, MAX_RECIPIENTS)
                        );
                      }}
                      placeholder="investor1@example.com, investor2@example.com"
                    />
                  </div>

                  {recipients.length > 0 && (
                    <div className="md:mt-8">
                      <Button
                        onClick={() => setShowAllEmailsModal(true)}
                        variant="secondary"
                        icon={
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        }
                      >
                        View All ({recipients.length})
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Subject Line */}
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-800">
                  <span className="mr-2">📝</span>Subject Line
                </label>
                <div className="flex flex-col md:flex-row gap-3">
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        subject: e.target.value,
                      }))
                    }
                    placeholder="Partnership Opportunity - [Your Company]"
                    className="flex-1 px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                  <Button
                    onClick={enhanceSubject}
                    loading={enhancingSubject}
                    variant="gradient"
                    icon={
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                    }
                  >
                    {enhancingSubject ? "Enhancing..." : "AI Enhance"}
                  </Button>
                </div>
              </div>

              {/* Email Content */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-gray-800">
                    <span className="mr-2">✉️</span>Email Content
                  </label>
                  <Button
                    onClick={enhanceContent}
                    loading={enhancingContent}
                    variant="gradient"
                    size="sm"
                    icon={
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                    }
                  >
                    {enhancingContent
                      ? "AI Enhancing..."
                      : "AI Enhance Content"}
                  </Button>
                </div>
                <Textarea
                  value={formData.content}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      content: e.target.value,
                    }))
                  }
                  rows={14}
                  placeholder="Hi [Investor Name],&#10;&#10;I hope this email finds you well..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
                <Button
                  onClick={() =>
                    setFormData({ to: "", subject: "", content: "" })
                  }
                  variant="ghost"
                  size="lg"
                  icon={
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  }
                >
                  Clear
                </Button>
                {scheduleType === "scheduled" && selectedScheduleLabel && (
                  <Button
                    onClick={removeSchedule}
                    variant="danger"
                    size="lg"
                    icon={
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    }
                  >
                    Remove Schedule
                  </Button>
                )}
                <Button
                  onClick={sendEmail}
                  loading={sending}
                  variant="gradient"
                  size="lg"
                  className="min-w-[200px]"
                  icon={
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  }
                >
                  {sending
                    ? "Sending..."
                    : scheduleType === "scheduled"
                    ? `Schedule for ${selectedScheduleLabel}`
                    : "Send Email"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      <Modal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        width="max-w-3xl"
      >
        <div className="bg-gradient-to-br from-gray-900 to-black text-white p-8">
          <h2 className="text-2xl font-bold mb-6 text-center">
            Schedule Your Email
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Tomorrow Morning */}
            <button
              className="text-left bg-gray-800 hover:bg-gray-700 rounded-xl p-6 transition-all duration-200 border-2 border-transparent hover:border-blue-500"
              onClick={() => {
                const d = tomorrowMorning();
                setScheduleType("scheduled");
                setScheduleDate(d);
                const label = "Tomorrow morning · 8:00 AM";
                setSelectedScheduleLabel(label);
                try {
                  localStorage.setItem("selectedScheduleLabel", label);
                } catch {}
                handleScheduleFromPreset();
                setScheduleModalOpen(false);
              }}
            >
              <div className="text-4xl mb-3">🌅</div>
              <div className="font-bold text-xl mb-2">Tomorrow morning</div>
              <div className="text-gray-400 text-sm">
                {formatInIST(tomorrowMorning())}
              </div>
            </button>

            {/* Tomorrow Afternoon */}
            <button
              className="text-left bg-gray-800 hover:bg-gray-700 rounded-xl p-6 transition-all duration-200 border-2 border-transparent hover:border-blue-500"
              onClick={() => {
                const d = tomorrowAfternoon();
                setScheduleType("scheduled");
                setScheduleDate(d);
                const label = "Tomorrow afternoon · 1:00 PM";
                setSelectedScheduleLabel(label);
                try {
                  localStorage.setItem("selectedScheduleLabel", label);
                } catch {}
                handleScheduleFromPreset();
                setScheduleModalOpen(false);
              }}
            >
              <div className="text-4xl mb-3">☀️</div>
              <div className="font-bold text-xl mb-2">Tomorrow afternoon</div>
              <div className="text-gray-400 text-sm">
                {formatInIST(tomorrowAfternoon())}
              </div>
            </button>

            {/* Monday Morning */}
            <button
              className="text-left bg-gray-800 hover:bg-gray-700 rounded-xl p-6 transition-all duration-200 border-2 border-transparent hover:border-blue-500"
              onClick={() => {
                const d = nextMondayMorning();
                setScheduleType("scheduled");
                setScheduleDate(d);
                const label = "Monday morning · 8:00 AM";
                setSelectedScheduleLabel(label);
                try {
                  localStorage.setItem("selectedScheduleLabel", label);
                } catch {}
                handleScheduleFromPreset();
                setScheduleModalOpen(false);
              }}
            >
              <div className="text-4xl mb-3">📅</div>
              <div className="font-bold text-xl mb-2">Monday morning</div>
              <div className="text-gray-400 text-sm">
                {formatInIST(nextMondayMorning())}
              </div>
            </button>

            {/* Custom Date & Time */}
            <div className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700">
              <div className="text-4xl mb-3">🕐</div>
              <div className="font-bold text-xl mb-4">Pick date & time</div>
              <div className="space-y-3">
                <TimePicker
                  value={customTime}
                  onChange={(v) => setCustomTime(v)}
                  placeholder="Select time"
                />
                <DatePicker
                  value={customDate}
                  onChange={(v) => setCustomDate(v)}
                  placeholder="Select date"
                />
              </div>
              <div className="mt-4">
                <Button
                  onClick={() => {
                    if (!customDate || !customTime) return;
                    const d = new Date(customDate);
                    const [hours, minutes] = customTime.split(":");
                    d.setHours(
                      Number.parseInt(hours),
                      Number.parseInt(minutes),
                      0,
                      0
                    );
                    setScheduleType("scheduled");
                    setScheduleDate(d);
                    const label = `${d.toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                    })}, ${d.toLocaleTimeString("en-IN", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}`;
                    setSelectedScheduleLabel(label);
                    try {
                      localStorage.setItem("selectedScheduleLabel", label);
                    } catch {}
                    handleScheduleFromPreset();
                    setScheduleModalOpen(false);
                  }}
                  disabled={!customDate || !customTime}
                  variant="primary"
                  className="w-full"
                >
                  Confirm
                </Button>
              </div>
            </div>
          </div>

          <div className="text-center text-gray-400 text-sm mb-4">
            All times are in India Standard Time
          </div>

          <div className="flex justify-center">
            <Button
              onClick={() => setScheduleModalOpen(false)}
              variant="danger"
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* All Recipients Modal */}
      <Modal
        isOpen={showAllEmailsModal}
        onClose={() => setShowAllEmailsModal(false)}
        title={`All Recipients (${recipients.length})`}
        width="max-w-3xl"
      >
        <div className="p-6">
          <div className="max-h-96 overflow-y-auto space-y-2">
            {recipients.map((email, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 font-bold text-sm min-w-[30px]">
                    {index + 1}.
                  </span>
                  <span className="font-medium text-gray-800">{email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(email);
                      message.success("Email copied!");
                    }}
                    className="px-3 py-1 text-sm font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => {
                      const newList = recipients.filter((r) => r !== email);
                      setRecipients(newList);
                      setFormData((prev) => ({
                        ...prev,
                        to: newList.join(", "),
                      }));
                      message.success("Email removed!");
                    }}
                    className="px-3 py-1 text-sm font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              onClick={() => {
                navigator.clipboard.writeText(recipients.join(", "));
                message.success("All emails copied to clipboard!");
              }}
              variant="primary"
            >
              Copy All
            </Button>
            <Button
              onClick={() => setShowAllEmailsModal(false)}
              variant="secondary"
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Custom Animations */}
      <style jsx global>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scale-in {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
}
