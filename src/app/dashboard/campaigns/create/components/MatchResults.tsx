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
  const [searchText, setSearchText] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

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

    setFilteredData(filtered);
  };

  const handleDeleteSelected = () => {
    if (selectedRowKeys.length === 0) {
      message.warning("Please select contacts to delete");
      return;
    }

    Modal.confirm({
      title: "Delete Selected Contacts?",
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>Are you sure you want to remove <strong>{selectedRowKeys.length}</strong> selected contacts from this campaign?</p>
          <p className="text-gray-600 text-sm mt-2">
            This action cannot be undone. The removed contacts will not receive emails from this campaign.
          </p>
        </div>
      ),
      okText: "Yes, Delete",
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

        onMatchComplete(updatedResults);
        setSelectedRowKeys([]);
        message.success(`${selectedRowKeys.length} contacts removed successfully`);
      },
    });
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
        item.matchedCriteria.join("; "),
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

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys);
    },
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
        <span className="text-blue-600">{email}</span>
      ),
    },
    {
      title: "Organization",
      dataIndex: "organization",
      key: "organization",
      width: 180,
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
          <Button
            icon={<DownloadOutlined />}
            onClick={exportToCSV}
            style={{
              backgroundColor: "#52c41a",
              borderColor: "#52c41a",
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
        <Button
          size="large"
          onClick={onBack}
          icon={<ArrowLeftOutlined />}
          style={{
            backgroundColor: "#6c757d",
            borderColor: "#6c757d",
            color: "white",
          }}
        >
          Back
        </Button>
        <Button
          type="primary"
          size="large"
          onClick={onNext}
          icon={<ArrowRightOutlined />}
          style={{
            backgroundColor: "#1890ff",
            borderColor: "#1890ff",
          }}
        >
          Continue to Email Template
        </Button>
      </div>
    </div>
  );
}
