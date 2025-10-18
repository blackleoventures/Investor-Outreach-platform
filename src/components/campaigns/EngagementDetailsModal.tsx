"use client";

import { Modal, Table, Tag, Badge } from "antd";
import {
  EyeOutlined,
  MessageOutlined,
  UserOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

interface EngagementDetailsModalProps {
  visible: boolean;
  type: "openers" | "repliers";
  campaignName: string;
  openers: any[];
  repliers: any[];
  onClose: () => void;
}

export default function EngagementDetailsModal({
  visible,
  type,
  campaignName,
  openers,
  repliers,
  onClose,
}: EngagementDetailsModalProps) {
  const isOpeners = type === "openers";
  const data = isOpeners ? openers : repliers;

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTypeColor = (type: string) => {
    return type === "investor" ? "blue" : "green";
  };

  const openersColumns: ColumnsType<any> = [
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
      title: "Total Opens",
      dataIndex: "totalOpens",
      key: "totalOpens",
      width: 120,
      align: "center",
      sorter: (a, b) => b.totalOpens - a.totalOpens,
      render: (opens: number) => (
        <Badge
          count={opens}
          showZero
          style={{ backgroundColor: opens >= 3 ? "#52c41a" : "#1890ff" }}
        />
      ),
    },
    {
      title: "First Opened",
      key: "firstOpened",
      width: 180,
      render: (_, record) => (
        <span className="text-xs text-gray-600">
          <CalendarOutlined className="mr-1" />
          {formatDate(record.firstOpenedAt)}
        </span>
      ),
    },
    {
      title: "Last Opened",
      key: "lastOpened",
      width: 180,
      render: (_, record) => (
        <span className="text-xs text-gray-600">
          <CalendarOutlined className="mr-1" />
          {formatDate(record.lastOpenedAt)}
        </span>
      ),
    },
  ];

  const repliersColumns: ColumnsType<any> = [
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
      title: "Replies",
      dataIndex: "totalReplies",
      key: "totalReplies",
      width: 100,
      align: "center",
      render: (replies: number) => (
        <Badge count={replies} showZero style={{ backgroundColor: "#52c41a" }} />
      ),
    },
    {
      title: "First Reply",
      key: "firstReply",
      width: 180,
      render: (_, record) => (
        <span className="text-xs text-gray-600">
          <CalendarOutlined className="mr-1" />
          {formatDate(record.firstRepliedAt)}
        </span>
      ),
    },
    {
      title: "Last Reply",
      key: "lastReply",
      width: 180,
      render: (_, record) => (
        <span className="text-xs text-gray-600">
          <CalendarOutlined className="mr-1" />
          {formatDate(record.lastRepliedAt)}
        </span>
      ),
    },
  ];

  return (
    <Modal
      title={
        <div>
          {isOpeners ? (
            <>
              <EyeOutlined className="mr-2" />
              Who Opened - {campaignName}
            </>
          ) : (
            <>
              <MessageOutlined className="mr-2" />
              Who Replied - {campaignName}
            </>
          )}
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={1000}
      footer={null}
      destroyOnClose
    >
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          {isOpeners
            ? `${data.length} unique people opened your campaign emails`
            : `${data.length} unique people replied to your campaign`}
        </p>
      </div>

      <Table
        columns={isOpeners ? openersColumns : repliersColumns}
        dataSource={data}
        rowKey="email"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50"],
          showTotal: (total) => `Total ${total} ${isOpeners ? "openers" : "repliers"}`,
        }}
        scroll={{ x: 900 }}
      />
    </Modal>
  );
}
