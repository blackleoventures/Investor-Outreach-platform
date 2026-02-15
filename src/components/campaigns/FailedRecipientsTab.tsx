// components/campaigns/FailedRecipientsTab.tsx

"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Button,
  Table,
  Tag,
  Badge,
  message,
  Modal,
  Tooltip,
  Select,
  Input,
  Form,
  Space,
  Popconfirm,
} from "antd";
import {
  ReloadOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  FilterOutlined,
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
  const [actionLoading, setActionLoading] = useState(false);
  const [failedRecipients, setFailedRecipients] = useState<FailedRecipient[]>(
    [],
  );
  const [filteredRecipients, setFilteredRecipients] = useState<
    FailedRecipient[]
  >([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  // Filter state
  const [filterType, setFilterType] = useState<"ALL" | "RETRYABLE" | "FATAL">(
    "ALL",
  );

  // Edit Modal State
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingRecipient, setEditingRecipient] =
    useState<FailedRecipient | null>(null);
  const [editForm] = Form.useForm();

  useEffect(() => {
    fetchFailedRecipients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failedRecipients, filterType]);

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
        },
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

  const applyFilters = () => {
    let filtered = [...failedRecipients];

    if (filterType === "RETRYABLE") {
      filtered = filtered.filter((r) => r.canRetry && r.totalRetries < 3);
    } else if (filterType === "FATAL") {
      filtered = filtered.filter((r) => !r.canRetry || r.totalRetries >= 3);
    }

    setFilteredRecipients(filtered);
  };

  // --- Actions ---

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
      setActionLoading(true);
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
        },
      );

      if (!response.ok) throw new Error("Failed to retry emails");

      const data = await response.json();
      message.success(data.message || "Retry scheduled successfully");
      setSelectedRowKeys([]);
      fetchFailedRecipients();
    } catch (error: any) {
      message.error(error.message || "Failed to retry emails");
    } finally {
      setActionLoading(false);
    }
  };

  // --- Edit Functionality ---

  const openEditModal = (record: FailedRecipient) => {
    setEditingRecipient(record);
    editForm.setFieldsValue({
      name: record.recipientName,
      email: record.recipientEmail,
    });
    setIsEditModalVisible(true);
  };

  const handleUpdateRecipient = async () => {
    try {
      const values = await editForm.validateFields();
      setActionLoading(true);
      const token = await getAuthToken();
      if (!token) return;

      if (!editingRecipient) return;

      const response = await fetch(
        `${API_BASE_URL}/campaigns/${campaignId}/recipients/${editingRecipient.id}/update`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: values.name,
            email: values.email,
            shouldRetry: true, // Automatically schedule retry
          }),
        },
      );

      if (!response.ok) throw new Error("Failed to update recipient");

      message.success("Recipient updated and scheduled for retry");
      setIsEditModalVisible(false);
      setEditingRecipient(null);
      fetchFailedRecipients();
    } catch (error: any) {
      message.error(error.message || "Failed to update recipient");
    } finally {
      setActionLoading(false);
    }
  };

  // --- Delete Functionality ---

  const handleDelete = async (recipientIds: string[]) => {
    try {
      setActionLoading(true);
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(
        `${API_BASE_URL}/campaigns/${campaignId}/recipients`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ recipientIds }),
        },
      );

      if (!response.ok) throw new Error("Failed to delete recipients");

      const data = await response.json();
      message.success(data.message || "Recipients deleted successfully");
      setSelectedRowKeys([]);
      fetchFailedRecipients();
    } catch (error: any) {
      message.error(error.message || "Failed to delete recipients");
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDeleteSingle = (record: FailedRecipient) => {
    Modal.confirm({
      title: "Delete recipient?",
      content: `Are you sure you want to delete ${record.recipientName}? This cannot be undone.`,
      okText: "Yes, Delete",
      okType: "danger",
      cancelText: "Cancel",
      okButtonProps: {
        style: {
          backgroundColor: "#ff4d4f",
          borderColor: "#ff4d4f",
          color: "white",
        },
      },
      onOk: () => handleDelete([record.id]),
    });
  };

  const confirmDeleteBulk = () => {
    if (selectedRowKeys.length === 0) return;

    Modal.confirm({
      title: "Delete Recipients",
      content: `Are you sure you want to delete ${selectedRowKeys.length} recipients? This cannot be undone.`,
      okText: "Yes, Delete",
      okType: "danger",
      cancelText: "Cancel",
      okButtonProps: {
        style: {
          backgroundColor: "#ff4d4f",
          borderColor: "#ff4d4f",
          color: "white",
        },
      },
      onOk: () => handleDelete(selectedRowKeys),
    });
  };

  // --- Helpers ---

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

  // --- Columns ---

  const columns: ColumnsType<FailedRecipient> = [
    {
      title: "Recipient",
      key: "recipient",
      width: 200,
      fixed: "left",
      render: (_, record) => (
        <div className="group relative">
          <p className="font-semibold text-gray-900 flex items-center gap-2">
            {record.recipientName}
          </p>
          <p className="text-xs text-gray-500">{record.recipientEmail}</p>
          {record.organization && (
            <p className="text-xs text-gray-400">{record.organization}</p>
          )}
        </div>
      ),
    },
    {
      title: "Error Type",
      key: "errorType",
      width: 130,
      render: (_, record) => {
        // Fix: Use errorType instead of category, handle legacy data
        const lastError = record.lastError as any;
        // Prioritize errorType, fallback to category, fallback to failureCategory from raw
        const errorType =
          lastError?.errorType ||
          lastError?.category ||
          (record as any).failureCategory ||
          "UNKNOWN_ERROR";

        // Friendly name
        const displayType = String(errorType).replace(/_/g, " ");

        return (
          <Tag
            color={getErrorColor(errorType as ErrorCategory)}
            style={{ margin: 0 }}
          >
            {displayType}
          </Tag>
        );
      },
    },
    {
      title: "Error Details",
      key: "errorMessage",
      width: 250,
      ellipsis: false,
      render: (_, record) => {
        const errorMsg =
          record.lastError?.errorMessage ||
          record.failureReason ||
          "Delivery failed";

        return (
          <Tooltip
            title={errorMsg}
            placement="topLeft"
            overlayStyle={{ maxWidth: 400 }}
          >
            <span className="text-sm text-gray-700 cursor-help line-clamp-2">
              {errorMsg}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: "Retries",
      dataIndex: "totalRetries",
      key: "totalRetries",
      width: 90,
      align: "center",
      render: (retries: number) => (
        <Badge
          count={`${retries}/3`}
          style={{ backgroundColor: retries >= 3 ? "#ff4d4f" : "#1890ff" }}
        />
      ),
    },
    {
      title: "Last Attempt",
      key: "lastAttempt",
      width: 160,
      render: (_, record) => (
        <span className="text-xs text-gray-600">
          {formatDate(record.lastAttemptAt)}
        </span>
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 160,
      fixed: "right",
      align: "center",
      render: (_, record) => (
        <Space size="small">
          {/* EDIT BUTTON */}
          <Tooltip title="Edit Email & Retry">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
            />
          </Tooltip>

          {/* RETRY BUTTON / STATUS */}
          {!record.canRetry || record.totalRetries >= 3 ? (
            <Tooltip
              title={
                record.totalRetries >= 3
                  ? "Maximum retries reached"
                  : "Non-retryable error (Fatal)"
              }
            >
              <Tag color="red" className="mr-0">
                {record.totalRetries >= 3 ? "Max Retries" : "Fatal Error"}
              </Tag>
            </Tooltip>
          ) : (
            <Tooltip title="Retry sending">
              <Button
                type="primary"
                size="small"
                icon={<ReloadOutlined />}
                onClick={() =>
                  handleRetrySingle(record.id, record.recipientEmail)
                }
                loading={actionLoading}
                style={{ backgroundColor: "#52c41a", borderColor: "#52c41a" }}
              />
            </Tooltip>
          )}

          {/* DELETE BUTTON */}
          <Tooltip title="Delete Recipient">
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={actionLoading}
              onClick={() => confirmDeleteSingle(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys as string[]);
    },
  };

  const retryableCount = failedRecipients.filter(
    (r) => r.canRetry && r.totalRetries < 3,
  ).length;

  return (
    <Card>
      <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <WarningOutlined className="text-red-500 mr-2" />
            Failed Emails ({failedRecipients.length})
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {retryableCount} emails can be retried
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* FILTER DROPDOWN */}
          <Select
            value={filterType}
            onChange={setFilterType}
            style={{ width: 140 }}
            prefix={<FilterOutlined />}
          >
            <Select.Option value="ALL">All Failed</Select.Option>
            <Select.Option value="RETRYABLE">Retryable</Select.Option>
            <Select.Option value="FATAL">Fatal Error</Select.Option>
          </Select>

          <Button
            icon={<ReloadOutlined />}
            onClick={fetchFailedRecipients}
            loading={loading}
          >
            Refresh
          </Button>

          {/* BULK ACTIONS */}
          {selectedRowKeys.length > 0 && (
            <>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRetryBulk}
                loading={actionLoading}
                style={{
                  backgroundColor: "#722ed1",
                  borderColor: "#722ed1",
                  color: "white",
                }}
              >
                Retry ({selectedRowKeys.length})
              </Button>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={confirmDeleteBulk}
                loading={actionLoading}
              >
                Delete ({selectedRowKeys.length})
              </Button>
            </>
          )}
        </div>
      </div>

      {filteredRecipients.length === 0 && !loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
            No failed emails found matching filter
          </p>
        </div>
      ) : (
        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={filteredRecipients}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50", "100"],
            showTotal: (total) => `Total ${total} failed emails`,
          }}
          scroll={{ x: 1300 }}
        />
      )}

      {/* Edit Modal */}
      <Modal
        title="Edit Recipient Details"
        open={isEditModalVisible}
        onOk={handleUpdateRecipient}
        onCancel={() => setIsEditModalVisible(false)}
        confirmLoading={actionLoading}
        okText="Update & Retry"
        okButtonProps={{
          style: { backgroundColor: "#1890ff", color: "white" },
        }}
      >
        <Form form={editForm} layout="vertical">
          <p className="mb-4 text-gray-500 text-sm">
            Updating the email addresses will automatically properly re-schedule
            the email for retry.
          </p>
          <Form.Item
            name="name"
            label="Recipient Name"
            rules={[{ required: true, message: "Please enter name" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email Address"
            rules={[
              { required: true, message: "Please enter email" },
              { type: "email", message: "Please enter a valid email" },
            ]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
