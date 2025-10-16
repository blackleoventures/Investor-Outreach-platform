"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Steps,
  Button,
  Card,
  message,
  Spin,
} from "antd";
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { auth } from "@/lib/firebase";

// Import step components (we'll create these next)
import ClientSelection from "./components/ClientSelection";
import TargetAudience from "./components/TargetAudience";
import MatchResults from "./components/MatchResults";
import EmailTemplate from "./components/EmailTemplate";
import ScheduleConfig from "./components/ScheduleConfig";
import FinalReview from "./components/FinalReview";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function CreateCampaignPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Campaign data state
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [targetType, setTargetType] = useState<"investors" | "incubators" | "both">("both");
  const [matchResults, setMatchResults] = useState<any>(null);
  const [emailTemplate, setEmailTemplate] = useState<any>(null);
  const [scheduleConfig, setScheduleConfig] = useState<any>(null);

  const steps = [
    {
      title: "Select Client",
      icon: <CheckCircleOutlined />,
    },
    {
      title: "Target Audience",
      icon: <CheckCircleOutlined />,
    },
    {
      title: "Match Results",
      icon: <CheckCircleOutlined />,
    },
    {
      title: "Email Template",
      icon: <CheckCircleOutlined />,
    },
    {
      title: "Schedule",
      icon: <CheckCircleOutlined />,
    },
    {
      title: "Review & Activate",
      icon: <CheckCircleOutlined />,
    },
  ];

  const getAuthToken = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        message.error("Please log in again");
        router.push("/");
        return null;
      }
      return await user.getIdToken(true);
    } catch (error) {
      console.error("Auth error:", error);
      message.error("Authentication failed");
      return null;
    }
  };

  const handleNext = () => {
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <ClientSelection
            selectedClient={selectedClient}
            onClientSelect={setSelectedClient}
            onNext={handleNext}
            getAuthToken={getAuthToken}
          />
        );
      case 1:
        return (
          <TargetAudience
            targetType={targetType}
            onTargetSelect={setTargetType}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 2:
        return (
          <MatchResults
            selectedClient={selectedClient}
            targetType={targetType}
            matchResults={matchResults}
            onMatchComplete={setMatchResults}
            onNext={handleNext}
            onBack={handleBack}
            getAuthToken={getAuthToken}
          />
        );
      case 3:
        return (
          <EmailTemplate
            selectedClient={selectedClient}
            emailTemplate={emailTemplate}
            onTemplateUpdate={setEmailTemplate}
            onNext={handleNext}
            onBack={handleBack}
            getAuthToken={getAuthToken}
          />
        );
      case 4:
        return (
          <ScheduleConfig
            selectedClient={selectedClient}
            matchResults={matchResults}
            scheduleConfig={scheduleConfig}
            onScheduleUpdate={setScheduleConfig}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 5:
        return (
          <FinalReview
            selectedClient={selectedClient}
            targetType={targetType}
            matchResults={matchResults}
            emailTemplate={emailTemplate}
            scheduleConfig={scheduleConfig}
            onBack={handleBack}
            getAuthToken={getAuthToken}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push("/dashboard/campaigns")}
          className="mb-4"
        >
          Back to Campaigns
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Create New Campaign</h1>
        <p className="text-gray-600 mt-1">
          Set up a new email outreach campaign for your client
        </p>
      </div>

      {/* Progress Steps */}
      <Card className="mb-6">
        <Steps current={currentStep} items={steps} />
      </Card>

      {/* Step Content */}
      <div className="min-h-[500px]">
        {renderStepContent()}
      </div>
    </div>
  );
}
