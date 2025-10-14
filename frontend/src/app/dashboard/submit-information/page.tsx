"use client";

import { useState, useEffect } from "react";
import {
  Steps,
  Button,
  Card,
  message,
  Alert,
  Space,
  Typography,
  Spin,
  Divider,
} from "antd";
import {
  FormOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  MailOutlined,
  SendOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/AuthContext";
import ClientInformationForm from "@/components/ClientInformationForm";
import ClientAIPitchAnalysis from "@/components/ClientAIPitchAnalysis";

const { Title, Text } = Typography;

interface UsageLimits {
  pitchAnalysisCount: number;
  formEditCount: number;
  maxPitchAnalysis: number;
  maxFormEdits: number;
  canEditForm: boolean;
  canAnalyzePitch: boolean;
}

interface ClientSubmission {
  id: string;
  userId: string;
  submissionId: string;
  clientInformation: any;
  pitchAnalyses: any[];
  usageLimits: UsageLimits;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function SubmitInformation() {
  const { currentUser } = useAuth();
  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submission, setSubmission] = useState<ClientSubmission | null>(null);
  const [current, setCurrent] = useState(0);
  const [clientData, setClientData] = useState<any>(null);
  const [pitchData, setPitchData] = useState<any>(null);
  const [emailConfiguration, setEmailConfiguration] = useState<any>(null);

  useEffect(() => {
    if (currentUser) {
      checkSubmissionStatus();
    }
  }, [currentUser]);

  const checkSubmissionStatus = async () => {
    setPageLoading(true);
    try {
      const token = await currentUser?.getIdToken();
      console.log("[Frontend] Checking submission status for user:", currentUser?.uid);

      const response = await fetch(
        `${API_BASE_URL}/client-submissions/my-submission`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("[Frontend] Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("[Frontend] Response data:", data);

        if (data.data) {
          // Returning user - has submitted before
          console.log("[Frontend] Returning user - submission found");
          setHasSubmitted(true);
          setSubmission(data.data);
          setClientData(data.data.clientInformation);
        } else {
          // First time user - load from localStorage if exists
          console.log("[Frontend] First time user - no submission found");
          const savedClientData = localStorage.getItem("clientFormData");
          const savedEmailConfig = localStorage.getItem("emailConfiguration");
          const savedPitchData = localStorage.getItem("pitchAnalysisData");

          if (savedClientData) {
            setClientData(JSON.parse(savedClientData));
          }
          if (savedEmailConfig) {
            setEmailConfiguration(JSON.parse(savedEmailConfig));
          }
          if (savedPitchData) {
            setPitchData(JSON.parse(savedPitchData));
          }
        }
      } else {
        const errorData = await response.json().catch(() => null);
        console.error("[Frontend] Error response:", errorData);
        throw new Error(errorData?.error?.message || "Failed to fetch");
      }
    } catch (error) {
      console.error("[Frontend] Error checking submission status:", error);
      message.error("Failed to load your submission status");
    } finally {
      setPageLoading(false);
    }
  };

  // FIRST TIME USER HANDLERS
  const handleFormNext = (formData: any) => {
    console.log("[Frontend] Form data received:", formData);

    // Extract SMTP configuration
    const {
      platformName,
      senderEmail,
      smtpHost,
      smtpPort,
      smtpSecurity,
      smtpUsername,
      smtpPassword,
      smtpTestStatus,
      smtpTestRecipient,
      smtpTestDate,
      ...clientInfo
    } = formData;

    const emailConfig = {
      platformName,
      senderEmail,
      smtpHost,
      smtpPort,
      smtpSecurity,
      smtpUsername,
      smtpPassword,
      testStatus: smtpTestStatus,
      testRecipient: smtpTestRecipient,
      testDate: smtpTestDate,
    };

    setClientData(clientInfo);
    setEmailConfiguration(emailConfig);

    // Save to localStorage
    localStorage.setItem("clientFormData", JSON.stringify(clientInfo));
    localStorage.setItem("emailConfiguration", JSON.stringify(emailConfig));

    message.success("Information saved!");
    setCurrent(1);
  };

  const handlePitchNext = (analysis: any) => {
    setPitchData(analysis);
    localStorage.setItem("pitchAnalysisData", JSON.stringify(analysis));
    message.success("Analysis saved!");
    setCurrent(2);
  };

  const handleInitialSubmit = async () => {
    if (!clientData) {
      message.error("Please complete the client information form first");
      return;
    }

    if (!emailConfiguration || emailConfiguration.testStatus !== "passed") {
      message.error("Please test your email configuration before submitting");
      return;
    }

    if (!pitchData) {
      message.error("Please upload and analyze your pitch deck before submitting");
      return;
    }

    setSubmitting(true);
    try {
      const token = await currentUser?.getIdToken();

      const payload = {
        userId: currentUser?.uid,
        clientInformation: clientData,
        emailConfiguration: emailConfiguration,
        pitchAnalyses: [pitchData],
        usageLimits: {
          formEditCount: 1,
          pitchAnalysisCount: 1,
          maxFormEdits: 4,
          maxPitchAnalysis: 2,
          canEditForm: true,
          canAnalyzePitch: true,
        },
      };

      console.log("[Frontend] Submitting application:", payload);

      const response = await fetch(
        `${API_BASE_URL}/client-submissions/submit`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      console.log("[Frontend] Submit response:", data);

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to submit");
      }

      // Clear localStorage
      localStorage.removeItem("clientFormData");
      localStorage.removeItem("emailConfiguration");
      localStorage.removeItem("pitchAnalysisData");

      setHasSubmitted(true);
      setSubmission(data.data);
      setClientData(data.data.clientInformation);
      setCurrent(0);

      message.success("Your application has been submitted successfully! We will review it within 24 hours.");
    } catch (error: any) {
      console.error("[Frontend] Submit error:", error);
      message.error(error.message || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  // RETURNING USER HANDLERS
  const handleEditClick = () => {
    if (!submission) return;

    if (
      submission.usageLimits.formEditCount >=
      submission.usageLimits.maxFormEdits
    ) {
      message.error({
        content: `You have reached the maximum number of edits (${submission.usageLimits.maxFormEdits}/${submission.usageLimits.maxFormEdits}). Please contact admin@company.com for additional edits.`,
        duration: 5,
      });
      return;
    }

    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Revert to original data
    if (submission) {
      setClientData(submission.clientInformation);
    }
  };

  const handleUpdateInfo = async (formData: any) => {
    if (!submission) return;

    setSubmitting(true);
    try {
      const token = await currentUser?.getIdToken();
      console.log("[Frontend] Updating client info");

      // Extract SMTP configuration
      const {
        platformName,
        senderEmail,
        smtpHost,
        smtpPort,
        smtpSecurity,
        smtpUsername,
        smtpPassword,
        smtpTestStatus,
        smtpTestRecipient,
        ...clientInfo
      } = formData;

      const emailConfig = {
        platformName,
        senderEmail,
        smtpHost,
        smtpPort,
        smtpSecurity,
        smtpUsername,
        smtpPassword: smtpPassword === "••••••••••••••" ? undefined : smtpPassword,
        testStatus: smtpTestStatus,
        testRecipient: smtpTestRecipient,
      };

      const response = await fetch(
        `${API_BASE_URL}/client-submissions/update-info`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clientInformation: clientInfo,
            emailConfiguration: emailConfig,
          }),
        }
      );

      const data = await response.json();
      console.log("[Frontend] Update response:", data);

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to update");
      }

      setSubmission(data.data);
      setClientData(data.data.clientInformation);
      setIsEditing(false);

      message.success(
        `Information updated successfully! (${data.data.usageLimits.formEditCount}/${data.data.usageLimits.maxFormEdits} edits used)`
      );
    } catch (error: any) {
      console.error("[Frontend] Update error:", error);
      message.error(error.message || "Failed to update");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPitchAnalysis = async (analysis: any) => {
    if (!submission) return;

    if (
      submission.usageLimits.pitchAnalysisCount >=
      submission.usageLimits.maxPitchAnalysis
    ) {
      message.error("You have reached the maximum number of pitch analyses");
      return;
    }

    setSubmitting(true);
    try {
      const token = await currentUser?.getIdToken();
      console.log("[Frontend] Adding pitch analysis");

      const response = await fetch(
        `${API_BASE_URL}/client-submissions/add-pitch-analysis`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ pitchAnalysis: analysis }),
        }
      );

      const data = await response.json();
      console.log("[Frontend] Add pitch response:", data);

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to add pitch analysis");
      }

      setSubmission(data.data);

      message.success(
        `Pitch analysis added successfully! (${data.data.usageLimits.pitchAnalysisCount}/${data.data.usageLimits.maxPitchAnalysis} analyses used)`
      );
    } catch (error: any) {
      console.error("[Frontend] Add pitch error:", error);
      message.error(error.message || "Failed to add pitch analysis");
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    {
      title: "Client Information",
      icon: <FormOutlined />,
      description: "Fill in your company details & email config",
    },
    {
      title: "Pitch Analysis",
      icon: <FileTextOutlined />,
      description: "Upload and analyze your pitch deck",
    },
    {
      title: "Review & Submit",
      icon: <CheckCircleOutlined />,
      description: "Review and finalize submission",
    },
  ];

  if (pageLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 16, color: "#666" }}>
              Checking your submission status...
            </Text>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div>
        {/* Header */}
        <div
          style={{
            marginBottom: 32,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <Title level={2} style={{ marginBottom: 8 }}>
              {hasSubmitted ? "Your Submission" : "Submit Your Information"}
            </Title>
            <Text style={{ fontSize: 16, color: "#666" }}>
              {hasSubmitted
                ? "View and update your submitted information"
                : "Complete your profile and pitch analysis in simple steps"}
            </Text>
          </div>

          {/* Edit Button (Only for returning users) */}
          {hasSubmitted && !isEditing && (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={handleEditClick}
              size="large"
              style={{
                height: 48,
                paddingLeft: 24,
                paddingRight: 24,
                backgroundColor: "#1890ff",
                borderColor: "#1890ff",
              }}
            >
              Edit Information
            </Button>
          )}

          {/* Cancel Button (When editing) */}
          {hasSubmitted && isEditing && (
            <Button
              onClick={handleCancelEdit}
              size="large"
              style={{ height: 48, paddingLeft: 24, paddingRight: 24 }}
            >
              Cancel Edit
            </Button>
          )}
        </div>

        {/* Usage Limits Alert */}
        <Alert
          message="Available Credits"
          description={
            <Space direction="vertical" size="small" style={{ width: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Text>Form Edits Available:</Text>
                <Text strong style={{ color: "#52c41a", fontSize: 16 }}>
                  {submission
                    ? `${
                        submission.usageLimits.maxFormEdits -
                        submission.usageLimits.formEditCount
                      } / ${submission.usageLimits.maxFormEdits}`
                    : "4 / 4"}
                </Text>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Text>Pitch Analyses Available:</Text>
                <Text strong style={{ color: "#52c41a", fontSize: 16 }}>
                  {submission
                    ? `${
                        submission.usageLimits.maxPitchAnalysis -
                        submission.usageLimits.pitchAnalysisCount
                      } / ${submission.usageLimits.maxPitchAnalysis}`
                    : "2 / 2"}
                </Text>
              </div>

              {submission && (
                <>
                  <Divider style={{ margin: "12px 0" }} />
                  <div style={{ fontSize: 13, color: "#666" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <Text type="secondary">Used:</Text>
                      <Text type="secondary">
                        {submission.usageLimits.formEditCount} edits,{" "}
                        {submission.usageLimits.pitchAnalysisCount} analyses
                      </Text>
                    </div>
                  </div>
                </>
              )}

              {submission &&
                (!submission.usageLimits.canEditForm ||
                  !submission.usageLimits.canAnalyzePitch) && (
                  <Alert
                    type="warning"
                    message="Credit Limit Reached"
                    description={
                      <div>
                        {!submission.usageLimits.canEditForm &&
                          "No form edits remaining. "}
                        {!submission.usageLimits.canAnalyzePitch &&
                          "No pitch analyses remaining. "}
                        Contact{" "}
                        <a href="mailto:admin@company.com">admin@company.com</a>{" "}
                        to request additional credits.
                      </div>
                    }
                    showIcon
                    icon={<WarningOutlined />}
                    style={{ marginTop: 8 }}
                  />
                )}
            </Space>
          }
          type="info"
          showIcon
          icon={<ExclamationCircleOutlined />}
          style={{ marginBottom: 32 }}
        />

        {/* Steps (Only for first-time users) */}
        {!hasSubmitted && (
          <Card style={{ marginBottom: 32 }}>
            <Steps current={current} items={steps} />
          </Card>
        )}

        {/* FIRST TIME USER FLOW */}
        {!hasSubmitted && (
          <div>
            {/* Step 1: Client Information + Email Config */}
            {current === 0 && (
              <Card title="Client Information & Email Configuration" style={{ marginBottom: 32 }}>
                <ClientInformationForm
                  onSave={handleFormNext}
                  initialData={clientData}
                  isFirstTime={true}
                />
              </Card>
            )}

            {/* Step 2: Pitch Analysis */}
            {current === 1 && (
              <Card title="Pitch Deck Analysis" style={{ marginBottom: 32 }}>
                <ClientAIPitchAnalysis
                  onAnalysisComplete={handlePitchNext}
                  isFirstTime={true}
                />
                <div style={{ marginTop: 24, display: "flex", gap: 16 }}>
                  <Button
                    size="large"
                    onClick={() => setCurrent(0)}
                    style={{ height: 48, paddingLeft: 24, paddingRight: 24 }}
                  >
                    Back
                  </Button>
                  <Button
                    type="primary"
                    size="large"
                    onClick={() => {
                      if (!pitchData) {
                        message.error(
                          "Please upload and analyze your pitch deck before proceeding"
                        );
                        return;
                      }
                      setCurrent(2);
                    }}
                    disabled={!pitchData}
                    style={{
                      height: 48,
                      paddingLeft: 24,
                      paddingRight: 24,
                      backgroundColor: "#1890ff",
                      borderColor: "#1890ff",
                    }}
                  >
                    Next
                  </Button>
                </div>
              </Card>
            )}

            {/* Step 3: Review */}
            {current === 2 && (
              <Card title="Review Your Submission" style={{ marginBottom: 32 }}>
                <div style={{ padding: "24px 0" }}>
                  <Space
                    direction="vertical"
                    size="large"
                    style={{ width: "100%", maxWidth: 800, margin: "0 auto" }}
                  >
                    {/* Client Information Summary */}
                    <Card size="small" title="Client Information">
                      {clientData && (
                        <div style={{ textAlign: "left" }}>
                          <p>
                            <strong>Company:</strong> {clientData.companyName}
                          </p>
                          <p>
                            <strong>Founder:</strong> {clientData.founderName}
                          </p>
                          <p>
                            <strong>Email:</strong> {clientData.email}
                          </p>
                          <p>
                            <strong>Phone:</strong> {clientData.phone}
                          </p>
                          <p>
                            <strong>Funding Stage:</strong>{" "}
                            {clientData.fundingStage}
                          </p>
                          <p>
                            <strong>Industry:</strong> {clientData.industry}
                          </p>
                          <p>
                            <strong>City:</strong> {clientData.city}
                          </p>
                        </div>
                      )}
                    </Card>

                    {/* Email Configuration Summary */}
                    <Card size="small" title="Email Configuration">
                      {emailConfiguration && (
                        <div style={{ textAlign: "left" }}>
                          <p>
                            <strong>Platform:</strong> {emailConfiguration.platformName}
                          </p>
                          <p>
                            <strong>Sender Email:</strong> {emailConfiguration.senderEmail}
                          </p>
                          <p>
                            <strong>SMTP Host:</strong> {emailConfiguration.smtpHost}
                          </p>
                          <p>
                            <strong>Test Status:</strong>{" "}
                            <span style={{ color: "#52c41a", fontWeight: 600 }}>
                              {emailConfiguration.testStatus === "passed" ? "✓ PASSED" : "NOT TESTED"}
                            </span>
                          </p>
                        </div>
                      )}
                    </Card>

                    {/* Pitch Analysis Summary */}
                    <Card size="small" title="Pitch Analysis">
                      {pitchData ? (
                        <div style={{ textAlign: "left" }}>
                          <p>
                            <strong>Score:</strong>{" "}
                            {pitchData.summary?.total_score}/100
                          </p>
                          <p>
                            <strong>Status:</strong>{" "}
                            <span
                              style={{
                                color:
                                  pitchData.summary?.status === "GREEN"
                                    ? "#52c41a"
                                    : pitchData.summary?.status === "YELLOW"
                                    ? "#faad14"
                                    : "#ff4d4f",
                                fontWeight: 600,
                              }}
                            >
                              {pitchData.summary?.status}
                            </span>
                          </p>
                          <p>
                            <strong>Problem:</strong>{" "}
                            {pitchData.summary?.problem.substring(0, 100)}...
                          </p>
                        </div>
                      ) : (
                        <Text type="secondary">
                          No pitch analysis completed
                        </Text>
                      )}
                    </Card>
                  </Space>

                  {/* Navigation Buttons */}
                  <div
                    style={{
                      textAlign: "center",
                      marginTop: 48,
                      display: "flex",
                      gap: 16,
                      justifyContent: "center",
                    }}
                  >
                    <Button
                      size="large"
                      onClick={() => setCurrent(1)}
                      style={{ height: 48, paddingLeft: 32, paddingRight: 32 }}
                    >
                      Back
                    </Button>
                    <Button
                      type="primary"
                      size="large"
                      onClick={handleInitialSubmit}
                      loading={submitting}
                      icon={<SendOutlined />}
                      style={{
                        height: 48,
                        paddingLeft: 32,
                        paddingRight: 32,
                        backgroundColor: "#1890ff",
                        borderColor: "#1890ff",
                      }}
                    >
                      Submit Application
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* RETURNING USER FLOW */}
        {hasSubmitted && (
          <div>
            {/* Client Information Section */}
            <Card title="Client Information & Email Configuration" style={{ marginBottom: 32 }}>
              <ClientInformationForm
                onSave={handleUpdateInfo}
                initialData={clientData}
                disabled={!isEditing}
                isEditing={isEditing}
                loading={submitting}
                isFirstTime={false}
              />
            </Card>

            {/* Pitch Analysis Section */}
            <Card title="Pitch Deck Analysis" style={{ marginBottom: 32 }}>
              <ClientAIPitchAnalysis
                onAnalysisComplete={handleAddPitchAnalysis}
                existingAnalyses={submission?.pitchAnalyses || []}
                disabled={!submission?.usageLimits.canAnalyzePitch}
                loading={submitting}
                isFirstTime={false}
              />
              {submission && !submission.usageLimits.canAnalyzePitch && (
                <Alert
                  type="error"
                  message="Analysis Limit Reached"
                  description={
                    <div>
                      You cannot analyze more pitch decks. Contact{" "}
                      <a href="mailto:admin@company.com">admin@company.com</a>{" "}
                      to request additional analyses.
                    </div>
                  }
                  showIcon
                  style={{ marginTop: 16 }}
                  action={
                    <Button
                      size="small"
                      type="primary"
                      icon={<MailOutlined />}
                      onClick={() => {
                        window.location.href =
                          "mailto:admin@company.com?subject=Request for Additional Pitch Analysis";
                      }}
                    >
                      Contact Admin
                    </Button>
                  }
                />
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
