"use client";

import { useState, useEffect } from "react";
import { Modal, Button, Input, Alert, App } from "antd";
import { EditOutlined } from "@ant-design/icons";
import { auth } from "@/lib/firebase";
import RichTextEditor from "@/components/ui/RichTextEditor";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface EditEmailModalProps {
  visible: boolean;
  campaignId: string;
  campaignStatus: string;
  initialSubject: string;
  initialBody: string;
  onCloseAction: () => void;
  onSuccessAction: (subject: string, body: string) => void;
}

export default function EditEmailModal({
  visible,
  campaignId,
  campaignStatus,
  initialSubject,
  initialBody,
  onCloseAction,
  onSuccessAction,
}: EditEmailModalProps) {
  const { message } = App.useApp();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setSubject(initialSubject);
      setBody(initialBody);
    }
  }, [visible, initialSubject, initialBody]);

  const getAuthToken = async () => {
    const user = auth.currentUser;
    if (!user) {
      message.error("Please login to continue");
      return null;
    }
    return await user.getIdToken();
  };

  const handleSave = async () => {
    if (!subject.trim()) {
      message.warning("Subject cannot be empty");
      return;
    }
    if (!body.trim()) {
      message.warning("Email body cannot be empty");
      return;
    }

    try {
      setSaving(true);
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(
        `${API_BASE_URL}/campaigns/${campaignId}/email-template`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ subject, emailBody: body }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update email template");
      }

      message.success("Email template updated successfully");
      onSuccessAction(subject, body);
    } catch (error: any) {
      console.error("[EditEmailModal] Save error:", error);
      message.error(error.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={
        <span>
          <EditOutlined className="mr-2" />
          Edit Email Template
        </span>
      }
      open={visible}
      onCancel={onCloseAction}
      width={800}
      centered
      footer={[
        <Button key="cancel" onClick={onCloseAction} disabled={saving}>
          Cancel
        </Button>,
        <Button
          key="save"
          type="primary"
          onClick={handleSave}
          loading={saving}
          style={{ backgroundColor: "#1890ff", borderColor: "#1890ff" }}
        >
          Save Changes
        </Button>,
      ]}
      destroyOnClose
    >
      <div className="space-y-4 pt-2">
        {campaignStatus === "active" && (
          <Alert
            type="info"
            showIcon
            message="Changes will only apply to pending emails not yet sent. Already-sent emails are unaffected."
          />
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Subject
          </label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter email subject"
            size="large"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Body
          </label>
          <RichTextEditor
            content={body}
            onChange={setBody}
            placeholder="Enter email body"
            minHeight="350px"
          />
        </div>
      </div>
    </Modal>
  );
}
