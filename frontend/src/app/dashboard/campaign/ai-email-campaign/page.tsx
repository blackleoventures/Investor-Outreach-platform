"use client";

import { useState } from "react";
import { RobotOutlined, MailOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import AIPitchAnalysis from "@/components/ai-pitch-analysis";
import EmailComposer from "@/components/email-composer";

export default function AIEmailCampaignPage() {
  const [activeTab, setActiveTab] = useState("1");
  const [emailTemplate, setEmailTemplate] = useState<{
    subject: string;
    body: string;
  } | null>(null);

  const handleTemplateGenerated = (template: {
    subject: string;
    body: string;
  }) => {
    setEmailTemplate(template);
    console.log("Generated Template:", template);
    setActiveTab("2");
  };

  const tabData = [
    {
      key: "1",
      label: "AI Pitch Analysis",
      icon: <RobotOutlined className="text-base sm:text-lg" />,
      content: (
        <AIPitchAnalysis onTemplateGenerated={handleTemplateGenerated} />
      ),
    },
    {
      key: "2",
      label: "Email Composer",
      icon: <MailOutlined className="text-base sm:text-lg" />,
      content: <EmailComposer emailTemplate={emailTemplate} />,
    },
  ];

  return (
    <div className="min-h-screen rounded-lg bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header Section - Fully Responsive */}
      <div className="px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 lg:pt-16 pb-6 sm:pb-8 lg:pb-12">
        <div className="text-center max-w-6xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-3 sm:mb-4 lg:mb-6 leading-tight">
            🤖 AI Email Campaign
          </h1>

          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-700 max-w-2xl sm:max-w-3xl lg:max-w-4xl mx-auto mb-6 sm:mb-8 lg:mb-10 leading-relaxed px-2 sm:px-4 font-medium">
            Advanced AI-powered investor outreach with pitch deck analysis,
            smart matching, and automated email generation
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 lg:gap-6 px-2 sm:px-4">
            <div className="bg-white/95 backdrop-blur-sm px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-full shadow-lg border border-purple-200 w-full sm:w-auto max-w-xs sm:max-w-none">
              <span className="text-sm sm:text-base lg:text-lg font-semibold text-purple-700 whitespace-nowrap">
                📊 AI Pitch Analysis
              </span>
            </div>
            <div className="bg-white/95 backdrop-blur-sm px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-full shadow-lg border border-pink-200 w-full sm:w-auto max-w-xs sm:max-w-none">
              <span className="text-sm sm:text-base lg:text-lg font-semibold text-pink-700 whitespace-nowrap">
                ✨ Auto Email Generation
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Professional Tabs Container */}
      <div className="px-4 sm:px-6 lg:px-8 pb-8">
        <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Tab Navigation - Industry Standard */}
          <div className="border-b border-gray-200 bg-gray-50/50">
            <nav className="flex overflow-x-auto scrollbar-hide" role="tablist">
              {tabData.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  aria-controls={`tabpanel-${tab.key}`}
                  className={`
                    group relative min-w-0 flex-1 whitespace-nowrap
                    px-4 sm:px-6 lg:px-8 py-3 sm:py-4
                    text-sm sm:text-base font-medium
                    border-b-2 transition-colors duration-150
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset
                    ${
                      activeTab === tab.key
                        ? "border-blue-600 text-blue-600 bg-blue-50/30"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }
                  `}
                >
                  <div className="flex items-center justify-center gap-2 sm:gap-3">
                    <span
                      className={`
                      transition-colors duration-150
                      ${
                        activeTab === tab.key
                          ? "text-blue-600"
                          : "text-gray-400 group-hover:text-gray-500"
                      }
                    `}
                    >
                      {tab.icon}
                    </span>
                    <span className="hidden sm:inline truncate">
                      {tab.label}
                    </span>
                    <span className="sm:hidden text-xs truncate max-w-20">
                      {tab.label.split(" ")[0]}
                    </span>
                  </div>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Panels */}
          <div className="relative min-h-[400px]">
            {tabData.map((tab) => (
              <div
                key={tab.key}
                id={`tabpanel-${tab.key}`}
                role="tabpanel"
                aria-labelledby={`tab-${tab.key}`}
                hidden={activeTab !== tab.key}
                className="focus:outline-none"
              >
                {activeTab === tab.key && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="p-4 sm:p-6 lg:p-8"
                  >
                    {tab.content}
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
