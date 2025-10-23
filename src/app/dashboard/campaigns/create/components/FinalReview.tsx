"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  Button,
  Checkbox,
  Modal,
  Collapse,
  Descriptions,
  Tag,
  message,
  Alert,
} from "antd";
import {
  ArrowLeftOutlined,
  RocketOutlined,
  CalendarOutlined,
  MailOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

const { Panel } = Collapse;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface FinalReviewProps {
  selectedClient: any;
  targetType: string;
  matchResults: any;
  emailTemplate: any;
  scheduleConfig: any;
  onBack: () => void;
  getAuthToken: () => Promise<string | null>;
}

export default function FinalReview({
  selectedClient,
  targetType,
  matchResults,
  emailTemplate,
  scheduleConfig,
  onBack,
  getAuthToken,
}: FinalReviewProps) {
  const router = useRouter();
  const [confirmChecks, setConfirmChecks] = useState({
    accuracy: false,
    template: false,
    schedule: false,
    noStop: false,
  });
  const [activationLoading, setActivationLoading] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);

  const allChecked = Object.values(confirmChecks).every(Boolean);

  const handleCheckChange = (key: string, checked: boolean) => {
    setConfirmChecks((prev) => ({ ...prev, [key]: checked }));
  };

  const showActivationConfirm = () => {
    if (!allChecked) {
      message.error("Please confirm all checkboxes before proceeding");
      return;
    }
    setConfirmModalVisible(true);
  };

  const activateCampaign = async () => {
    try {
      setActivationLoading(true);
      const token = await getAuthToken();
      if (!token) return;

      const payload = {
        clientId: selectedClient.id,
        targetType,
        matchResults,
        emailTemplate,
        scheduleConfig,
      };

      const response = await fetch(`${API_BASE_URL}/campaigns/activate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to activate campaign");
      }

      const data = await response.json();

      setConfirmModalVisible(false);

      // Show success modal
      Modal.confirm({
        title: "Campaign Activated Successfully!",
        icon: null,
        content: (
          <div className="py-4">
            <p className="mb-2">
              <strong>Campaign:</strong> {scheduleConfig.campaignName}
            </p>
            <p className="mb-2">
              <strong>Total Recipients:</strong> {matchResults.totalMatches}{" "}
              emails
            </p>
            <p className="mb-2">
              <strong>Duration:</strong> {scheduleConfig.duration} days
            </p>
            <p className="mb-2">
              <strong>First Send:</strong>{" "}
              {dayjs(scheduleConfig.startDate).format("MMM DD, YYYY")} at{" "}
              {scheduleConfig.sendingWindow.start}
            </p>
            <div className="mt-4 p-3 bg-blue-50 rounded">
              <p className="text-sm text-blue-800 mb-2">
                <strong>Public Report Link:</strong>
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={data.publicReportUrl}
                  readOnly
                  className="flex-1 px-2 py-1 text-xs border rounded"
                />
                <Button
                  size="small"
                  className="bg-green-600 hover:bg-green-700 border-green-600"
                  onClick={() => {
                    navigator.clipboard.writeText(data.publicReportUrl);
                    message.success("Link copied!");
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>
          </div>
        ),
        okText: "View Campaigns",
        okButtonProps: {
          style: { backgroundColor: "#1677ff", borderColor: "#1677ff" }, // Blue color
        },
        width: 600,
        onOk: () => router.push("/dashboard/campaigns"),
      });
    } catch (error: any) {
      console.error("Campaign activation error:", error);
      message.error(error.message || "Failed to activate campaign");
    } finally {
      setActivationLoading(false);
    }
  };

  return (
    <div>
      <Card title="Campaign Review" className="mb-6">
        <Alert
          message="Please review all campaign details before activation"
          description="Once activated, the campaign will run automatically and cannot be stopped or significantly modified."
          type="info"
          showIcon
          className="mb-6"
        />

        <Collapse defaultActiveKey={["1", "2"]} className="mb-6">
          {/* Client Information */}
          <Panel
            header={
              <span>
                <TeamOutlined className="mr-2" />
                Client Information
              </span>
            }
            key="1"
          >
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Company">
                {selectedClient.companyName}
              </Descriptions.Item>
              <Descriptions.Item label="Founder">
                {selectedClient.founderName}
              </Descriptions.Item>
              <Descriptions.Item label="Industry">
                {selectedClient.industry}
              </Descriptions.Item>
              <Descriptions.Item label="Stage">
                {selectedClient.fundingStage}
              </Descriptions.Item>
              <Descriptions.Item label="Investment Ask">
                {selectedClient.investment}
              </Descriptions.Item>
              <Descriptions.Item label="Location">
                {selectedClient.city}
              </Descriptions.Item>
            </Descriptions>
          </Panel>

          {/* Audience & Matches */}
          <Panel
            header={
              <span>
                <TeamOutlined className="mr-2" />
                Audience & Matches
              </span>
            }
            key="2"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {matchResults.totalMatches}
                </p>
                <p className="text-gray-600">Total Recipients</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {matchResults.highPriority} (
                  {matchResults.highPriorityPercent}%)
                </p>
                <p className="text-gray-600">High Priority</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {matchResults.mediumPriority} (
                  {matchResults.mediumPriorityPercent}%)
                </p>
                <p className="text-gray-600">Medium Priority</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-600">
                  {matchResults.lowPriority} ({matchResults.lowPriorityPercent}
                  %)
                </p>
                <p className="text-gray-600">Low Priority</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Tag color="blue">Target: {targetType}</Tag>
              {targetType === "both" && (
                <>
                  <Tag color="blue">
                    Investors: {matchResults.investorCount}
                  </Tag>
                  <Tag color="green">
                    Incubators: {matchResults.incubatorCount}
                  </Tag>
                </>
              )}
            </div>
          </Panel>

          {/* Email Template */}
          <Panel
            header={
              <span>
                <MailOutlined className="mr-2" />
                Email Template
              </span>
            }
            key="3"
          >
            <div className="mb-4">
              <p className="font-medium mb-2">Subject Line:</p>
              <div className="bg-gray-50 p-3 rounded">
                {emailTemplate.currentSubject}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Characters: {emailTemplate.currentSubject.length}
                {emailTemplate.subjectImproved && (
                  <Tag color="green" className="ml-2">
                    Improved
                  </Tag>
                )}
              </p>
            </div>
            <div>
              <p className="font-medium mb-2">Email Body:</p>
              <div className="bg-gray-50 p-3 rounded max-h-40 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm">
                  {emailTemplate.currentBody.substring(0, 300)}
                  {emailTemplate.currentBody.length > 300 && "..."}
                </pre>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Words: {emailTemplate.currentBody.split(" ").length}
                {emailTemplate.bodyImproved && (
                  <Tag color="green" className="ml-2">
                    Improved
                  </Tag>
                )}
              </p>
            </div>
          </Panel>

          {/* Schedule */}
          <Panel
            header={
              <span>
                <CalendarOutlined className="mr-2" />
                Campaign Schedule
              </span>
            }
            key="4"
          >
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Campaign Name">
                {scheduleConfig.campaignName}
              </Descriptions.Item>
              <Descriptions.Item label="Daily Limit">
                {scheduleConfig.dailyLimit} emails/day
              </Descriptions.Item>
              <Descriptions.Item label="Start Date">
                {dayjs(scheduleConfig.startDate).format("MMM DD, YYYY")}
              </Descriptions.Item>
              <Descriptions.Item label="End Date">
                {dayjs(scheduleConfig.endDate).format("MMM DD, YYYY")}
              </Descriptions.Item>
              <Descriptions.Item label="Duration">
                {scheduleConfig.duration} days
              </Descriptions.Item>
              <Descriptions.Item label="Sending Hours">
                {scheduleConfig.sendingWindow.start} -{" "}
                {scheduleConfig.sendingWindow.end}
              </Descriptions.Item>
              <Descriptions.Item label="Weekend Behavior">
                {scheduleConfig.pauseOnWeekends
                  ? "Pause on weekends"
                  : "Send on all days"}
              </Descriptions.Item>
              <Descriptions.Item label="Priority Allocation">
                High: {scheduleConfig.priorityAllocation.high}% | Medium:{" "}
                {scheduleConfig.priorityAllocation.medium}% | Low:{" "}
                {scheduleConfig.priorityAllocation.low}%
              </Descriptions.Item>
            </Descriptions>
          </Panel>
        </Collapse>

        {/* Confirmation Checkboxes */}
        <div className="bg-yellow-50 p-4 rounded mb-6">
          <p className="font-medium mb-4 text-yellow-800">
            Please confirm the following before activation:
          </p>
          <div className="space-y-3">
            <Checkbox
              checked={confirmChecks.accuracy}
              onChange={(e) => handleCheckChange("accuracy", e.target.checked)}
            >
              I confirm that all client information and campaign details are
              accurate
            </Checkbox>
            <Checkbox
              checked={confirmChecks.template}
              onChange={(e) => handleCheckChange("template", e.target.checked)}
            >
              I have reviewed the email template and confirm it is appropriate
              for sending
            </Checkbox>
            <Checkbox
              checked={confirmChecks.schedule}
              onChange={(e) => handleCheckChange("schedule", e.target.checked)}
            >
              I understand that emails will begin sending on{" "}
              {dayjs(scheduleConfig.startDate).format("MMM DD, YYYY")} at{" "}
              {scheduleConfig.sendingWindow.start}
            </Checkbox>
            <Checkbox
              checked={confirmChecks.noStop}
              onChange={(e) => handleCheckChange("noStop", e.target.checked)}
            >
              I acknowledge that once activated, this campaign cannot be stopped
              or significantly modified
            </Checkbox>
          </div>
        </div>
      </Card>

      <div className="flex justify-between">
        <Button size="large" onClick={onBack} icon={<ArrowLeftOutlined />}>
          Back to Schedule
        </Button>
        <Button
          type="primary"
          size="large"
          onClick={showActivationConfirm}
          disabled={!allChecked}
          icon={<RocketOutlined />}
          className="bg-green-600 hover:bg-green-700 border-green-600"
        >
          Activate Campaign
        </Button>
      </div>

      {/* Activation Confirmation Modal */}
      <Modal
        title="Confirm Campaign Activation"
        open={confirmModalVisible}
        onCancel={() => setConfirmModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setConfirmModalVisible(false)}>
            Cancel
          </Button>,
          <Button
            key="activate"
            type="primary"
            danger
            onClick={activateCampaign}
            loading={activationLoading}
            icon={<RocketOutlined />}
          >
            Yes, Activate Campaign
          </Button>,
        ]}
        maskClosable={false}
      >
        <div className="py-4">
          <Alert
            message="Campaign Activation Warning"
            description="You are about to activate a campaign that will send emails to recipients over multiple days. This action cannot be undone."
            type="warning"
            showIcon
            className="mb-4"
          />
          <div className="bg-gray-50 p-4 rounded">
            <p className="mb-2">
              <strong>Campaign:</strong> {scheduleConfig.campaignName}
            </p>
            <p className="mb-2">
              <strong>Recipients:</strong> {matchResults.totalMatches} emails
            </p>
            <p className="mb-2">
              <strong>Duration:</strong> {scheduleConfig.duration} days
            </p>
            <p className="mb-2">
              <strong>Start:</strong>{" "}
              {dayjs(scheduleConfig.startDate).format("MMM DD, YYYY")} at{" "}
              {scheduleConfig.sendingWindow.start}
            </p>
            <p className="mb-2">
              <strong>Daily Rate:</strong> {scheduleConfig.dailyLimit}{" "}
              emails/day
            </p>
          </div>
          <p className="mt-4 text-red-600 font-medium">
            Are you absolutely sure you want to proceed?
          </p>
        </div>
      </Modal>
    </div>
  );
}
