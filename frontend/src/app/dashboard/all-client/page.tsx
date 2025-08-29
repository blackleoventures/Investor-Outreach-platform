// @ts-nocheck
"use client";

import { CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, EditOutlined, EyeOutlined, InboxOutlined, PlusOutlined, SearchOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, Card, Descriptions, Input, message, Modal, Popconfirm, Popover, Space, Table, Tag, Tooltip, Typography } from "antd";
import { ChevronDown, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL as string;
// Lazy-load axios to reduce initial bundle size
let lazyAxios: typeof import("axios") | null = null;

const { Title, Text } = Typography;

const columnOptions = [
  {
    key: "companyName",
    label: "Company Name",
    default: true,
    render: (_, record) => <Text>{record.company_name || "N/A"}</Text>,
  },
  {
    key: "founderName",
    label: "Founder Name",
    render: (_, record) => (
      <Text>{`${record.first_name || ""} ${record.last_name || ""}`}</Text>
    ),
  },
  {
    key: "companyEmail",
    label: "Company Email",
    default: true,
    render: (_, record) => <Text>{record.email || "N/A"}</Text>,
  },
  {
    key: "contact",
    label: "Contact",
    render: (_, record) => <Text>{record.phone || "N/A"}</Text>,
  },
  {
    key: "verified",
    label: "Email Verified",
    render: (_, record) => (
      <Tag color={record.email_verified ? "green" : "red"}>
        {record.email_verified ? "Verified" : "Not Verified"}
      </Tag>
    ),
  },
  {
    key: "archived",
    label: "Is Archived",
    render: (_, record) => (
      <Tag color={record.archive ? "green" : "red"}>
        {record.archive ? "Yes" : "No"}
      </Tag>
    ),
  },
  {
    key: "fund_stage",
    label: "Fund Stage",
    default: true,
    render: (_, record) => (
      <Tag color="purple">{record.fund_stage || "N/A"}</Tag>
    ),
  },
  {
    key: "revenue",
    label: "Revenue",
    default: true,
    render: (_, record) => <Text>{record.revenue || 0}</Text>,
  },
  {
    key: "investmentAsk",
    label: "Investment Ask",
    render: (_, record) => <Text>{record.investment_ask || 0}</Text>,
  },
  {
    key: "sector",
    label: "Sector",
    render: (_, record) => <Tag color="blue">{record.industry || "N/A"}</Tag>,
  },
  {
    key: "onboarding",
    label: "Onboarding Info",
    render: (_, record) => {
      const onboardedDate = record.createdAt
        ? new Date(record.createdAt)
        : null;

      const today = new Date();
      const diffTime = onboardedDate ? today - onboardedDate : null;
      const diffDays = diffTime
        ? Math.floor(diffTime / (1000 * 60 * 60 * 24))
        : null;

      return (
        <Text>
          {diffDays === null
            ? "Date not available"
            : `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`}
        </Text>
      );
    },
  },
];

const ClientsData = () => {
  const { token } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(
    Object.fromEntries(
      columnOptions.map((option) => [
        option.key,
        option.default || option.permanent || false,
      ])
    )
  );
  const [popoverVisible, setPopoverVisible] = useState(false);

  useEffect(() => {
    loadClients();
  }, [showAll]);

  const loadClients = async (email = "") => {
    setLoading(true);
    try {
      if (!lazyAxios) {
        lazyAxios = await import("axios");
      }
      const filter = showAll ? "all" : "archived";
      const baseUrl = `${BACKEND_URL}/clients?filter=${filter}`;

      const url = email ? `${baseUrl}&email=${email}` : baseUrl;

      const response = await lazyAxios.default.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setClients(
        Array.isArray(response?.data?.clients) ? response.data.clients : []
      );
    } catch (error) {
      console.error("Error fetching clients:", error);
      // Silently handle all errors without showing popup messages
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      if (!lazyAxios) {
        lazyAxios = await import("axios");
      }
      await lazyAxios.default.delete(`${BACKEND_URL}/clients/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      message.success("Client deleted successfully.");
      setClients(clients.filter((client) => client._id !== id));
    } catch (error) {
      console.error("Delete error:", error);
      // Silently handle delete errors
    }
  };

  const handleView = (client) => {
    console.log("Viewing client:", client);
    setSelectedClient(client);
    setModalVisible(true);
  };

  const handleEdit = (client) => {
    setSelectedClient(client);
    setModalVisible(false);
    setEditModalVisible(true);
  };

  const handleUnArchive = async (id) => {
    try {
      if (!lazyAxios) {
        lazyAxios = await import("axios");
      }
      await lazyAxios.default.put(
        `${BACKEND_URL}/clients/${id}`,
        {
          archive: false,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      message.success("Client Unarchived successfully.");
      setClients(clients.filter((client) => client.id !== id));
    } catch (error) {
      console.error("Archive error:", error);
      // Silently handle archive errors
    }
  };

  const handleEditSubmit = async (updatedClient) => {
    try {
      if (!lazyAxios) {
        lazyAxios = await import("axios");
      }
      const response = await lazyAxios.default.put(
        `${BACKEND_URL}/clients/${updatedClient.id}`,
        updatedClient,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      message.success("Client updated successfully.");
      setClients(
        clients.map((client) =>
          client.id === updatedClient.id ? response.data : client
        )
      );
      setEditModalVisible(false);
      setSelectedClient(null);
    } catch (error) {
      console.error("Update error:", error);
      // Silently handle update errors
    }
  };

  const columns = [
    {
      title: "S.No.",
      key: "serial",
      render: (_, __, index) => <Text>{index + 1}</Text>,
      width: 50,
      align: "center",
    },
    ...columnOptions
      .filter((option) => visibleColumns[option.key])
      .map((option) => ({
        title: option.label,
        key: option.key,
        dataIndex: option.key,
        render: option.render,
      })),
    {
      title: "Actions",
      key: "actions",
      width: 200,
      align: "center",
      render: (_, record) => (
        <Space>
          <Tooltip title="View details">
            <Button
              shape="circle"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
            />
          </Tooltip>

          <Tooltip title="Edit client">
            <Button
              shape="circle"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>

          {record.archive && (
            <Tooltip title="Unarchive client">
              <Button
                shape="circle"
                icon={<UploadOutlined />}
                onClick={() => handleUnArchive(record._id)}
              />
            </Tooltip>
          )}

          <Popconfirm
            title="Delete this client?"
            description="This action cannot be undone."
            onConfirm={() => handleDelete(record._id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete client">
              <Button shape="circle" icon={<DeleteOutlined />} danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleColumnChange = (key, checked) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: checked }));
  };

  const columnSelectorContent = (
    <div className="bg-white rounded-lg shadow-md p-4 max-h-[25vh] overflow-y-auto">
      {columnOptions.map(({ key, label, permanent }) => (
        <div key={key} className="flex items-center mb-2">
          <input
            type="checkbox"
            checked={visibleColumns[key]}
            onChange={(e) => handleColumnChange(key, e.target.checked)}
            disabled={permanent}
            className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded"
            aria-label={`Toggle column ${label}`}
          />
          <span className={permanent ? "text-gray-500" : "text-gray-800"}>
            {label} {permanent && "(Required)"}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-6">
      <Card
        title={
          <Title level={4} className="!mb-0">
            Client Management
          </Title>
        }
        extra={
          <div className="flex justify-between gap-2">
            <Popover
              content={columnSelectorContent}
              title={<span className="font-semibold">Select Columns</span>}
              trigger="click"
              placement="bottomLeft"
              open={popoverVisible}
              onOpenChange={setPopoverVisible}
            >
              <button className="flex items-center px-2 py-0 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">
                <Settings size={18} className="mr-2" />
                Customize Columns
                <ChevronDown size={18} className="ml-2" />
              </button>
            </Popover>
            <Button
              type="primary"
              style={{
                backgroundColor: "#ac6a1e",
                color: "#fff",
              }}
              icon={<PlusOutlined />}
              className="flex items-center"
              onClick={() => router.push("/dashboard/add-client")}
            >
              Add Client
            </Button>
          </div>
        }
      >
        <div className="mb-6">
          <Input
            placeholder="Search clients by email..."
            suffix={<SearchOutlined />}
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            onPressEnter={() => loadClients(searchEmail)}
            allowClear
            style={{ maxWidth: 400 }}
          />
          <Button
            className="ml-2"
            onClick={() => {
              setSearchEmail("");
              loadClients();
            }}
          >
            Reset
          </Button>
          <Button
            className="ml-2"
            type={!showAll ? "default" : "primary"}
            onClick={() => setShowAll(!showAll)}
            icon={showAll ? <EyeOutlined /> : <InboxOutlined />}
          >
            {showAll ? "Show Archived" : "Show All"}
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={Array.isArray(clients) ? clients : []}
          loading={loading}
          rowKey={(record) =>
            record.id || Math.random().toString(36).substring(2, 9)
          }
          scroll={{ x: "max-content" }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} clients`,
          }}
          locale={{ emptyText: "No clients found" }}
        />
      </Card>

      <Modal
        title={<span className="text-lg font-semibold">Client Details</span>}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedClient && (
          <Descriptions
            bordered
            column={2}
            size="middle"
            className="mt-4"
            extra={
              <Button
                icon={<EditOutlined />}
                onClick={() => handleEdit(selectedClient)}
              >
                Edit Profile
              </Button>
            }
          >
            <Descriptions.Item label="Full Name" span={2}>
              {selectedClient.first_name || ""} {selectedClient.last_name || ""}
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              <div className="flex items-center">
                {selectedClient.email || "N/A"}
                {selectedClient.email && (
                  <div className="ml-2">
                    <Button
                      size="small"
                      type={"default"}
                      icon={
                        selectedClient.email_verified ? (
                          <CheckCircleOutlined />
                        ) : (
                          <CloseCircleOutlined />
                        )
                      }
                      style={{
                        backgroundColor: selectedClient.email_verified
                          ? "#f6ffed"
                          : "#fff1f0",
                        color: selectedClient.email_verified
                          ? "#52c41a"
                          : "#cf1322",
                        borderColor: selectedClient.email_verified
                          ? "#b7eb8f"
                          : "#ffa39e",
                      }}
                      disabled
                    >
                      {selectedClient.email_verified
                        ? "Verified"
                        : "Not Verified"}
                    </Button>
                  </div>
                )}
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="Phone">
              {selectedClient.phone || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Company" span={2}>
              <div>
                <Text strong>{selectedClient.company_name || "N/A"}</Text>
                <br />
                <Text type="secondary">{selectedClient.position || "N/A"}</Text>
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="Industry">
              <Tag color="blue">{selectedClient.industry || "N/A"}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Employees">
              {selectedClient.employees || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Website">
              {selectedClient.website ? (
                <a
                  href={selectedClient.website}
                  target="_blank"
                  rel="noreferrer"
                >
                  {selectedClient.website}
                </a>
              ) : (
                "N/A"
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Address" span={2}>
              {[
                selectedClient.address,
                selectedClient.city,
                selectedClient.state,
                selectedClient.postalcode,
              ]
                .filter(Boolean)
                .join(", ") || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Financial Info" span={2}>
              <Space>
                <StatCard
                  title="Revenue"
                  value={selectedClient.revenue || "N/A"}
                />
                <StatCard
                  title="Investment"
                  value={selectedClient.investment_ask || "N/A"}
                />
                <StatCard
                  title="Fund Stage"
                  value={selectedClient.fund_stage || "N/A"}
                />
              </Space>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
      {/* TODO: Re-add EditClientModal when implemented in current codebase */}
    </div>
  );
};

const StatCard = ({ title, value }) => (
  <Card className="!bg-gray-50 !w-32">
    <Text type="secondary" className="block text-xs">
      {title}
    </Text>
    <Text strong className="block mt-1">
      {value}
    </Text>
  </Card>
);

export default function Page() {
  return <ClientsData />;
}

