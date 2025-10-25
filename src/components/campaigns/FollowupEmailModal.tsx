"use client";

import { useState, useEffect } from "react";
import { Modal, Button, Input, message, Spin, Tag, DatePicker, TimePicker } from "antd";
import {
  ThunderboltOutlined,
  SendOutlined,
  CloseOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { auth } from "@/lib/firebase";
import dayjs, { Dayjs } from "dayjs";

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
  const [scheduleType, setScheduleType] = useState<"now" | "schedule">("now");
  const [scheduledDate, setScheduledDate] = useState<Dayjs | null>(null);
  const [scheduledTime, setScheduledTime] = useState<Dayjs | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

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

  const handleScheduleClick = () => {
    if (!subject.trim()) {
      message.warning("Please enter a subject");
      return;
    }

    if (!body.trim()) {
      message.warning("Please enter email body");
      return;
    }
    setShowScheduleModal(true);
  };

  const handleSend = async () => {
    let scheduledFor = "now";

    if (scheduleType === "schedule") {
      if (!scheduledDate || !scheduledTime) {
        message.warning("Please select both date and time");
        return;
      }

      const combinedDateTime = scheduledDate
        .hour(scheduledTime.hour())
        .minute(scheduledTime.minute())
        .second(0);

      if (combinedDateTime.isBefore(dayjs())) {
        message.warning("Scheduled time must be in the future");
        return;
      }

      scheduledFor = combinedDateTime.toISOString();
    }

    Modal.confirm({
      title: scheduleType === "now" ? "Send Follow-up Emails?" : "Schedule Follow-up Emails?",
      content:
        scheduleType === "now"
          ? `Are you sure you want to send follow-up emails to ${recipientIds.length} recipients immediately?`
          : `Schedule follow-up emails to ${recipientIds.length} recipients for ${dayjs(scheduledFor).format("MMMM DD, YYYY at hh:mm A")}?`,
      okText: scheduleType === "now" ? "Yes, Send Now" : "Yes, Schedule",
      cancelText: "Cancel",
      okButtonProps: {
        style: {
          backgroundColor: "#1890ff",
          borderColor: "#1890ff",
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
                scheduledFor,
              }),
            }
          );

          if (!response.ok) {
            throw new Error("Failed to send follow-up emails");
          }

          const data = await response.json();
          if (scheduleType === "now") {
            message.success(
              `Follow-up emails queued! ${data.summary.queued} emails will be sent shortly.`
            );
          } else {
            message.success(
              `Follow-up emails scheduled! ${data.summary.queued} emails will be sent on ${dayjs(scheduledFor).format("MMM DD, YYYY at hh:mm A")}.`
            );
          }
          setShowScheduleModal(false);
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

  const disabledDate = (current: Dayjs) => {
    return current && current.isBefore(dayjs().startOf("day"));
  };

  return (
    <>
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
                  {followupType === "not_opened"
                    ? "Not Opened"
                    : "Opened Not Replied"}
                </Tag>
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Subject Line
              </label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject"
                size="large"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Email Body
              </label>
              <TextArea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Enter email body"
                rows={12}
                style={{ fontFamily: "monospace", fontSize: 13 }}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button icon={<CloseOutlined />} onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="primary"
                icon={<ClockCircleOutlined />}
                onClick={handleScheduleClick}
                style={{
                  backgroundColor: "#1890ff",
                  borderColor: "#1890ff",
                }}
              >
                Schedule Email
              </Button>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={() => {
                  if (!subject.trim()) {
                    message.warning("Please enter a subject");
                    return;
                  }
                  if (!body.trim()) {
                    message.warning("Please enter email body");
                    return;
                  }
                  setScheduleType("now");
                  handleSend();
                }}
                loading={sending}
                style={{
                  backgroundColor: "#1890ff",
                  borderColor: "#1890ff",
                }}
              >
                Send Now ({recipientIds.length})
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Schedule Modal */}
      <Modal
        title={
          <div>
            <ClockCircleOutlined className="mr-2" />
            Schedule Follow-up Email
          </div>
        }
        open={showScheduleModal}
        onCancel={() => setShowScheduleModal(false)}
        width={500}
        footer={null}
        destroyOnClose
      >
        <div className="space-y-4">
          <div className="bg-blue-50 p-3 rounded">
            <p className="text-sm">
              <strong>Recipients:</strong> {recipientIds.length} selected
            </p>
            <p className="text-sm">
              <strong>Subject:</strong> {subject}
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">
              Select Date
            </label>
            <DatePicker
              value={scheduledDate}
              onChange={setScheduledDate}
              disabledDate={disabledDate}
              format="MMMM DD, YYYY"
              size="large"
              className="w-full"
              placeholder="Select date"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">
              Select Time
            </label>
            <TimePicker
              value={scheduledTime}
              onChange={setScheduledTime}
              format="hh:mm A"
              size="large"
              className="w-full"
              placeholder="Select time"
              use12Hours
            />
          </div>

          {scheduledDate && scheduledTime && (
            <div className="bg-green-50 p-3 rounded">
              <p className="text-sm text-green-800">
                <strong>Scheduled for:</strong>{" "}
                {scheduledDate
                  .hour(scheduledTime.hour())
                  .minute(scheduledTime.minute())
                  .format("MMMM DD, YYYY at hh:mm A")}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              icon={<CloseOutlined />}
              onClick={() => setShowScheduleModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={() => {
                setScheduleType("schedule");
                handleSend();
              }}
              loading={sending}
              disabled={!scheduledDate || !scheduledTime}
              style={{
                backgroundColor: "#1890ff",
                borderColor: "#1890ff",
              }}
            >
              Confirm Schedule
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
