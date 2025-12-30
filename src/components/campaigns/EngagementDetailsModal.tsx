"use client";

import { useState, useMemo } from "react";
import { Modal, Table, Tag, Badge, Tooltip, Empty, Input } from "antd";
import {
  EyeOutlined,
  MessageOutlined,
  CalendarOutlined,
  SwapOutlined,
  CheckCircleOutlined,
  ShareAltOutlined,
  SearchOutlined,
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

// Enhanced replier interface with original recipient info
interface EnhancedReplier {
  id: string;
  originalRecipient: {
    name: string;
    email: string;
    organization: string;
  };
  replier: {
    name: string;
    email: string;
    organization: string;
  };
  isSamePerson: boolean;
  matchType: string;
  replyReceivedAt: string;
  totalReplies?: number;
  firstRepliedAt?: string;
  recipientType?: string;
  // Legacy support
  name?: string;
  email?: string;
  organization?: string;
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
  const rawData = isOpeners ? openers : repliers;

  // Search state
  const [searchText, setSearchText] = useState("");

  // Filter data based on search
  const data = useMemo(() => {
    if (!searchText.trim()) return rawData;

    const search = searchText.toLowerCase();
    return rawData.filter((item: any) => {
      // Search in original recipient
      const originalName =
        item.originalRecipient?.name?.toLowerCase() ||
        item.name?.toLowerCase() ||
        "";
      const originalEmail =
        item.originalRecipient?.email?.toLowerCase() ||
        item.email?.toLowerCase() ||
        "";
      const originalOrg =
        item.originalRecipient?.organization?.toLowerCase() ||
        item.organization?.toLowerCase() ||
        "";

      // Search in replier (for replies)
      const replierName = item.replier?.name?.toLowerCase() || "";
      const replierEmail = item.replier?.email?.toLowerCase() || "";
      const replierOrg = item.replier?.organization?.toLowerCase() || "";

      return (
        originalName.includes(search) ||
        originalEmail.includes(search) ||
        originalOrg.includes(search) ||
        replierName.includes(search) ||
        replierEmail.includes(search) ||
        replierOrg.includes(search)
      );
    });
  }, [rawData, searchText]);

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

  const getMatchTypeLabel = (matchType: string) => {
    switch (matchType) {
      case "exact":
        return "Direct Reply";
      case "forwarded":
        return "Forwarded";
      case "domain":
        return "Same Domain";
      case "organization":
        return "Same Org";
      case "thread":
        return "Thread Reply";
      default:
        return matchType;
    }
  };

  const getMatchTypeColor = (matchType: string) => {
    switch (matchType) {
      case "exact":
        return "green";
      case "forwarded":
        return "orange";
      case "domain":
        return "blue";
      case "organization":
        return "purple";
      case "thread":
        return "cyan";
      default:
        return "default";
    }
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

  // Enhanced repliers columns showing original recipient → replier relationship
  const repliersColumns: ColumnsType<EnhancedReplier> = [
    {
      title: "Original Recipient",
      key: "originalRecipient",
      width: 220,
      render: (_, record) => {
        // Support both new and legacy format
        const original = record.originalRecipient || {
          name: record.name,
          email: record.email,
          organization: record.organization,
        };
        return (
          <div>
            <p className="font-semibold text-gray-900">{original.name}</p>
            <p className="text-xs text-gray-500">{original.email}</p>
            <p className="text-xs text-gray-400">{original.organization}</p>
          </div>
        );
      },
    },
    {
      title: "Reply Type",
      key: "replyType",
      width: 100,
      align: "center",
      filters: [
        { text: "Direct", value: true },
        { text: "Forwarded", value: false },
      ],
      onFilter: (value, record) => {
        const isSame =
          record.isSamePerson !== undefined ? record.isSamePerson : true;
        return isSame === value;
      },
      render: (_, record) => {
        const isSame =
          record.isSamePerson !== undefined ? record.isSamePerson : true;
        return isSame ? (
          <Tag color="green" className="m-0">
            <CheckCircleOutlined className="mr-1" />
            Direct
          </Tag>
        ) : (
          <Tag color="orange" className="m-0">
            <SwapOutlined className="mr-1" />
            Forwarded
          </Tag>
        );
      },
    },
    {
      title: "Who Replied",
      key: "replier",
      width: 220,
      render: (_, record) => {
        // Support both new and legacy format
        const replier = record.replier || {
          name: record.name,
          email: record.email,
          organization: record.organization,
        };
        const isSame =
          record.isSamePerson !== undefined ? record.isSamePerson : true;

        return (
          <div className={!isSame ? "bg-orange-50 p-2 rounded -m-2" : ""}>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">
                {replier.name}
              </span>
              {!isSame && (
                <Tag color="orange" className="text-xs">
                  <ShareAltOutlined className="mr-1" />
                  Forwarded
                </Tag>
              )}
            </div>
            <p className="text-xs text-gray-500">{replier.email}</p>
            <p className="text-xs text-gray-400">{replier.organization}</p>
          </div>
        );
      },
    },
    {
      title: "Match Type",
      key: "matchType",
      width: 120,
      align: "center",
      render: (_, record) => {
        const matchType = record.matchType || "exact";
        return (
          <Tag color={getMatchTypeColor(matchType)}>
            {getMatchTypeLabel(matchType)}
          </Tag>
        );
      },
    },
    {
      title: "Reply Time",
      key: "replyTime",
      width: 180,
      sorter: (a, b) => {
        const timeA = new Date(
          a.replyReceivedAt || a.firstRepliedAt || ""
        ).getTime();
        const timeB = new Date(
          b.replyReceivedAt || b.firstRepliedAt || ""
        ).getTime();
        return timeB - timeA;
      },
      render: (_, record) => (
        <span className="text-xs text-gray-600">
          <CalendarOutlined className="mr-1" />
          {formatDate(record.replyReceivedAt || record.firstRepliedAt || "")}
        </span>
      ),
    },
  ];

  // Calculate summary for repliers
  const forwardedCount = repliers.filter(
    (r) => r.isSamePerson === false
  ).length;

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          {isOpeners ? (
            <>
              <EyeOutlined className="text-blue-500" />
              <span>Who Opened - {campaignName}</span>
            </>
          ) : (
            <>
              <MessageOutlined className="text-green-500" />
              <span>Who Replied - {campaignName}</span>
            </>
          )}
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={isOpeners ? 1000 : 1100}
      footer={null}
      destroyOnClose
    >
      {/* Search Input */}
      <div className="mb-4">
        <Input
          placeholder={
            isOpeners
              ? "Search by name, email, or organization..."
              : "Search replies by name, email, or organization..."
          }
          prefix={<SearchOutlined className="text-gray-400" />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          className="max-w-md"
        />
      </div>

      <div className="mb-4">
        {isOpeners ? (
          <p className="text-sm text-gray-600">
            {data.length} unique people opened your campaign emails
            {searchText && ` (filtered from ${rawData.length})`}
          </p>
        ) : (
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-gray-600">
              <strong>{data.length}</strong> total replies
            </span>
            <span className="text-green-600">
              <CheckCircleOutlined className="mr-1" />
              <strong>{data.length - forwardedCount}</strong> direct replies
            </span>
            {forwardedCount > 0 && (
              <span className="text-orange-600">
                <ShareAltOutlined className="mr-1" />
                <strong>{forwardedCount}</strong> forwarded replies
              </span>
            )}
          </div>
        )}
      </div>

      {!isOpeners && forwardedCount > 0 && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-sm text-orange-700">
            <ShareAltOutlined className="mr-2" />
            <strong>Forwarded replies detected!</strong> Some recipients
            forwarded your email to colleagues who then replied. These are
            highlighted with an orange background.
          </p>
        </div>
      )}

      {data.length === 0 ? (
        <Empty description={isOpeners ? "No opens yet" : "No replies yet"} />
      ) : (
        <Table
          columns={isOpeners ? openersColumns : repliersColumns}
          dataSource={data}
          rowKey={(record) => record.id || record.email}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50"],
            showTotal: (total) =>
              `Total ${total} ${isOpeners ? "openers" : "replies"}`,
          }}
          scroll={{ x: isOpeners ? 900 : 1050 }}
          size="small"
        />
      )}
    </Modal>
  );
}
