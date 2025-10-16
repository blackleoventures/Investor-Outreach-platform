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
  Alert,
} from "antd";
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  SearchOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
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
  const [searchText, setSearchText] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [filteredData, setFilteredData] = useState<any[]>([]);

  useEffect(() => {
    if (!matchResults) {
      runMatching();
    }
  }, []);

  useEffect(() => {
    if (matchResults?.matches) {
      filterData();
    }
  }, [searchText, priorityFilter, typeFilter, matchResults]);

  const runMatching = async () => {
    try {
      setLoading(true);
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
      onMatchComplete(data);
      message.success(`Found ${data.totalMatches} matches!`);
    } catch (error: any) {
      console.error("Matching error:", error);
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
          item.organization.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (priorityFilter !== "all") {
      filtered = filtered.filter((item: any) => item.priority === priorityFilter);
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((item: any) => item.type === typeFilter);
    }

    setFilteredData(filtered);
  };

  const exportToCSV = () => {
    if (!matchResults?.matches) return;

    const csvContent = [
      ["Name", "Email", "Organization", "Type", "Priority", "Score", "Matched Criteria"],
      ...matchResults.matches.map((item: any) => [
        item.name,
        item.email,
        item.organization,
        item.type,
        item.priority,
        item.matchScore,
        item.matchedCriteria.join(", "),
      ]),
    ]
      .map((row) => row.join(","))
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

  const columns = [
    {
      title: "Rank",
      dataIndex: "rank",
      key: "rank",
      width: 80,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: "Organization",
      dataIndex: "organization",
      key: "organization",
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
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

  if (!matchResults) {
    return null;
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
              <p className="text-2xl font-bold text-blue-600">
                {matchResults.investorCount} ({matchResults.investorPercent}%)
              </p>
            </div>
            <div>
              <p className="text-gray-600 mb-2">Incubators</p>
              <p className="text-2xl font-bold text-green-600">
                {matchResults.incubatorCount} ({matchResults.incubatorPercent}%)
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card title="Matched Contacts" className="mb-6">
        <div className="flex gap-4 mb-4 flex-wrap">
          <Input
            placeholder="Search by name or organization..."
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
          <Button
            icon={<DownloadOutlined />}
            onClick={exportToCSV}
          >
            Export CSV
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          pagination={{
            pageSize: 50,
            showSizeChanger: false,
            showTotal: (total) => `Total ${total} matches`,
          }}
        />
      </Card>

      <div className="flex justify-between">
        <Button
          size="large"
          onClick={onBack}
          icon={<ArrowLeftOutlined />}
        >
          Back
        </Button>
        <Button
          type="primary"
          size="large"
          onClick={onNext}
          icon={<ArrowRightOutlined />}
        >
          Continue to Email Template
        </Button>
      </div>
    </div>
  );
}
