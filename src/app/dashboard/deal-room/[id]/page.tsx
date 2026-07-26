"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Input,
  Modal,
  Row,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  BankOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  ExperimentOutlined,
  FilePdfOutlined,
  GlobalOutlined,
  LinkOutlined,
  LockOutlined,
  PlayCircleOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  TrophyOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { formatUsd } from "@/lib/config/deal-room-options";
import type { PublicStartupProfile } from "@/types/startup-application";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

/**
 * Google Drive share links don't render in an iframe as-is; the /preview
 * variant does. Anything else is offered as a plain link.
 */
function toEmbeddableUrl(url: string): string | null {
  if (!url) return null;
  const driveFile = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveFile) return `https://drive.google.com/file/d/${driveFile[1]}/preview`;
  const drivePresentation = url.match(/docs\.google\.com\/presentation\/d\/([^/]+)/);
  if (drivePresentation)
    return `https://docs.google.com/presentation/d/${drivePresentation[1]}/preview`;
  if (/\.pdf($|\?)/i.test(url)) return url;
  return null;
}

function SectionCard({
  title,
  icon,
  children,
  extra,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <Card
      className="mb-6 rounded-xl"
      title={
        <Space>
          {icon}
          {title}
        </Space>
      }
      extra={extra}
    >
      {children}
    </Card>
  );
}

export default function StartupProfilePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { userData, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [startup, setStartup] = useState<PublicStartupProfile | null>(null);
  const [alreadyRequested, setAlreadyRequested] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        router.push("/login");
        return;
      }
      const token = await user.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [profileResponse, requestsResponse] = await Promise.all([
        fetch(`/api/deal-room/startups/${id}`, { headers }),
        fetch("/api/introduction-requests", { headers }),
      ]);

      const profileData = await profileResponse.json();

      if (profileResponse.ok && profileData.success) {
        setStartup(profileData.data);
      } else {
        message.error(profileData.error?.message || "Unable to load this startup.");
        router.push("/dashboard/deal-room");
        return;
      }

      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        const mine = (requestsData.data || []).filter(
          (r: any) => r.startupId === id && r.stage !== "closed"
        );
        setAlreadyRequested(mine.length > 0);
      }
    } catch (error) {
      console.error("Failed to load startup profile:", error);
      message.error("Unable to load this startup.");
      router.push("/dashboard/deal-room");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (authLoading) return;

    const isStaff = userData?.role === "admin" || userData?.role === "subadmin";
    const hasInvite =
      typeof window !== "undefined" &&
      sessionStorage.getItem("dealRoomAccess") === "granted";

    if (!isStaff && !hasInvite) {
      router.push("/dashboard");
      return;
    }

    if (id) loadProfile();
  }, [authLoading, userData?.role, id, loadProfile, router]);

  const submitRequest = async () => {
    setSending(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        router.push("/login");
        return;
      }
      const token = await user.getIdToken();

      const response = await fetch("/api/introduction-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ startupId: id, message: note.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        message.success(data.message);
        setAlreadyRequested(true);
        setModalOpen(false);
        setNote("");
      } else if (response.status === 409) {
        message.info(data.error?.message);
        setAlreadyRequested(true);
        setModalOpen(false);
      } else {
        message.error(data.error?.message || "Unable to send your request.");
      }
    } catch (error) {
      console.error("Introduction request failed:", error);
      message.error("Unable to send your request.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!startup) return null;

  const deckEmbed = toEmbeddableUrl(startup.pitchDeckUrl);

  const requestButton = alreadyRequested ? (
    <Button size="large" icon={<CheckCircleOutlined />} disabled block>
      Introduction Requested
    </Button>
  ) : (
    <Button
      type="primary"
      size="large"
      block
      icon={<TeamOutlined />}
      style={{ backgroundColor: "#4f46e5" }}
      onClick={() => setModalOpen(true)}
    >
      Request Introduction
    </Button>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push("/dashboard/deal-room")}
          className="mb-4"
        >
          Back to Deal Room
        </Button>

        {/* Overview */}
        <Card className="mb-6 overflow-hidden rounded-xl" bodyStyle={{ padding: 0 }}>
          <div className="bg-black p-6 text-white md:p-8">
            <Space wrap size={8} className="mb-3">
              <Tag color="#4f46e5" className="m-0">
                {startup.stage}
              </Tag>
              <Tag className="m-0">{startup.sector}</Tag>
              {startup.isIncubated && (
                <Tag icon={<BankOutlined />} color="geekblue" className="m-0">
                  Incubated
                </Tag>
              )}
              {startup.isGrantWinner && (
                <Tag icon={<TrophyOutlined />} color="gold" className="m-0">
                  Grant Winner
                </Tag>
              )}
            </Space>

            <Title level={2} style={{ color: "white", margin: "0 0 8px" }}>
              {startup.startupName}
            </Title>
            <Paragraph style={{ color: "#d4d4d8", fontSize: 16, marginBottom: 16 }}>
              {startup.oneLineDescription}
            </Paragraph>

            <Space wrap size={16} className="text-sm" style={{ color: "#a1a1aa" }}>
              <span>
                <EnvironmentOutlined /> {startup.country}
              </span>
              {startup.incubationCentre && (
                <span>
                  <BankOutlined /> {startup.incubationCentre}
                </span>
              )}
              {startup.companyWebsite && (
                <a
                  href={startup.companyWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#ff9617" }}
                >
                  <GlobalOutlined /> Website
                </a>
              )}
            </Space>
          </div>

          <div className="p-6">
            <Row gutter={[24, 24]}>
              <Col xs={12} md={6}>
                <Statistic
                  title="Funding Ask"
                  value={startup.raisingAmount || formatUsd(startup.raisingAmountUsd)}
                  valueStyle={{ color: "#16a34a", fontSize: 20 }}
                />
              </Col>
              <Col xs={12} md={6}>
                <Statistic
                  title="Monthly Revenue"
                  value={startup.monthlyRevenue}
                  valueStyle={{ fontSize: 16 }}
                />
              </Col>
              <Col xs={12} md={6}>
                <Statistic title="Paying Customers" value={startup.payingCustomers} />
              </Col>
              <Col xs={12} md={6}>
                <Statistic title="Technology Readiness" value={`TRL ${startup.trl}`} />
              </Col>
            </Row>
          </div>
        </Card>

        <Row gutter={[24, 0]}>
          <Col xs={24} lg={15}>
            {/* Pitch Deck */}
            <SectionCard
              title="Pitch Deck"
              icon={<FilePdfOutlined />}
              extra={
                startup.pitchDeckUrl && (
                  <Button
                    size="small"
                    icon={<LinkOutlined />}
                    href={startup.pitchDeckUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open
                  </Button>
                )
              }
            >
              {deckEmbed ? (
                <div className="aspect-[16/10] w-full overflow-hidden rounded-lg bg-gray-100">
                  <iframe
                    src={deckEmbed}
                    className="h-full w-full border-none"
                    title="Pitch deck"
                    allow="autoplay"
                  />
                </div>
              ) : startup.pitchDeckUrl ? (
                <div className="py-8 text-center">
                  <Paragraph type="secondary">
                    This deck is hosted somewhere that can&apos;t be previewed inline.
                  </Paragraph>
                  <Button
                    type="primary"
                    icon={<FilePdfOutlined />}
                    href={startup.pitchDeckUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ backgroundColor: "#4f46e5" }}
                  >
                    Open Pitch Deck
                  </Button>
                </div>
              ) : (
                <Empty description="No pitch deck provided." />
              )}

              {startup.productDemoUrl && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <Button
                    icon={<PlayCircleOutlined />}
                    href={startup.productDemoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Product Demo
                  </Button>
                </div>
              )}
            </SectionCard>

            {/* Metrics */}
            <SectionCard title="Metrics" icon={<ExperimentOutlined />}>
              <Row gutter={[16, 16]}>
                <Col xs={12} sm={8}>
                  <Text type="secondary" className="block text-xs uppercase">
                    Stage
                  </Text>
                  <Text strong>{startup.stage}</Text>
                </Col>
                <Col xs={12} sm={8}>
                  <Text type="secondary" className="block text-xs uppercase">
                    Business Model
                  </Text>
                  <Text strong>{startup.businessModel || "Not specified"}</Text>
                </Col>
                <Col xs={12} sm={8}>
                  <Text type="secondary" className="block text-xs uppercase">
                    TRL
                  </Text>
                  <Text strong>TRL {startup.trl}</Text>
                </Col>
                <Col xs={12} sm={8}>
                  <Text type="secondary" className="block text-xs uppercase">
                    Monthly Revenue
                  </Text>
                  <Text strong>{startup.monthlyRevenue}</Text>
                </Col>
                <Col xs={12} sm={8}>
                  <Text type="secondary" className="block text-xs uppercase">
                    Paying Customers
                  </Text>
                  <Text strong>{startup.payingCustomers}</Text>
                </Col>
                <Col xs={12} sm={8}>
                  <Text type="secondary" className="block text-xs uppercase">
                    Incubation
                  </Text>
                  <Text strong>{startup.incubationCentre || "Not incubated"}</Text>
                </Col>
              </Row>

              <Divider orientation="left" plain>
                Technology & Defensibility
              </Divider>
              <Paragraph className="whitespace-pre-wrap text-gray-700">
                {startup.technologyDescription}
              </Paragraph>

              <Divider orientation="left" plain>
                Intellectual Property
              </Divider>
              <Space wrap>
                {startup.ipTypes.length > 0 ? (
                  startup.ipTypes.map((ip) => (
                    <Tag key={ip} icon={<SafetyCertificateOutlined />} color="purple">
                      {ip}
                    </Tag>
                  ))
                ) : (
                  <Text type="secondary">Not disclosed</Text>
                )}
              </Space>
            </SectionCard>

            {/* Use of Funds */}
            <SectionCard title="Use of Funds" icon={<DollarOutlined />}>
              {startup.useOfFunds ? (
                <Paragraph className="whitespace-pre-wrap text-gray-700">
                  {startup.useOfFunds}
                </Paragraph>
              ) : (
                <Text type="secondary">
                  Not provided. Request an introduction to discuss deployment plans.
                </Text>
              )}
            </SectionCard>

            {/* Financial Highlights */}
            <SectionCard title="Financial Highlights" icon={<DollarOutlined />}>
              {startup.financialHighlights ? (
                <Paragraph className="whitespace-pre-wrap text-gray-700">
                  {startup.financialHighlights}
                </Paragraph>
              ) : (
                <Text type="secondary">Not provided.</Text>
              )}
            </SectionCard>

            {/* Grant History */}
            <SectionCard title="Grant History" icon={<TrophyOutlined />}>
              {startup.grantHistory ? (
                <Paragraph className="whitespace-pre-wrap text-gray-700">
                  {startup.grantHistory}
                </Paragraph>
              ) : startup.isGrantWinner ? (
                <Text type="secondary">
                  This startup has received grant funding. Details not provided.
                </Text>
              ) : (
                <Text type="secondary">No grants recorded.</Text>
              )}
            </SectionCard>
          </Col>

          {/* Sidebar */}
          <Col xs={24} lg={9}>
            <Card className="mb-6 rounded-xl">
              <Title level={5} style={{ marginTop: 0 }}>
                Interested in this startup?
              </Title>
              <Paragraph type="secondary" className="text-sm">
                Founder contact details are not published. Our team verifies every investor,
                contacts the startup, and coordinates the meeting directly.
              </Paragraph>
              {requestButton}
              {alreadyRequested && (
                <Alert
                  className="mt-3"
                  type="success"
                  showIcon
                  message="Our team has your request and will be in touch."
                />
              )}
            </Card>

            {/* Funding Ask */}
            <SectionCard title="Funding Ask" icon={<DollarOutlined />}>
              <div className="mb-4">
                <Text type="secondary" className="block text-xs uppercase">
                  Raising
                </Text>
                <Title level={3} style={{ margin: 0, color: "#16a34a" }}>
                  {startup.raisingAmount || formatUsd(startup.raisingAmountUsd)}
                </Title>
                {startup.raisingAmountUsd !== null && startup.raisingAmount && (
                  <Text type="secondary" className="text-xs">
                    ~{formatUsd(startup.raisingAmountUsd)} USD equivalent
                  </Text>
                )}
              </div>

              <div className="mb-4">
                <Text type="secondary" className="block text-xs uppercase">
                  Current Valuation
                </Text>
                <Text strong>{startup.currentValuation || "Not disclosed"}</Text>
              </div>

              <div>
                <Text type="secondary" className="mb-2 block text-xs uppercase">
                  Previous Funding
                </Text>
                <Space wrap>
                  {startup.previousFunding.length > 0 ? (
                    startup.previousFunding.map((entry) => <Tag key={entry}>{entry}</Tag>)
                  ) : (
                    <Text type="secondary">Not disclosed</Text>
                  )}
                </Space>
              </div>
            </SectionCard>

            {/* Founder Profiles */}
            <SectionCard title="Founder Profiles" icon={<UserOutlined />}>
              {startup.founders.length > 0 ? (
                startup.founders.map((founder, index) => (
                  <div
                    key={index}
                    className="mb-3 flex items-center gap-3 rounded-lg bg-gray-50 p-3"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 font-semibold text-white">
                      {founder.founderName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <Text strong className="block truncate">
                        {founder.founderName}
                      </Text>
                      <Text type="secondary" className="text-xs">
                        {founder.designation}
                      </Text>
                    </div>
                  </div>
                ))
              ) : (
                <Text type="secondary">Not provided.</Text>
              )}

              <Alert
                className="mt-3"
                type="info"
                icon={<LockOutlined />}
                showIcon
                message="Contact details protected"
                description="Email, phone, and LinkedIn are shared only after our team verifies your request."
              />
            </SectionCard>
          </Col>
        </Row>
      </div>

      <Modal
        open={modalOpen}
        title={`Request an introduction to ${startup.startupName}`}
        onCancel={() => setModalOpen(false)}
        onOk={submitRequest}
        confirmLoading={sending}
        okText="Send Request"
        okButtonProps={{ style: { backgroundColor: "#4f46e5" } }}
      >
        <Paragraph type="secondary" className="text-sm">
          Our team will verify your request, contact {startup.startupName}, and coordinate a
          meeting. You&apos;ll hear from us directly.
        </Paragraph>
        <Text strong className="mb-2 block">
          Add a note (optional)
        </Text>
        <TextArea
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={2000}
          showCount
          placeholder="What interests you about this startup? Any specific questions for the founder?"
        />
      </Modal>
    </div>
  );
}
