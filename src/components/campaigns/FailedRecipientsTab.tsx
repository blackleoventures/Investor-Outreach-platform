// components/campaigns/FailedRecipientsTab.tsx

"use client";

import { useState, useEffect } from "react";
import { Card, Button, Table, Tag, Badge, message, Modal, Tooltip } from "antd";
import { 
  ReloadOutlined, 
  WarningOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined 
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { auth } from "@/lib/firebase";
import type { FailedRecipient, ErrorCategory } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface FailedRecipientsTabProps {
  campaignId: string;
  campaignName: string;
}

export default function FailedRecipientsTab({
  campaignId,
  campaignName,
}: FailedRecipientsTabProps) {
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [failedRecipients, setFailedRecipients] = useState<FailedRecipient[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  useEffect(() => {
    fetchFailedRecipients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const getAuthToken = async () => {
    const user = auth.currentUser;
    if (!user) {
      message.error("Please login to continue");
      return null;
    }
    return await user.getIdToken();
  };

  const fetchFailedRecipients = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(
        `${API_BASE_URL}/campaigns/${campaignId}/failed-recipients`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch failed recipients");
      }

      const data = await response.json();
      setFailedRecipients(data.failedRecipients || []);
    } catch (error: any) {
      console.error("Fetch failed recipients error:", error);
      message.error(error.message || "Failed to load failed recipients");
    } finally {
      setLoading(false);
    }
  };

  const handleRetrySingle = (recipientId: string, recipientEmail: string) => {
    Modal.confirm({
      title: "Retry Sending Email",
      content: `Are you sure you want to retry sending to ${recipientEmail}?`,
      icon: <ExclamationCircleOutlined />,
      okText: "Yes, Retry",
      cancelText: "Cancel",
      onOk: () => handleRetry([recipientId]),
    });
  };

  const handleRetryBulk = () => {
    if (selectedRowKeys.length === 0) {
      message.warning("Please select recipients to retry");
      return;
    }

    Modal.confirm({
      title: "Retry Multiple Emails",
      content: `Are you sure you want to retry sending to ${selectedRowKeys.length} recipients?`,
      icon: <ExclamationCircleOutlined />,
      okText: `Yes, Retry ${selectedRowKeys.length} Emails`,
      cancelText: "Cancel",
      onOk: () => handleRetry(selectedRowKeys),
    });
  };

  const handleRetry = async (recipientIds: string[]) => {
    try {
      setRetrying(true);
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(
        `${API_BASE_URL}/campaigns/${campaignId}/retry-failed`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ recipientIds }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to retry emails");
      }

      const data = await response.json();
      
      message.success(data.message || "Retry scheduled successfully");
      
      // Clear selection and refresh
      setSelectedRowKeys([]);
      fetchFailedRecipients();

    } catch (error: any) {
      console.error("Retry error:", error);
      message.error(error.message || "Failed to retry emails");
    } finally {
      setRetrying(false);
    }
  };

  const getErrorColor = (errorType: ErrorCategory) => {
    const colors: Record<ErrorCategory, string> = {
      AUTH_FAILED: "red",
      INVALID_EMAIL: "orange",
      CONNECTION_TIMEOUT: "blue",
      QUOTA_EXCEEDED: "purple",
      SPAM_BLOCKED: "magenta",
      SMTP_ERROR: "gold",
      UNKNOWN_ERROR: "default",
    };
    return colors[errorType] || "default";
  };

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

  const columns: ColumnsType<FailedRecipient> = [
    {
      title: "Recipient",
      key: "recipient",
      width: 220,
      fixed: "left",
      render: (_, record) => (
        <div>
          <p className="font-semibold text-gray-900">{record.recipientName}</p>
          <p className="text-xs text-gray-500">{record.recipientEmail}</p>
          {record.organization && (
            <p className="text-xs text-gray-400">{record.organization}</p>
          )}
        </div>
      ),
    },
    {
      title: "Error Type",
      dataIndex: "failureReason",
      key: "failureReason",
      width: 150,
      render: (errorType: ErrorCategory) => (
        <Tag color={getErrorColor(errorType)}>
          {errorType.replace(/_/g, " ")}
        </Tag>
      ),
    },
    {
      title: "Error Message",
      key: "errorMessage",
      width: 300,
      render: (_, record) => (
        <Tooltip title={record.lastError.errorMessage}>
          <p className="text-sm text-gray-700 truncate">
            {record.lastError.friendlyMessage}
          </p>
        </Tooltip>
      ),
    },
    {
      title: "Retries",
      dataIndex: "totalRetries",
      key: "totalRetries",
      width: 100,
      align: "center",
      render: (retries: number) => (
        <Badge
          count={`${retries}/3`}
          style={{ 
            backgroundColor: retries >= 3 ? "#ff4d4f" : "#1890ff" 
          }}
        />
      ),
    },
    {
      title: "Last Attempt",
      key: "lastAttempt",
      width: 180,
      render: (_, record) => (
        <span className="text-xs text-gray-600">
          {formatDate(record.lastAttemptAt)}
        </span>
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 120,
      fixed: "right",
      align: "center",
      render: (_, record) => {
        if (!record.canRetry || record.totalRetries >= 3) {
          return (
            <Tooltip title="Maximum retries reached or error not retryable">
              <Tag color="default">
                <CloseCircleOutlined /> Max Retries
              </Tag>
            </Tooltip>
          );
        }

        return (
          <Button
            type="primary"
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => handleRetrySingle(record.id, record.recipientEmail)}
            loading={retrying}
            style={{
              backgroundColor: "#52c41a",
              borderColor: "#52c41a",
            }}
          >
            Retry
          </Button>
        );
      },
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys as string[]);
    },
    getCheckboxProps: (record: FailedRecipient) => ({
      disabled: !record.canRetry || record.totalRetries >= 3,
    }),
  };

  const retryableCount = failedRecipients.filter(
    (r) => r.canRetry && r.totalRetries < 3
  ).length;

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            <WarningOutlined className="text-red-500 mr-2" />
            Failed Emails ({failedRecipients.length})
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {retryableCount} emails can be retried
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchFailedRecipients}
            loading={loading}
            style={{
              backgroundColor: "#1890ff",
              borderColor: "#1890ff",
              color: "white",
            }}
          >
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={handleRetryBulk}
            disabled={selectedRowKeys.length === 0}
            loading={retrying}
            style={{
              backgroundColor: "#722ed1",
              borderColor: "#722ed1",
            }}
          >
            Retry Selected ({selectedRowKeys.length})
          </Button>
        </div>
      </div>

      {failedRecipients.length === 0 && !loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No failed emails found</p>
          <p className="text-sm text-gray-400 mt-2">
            All emails were sent successfully!
          </p>
        </div>
      ) : (
        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={failedRecipients}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50", "100"],
            showTotal: (total) => `Total ${total} failed emails`,
          }}
          scroll={{ x: 1200 }}
        />
      )}
    </Card>
  );
}
