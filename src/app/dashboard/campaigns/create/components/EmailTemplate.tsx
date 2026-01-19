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
  PaperClipOutlined,
  DeleteOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import RichTextEditor, {
  getWordCount,
  markdownToHtml,
  htmlToPlainText,
} from "@/components/ui/RichTextEditor";
import {
  Attachment,
  uploadAttachment,
  deleteAttachment,
  validateAttachments,
  formatFileSize,
  getFileIcon,
  MAX_FILES,
  MAX_FILE_SIZE,
  MAX_TOTAL_SIZE,
} from "@/lib/firebase-storage";

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
      "",
  );
  const [currentBody, setCurrentBody] = useState(
    emailTemplate?.currentBody ||
      selectedClient?.pitchAnalysis?.email_body ||
      "",
  );

  const [subjectModalVisible, setSubjectModalVisible] = useState(false);
  const [bodyModalVisible, setBodyModalVisible] = useState(false);
  const [improvementMethod, setImprovementMethod] = useState<
    "optimized" | "custom"
  >("optimized");
  const [customInstructions, setCustomInstructions] = useState("");
  const [loading, setLoading] = useState(false);

  // Attachments state
  const [attachments, setAttachments] = useState<Attachment[]>(
    emailTemplate?.attachments || [],
  );
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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
      // Convert markdown to HTML for the rich text editor
      const cleanedBody = markdownToHtml(data.improvedBody);
      setCurrentBody(cleanedBody);
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

  // ============================================================
  // ATTACHMENT HANDLERS
  // ============================================================

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    setUploadError(null);

    // Validate before upload
    const validation = validateAttachments(attachments, fileArray);
    if (!validation.valid) {
      setUploadError(validation.error || "Validation failed");
      message.error(validation.error);
      return;
    }

    setUploadingFiles(true);

    try {
      // Generate a temporary campaign ID for storage path
      const tempCampaignId = `temp_${Date.now()}`;

      const uploadPromises = fileArray.map((file) =>
        uploadAttachment(file, tempCampaignId),
      );

      const uploadedFiles = await Promise.all(uploadPromises);
      setAttachments((prev) => [...prev, ...uploadedFiles]);
      message.success(`${uploadedFiles.length} file(s) uploaded successfully`);
    } catch (error: any) {
      console.error("Upload error:", error);
      setUploadError(error.message || "Upload failed");
      message.error(error.message || "Failed to upload files");
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    const attachment = attachments.find((a) => a.id === attachmentId);
    if (!attachment) return;

    try {
      // Delete from storage
      await deleteAttachment(attachment.url);
      // Remove from state
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      message.success("Attachment removed");
    } catch (error: any) {
      console.error("Delete error:", error);
      message.error("Failed to remove attachment");
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleNext = () => {
    if (!currentSubject || !currentBody) {
      message.error("Please ensure both subject and body are filled");
      return;
    }

    // Get pitch values (may be undefined for admin-created clients)
    const pitchSubject = selectedClient?.pitchAnalysis?.email_subject || "";
    const pitchBody = selectedClient?.pitchAnalysis?.email_body || "";

    // Check if pitch content actually exists
    const hasPitchSubject = Boolean(
      selectedClient?.pitchAnalysis?.email_subject,
    );
    const hasPitchBody = Boolean(selectedClient?.pitchAnalysis?.email_body);

    onTemplateUpdate({
      // Original: Use pitch if exists, otherwise use current (what user typed from scratch)
      originalSubject: hasPitchSubject ? pitchSubject : currentSubject,
      currentSubject,
      // Improved: Only true if there WAS a pitch to compare against AND it's different
      subjectImproved: hasPitchSubject && currentSubject !== pitchSubject,

      originalBody: hasPitchBody ? pitchBody : currentBody,
      currentBody,
      currentBodyText: htmlToPlainText(currentBody),
      bodyImproved: hasPitchBody && currentBody !== pitchBody,
      // Include attachments (optional field for backward compatibility)
      attachments: attachments.length > 0 ? attachments : undefined,
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
        <RichTextEditor
          content={currentBody}
          onChange={setCurrentBody}
          placeholder="Email body content..."
          minHeight="400px"
        />
        <p className="text-sm text-gray-500 mt-2">
          Word count: {getWordCount(currentBody)} (recommended: 150-300)
        </p>
      </Card>

      {/* Attachments Section */}
      <Card
        title={
          <span>
            <PaperClipOutlined className="mr-2" />
            Attachments ({attachments.length}/{MAX_FILES})
          </span>
        }
        className="mb-6"
      >
        <Alert
          message="Optional: Attach files that will be sent with every email in this campaign"
          description={`Max ${MAX_FILES} files, ${formatFileSize(MAX_FILE_SIZE)} per file, ${formatFileSize(MAX_TOTAL_SIZE)} total`}
          type="info"
          showIcon
          className="mb-4"
        />

        {/* Drag and Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragging
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-blue-400"
          } ${
            attachments.length >= MAX_FILES
              ? "opacity-50 cursor-not-allowed"
              : ""
          }`}
          onClick={() => {
            if (attachments.length < MAX_FILES) {
              document.getElementById("file-upload-input")?.click();
            }
          }}
        >
          <input
            id="file-upload-input"
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.txt,.csv"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
            disabled={attachments.length >= MAX_FILES}
          />

          {uploadingFiles ? (
            <div>
              <LoadingOutlined className="text-2xl text-blue-500 mb-2" />
              <p className="text-gray-600">Uploading files...</p>
            </div>
          ) : (
            <div>
              <PaperClipOutlined className="text-3xl text-gray-400 mb-2" />
              <p className="text-gray-600">
                {attachments.length >= MAX_FILES
                  ? `Maximum ${MAX_FILES} attachments reached`
                  : "Drag & drop files here, or click to browse"}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                PDF, Word, Excel, Images
              </p>
            </div>
          )}
        </div>

        {/* Error Display */}
        {uploadError && (
          <Alert
            message={uploadError}
            type="error"
            showIcon
            className="mt-4"
            closable
            onClose={() => setUploadError(null)}
          />
        )}

        {/* Attached Files List */}
        {attachments.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="font-medium text-gray-700">Attached Files:</p>
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{getFileIcon(att.type)}</span>
                  <div>
                    <p className="font-medium text-gray-800">
                      {att.originalName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(att.size)}
                    </p>
                  </div>
                </div>
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleRemoveAttachment(att.id)}
                >
                  Remove
                </Button>
              </div>
            ))}

            {/* Total size indicator */}
            <p className="text-sm text-gray-500 mt-2">
              Total size:{" "}
              {formatFileSize(
                attachments.reduce((sum, att) => sum + att.size, 0),
              )}{" "}
              / {formatFileSize(MAX_TOTAL_SIZE)}
            </p>
          </div>
        )}
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
