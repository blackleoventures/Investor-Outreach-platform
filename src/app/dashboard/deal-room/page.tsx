"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  Col,
  Empty,
  Input,
  Row,
  Select,
  Spin,
  Switch,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  ArrowRightOutlined,
  BankOutlined,
  ClearOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import {
  BUSINESS_MODELS,
  FUNDING_ASK_RANGES,
  REVENUE_BANDS,
  SECTORS,
  STARTUP_STAGES,
  formatUsd,
  revenueRank,
  stageRank,
} from "@/lib/config/deal-room-options";
import type { PublicStartupProfile } from "@/types/startup-application";

const { Title, Text, Paragraph } = Typography;

type SortKey = "recent" | "revenue" | "growth" | "fundingAsk";

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "recent", label: "Recently Added" },
  { value: "revenue", label: "Revenue" },
  { value: "growth", label: "Fastest Growing" },
  { value: "fundingAsk", label: "Funding Ask" },
];

/**
 * Composite growth score. The application captures a point-in-time snapshot
 * rather than a time series, so "fastest growing" ranks how far along a startup
 * is: stage first, then revenue band, then customer count as a tiebreaker.
 */
function growthScore(startup: PublicStartupProfile): number {
  return (
    stageRank(startup.stage) * 1000 +
    revenueRank(startup.monthlyRevenue) * 100 +
    Math.min(startup.payingCustomers || 0, 99)
  );
}

export default function InvestorPortalPage() {
  const router = useRouter();
  const { userData, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [startups, setStartups] = useState<PublicStartupProfile[]>([]);

  const [search, setSearch] = useState("");
  const [sector, setSector] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [fundingRange, setFundingRange] = useState<string | null>(null);
  const [revenue, setRevenue] = useState<string | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [businessModel, setBusinessModel] = useState<string | null>(null);
  const [incubatedOnly, setIncubatedOnly] = useState(false);
  const [grantWinnersOnly, setGrantWinnersOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("recent");

  const fetchStartups = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const user = auth.currentUser;
      if (!user) {
        router.push("/login");
        return;
      }
      const token = await user.getIdToken();

      const response = await fetch("/api/deal-room/startups", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setStartups(data.data || []);
      } else {
        setStartups([]);
        setFetchError(true);
      }
    } catch (error) {
      console.error("Failed to load deal room:", error);
      setStartups([]);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (authLoading) return;

    // Staff browse from the sidebar; investors arrive via their magic link,
    // which sets the session flag.
    const isStaff = userData?.role === "admin" || userData?.role === "subadmin";
    const hasInvite =
      typeof window !== "undefined" &&
      sessionStorage.getItem("dealRoomAccess") === "granted";

    if (!isStaff && !hasInvite) {
      router.push("/dashboard");
      return;
    }

    fetchStartups();
  }, [authLoading, userData?.role, fetchStartups, router]);

  // Countries come from the data rather than the master list so the dropdown
  // only offers values that will actually return results.
  const countries = useMemo(
    () => Array.from(new Set(startups.map((s) => s.country).filter(Boolean))).sort(),
    [startups]
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const range = FUNDING_ASK_RANGES.find((r) => r.label === fundingRange);

    const filtered = startups.filter((startup) => {
      if (term) {
        const haystack = [
          startup.startupName,
          startup.oneLineDescription,
          startup.sector,
          startup.country,
          startup.businessModel,
          startup.incubationCentre,
          startup.technologyDescription,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      if (sector && startup.sector !== sector) return false;
      if (country && startup.country !== country) return false;
      if (revenue && startup.monthlyRevenue !== revenue) return false;
      if (stage && startup.stage !== stage) return false;
      if (businessModel && startup.businessModel !== businessModel) return false;
      if (incubatedOnly && !startup.isIncubated) return false;
      if (grantWinnersOnly && !startup.isGrantWinner) return false;

      if (range) {
        const ask = startup.raisingAmountUsd;
        // An unparseable ask is excluded from range filtering rather than
        // treated as zero, which would wrongly land it in the lowest bucket.
        if (ask === null) return false;
        if (ask < range.min || ask >= range.max) return false;
      }

      return true;
    });

    const sorted = [...filtered];
    switch (sortBy) {
      case "revenue":
        sorted.sort(
          (a, b) =>
            revenueRank(b.monthlyRevenue) - revenueRank(a.monthlyRevenue) ||
            (b.payingCustomers || 0) - (a.payingCustomers || 0)
        );
        break;
      case "growth":
        sorted.sort((a, b) => growthScore(b) - growthScore(a));
        break;
      case "fundingAsk":
        sorted.sort((a, b) => (b.raisingAmountUsd ?? -1) - (a.raisingAmountUsd ?? -1));
        break;
      default:
        sorted.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }

    return sorted;
  }, [
    startups,
    search,
    sector,
    country,
    fundingRange,
    revenue,
    stage,
    businessModel,
    incubatedOnly,
    grantWinnersOnly,
    sortBy,
  ]);

  const activeFilterCount = [
    search.trim(),
    sector,
    country,
    fundingRange,
    revenue,
    stage,
    businessModel,
    incubatedOnly || null,
    grantWinnersOnly || null,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearch("");
    setSector(null);
    setCountry(null);
    setFundingRange(null);
    setRevenue(null);
    setStage(null);
    setBusinessModel(null);
    setIncubatedOnly(false);
    setGrantWinnersOnly(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <Title level={2} style={{ marginBottom: 4 }}>
            Deal Room
          </Title>
          <Text type="secondary">
            Curated, reviewed startups. Request an introduction and our team handles the rest.
          </Text>
        </div>

        {/* Filters */}
        <Card className="mb-6 rounded-xl" bodyStyle={{ padding: 16 }}>
          <Input
            allowClear
            size="large"
            placeholder="Search by startup, description, sector, or technology..."
            prefix={<SearchOutlined className="text-gray-400" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4"
          />

          <Row gutter={[12, 12]}>
            <Col xs={24} sm={12} lg={6}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                className="w-full"
                placeholder="Sector / Industry"
                value={sector}
                onChange={setSector}
                options={SECTORS.map((s) => ({ label: s, value: s }))}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                className="w-full"
                placeholder="Country"
                value={country}
                onChange={setCountry}
                options={countries.map((c) => ({ label: c, value: c }))}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Select
                allowClear
                className="w-full"
                placeholder="Funding Required"
                value={fundingRange}
                onChange={setFundingRange}
                options={FUNDING_ASK_RANGES.map((r) => ({ label: r.label, value: r.label }))}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Select
                allowClear
                className="w-full"
                placeholder="Revenue"
                value={revenue}
                onChange={setRevenue}
                options={REVENUE_BANDS.map((r) => ({ label: r, value: r }))}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Select
                allowClear
                className="w-full"
                placeholder="Stage"
                value={stage}
                onChange={setStage}
                options={STARTUP_STAGES.map((s) => ({ label: s, value: s }))}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Select
                allowClear
                className="w-full"
                placeholder="Business Model"
                value={businessModel}
                onChange={setBusinessModel}
                options={BUSINESS_MODELS.map((m) => ({ label: m, value: m }))}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Select
                className="w-full"
                value={sortBy}
                onChange={(value: SortKey) => setSortBy(value)}
                options={SORT_OPTIONS}
                suffixIcon={
                  <Tooltip title="Fastest Growing ranks by stage, then revenue band, then paying customers.">
                    <InfoCircleOutlined />
                  </Tooltip>
                }
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <div className="flex h-8 items-center gap-4">
                <span className="flex items-center gap-2">
                  <Switch size="small" checked={incubatedOnly} onChange={setIncubatedOnly} />
                  <Text className="text-sm">Incubated</Text>
                </span>
                <span className="flex items-center gap-2">
                  <Switch
                    size="small"
                    checked={grantWinnersOnly}
                    onChange={setGrantWinnersOnly}
                  />
                  <Text className="text-sm">Grant Winner</Text>
                </span>
              </div>
            </Col>
          </Row>

          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
            <Text type="secondary" className="text-sm">
              {visible.length} {visible.length === 1 ? "startup" : "startups"}
              {activeFilterCount > 0 ? ` matching ${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"}` : ""}
            </Text>
            {activeFilterCount > 0 && (
              <Button type="link" size="small" icon={<ClearOutlined />} onClick={clearFilters}>
                Clear all
              </Button>
            )}
          </div>
        </Card>

        {/* Results */}
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <Spin size="large" />
            <Text type="secondary">Loading opportunities...</Text>
          </div>
        ) : fetchError ? (
          <Empty description="We couldn't load the deal room.">
            <Button type="primary" icon={<ReloadOutlined />} onClick={fetchStartups}>
              Retry
            </Button>
          </Empty>
        ) : visible.length === 0 ? (
          <Empty
            description={
              startups.length === 0
                ? "No startups have been approved for the deal room yet."
                : "No startups match your filters."
            }
          >
            {activeFilterCount > 0 && <Button onClick={clearFilters}>Clear filters</Button>}
          </Empty>
        ) : (
          <Row gutter={[20, 20]}>
            {visible.map((startup) => (
              <Col xs={24} sm={12} lg={8} key={startup.id}>
                <Card
                  hoverable
                  className="flex h-full flex-col rounded-xl"
                  bodyStyle={{ flex: 1, display: "flex", flexDirection: "column" }}
                  onClick={() => router.push(`/dashboard/deal-room/${startup.id}`)}
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Title level={4} style={{ marginBottom: 2 }} ellipsis>
                        {startup.startupName}
                      </Title>
                      <Text
                        type="secondary"
                        className="line-clamp-1 text-xs uppercase tracking-wide"
                        title={startup.sector}
                      >
                        {startup.sector}
                      </Text>
                    </div>
                    <Tag color="#4f46e5" className="m-0 shrink-0">
                      {startup.stage}
                    </Tag>
                  </div>

                  <Paragraph ellipsis={{ rows: 3 }} className="mb-4 flex-grow text-gray-600">
                    {startup.oneLineDescription}
                  </Paragraph>

                  <div className="mb-3 flex flex-wrap gap-1">
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
                    {startup.businessModel && (
                      <Tag className="m-0">{startup.businessModel}</Tag>
                    )}
                  </div>

                  <div className="mt-auto space-y-2 border-t border-gray-100 pt-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-gray-500">
                        <EnvironmentOutlined /> {startup.country}
                      </span>
                      <span className="flex items-center gap-2 text-gray-500">
                        <TeamOutlined /> {startup.payingCustomers} customers
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 font-medium text-gray-900">
                        <DollarOutlined className="text-green-600" />
                        {startup.raisingAmount || formatUsd(startup.raisingAmountUsd)}
                      </span>
                      <Text type="secondary" className="text-xs">
                        {startup.monthlyRevenue}
                      </Text>
                    </div>

                    <Button
                      type="primary"
                      block
                      className="mt-2"
                      style={{ backgroundColor: "#4f46e5" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/deal-room/${startup.id}`);
                      }}
                    >
                      View Profile <ArrowRightOutlined />
                    </Button>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>
    </div>
  );
}
