"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Steps,
  Button,
  Card,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  UserOutlined,
  AimOutlined,
  ThunderboltOutlined,
  MailOutlined,
  ClockCircleOutlined,
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

const STORAGE_KEY = "create-campaign-wizard-state";

export default function CreateCampaignPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  // Campaign data state
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [targetType, setTargetType] = useState<"investors" | "incubators" | "both">("both");
  const [matchResults, setMatchResults] = useState<any>(null);
  const [emailTemplate, setEmailTemplate] = useState<any>(null);
  const [scheduleConfig, setScheduleConfig] = useState<any>(null);
  const [hydrated, setHydrated] = useState(false);

  // Rehydrate wizard state from sessionStorage on mount.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && typeof saved === "object") {
          if (typeof saved.currentStep === "number") setCurrentStep(saved.currentStep);
          if (saved.selectedClient) setSelectedClient(saved.selectedClient);
          if (saved.targetType) setTargetType(saved.targetType);
          if (saved.matchResults) setMatchResults(saved.matchResults);
          if (saved.emailTemplate) setEmailTemplate(saved.emailTemplate);
          if (saved.scheduleConfig) setScheduleConfig(saved.scheduleConfig);
        }
      }
    } catch (error) {
      // Corrupt/unparseable state — start fresh without crashing.
      console.warn("Failed to restore campaign wizard state:", error);
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {}
    } finally {
      setHydrated(true);
    }
  }, []);

  // Persist wizard state on change. Note: in-memory File blobs (e.g. attachment
  // File objects) are not serializable and are intentionally not persisted.
  useEffect(() => {
    if (!hydrated) return;
    try {
      const toPersist = {
        currentStep,
        selectedClient,
        targetType,
        matchResults,
        emailTemplate,
        scheduleConfig,
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist));
    } catch (error) {
      console.warn("Failed to persist campaign wizard state:", error);
    }
  }, [
    hydrated,
    currentStep,
    selectedClient,
    targetType,
    matchResults,
    emailTemplate,
    scheduleConfig,
  ]);

  const clearWizardState = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const steps = [
    {
      title: "Select Client",
      icon: <UserOutlined />,
    },
    {
      title: "Target Audience",
      icon: <AimOutlined />,
    },
    {
      title: "Match Results",
      icon: <ThunderboltOutlined />,
    },
    {
      title: "Email Template",
      icon: <MailOutlined />,
    },
    {
      title: "Schedule",
      icon: <ClockCircleOutlined />,
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
    // Gate transitions that matter; per-step components self-police the rest.
    if (currentStep === 0 && !selectedClient) {
      message.error("Please select a client before continuing");
      return;
    }
    if (currentStep === 2) {
      const total = matchResults?.totalMatches ?? matchResults?.matches?.length ?? 0;
      if (!matchResults || total === 0) {
        message.error("You need at least one matched recipient to continue");
        return;
      }
    }
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
            onActivated={clearWizardState}
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
        <Steps current={currentStep} items={steps} size="small" responsive />
      </Card>

      {/* Step Content */}
      <div className="min-h-[500px]">
        {renderStepContent()}
      </div>
    </div>
  );
}
