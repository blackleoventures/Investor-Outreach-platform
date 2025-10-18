"use client";

import { useState, useEffect } from "react";
import { Modal, Button, Input, message, Spin, Tag } from "antd";
import {
  ThunderboltOutlined,
  EyeOutlined,
  SendOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { auth } from "@/lib/firebase";

const { TextArea } = Input;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface FollowupEmailModalProps {
  visible: boolean;
  campaignId: string;
  campaignName: string;
  recipientIds: string[];
  originalTemplate: {
    subject: string;
    body: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function FollowupEmailModal({
  visible,
  campaignId,
  campaignName,
  recipientIds,
  originalTemplate,
  onClose,
  onSuccess,
}: FollowupEmailModalProps) {
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [followupType, setFollowupType] = useState("not_opened");

  useEffect(() => {
    if (visible && recipientIds.length > 0) {
      generateEmail();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, recipientIds]);

  const getAuthToken = async () => {
    const user = auth.currentUser;
    if (!user) {
      message.error("Please login to continue");
      return null;
    }
    return await user.getIdToken();
  };

  const generateEmail = async () => {
    try {
      setGenerating(true);
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(
        `${API_BASE_URL}/campaigns/${campaignId}/generate-followup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            recipientIds,
            followupType,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate follow-up email");
      }

      const data = await response.json();
      setSubject(data.subject);
      setBody(data.body);
      setFollowupType(data.followupType);
    } catch (error: any) {
      console.error("Generate email error:", error);
      message.error(error.message || "Failed to generate email with AI");
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!subject.trim()) {
      message.warning("Please enter a subject");
      return;
    }

    if (!body.trim()) {
      message.warning("Please enter email body");
      return;
    }

    if (!body.includes("{{name}}")) {
      message.warning("Email body must include {{name}} personalization tag");
      return;
    }

    Modal.confirm({
      title: "Send Follow-up Emails?",
      content: `Are you sure you want to send follow-up emails to ${recipientIds.length} recipients?`,
      okText: "Yes, Send",
      cancelText: "Cancel",
      okButtonProps: {
        style: {
          backgroundColor: "#52c41a",
          borderColor: "#52c41a",
        },
      },
      onOk: async () => {
        try {
          setSending(true);
          const token = await getAuthToken();
          if (!token) return;

          const response = await fetch(
            `${API_BASE_URL}/campaigns/${campaignId}/send-followup`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                recipientIds,
                subject,
                body,
                scheduledFor: "now",
              }),
            }
          );

          if (!response.ok) {
            throw new Error("Failed to send follow-up emails");
          }

          const data = await response.json();
          message.success(
            `Follow-up emails queued! ${data.summary.queued} emails will be sent shortly.`
          );
          onSuccess();
        } catch (error: any) {
          console.error("Send email error:", error);
          message.error(error.message || "Failed to send follow-up emails");
        } finally {
          setSending(false);
        }
      },
    });
  };

  return (
    <Modal
      title={
        <div>
          <ThunderboltOutlined className="mr-2" />
          Generate Follow-up Email
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={800}
      footer={null}
      destroyOnClose
    >
      {generating ? (
        <div className="text-center py-12">
          <Spin size="large" />
          <p className="mt-4 text-gray-600">Generating email with AI...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 p-3 rounded">
            <p className="text-sm">
              <strong>Campaign:</strong> {campaignName}
            </p>
            <p className="text-sm">
              <strong>Recipients:</strong> {recipientIds.length} selected
            </p>
            <p className="text-sm">
              <strong>Type:</strong>{" "}
              <Tag color={followupType === "not_opened" ? "blue" : "green"}>
                {followupType === "not_opened" ? "Not Opened" : "Opened Not Replied"}
              </Tag>
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Subject Line</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject"
              size="large"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Email Body</label>
            <TextArea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Enter email body"
              rows={12}
              style={{ fontFamily: "monospace", fontSize: 13 }}
            />
            <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
              <strong>Variables:</strong> {`{{name}}`}, {`{{organization}}`},{" "}
              {`{{companyName}}`}, {`{{founderName}}`}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button icon={<CloseOutlined />} onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="primary"
              icon={<EyeOutlined />}
              onClick={() => {
                Modal.info({
                  title: "Email Preview",
                  width: 600,
                  content: (
                    <div className="space-y-4">
                      <div>
                        <p className="font-semibold text-sm mb-1">Subject:</p>
                        <p className="bg-gray-50 p-2 rounded">{subject}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-sm mb-1">Body:</p>
                        <div className="bg-gray-50 p-3 rounded whitespace-pre-wrap text-sm">
                          {body.replace("{{name}}", "John Investor")}
                        </div>
                      </div>
                    </div>
                  ),
                });
              }}
              style={{
                backgroundColor: "#1890ff",
                borderColor: "#1890ff",
              }}
            >
              Preview
            </Button>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              loading={sending}
              style={{
                backgroundColor: "#52c41a",
                borderColor: "#52c41a",
              }}
            >
              Send Follow-up ({recipientIds.length})
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
