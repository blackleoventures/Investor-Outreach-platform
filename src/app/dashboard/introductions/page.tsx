"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Drawer,
  Empty,
  Input,
  Row,
  Select,
  Spin,
  Statistic,
  Steps,
  Table,
  Tag,
  Timeline,
  Typography,
  message,
} from "antd";
import { ReloadOutlined, SearchOutlined, SendOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type {
  IntroductionOutcome,
  IntroductionRequest,
  IntroductionStage,
} from "@/types/startup-application";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

/** The workflow the team runs after an investor asks for an introduction. */
const STAGES: Array<{ key: IntroductionStage; label: string; description: string }> = [
  { key: "requested", label: "Requested", description: "Investor asked for an intro" },
  { key: "investor_verified", label: "Investor Verified", description: "Checked the investor" },
  { key: "startup_contacted", label: "Startup Contacted", description: "Reached out to founder" },
  { key: "meeting_scheduled", label: "Meeting Scheduled", description: "Intro call booked" },
  { key: "follow_up", label: "Follow Up", description: "Post-meeting follow up" },
  { key: "closed", label: "Closed", description: "Outcome recorded" },
];

const STAGE_COLORS: Record<IntroductionStage, string> = {
  requested: "gold",
  investor_verified: "cyan",
  startup_contacted: "blue",
  meeting_scheduled: "geekblue",
  follow_up: "purple",
  closed: "default",
};

const OUTCOMES: Array<{ value: IntroductionOutcome; label: string; color: string }> = [
  { value: "pending", label: "Pending", color: "default" },
  { value: "meeting_completed", label: "Meeting Completed", color: "blue" },
  { value: "in_diligence", label: "In Diligence", color: "cyan" },
  { value: "term_sheet", label: "Term Sheet", color: "purple" },
  { value: "invested", label: "Invested", color: "green" },
  { value: "passed", label: "Passed", color: "red" },
  { value: "no_response", label: "No Response", color: "orange" },
];

function stageIndex(stage: IntroductionStage): number {
  const index = STAGES.findIndex((s) => s.key === stage);
  return index === -1 ? 0 : index;
}

export default function IntroductionsDashboardPage() {
  const router = useRouter();
  const { userData, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<IntroductionRequest[]>([]);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<IntroductionStage | null>(null);

  const [selected, setSelected] = useState<IntroductionRequest | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        router.push("/login");
        return;
      }
      const token = await user.getIdToken();

      const response = await fetch("/api/introduction-requests", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setRequests(data.data || []);
      } else {
        message.error(data.error?.message || "Unable to load introduction requests.");
        setRequests([]);
      }
    } catch (error) {
      console.error("Failed to load introductions:", error);
      message.error("Unable to load introduction requests.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (authLoading) return;

    if (userData?.role !== "admin" && userData?.role !== "subadmin") {
      router.push("/dashboard");
      return;
    }

    fetchRequests();
  }, [authLoading, userData?.role, fetchRequests, router]);

  /** Persist a change and refresh both the table and the open drawer. */
  const patchRequest = async (id: string, payload: Record<string, unknown>) => {
    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        router.push("/login");
        return;
      }
      const token = await user.getIdToken();

      const response = await fetch(`/api/introduction-requests/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        message.success("Updated.");
        setNote("");

        const refreshed = await fetch("/api/introduction-requests", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const refreshedData = await refreshed.json();
        if (refreshed.ok && refreshedData.success) {
          const list: IntroductionRequest[] = refreshedData.data || [];
          setRequests(list);
          if (selected) {
            setSelected(list.find((r) => r.id === selected.id) || null);
          }
        }
      } else {
        message.error(data.error?.message || "Unable to save.");
      }
    } catch (error) {
      console.error("Failed to update introduction:", error);
      message.error("Unable to save.");
    } finally {
      setSaving(false);
    }
  };

  const stats = useMemo(() => {
    const open = requests.filter((r) => r.stage !== "closed").length;
    const awaitingVerification = requests.filter((r) => r.stage === "requested").length;
    const meetings = requests.filter((r) => r.stage === "meeting_scheduled").length;
    const invested = requests.filter((r) => r.outcome === "invested").length;
    return { open, awaitingVerification, meetings, invested };
  }, [requests]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (stageFilter && r.stage !== stageFilter) return false;
      if (!term) return true;
      return [r.investorName, r.investorEmail, r.investorFirm, r.startupName]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(term));
    });
  }, [requests, search, stageFilter]);

  const columns = [
    {
      title: "Investor",
      key: "investor",
      render: (_: unknown, record: IntroductionRequest) => (
        <div>
          <Text strong>{record.investorName}</Text>
          <div>
            <Text type="secondary" className="text-xs">
              {record.investorFirm || record.investorEmail}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Startup",
      key: "startup",
      render: (_: unknown, record: IntroductionRequest) => (
        <Text strong>{record.startupName}</Text>
      ),
    },
    {
      title: "Stage",
      key: "stage",
      render: (_: unknown, record: IntroductionRequest) => (
        <Tag color={STAGE_COLORS[record.stage]}>
          {STAGES.find((s) => s.key === record.stage)?.label || record.stage}
        </Tag>
      ),
    },
    {
      title: "Outcome",
      key: "outcome",
      render: (_: unknown, record: IntroductionRequest) => {
        const outcome = OUTCOMES.find((o) => o.value === record.outcome);
        return <Tag color={outcome?.color}>{outcome?.label || record.outcome}</Tag>;
      },
    },
    {
      title: "Assigned",
      key: "assignedTo",
      render: (_: unknown, record: IntroductionRequest) =>
        record.assignedTo || <Text type="secondary">Unassigned</Text>,
    },
    {
      title: "Requested",
      key: "createdAt",
      render: (_: unknown, record: IntroductionRequest) =>
        record.createdAt ? new Date(record.createdAt).toLocaleDateString() : "-",
    },
    {
      title: "",
      key: "action",
      render: (_: unknown, record: IntroductionRequest) => (
        <Button
          type="primary"
          size="small"
          onClick={() => {
            setSelected(record);
            setNote("");
          }}
        >
          Manage
        </Button>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <Title level={3} style={{ marginBottom: 4 }}>
            Introduction Requests
          </Title>
          <Text type="secondary">
            Every introduction runs through your team. Verify, contact, schedule, follow up.
          </Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchRequests} loading={loading}>
          Refresh
        </Button>
      </div>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={12} md={6}>
          <Card className="rounded-xl">
            <Statistic title="Open" value={stats.open} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="rounded-xl">
            <Statistic
              title="Awaiting Verification"
              value={stats.awaitingVerification}
              valueStyle={{ color: stats.awaitingVerification > 0 ? "#d97706" : undefined }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="rounded-xl">
            <Statistic title="Meetings Scheduled" value={stats.meetings} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="rounded-xl">
            <Statistic
              title="Invested"
              value={stats.invested}
              valueStyle={{ color: "#16a34a" }}
            />
          </Card>
        </Col>
      </Row>

      <Card className="mb-4 rounded-xl" bodyStyle={{ padding: 16 }}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              type={stageFilter === null ? "primary" : "default"}
              style={stageFilter === null ? { backgroundColor: "#4f46e5" } : undefined}
              onClick={() => setStageFilter(null)}
            >
              All
            </Button>
            {STAGES.map((stage) => {
              const count = requests.filter((r) => r.stage === stage.key).length;
              return (
                <Badge key={stage.key} count={count} size="small" offset={[-4, 2]}>
                  <Button
                    type={stageFilter === stage.key ? "primary" : "default"}
                    style={
                      stageFilter === stage.key ? { backgroundColor: "#4f46e5" } : undefined
                    }
                    onClick={() => setStageFilter(stage.key)}
                  >
                    {stage.label}
                  </Button>
                </Badge>
              );
            })}
          </div>

          <Input
            allowClear
            placeholder="Search investor, firm, or startup"
            prefix={<SearchOutlined className="text-gray-400" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full lg:max-w-sm"
          />
        </div>
      </Card>

      <Card className="rounded-xl" bodyStyle={{ padding: 0 }}>
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spin size="large" />
          </div>
        ) : visible.length === 0 ? (
          <div className="py-16">
            <Empty
              description={
                requests.length === 0
                  ? "No introduction requests yet."
                  : "No requests match your filters."
              }
            />
          </div>
        ) : (
          <Table
            rowKey="id"
            dataSource={visible}
            columns={columns}
            pagination={{ pageSize: 20, showSizeChanger: false }}
            scroll={{ x: 900 }}
          />
        )}
      </Card>

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        width={560}
        title={selected ? `${selected.investorName} → ${selected.startupName}` : ""}
      >
        {selected && (
          <div>
            <Card className="mb-4 rounded-lg" size="small">
              <Text type="secondary" className="block text-xs uppercase">
                Investor
              </Text>
              <Text strong>{selected.investorName}</Text>
              <div>
                <a href={`mailto:${selected.investorEmail}`}>{selected.investorEmail}</a>
              </div>
              {selected.investorFirm && (
                <Text type="secondary" className="text-sm">
                  {selected.investorFirm}
                </Text>
              )}
            </Card>

            {selected.message && (
              <Card className="mb-4 rounded-lg bg-gray-50" size="small">
                <Text type="secondary" className="block text-xs uppercase">
                  Investor note
                </Text>
                <Paragraph className="mb-0 mt-1 whitespace-pre-wrap">
                  {selected.message}
                </Paragraph>
              </Card>
            )}

            <Text strong className="mb-3 block">
              Workflow
            </Text>
            <Steps
              direction="vertical"
              size="small"
              current={stageIndex(selected.stage)}
              className="mb-4"
              items={STAGES.map((stage) => ({
                title: stage.label,
                description: stage.description,
              }))}
            />

            <Text strong className="mb-2 block">
              Move to stage
            </Text>
            <Select
              className="mb-4 w-full"
              value={selected.stage}
              onChange={(value) => patchRequest(selected.id, { stage: value })}
              disabled={saving}
              options={STAGES.map((s) => ({ label: s.label, value: s.key }))}
            />

            <Text strong className="mb-2 block">
              Outcome
            </Text>
            <Select
              className="mb-4 w-full"
              value={selected.outcome}
              onChange={(value) => patchRequest(selected.id, { outcome: value })}
              disabled={saving}
              options={OUTCOMES.map((o) => ({ label: o.label, value: o.value }))}
            />

            <Text strong className="mb-2 block">
              Assigned to
            </Text>
            <Input
              className="mb-4"
              placeholder="Team member email"
              defaultValue={selected.assignedTo || ""}
              onBlur={(e) => {
                const value = e.target.value.trim();
                if (value !== (selected.assignedTo || "")) {
                  patchRequest(selected.id, { assignedTo: value });
                }
              }}
              disabled={saving}
            />

            <Text strong className="mb-2 block">
              Meeting date
            </Text>
            <DatePicker
              showTime
              className="mb-4 w-full"
              value={selected.meetingScheduledAt ? dayjs(selected.meetingScheduledAt) : null}
              onChange={(value) =>
                patchRequest(selected.id, {
                  meetingScheduledAt: value ? value.toISOString() : null,
                })
              }
              disabled={saving}
            />

            <Text strong className="mb-2 block">
              Add a note
            </Text>
            <TextArea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What happened on this introduction?"
              className="mb-2"
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={saving}
              disabled={!note.trim()}
              style={{ backgroundColor: "#4f46e5" }}
              onClick={() => patchRequest(selected.id, { note: note.trim() })}
            >
              Add note
            </Button>

            {selected.teamNotes?.length > 0 && (
              <>
                <Text strong className="mb-3 mt-6 block">
                  Activity
                </Text>
                <Timeline
                  items={[...selected.teamNotes]
                    .reverse()
                    .map((entry) => ({
                      children: (
                        <div>
                          <Paragraph className="mb-1 whitespace-pre-wrap">
                            {entry.note}
                          </Paragraph>
                          <Text type="secondary" className="text-xs">
                            {entry.authorEmail} &middot;{" "}
                            {new Date(entry.createdAt).toLocaleString()}
                          </Text>
                        </div>
                      ),
                    }))}
                />
              </>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
