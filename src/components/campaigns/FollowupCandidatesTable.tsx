"use client";

import { useState, useEffect } from "react";
import { Table, Button, Tag, Tabs, Badge, Checkbox, Tooltip } from "antd";
import {
  ThunderboltOutlined,
  ReloadOutlined,
  MailOutlined,
  EyeOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

interface FollowupCandidate {
  id: string;
  name: string;
  email: string;
  organization: string;
  recipientType: string;
  status: string;
  daysSinceSent?: number;
  daysSinceOpened?: number;
  minutesSinceSent?: number;
  minutesSinceOpened?: number;
  followupType: string;
  followUpsSent: number;
  totalOpens: number;
}

interface FollowupCandidatesTableProps {
  candidates: {
    deliveredNotOpened: FollowupCandidate[];
    openedNotReplied: FollowupCandidate[];
  };
  loading: boolean;
  onRefresh: () => void;
  selectedRecipients: string[];
  onSelectionChange: (ids: string[]) => void;
  onGenerateEmail: () => void;
  isDevelopment?: boolean; // Optional prop to indicate environment
}

export default function FollowupCandidatesTable({
  candidates,
  loading,
  onRefresh,
  selectedRecipients,
  onSelectionChange,
  onGenerateEmail,
  isDevelopment = false,
}: FollowupCandidatesTableProps) {
  const [activeTab, setActiveTab] = useState("not_opened");

  const getTypeColor = (type: string) => {
    return type === "investor" ? "blue" : "green";
  };

  const formatTimeElapsed = (record: FollowupCandidate) => {
    if (isDevelopment) {
      // Development mode: show minutes
      const minutes = record.minutesSinceSent || record.minutesSinceOpened || 0;
      if (minutes < 60) {
        return `${minutes}m`;
      }
      const hours = Math.floor(minutes / 60);
      return `${hours}h ${minutes % 60}m`;
    } else {
      // Production mode: show days
      const days = record.daysSinceSent || record.daysSinceOpened || 0;
      return days === 1 ? "1 day" : `${days} days`;
    }
  };

  const getTimeBadgeColor = (record: FollowupCandidate) => {
    if (isDevelopment) {
      const minutes = record.minutesSinceSent || record.minutesSinceOpened || 0;
      if (minutes >= 30) return "red";
      if (minutes >= 15) return "orange";
      return "blue";
    } else {
      const days = record.daysSinceSent || record.daysSinceOpened || 0;
      if (days >= 7) return "red";
      if (days >= 5) return "orange";
      return "blue";
    }
  };

  const columns: ColumnsType<FollowupCandidate> = [
    {
      title: "Name",
      key: "name",
      width: 200,
      render: (_, record) => (
        <div>
          <p className="font-semibold text-gray-900">{record.name}</p>
          <p className="text-xs text-gray-500">{record.organization}</p>
        </div>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 220,
    },
    {
      title: "Type",
      key: "type",
      width: 100,
      align: "center",
      render: (_, record) => (
        <Tag color={getTypeColor(record.recipientType)}>
          {record.recipientType === "investor" ? "Investor" : "Incubator"}
        </Tag>
      ),
    },
    {
      title: (
        <span>
          <ClockCircleOutlined /> Time Elapsed
        </span>
      ),
      key: "time",
      width: 130,
      align: "center",
      render: (_, record) => (
        <Tooltip
          title={
            isDevelopment
              ? `${record.minutesSinceSent || record.minutesSinceOpened || 0} minutes`
              : `${record.daysSinceSent || record.daysSinceOpened || 0} days`
          }
        >
          <Tag color={getTimeBadgeColor(record)} style={{ fontSize: 13 }}>
            {formatTimeElapsed(record)}
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: "Opens",
      dataIndex: "totalOpens",
      key: "opens",
      width: 80,
      align: "center",
      render: (opens: number) => (
        <span
          className={
            opens > 0 ? "text-blue-600 font-semibold" : "text-gray-400"
          }
        >
          {opens}
        </span>
      ),
    },
    {
      title: "Follow-ups Sent",
      dataIndex: "followUpsSent",
      key: "followUpsSent",
      width: 130,
      align: "center",
      render: (sent: number) => (
        <Tag color={sent === 0 ? "default" : sent >= 3 ? "red" : "orange"}>
          {sent}
        </Tag>
      ),
    },
  ];

  const notOpenedData = candidates.deliveredNotOpened || [];
  const openedNotRepliedData = candidates.openedNotReplied || [];

  const currentData =
    activeTab === "not_opened" ? notOpenedData : openedNotRepliedData;

  const rowSelection = {
    selectedRowKeys: selectedRecipients,
    onChange: (selectedRowKeys: React.Key[]) => {
      onSelectionChange(selectedRowKeys as string[]);
    },
  };

  const tabItems = [
    {
      key: "not_opened",
      label: (
        <span>
          <MailOutlined /> Delivered Not Opened (
          <Badge
            count={notOpenedData.length}
            showZero
            style={{ backgroundColor: "#1890ff" }}
          />
          )
        </span>
      ),
    },
    {
      key: "opened_not_replied",
      label: (
        <span>
          <EyeOutlined /> Opened Not Replied (
          <Badge
            count={openedNotRepliedData.length}
            showZero
            style={{ backgroundColor: "#52c41a" }}
          />
          )
        </span>
      ),
    },
  ];

  return (
    <div>
      {/* Environment Indicator */}
      {isDevelopment && (
        <div
          style={{
            padding: "8px 16px",
            marginBottom: 16,
            backgroundColor: "#fff7e6",
            border: "1px solid #ffd591",
            borderRadius: 8,
            textAlign: "center",
          }}
        >
          <Tag color="orange">Development Mode</Tag>
          <span style={{ marginLeft: 8, color: "#ad6800" }}>
            Showing minutes for faster testing
          </span>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          className="flex-1"
        />
        <div className="flex gap-2">
          <Button
            icon={<ReloadOutlined />}
            onClick={onRefresh}
            loading={loading}
          >
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={onGenerateEmail}
            disabled={selectedRecipients.length === 0}
            style={{
              backgroundColor:
                selectedRecipients.length > 0 ? "#1890ff" : undefined,
              borderColor:
                selectedRecipients.length > 0 ? "#1890ff" : undefined,
            }}
          >
            Generate Follow-up Email ({selectedRecipients.length})
          </Button>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={currentData}
        rowKey="id"
        loading={loading}
        rowSelection={rowSelection}
        pagination={{
          pageSize: 50,
          showSizeChanger: true,
          pageSizeOptions: ["25", "50", "100"],
          showTotal: (total) => `Total ${total} candidates`,
        }}
        scroll={{ x: 1200 }}
      />
    </div>
  );
}
