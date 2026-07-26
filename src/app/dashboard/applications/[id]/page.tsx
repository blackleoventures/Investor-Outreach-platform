"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Divider,
  Input,
  Modal,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { ApplicationStatus, StartupApplication } from "@/types/startup-application";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const STATUS_META: Record<ApplicationStatus, { label: string; color: string }> = {
  pending_review: { label: "Pending Review", color: "gold" },
  approved: { label: "Approved", color: "green" },
  rejected: { label: "Rejected", color: "red" },
  needs_changes: { label: "Needs Changes", color: "blue" },
};

/** Decisions the reviewer can take, and whether founder feedback is mandatory. */
const DECISIONS: Array<{
  status: Exclude<ApplicationStatus, "pending_review">;
  label: string;
  requiresFeedback: boolean;
  danger?: boolean;
}> = [
  { status: "approved", label: "Approve", requiresFeedback: false },
  { status: "needs_changes", label: "Request Changes", requiresFeedback: true },
  { status: "rejected", label: "Reject", requiresFeedback: true, danger: true },
];

function ExternalLink({ url, label }: { url?: string; label: string }) {
  if (!url) return <Text type="secondary">Not provided</Text>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <Space size={4}>
        <LinkOutlined />
        {label}
      </Space>
    </a>
  );
}

export default function ApplicationReviewPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { userData, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<StartupApplication | null>(null);

  const [decision, setDecision] = useState<(typeof DECISIONS)[number] | null>(null);
  const [feedback, setFeedback] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [notifyFounder, setNotifyFounder] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchApplication = useCallback(async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        router.push("/login");
        return;
      }
      const token = await user.getIdToken();

      const response = await fetch(`/api/startup-applications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setApplication(data.data);
        setReviewNotes(data.data.review?.reviewNotes || "");
      } else {
        message.error(data.error?.message || "Unable to load this application.");
        router.push("/dashboard/applications");
      }
    } catch (error) {
      console.error("Failed to load application:", error);
      message.error("Unable to load this application.");
      router.push("/dashboard/applications");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (authLoading) return;

    if (userData?.role !== "admin" && userData?.role !== "subadmin") {
      router.push("/dashboard");
      return;
    }

    if (id) fetchApplication();
  }, [authLoading, userData?.role, id, fetchApplication, router]);

  const submitDecision = async () => {
    if (!decision) return;

    if (decision.requiresFeedback && !feedback.trim()) {
      message.error("Please explain the decision so the founder knows what to address.");
      return;
    }

    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        router.push("/login");
        return;
      }
      const token = await user.getIdToken();

      const response = await fetch(`/api/startup-applications/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: decision.status,
          feedbackToFounder: feedback.trim(),
          reviewNotes: reviewNotes.trim(),
          notifyFounder,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        message.success(
          data.data?.founderNotified
            ? `${data.message} The founder has been notified.`
            : `${data.message}${
                notifyFounder ? " The founder could not be emailed - check SMTP settings." : ""
              }`
        );
        setDecision(null);
        setFeedback("");
        fetchApplication();
      } else {
        message.error(data.error?.message || "Unable to save this decision.");
      }
    } catch (error) {
      console.error("Failed to save decision:", error);
      message.error("Unable to save this decision.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!application) return null;

  const status = application.review?.status || "pending_review";
  const meta = STATUS_META[status];

  return (
    <div className="p-4 md:p-6">
      <div className="mx-auto max-w-5xl">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push("/dashboard/applications")}
          className="mb-4"
        >
          Back to queue
        </Button>

        <Card className="mb-6 rounded-xl">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <Space align="center" wrap>
                <Title level={3} style={{ margin: 0 }}>
                  {application.startup?.startupName}
                </Title>
                <Tag color={meta.color}>{meta.label}</Tag>
              </Space>
              <Paragraph className="mt-2 mb-0 text-gray-600">
                {application.overview?.oneLineDescription}
              </Paragraph>
              <Text type="secondary" className="text-xs">
                {application.applicationId} &middot; Submitted{" "}
                {application.createdAt
                  ? new Date(application.createdAt).toLocaleString()
                  : "unknown"}
              </Text>
            </div>

            <Space wrap>
              {DECISIONS.map((option) => (
                <Button
                  key={option.status}
                  danger={option.danger}
                  type={option.status === "approved" ? "primary" : "default"}
                  icon={
                    option.status === "approved" ? (
                      <CheckCircleOutlined />
                    ) : option.status === "rejected" ? (
                      <CloseCircleOutlined />
                    ) : (
                      <EditOutlined />
                    )
                  }
                  style={
                    option.status === "approved" ? { backgroundColor: "#16a34a" } : undefined
                  }
                  onClick={() => {
                    setDecision(option);
                    setFeedback(application.review?.feedbackToFounder || "");
                  }}
                >
                  {option.label}
                </Button>
              ))}
            </Space>
          </div>

          {status !== "pending_review" && application.review?.reviewedAt && (
            <Alert
              className="mt-4"
              type={status === "approved" ? "success" : status === "rejected" ? "error" : "info"}
              showIcon
              message={`${meta.label} by ${application.review.reviewerEmail || "team"} on ${new Date(
                application.review.reviewedAt
              ).toLocaleString()}`}
              description={application.review.feedbackToFounder || undefined}
            />
          )}
        </Card>

        <Card title="Founder Information" className="mb-6 rounded-xl">
          <Alert
            type="warning"
            showIcon
            className="mb-4"
            message="Internal only"
            description="These contact details are never shown to investors. They are released only when your team makes an introduction."
          />
          <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
            <Descriptions.Item label="Name">
              {application.founder?.founderName}
            </Descriptions.Item>
            <Descriptions.Item label="Designation">
              {application.founder?.designation}
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              <a href={`mailto:${application.founder?.email}`}>{application.founder?.email}</a>
            </Descriptions.Item>
            <Descriptions.Item label="Mobile (WhatsApp)">
              {application.founder?.mobileNumber}
            </Descriptions.Item>
            <Descriptions.Item label="LinkedIn" span={2}>
              <ExternalLink url={application.founder?.linkedinProfile} label="View profile" />
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="Startup & Overview" className="mb-6 rounded-xl">
          <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
            <Descriptions.Item label="Country">
              {application.startup?.country}
            </Descriptions.Item>
            <Descriptions.Item label="Incubation Centre">
              {application.startup?.incubationCentre}
            </Descriptions.Item>
            <Descriptions.Item label="Website / LinkedIn" span={2}>
              <ExternalLink url={application.startup?.companyWebsite} label="Open" />
            </Descriptions.Item>
            <Descriptions.Item label="Sector">{application.overview?.sector}</Descriptions.Item>
            <Descriptions.Item label="Business Model">
              {application.overview?.businessModel}
            </Descriptions.Item>
            <Descriptions.Item label="Stage">{application.overview?.stage}</Descriptions.Item>
            <Descriptions.Item label="TRL">TRL {application.overview?.trl}</Descriptions.Item>
          </Descriptions>

          <Divider orientation="left" plain>
            Technology & Defensibility
          </Divider>
          <Paragraph className="whitespace-pre-wrap text-gray-700">
            {application.overview?.technologyDescription}
          </Paragraph>
        </Card>

        <Card title="Traction & Intellectual Property" className="mb-6 rounded-xl">
          <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
            <Descriptions.Item label="Monthly Revenue">
              {application.traction?.monthlyRevenue}
            </Descriptions.Item>
            <Descriptions.Item label="Paying Customers">
              {application.traction?.payingCustomers}
            </Descriptions.Item>
            <Descriptions.Item label="Intellectual Property" span={2}>
              <Space wrap>
                {(application.intellectualProperty?.ipTypes || []).map((ip) => (
                  <Tag key={ip} color="purple">
                    {ip}
                  </Tag>
                ))}
              </Space>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="Fundraising" className="mb-6 rounded-xl">
          <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
            <Descriptions.Item label="Raising">
              {application.fundraising?.raisingAmount}
            </Descriptions.Item>
            <Descriptions.Item label="Valuation">
              {application.fundraising?.currentValuation || "Not disclosed"}
            </Descriptions.Item>
            <Descriptions.Item label="Previous Funding" span={2}>
              <Space wrap>
                {(application.fundraising?.previousFunding || []).map((entry) => (
                  <Tag key={entry}>{entry}</Tag>
                ))}
              </Space>
            </Descriptions.Item>
          </Descriptions>

          {application.fundraising?.useOfFunds && (
            <>
              <Divider orientation="left" plain>
                Use of Funds
              </Divider>
              <Paragraph className="whitespace-pre-wrap text-gray-700">
                {application.fundraising.useOfFunds}
              </Paragraph>
            </>
          )}

          {application.fundraising?.financialHighlights && (
            <>
              <Divider orientation="left" plain>
                Financial Highlights
              </Divider>
              <Paragraph className="whitespace-pre-wrap text-gray-700">
                {application.fundraising.financialHighlights}
              </Paragraph>
            </>
          )}

          {application.fundraising?.grantHistory && (
            <>
              <Divider orientation="left" plain>
                Grant History
              </Divider>
              <Paragraph className="whitespace-pre-wrap text-gray-700">
                {application.fundraising.grantHistory}
              </Paragraph>
            </>
          )}
        </Card>

        <Card title="Documents" className="mb-6 rounded-xl">
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Pitch Deck">
              <ExternalLink url={application.documents?.pitchDeckUrl} label="Open pitch deck" />
            </Descriptions.Item>
            <Descriptions.Item label="Product Demo">
              <ExternalLink url={application.documents?.productDemoUrl} label="Open demo" />
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="Internal Notes" className="mb-6 rounded-xl">
          <Text type="secondary" className="mb-2 block text-xs">
            Visible to your team only. Saved with your next decision.
          </Text>
          <TextArea
            rows={4}
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="Diligence notes, references checked, concerns..."
          />
        </Card>
      </div>

      <Modal
        open={Boolean(decision)}
        title={`${decision?.label} - ${application.startup?.startupName}`}
        onCancel={() => setDecision(null)}
        onOk={submitDecision}
        confirmLoading={saving}
        okText={decision?.label}
        okButtonProps={{ danger: decision?.danger }}
      >
        {decision?.status === "approved" && (
          <Alert
            type="success"
            showIcon
            className="mb-4"
            message="This startup will become visible to investors in the Deal Room immediately."
          />
        )}

        <Text strong className="mb-2 block">
          Message to founder{" "}
          {decision?.requiresFeedback ? (
            <Text type="danger">*</Text>
          ) : (
            <Text type="secondary">(optional)</Text>
          )}
        </Text>
        <TextArea
          rows={5}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder={
            decision?.status === "needs_changes"
              ? "Tell the founder exactly what needs to change."
              : decision?.status === "rejected"
              ? "Explain why this application was not accepted."
              : "Anything you would like the founder to know."
          }
        />

        <Checkbox
          className="mt-4"
          checked={notifyFounder}
          onChange={(e) => setNotifyFounder(e.target.checked)}
        >
          Email this decision to the founder
        </Checkbox>
      </Modal>
    </div>
  );
}
