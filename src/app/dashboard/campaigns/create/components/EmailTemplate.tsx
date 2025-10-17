"use client";

import { useState } from "react";
import {
  Card,
  Button,
  Input,
  Modal,
  Radio,
  message,
  Spin,
  Alert,
  Divider,
  Space,
} from "antd";
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  ThunderboltOutlined,
  EditOutlined,
} from "@ant-design/icons";

const { TextArea } = Input;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface EmailTemplateProps {
  selectedClient: any;
  emailTemplate: any;
  onTemplateUpdate: (template: any) => void;
  onNext: () => void;
  onBack: () => void;
  getAuthToken: () => Promise<string | null>;
}

export default function EmailTemplate({
  selectedClient,
  emailTemplate,
  onTemplateUpdate,
  onNext,
  onBack,
  getAuthToken,
}: EmailTemplateProps) {
  const [currentSubject, setCurrentSubject] = useState(
    emailTemplate?.currentSubject ||
      selectedClient?.pitchAnalysis?.email_subject ||
      ""
  );
  const [currentBody, setCurrentBody] = useState(
    emailTemplate?.currentBody ||
      selectedClient?.pitchAnalysis?.email_body ||
      ""
  );

  const [subjectModalVisible, setSubjectModalVisible] = useState(false);
  const [bodyModalVisible, setBodyModalVisible] = useState(false);
  const [improvementMethod, setImprovementMethod] = useState<
    "optimized" | "custom"
  >("optimized");
  const [customInstructions, setCustomInstructions] = useState("");
  const [loading, setLoading] = useState(false);

  const improveSubject = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/ai/improve-subject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentSubject,
          companyContext: {
            name: selectedClient.companyName,
            industry: selectedClient.industry,
            stage: selectedClient.fundingStage,
            metrics: selectedClient.pitchAnalysis?.summary,
          },
          useOptimizedPrompt: improvementMethod === "optimized",
          customInstructions:
            improvementMethod === "custom" ? customInstructions : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to improve subject");
      }

      const data = await response.json();
      setCurrentSubject(data.improvedSubject);
      setSubjectModalVisible(false);
      setCustomInstructions(""); // Reset custom instructions
      message.success("Subject improved successfully!");
    } catch (error: any) {
      console.error("Subject improvement error:", error);
      message.error(error.message || "Failed to improve subject");
    } finally {
      setLoading(false);
    }
  };

  const improveBody = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/ai/improve-body`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentBody,
          companyContext: {
            name: selectedClient.companyName,
            industry: selectedClient.industry,
            metrics: selectedClient.pitchAnalysis?.summary,
            traction: selectedClient.pitchAnalysis?.summary?.traction,
          },
          useOptimizedPrompt: improvementMethod === "optimized",
          customInstructions:
            improvementMethod === "custom" ? customInstructions : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to improve body");
      }

      const data = await response.json();
      setCurrentBody(data.improvedBody);
      setBodyModalVisible(false);
      setCustomInstructions(""); // Reset custom instructions
      message.success("Email body improved successfully!");
    } catch (error: any) {
      console.error("Body improvement error:", error);
      message.error(error.message || "Failed to improve email body");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (!currentSubject || !currentBody) {
      message.error("Please ensure both subject and body are filled");
      return;
    }

    onTemplateUpdate({
      originalSubject: selectedClient?.pitchAnalysis?.email_subject,
      currentSubject,
      subjectImproved:
        currentSubject !== selectedClient?.pitchAnalysis?.email_subject,
      originalBody: selectedClient?.pitchAnalysis?.email_body,
      currentBody,
      bodyImproved: currentBody !== selectedClient?.pitchAnalysis?.email_body,
    });

    onNext();
  };

  return (
    <div>
      {/* Subject Section */}
      <Card
        title="Email Subject Line"
        extra={
          <Button
            icon={<ThunderboltOutlined />}
            onClick={() => setSubjectModalVisible(true)}
            style={{
              backgroundColor: "#722ed1",
              borderColor: "#722ed1",
              color: "white",
            }}
          >
            Improve Subject
          </Button>
        }
        className="mb-6"
      >
        <Alert
          message="This subject line will be used for all emails in the campaign"
          type="info"
          showIcon
          className="mb-4"
        />
        <Input
          value={currentSubject}
          onChange={(e) => setCurrentSubject(e.target.value)}
          size="large"
          placeholder="Email subject line..."
          style={{ backgroundColor: "#ffffff" }}
        />
        <p className="text-sm text-gray-500 mt-2">
          Character count: {currentSubject.length} (recommended: 40-60)
        </p>
      </Card>

      {/* Body Section */}
      <Card
        title="Email Body"
        extra={
          <Button
            icon={<ThunderboltOutlined />}
            onClick={() => setBodyModalVisible(true)}
            style={{
              backgroundColor: "#722ed1",
              borderColor: "#722ed1",
              color: "white",
            }}
          >
            Improve Body
          </Button>
        }
        className="mb-6"
      >
        <Alert
          message="This email content will be sent to all matched recipients with personalized details"
          type="info"
          showIcon
          className="mb-4"
        />
        <TextArea
          value={currentBody}
          onChange={(e) => setCurrentBody(e.target.value)}
          rows={15}
          placeholder="Email body content..."
          style={{ backgroundColor: "#ffffff", fontFamily: "monospace" }}
        />
        <p className="text-sm text-gray-500 mt-2">
          Word count: {currentBody.split(" ").length} (recommended: 150-300)
        </p>
      </Card>

      {/* Subject Improvement Modal */}
      <Modal
        title="Improve Email Subject"
        open={subjectModalVisible}
        onCancel={() => {
          setSubjectModalVisible(false);
          setCustomInstructions("");
          setImprovementMethod("optimized");
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setSubjectModalVisible(false);
              setCustomInstructions("");
              setImprovementMethod("optimized");
            }}
            style={{
              backgroundColor: "#6c757d",
              borderColor: "#6c757d",
              color: "white",
            }}
          >
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={loading}
            onClick={improveSubject}
            style={{
              backgroundColor: "#52c41a",
              borderColor: "#52c41a",
            }}
          >
            Generate Improved Subject
          </Button>,
        ]}
        width={700}
      >
        <div className="py-4">
          <p className="mb-4">
            <strong>Current Subject:</strong>
          </p>
          <div className="bg-gray-50 p-3 rounded mb-4">{currentSubject}</div>

          <Divider />

          <p className="mb-4">
            <strong>Improvement Method:</strong>
          </p>
          <Radio.Group
            value={improvementMethod}
            onChange={(e) => setImprovementMethod(e.target.value)}
            className="mb-4"
          >
            <Space direction="vertical">
              <Radio value="optimized">
                Use our optimized AI prompt (recommended)
              </Radio>
              <Radio value="custom">Custom instructions (advanced)</Radio>
            </Space>
          </Radio.Group>

          {improvementMethod === "custom" && (
            <TextArea
              placeholder="Enter custom instructions (e.g., 'Make it shorter and more urgent', 'Add the 35% metric')"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              rows={4}
            />
          )}
        </div>
      </Modal>

      {/* Body Improvement Modal */}
      <Modal
        title="Improve Email Body"
        open={bodyModalVisible}
        onCancel={() => {
          setBodyModalVisible(false);
          setCustomInstructions("");
          setImprovementMethod("optimized");
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setBodyModalVisible(false);
              setCustomInstructions("");
              setImprovementMethod("optimized");
            }}
            style={{
              backgroundColor: "#6c757d",
              borderColor: "#6c757d",
              color: "white",
            }}
          >
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={loading}
            onClick={improveBody}
            style={{
              backgroundColor: "#52c41a",
              borderColor: "#52c41a",
            }}
          >
            Generate Improved Body
          </Button>,
        ]}
        width={800}
      >
        <div className="py-4">
          <p className="mb-4">
            <strong>Current Body:</strong>
          </p>
          <div className="bg-gray-50 p-3 rounded mb-4 max-h-60 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm">{currentBody}</pre>
          </div>

          <Divider />

          <p className="mb-4">
            <strong>Improvement Method:</strong>
          </p>
          <Radio.Group
            value={improvementMethod}
            onChange={(e) => setImprovementMethod(e.target.value)}
            className="mb-4"
          >
            <Space direction="vertical">
              <Radio value="optimized">
                Use our optimized AI prompt (recommended)
              </Radio>
              <Radio value="custom">Custom instructions (advanced)</Radio>
            </Space>
          </Radio.Group>

          {improvementMethod === "custom" && (
            <TextArea
              placeholder="Enter custom instructions (e.g., 'Make it 50% shorter', 'Add more social proof', 'Stronger call-to-action')"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              rows={4}
            />
          )}
        </div>
      </Modal>

      <div className="flex justify-between">
        <Button
          size="large"
          onClick={onBack}
          icon={<ArrowLeftOutlined />}
          style={{
            backgroundColor: "#6c757d",
            borderColor: "#6c757d",
            color: "white",
          }}
        >
          Back
        </Button>
        <Button
          type="primary"
          size="large"
          onClick={handleNext}
          icon={<ArrowRightOutlined />}
          style={{
            backgroundColor: "#1890ff",
            borderColor: "#1890ff",
          }}
        >
          Continue to Schedule
        </Button>
      </div>
    </div>
  );
}
