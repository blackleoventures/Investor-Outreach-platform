"use client";

import { useState } from "react";
import { Table, Button, Tag, Tabs, Badge, Checkbox } from "antd";
import {
  ThunderboltOutlined,
  ReloadOutlined,
  MailOutlined,
  EyeOutlined,
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
  hoursSinceSent?: number;
  hoursSinceOpened?: number;
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
}

export default function FollowupCandidatesTable({
  candidates,
  loading,
  onRefresh,
  selectedRecipients,
  onSelectionChange,
  onGenerateEmail,
}: FollowupCandidatesTableProps) {
  const [activeTab, setActiveTab] = useState("not_opened");

  const getTypeColor = (type: string) => {
    return type === "investor" ? "blue" : "green";
  };

  const columns: ColumnsType<FollowupCandidate> = [
    {
      title: "Select",
      key: "select",
      width: 60,
      fixed: "left",
      render: (_, record) => (
        <Checkbox
          checked={selectedRecipients.includes(record.id)}
          onChange={(e) => {
            if (e.target.checked) {
              onSelectionChange([...selectedRecipients, record.id]);
            } else {
              onSelectionChange(
                selectedRecipients.filter((id) => id !== record.id)
              );
            }
          }}
        />
      ),
    },
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
      title: "Days Since",
      key: "days",
      width: 120,
      align: "center",
      render: (_, record) => (
        <Badge
          count={record.daysSinceSent || record.daysSinceOpened || 0}
          showZero
          color={
            (record.daysSinceSent || record.daysSinceOpened || 0) >= 7
              ? "red"
              : (record.daysSinceSent || record.daysSinceOpened || 0) >= 5
              ? "orange"
              : "blue"
          }
          style={{ fontSize: 14 }}
        />
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
        <Tag color={sent === 0 ? "default" : sent === 1 ? "orange" : "red"}>
          {sent} / 2
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
          <MailOutlined /> Delivered Not Opened ({notOpenedData.length})
        </span>
      ),
    },
    {
      key: "opened_not_replied",
      label: (
        <span>
          <EyeOutlined /> Opened Not Replied ({openedNotRepliedData.length})
        </span>
      ),
    },
  ];

  return (
    <div>
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
