"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Button,
  Table,
  Tag,
  Spin,
  message,
  Progress,
  Statistic,
  Input,
  Select,
  Space,
  Modal,
  Checkbox,
} from "antd";
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  SearchOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface MatchResultsProps {
  selectedClient: any;
  targetType: string;
  matchResults: any;
  onMatchComplete: (results: any) => void;
  onNext: () => void;
  onBack: () => void;
  getAuthToken: () => Promise<string | null>;
}

export default function MatchResults({
  selectedClient,
  targetType,
  matchResults,
  onMatchComplete,
  onNext,
  onBack,
  getAuthToken,
}: MatchResultsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Key identifying the inputs that produced the current matches. Used to
  // detect stale matches when the user goes Back and changes client/target.
  const currentInputKey = `${selectedClient?.id ?? ""}|${targetType}`;

  useEffect(() => {
    // Run matching when there are no results yet, or when the existing results
    // were produced for a different client/targetType (stale after going Back).
    const stale =
      matchResults && matchResults.__inputKey && matchResults.__inputKey !== currentInputKey;
    if (!matchResults || stale) {
      runMatching();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentInputKey]);

  useEffect(() => {
    if (matchResults?.matches) {
      filterData();
    }
  }, [searchText, priorityFilter, typeFilter, stateFilter, matchResults]);

  // Location strings for a match: incubators carry "State/City" from the
  // sheet, investors carry a free-form locations array.
  const getMatchLocations = (item: any): string[] => {
    const locs: string[] = [];
    if (item.rawData?.stateCity) locs.push(item.rawData.stateCity);
    if (Array.isArray(item.rawData?.locations)) locs.push(...item.rawData.locations);
    return locs.map((l) => String(l).trim()).filter((l) => l.length > 0);
  };

  // Unique state/location options across all matches (case-insensitive dedupe,
  // first-seen casing wins).
  const stateOptions: string[] = (() => {
    const seen = new Map<string, string>();
    (matchResults?.matches || []).forEach((item: any) => {
      getMatchLocations(item).forEach((l) => {
        const key = l.toLowerCase();
        if (!seen.has(key)) seen.set(key, l);
      });
    });
    return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
  })();

  const runMatching = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/campaigns/match`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clientId: selectedClient.id,
          targetType,
        }),
      });

      if (!response.ok) {
        throw new Error("Matching failed");
      }

      const data = await response.json();
      // Stamp the inputs that produced these matches so we can detect staleness.
      onMatchComplete({ ...data, __inputKey: currentInputKey });
      message.success(`Found ${data.totalMatches} matches!`);
    } catch (error: any) {
      console.error("Matching error:", error);
      setError(error.message || "Failed to find matches");
      message.error(error.message || "Failed to find matches");
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    let filtered = matchResults.matches || [];

    if (searchText) {
      filtered = filtered.filter(
        (item: any) =>
          item.name.toLowerCase().includes(searchText.toLowerCase()) ||
          item.organization.toLowerCase().includes(searchText.toLowerCase()) ||
          item.email.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (priorityFilter !== "all") {
      filtered = filtered.filter((item: any) => item.priority === priorityFilter);
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((item: any) => item.type === typeFilter);
    }

    if (stateFilter !== "all") {
      filtered = filtered.filter((item: any) =>
        getMatchLocations(item).some(
          (l) => l.toLowerCase() === stateFilter.toLowerCase()
        )
      );
    }

    setFilteredData(filtered);
  };

  const handleDeleteSelected = () => {
    if (selectedRowKeys.length === 0) {
      message.warning("Please select contacts to delete");
      return;
    }

    Modal.confirm({
      title: "Remove Selected Contacts?",
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>Remove <strong>{selectedRowKeys.length}</strong> selected contacts from this campaign?</p>
          <p className="text-gray-600 text-sm mt-2">
            These contacts won't receive emails from this campaign. This only
            affects the current selection — you can re-run matching to bring
            them back.
          </p>
        </div>
      ),
      okText: "Remove",
      okType: "danger",
      cancelText: "Cancel",
      onOk: () => {
        // Remove selected contacts from matchResults
        const updatedMatches = matchResults.matches.filter(
          (match: any) => !selectedRowKeys.includes(match.id)
        );

        // Recalculate statistics
        const highPriority = updatedMatches.filter((m: any) => m.priority === "high").length;
        const mediumPriority = updatedMatches.filter((m: any) => m.priority === "medium").length;
        const lowPriority = updatedMatches.filter((m: any) => m.priority === "low").length;
        const investorCount = updatedMatches.filter((m: any) => m.type === "investor").length;
        const incubatorCount = updatedMatches.filter((m: any) => m.type === "incubator").length;
        const totalMatches = updatedMatches.length;

        const updatedResults = {
          ...matchResults,
          matches: updatedMatches,
          totalMatches,
          highPriority,
          highPriorityPercent: totalMatches > 0 ? Math.round((highPriority / totalMatches) * 100) : 0,
          mediumPriority,
          mediumPriorityPercent: totalMatches > 0 ? Math.round((mediumPriority / totalMatches) * 100) : 0,
          lowPriority,
          lowPriorityPercent: totalMatches > 0 ? Math.round((lowPriority / totalMatches) * 100) : 0,
          investorCount,
          investorPercent: totalMatches > 0 ? Math.round((investorCount / totalMatches) * 100) : 0,
          incubatorCount,
          incubatorPercent: totalMatches > 0 ? Math.round((incubatorCount / totalMatches) * 100) : 0,
        };

        onMatchComplete({ ...updatedResults, __inputKey: currentInputKey });
        setSelectedRowKeys([]);
        message.success(`${selectedRowKeys.length} contacts removed successfully`);
      },
    });
  };

  const escapeCsv = (value: any) => {
    const str = value === null || value === undefined ? "" : String(value);
    // Always quote and escape embedded double-quotes per RFC 4180.
    return `"${str.replace(/"/g, '""')}"`;
  };

  const exportToCSV = () => {
    if (!matchResults?.matches) return;

    const csvContent = [
      ["Name", "Email", "Organization", "Location", "Type", "Priority", "Score", "Matched Criteria"],
      ...matchResults.matches.map((item: any) => [
        item.name,
        item.email,
        item.organization,
        getMatchLocations(item).join("; "),
        item.type,
        item.priority,
        item.matchScore,
        (item.matchedCriteria || []).join("; "),
      ]),
    ]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campaign-matches-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    message.success("Exported to CSV");
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "green";
      case "medium":
        return "orange";
      case "low":
        return "default";
      default:
        return "default";
    }
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys);
    },
    selections: [
      Table.SELECTION_ALL,
      Table.SELECTION_INVERT,
      Table.SELECTION_NONE,
    ],
  };

  const allFilteredSelected =
    filteredData.length > 0 &&
    (() => {
      const selected = new Set(selectedRowKeys);
      return filteredData.every((item: any) => selected.has(item.id));
    })();

  const handleSelectAllFiltered = (checked: boolean) => {
    setSelectedRowKeys(checked ? filteredData.map((item: any) => item.id) : []);
  };

  const columns = [
    {
      title: "Rank",
      dataIndex: "rank",
      key: "rank",
      width: 70,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      width: 150,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 200,
      render: (email: string) => (
        <span className="text-brand-600">{email}</span>
      ),
    },
    {
      title: "Organization",
      dataIndex: "organization",
      key: "organization",
      width: 180,
    },
    {
      title: "Location",
      key: "location",
      width: 140,
      render: (_: any, record: any) => {
        const locs = getMatchLocations(record);
        return locs.length > 0 ? (
          <span>{locs.join(", ")}</span>
        ) : (
          <span className="text-gray-400">—</span>
        );
      },
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 100,
      render: (type: string) => (
        <Tag color={type === "investor" ? "blue" : "green"}>
          {type === "investor" ? "Investor" : "Incubator"}
        </Tag>
      ),
    },
    {
      title: "Match Score",
      dataIndex: "matchScore",
      key: "matchScore",
      width: 150,
      render: (score: number) => (
        <div className="flex items-center gap-2">
          <Progress
            percent={score}
            size="small"
            style={{ width: 80 }}
            strokeColor={score >= 80 ? "#52c41a" : score >= 60 ? "#faad14" : "#ff4d4f"}
          />
          <span className="font-semibold">{score}</span>
        </div>
      ),
    },
    {
      title: "Priority",
      dataIndex: "priority",
      key: "priority",
      width: 100,
      render: (priority: string) => (
        <Tag color={getPriorityColor(priority)}>
          {priority.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Matched Criteria",
      dataIndex: "matchedCriteria",
      key: "matchedCriteria",
      width: 200,
      render: (criteria: string[]) => (
        <div className="flex gap-1 flex-wrap">
          {criteria.map((c, i) => (
            <Tag key={i} color="blue" className="text-xs">
              {c}
            </Tag>
          ))}
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <Card>
        <div className="flex flex-col justify-center items-center py-12">
          <Spin size="large" />
          <p className="mt-4 text-lg font-semibold">Finding matches...</p>
          <p className="text-gray-500">This may take 20-30 seconds</p>
        </div>
      </Card>
    );
  }

  // Error state: matching failed — let the user retry instead of a blank screen.
  if (error && !matchResults) {
    return (
      <div>
        <Card>
          <div className="flex flex-col justify-center items-center py-12 text-center">
            <ExclamationCircleOutlined style={{ fontSize: 40, color: "#ff4d4f" }} />
            <p className="mt-4 text-lg font-semibold">Matching failed</p>
            <p className="text-gray-500 mb-4">{error}</p>
            <Button
              type="primary"
              onClick={runMatching}
              style={{ backgroundColor: "#4f46e5", borderColor: "#4f46e5" }}
            >
              Retry matching
            </Button>
          </div>
        </Card>
        <div className="flex justify-between mt-6">
          <Button size="large" onClick={onBack} icon={<ArrowLeftOutlined />}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  if (!matchResults) {
    return null;
  }

  const totalMatches = matchResults.totalMatches ?? matchResults.matches?.length ?? 0;

  // Zero-matches empty state.
  if (totalMatches === 0) {
    return (
      <div>
        <Card>
          <div className="flex flex-col justify-center items-center py-12 text-center">
            <SearchOutlined style={{ fontSize: 40, color: "#94a3b8" }} />
            <p className="mt-4 text-lg font-semibold">No matches found</p>
            <p className="text-gray-500 mb-4">
              No contacts matched this client and audience. Try a different
              target audience or re-run matching.
            </p>
            <Button
              type="primary"
              onClick={runMatching}
              style={{ backgroundColor: "#4f46e5", borderColor: "#4f46e5" }}
            >
              Re-run matching
            </Button>
          </div>
        </Card>
        <div className="flex justify-between mt-6">
          <Button size="large" onClick={onBack} icon={<ArrowLeftOutlined />}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <Statistic
            title="Total Matches"
            value={matchResults.totalMatches}
            prefix={<CheckCircleOutlined />}
          />
        </Card>
        <Card>
          <Statistic
            title="High Priority"
            value={matchResults.highPriority}
            suffix={`(${matchResults.highPriorityPercent}%)`}
            valueStyle={{ color: "#52c41a" }}
          />
        </Card>
        <Card>
          <Statistic
            title="Medium Priority"
            value={matchResults.mediumPriority}
            suffix={`(${matchResults.mediumPriorityPercent}%)`}
            valueStyle={{ color: "#faad14" }}
          />
        </Card>
        <Card>
          <Statistic
            title="Low Priority"
            value={matchResults.lowPriority}
            suffix={`(${matchResults.lowPriorityPercent}%)`}
            valueStyle={{ color: "#8c8c8c" }}
          />
        </Card>
      </div>

      {/* Type Breakdown */}
      {targetType === "both" && (
        <Card className="mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600 mb-2">Investors</p>
              <p className="text-2xl font-bold text-brand-600">
                {matchResults.investorCount} ({matchResults.investorPercent}%)
              </p>
            </div>
            <div>
              <p className="text-gray-600 mb-2">Incubators</p>
              <p className="text-2xl font-bold text-brand-500">
                {matchResults.incubatorCount} ({matchResults.incubatorPercent}%)
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Filters and Actions */}
      <Card title="Matched Contacts" className="mb-6">
        <div className="flex gap-4 mb-4 flex-wrap">
          <Input
            placeholder="Search by name, email or organization..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
          />
          <Select
            value={priorityFilter}
            onChange={setPriorityFilter}
            style={{ width: 150 }}
          >
            <Select.Option value="all">All Priorities</Select.Option>
            <Select.Option value="high">High</Select.Option>
            <Select.Option value="medium">Medium</Select.Option>
            <Select.Option value="low">Low</Select.Option>
          </Select>
          {targetType === "both" && (
            <Select
              value={typeFilter}
              onChange={setTypeFilter}
              style={{ width: 150 }}
            >
              <Select.Option value="all">All Types</Select.Option>
              <Select.Option value="investor">Investors</Select.Option>
              <Select.Option value="incubator">Incubators</Select.Option>
            </Select>
          )}
          <Select
            value={stateFilter}
            onChange={setStateFilter}
            style={{ width: 200 }}
            showSearch
            optionFilterProp="children"
          >
            <Select.Option value="all">All States / Locations</Select.Option>
            {stateOptions.map((state) => (
              <Select.Option key={state} value={state}>
                {state}
              </Select.Option>
            ))}
          </Select>
          <Button
            icon={<DownloadOutlined />}
            onClick={exportToCSV}
            style={{
              backgroundColor: "#4f46e5",
              borderColor: "#4f46e5",
              color: "white",
            }}
          >
            Export CSV
          </Button>
          {selectedRowKeys.length > 0 && (
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={handleDeleteSelected}
            >
              Delete Selected ({selectedRowKeys.length})
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between mb-3">
          <Checkbox
            checked={allFilteredSelected}
            indeterminate={selectedRowKeys.length > 0 && !allFilteredSelected}
            onChange={(e) => handleSelectAllFiltered(e.target.checked)}
            disabled={filteredData.length === 0}
          >
            Select all {filteredData.length} contacts
            {stateFilter !== "all" || priorityFilter !== "all" || searchText
              ? " (filtered)"
              : ""}
          </Checkbox>
          {selectedRowKeys.length > 0 && (
            <span className="text-sm text-gray-500">
              {selectedRowKeys.length} selected
            </span>
          )}
        </div>

        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          scroll={{ x: 1200 }}
          pagination={{
            pageSize: 50,
            showSizeChanger: false,
            showTotal: (total) => `Total ${total} matches`,
          }}
        />
      </Card>

      <div className="flex justify-between">
        <Button size="large" onClick={onBack} icon={<ArrowLeftOutlined />}>
          Back
        </Button>
        <Button
          type="primary"
          size="large"
          onClick={onNext}
          disabled={totalMatches === 0}
          icon={<ArrowRightOutlined />}
          style={
            totalMatches === 0
              ? undefined
              : { backgroundColor: "#4f46e5", borderColor: "#4f46e5" }
          }
        >
          Continue to Email Template
        </Button>
      </div>
    </div>
  );
}
