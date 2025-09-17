// @ts-nocheck
"use client";

import { CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, EditOutlined, EyeOutlined, InboxOutlined, PlusOutlined, SearchOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, Card, Descriptions, Input, message, Modal, Popconfirm, Popover, Space, Table, Tag, Tooltip, Typography, Form, Select } from "antd";
import { ChevronDown, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getApiBase } from "@/lib/api";
// Lazy-load axios to reduce initial bundle size
let lazyAxios: typeof import("axios") | null = null;

const { Title, Text } = Typography;

const columnOptions = [
  {
    key: "companyName",
    label: "Company Name",
    default: true,
    permanent: true,
    render: (_, record) => <Text>{record.company_name || "N/A"}</Text>,
  },
  {
    key: "founderName",
    label: "Founder Name",
    permanent: true,
    render: (_, record) => (
      <Text>{`${record.first_name || ""} ${record.last_name || ""}`}</Text>
    ),
  },
  {
    key: "companyEmail",
    label: "Company Email",
    default: true,
    permanent: true,
    render: (_, record) => <Text>{record.email || "N/A"}</Text>,
  },
  {
    key: "contact",
    label: "Contact",
    permanent: true,
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
    permanent: true,
    render: (_, record) => (
      <Tag color="purple">{record.fund_stage || "N/A"}</Tag>
    ),
  },
  {
    key: "revenue",
    label: "Revenue",
    default: true,
    permanent: true,
    render: (_, record) => <Text>{record.revenue || 0}</Text>,
  },
  {
    key: "investmentAsk",
    label: "Investment Ask",
    permanent: true,
    render: (_, record) => <Text>{record.investment_ask || 0}</Text>,
  },
  {
    key: "sector",
    label: "Sector",
    permanent: true,
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
  const [apiBase, setApiBase] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm] = Form.useForm();
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
    (async () => {
      const base = await getApiBase();
      setApiBase(base);
      await loadClients();
    })();
  }, [showAll]);

  // Debounced search: filter by email/company/contact as user types
  useEffect(() => {
    const t = setTimeout(() => {
      loadClients(searchEmail);
    }, 300);
    return () => clearTimeout(t);
  }, [searchEmail]);

  const loadClients = async (email = "") => {
    setLoading(true);
    try {
      if (!lazyAxios) {
        lazyAxios = await import("axios");
      }
      const filter = showAll ? "all" : "active";
      const base = apiBase || (await getApiBase());
      const baseUrl = `${base}/api/clients?filter=${filter}`;

      let url = baseUrl;
      if (email && email.trim()) {
        const q = encodeURIComponent(email.trim());
        // backend supports email query; for company/phone we will filter client-side after fetch
        url = `${baseUrl}&email=${q}`;
      }

      const response = await lazyAxios.default.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const serverClients = Array.isArray(response?.data?.clients) ? response.data.clients : [];
      let filtered = serverClients;
      if (email && email.trim()) {
        const q = email.trim().toLowerCase();
        filtered = serverClients.filter((c) => {
          const emailStr = (c.email || "").toLowerCase();
          const companyStr = (c.company_name || "").toLowerCase();
          const phoneStr = (c.phone || "").toLowerCase();
          return (
            emailStr.includes(q) || companyStr.includes(q) || phoneStr.includes(q)
          );
        });
      }
      setClients(filtered);
    } catch (error) {
      console.error("Error fetching clients:", error);
      message.error("Failed to load clients. Please check if backend server is running.");
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
      const base = apiBase || (await getApiBase());
      await lazyAxios.default.delete(`${base}/api/clients/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      message.success("Client deleted successfully.");
      setClients((prev) => prev.filter((client) => client.id !== id && client._id !== id));
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
    // seed form
    editForm.setFieldsValue({
      first_name: client.first_name || "",
      last_name: client.last_name || "",
      email: client.email || "",
      phone: client.phone || "",
      company_name: client.company_name || "",
      industry: client.industry || "",
      fund_stage: client.fund_stage || "",
      revenue: client.revenue || "",
      investment_ask: client.investment_ask || "",
      archive: !!client.archive,
    });
  };

  const handleUnArchive = async (id) => {
    try {
      if (!lazyAxios) {
        lazyAxios = await import("axios");
      }
      const base = apiBase || (await getApiBase());
      await lazyAxios.default.put(
        `${base}/api/clients/${id}`,
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
      const base = apiBase || (await getApiBase());
      const payload = {
        id: selectedClient.id,
        firstName: updatedClient.first_name,
        lastName: updatedClient.last_name,
        email: updatedClient.email,
        phone: updatedClient.phone,
        companyName: updatedClient.company_name,
        industry: updatedClient.industry,
        fundingStage: updatedClient.fund_stage,
        revenue: updatedClient.revenue,
        investment: updatedClient.investment_ask,
        archive: updatedClient.archive,
      };
      const response = await lazyAxios.default.put(
        `${base}/api/clients/${selectedClient.id}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      message.success("Client updated successfully.");
      setClients(
        clients.map((client) =>
          client.id === selectedClient.id ? response.data : client
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

            <Tooltip title="Delete client">
            <Button
              shape="circle"
              icon={<DeleteOutlined />}
              danger
              onClick={() =>
                Modal.confirm({
                  title: "Delete this client?",
                  content: "This action cannot be undone.",
                  okText: "Delete",
                  cancelText: "Cancel",
                  okButtonProps: { danger: true },
                  onOk: () => handleDelete(record._id || record.id),
                })
              }
            />
            </Tooltip>
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
        <div className="mb-6 flex items-center gap-2 flex-wrap">
          <Input
            placeholder="Search by email, company or contact..."
            suffix={<SearchOutlined />}
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            allowClear
            style={{ maxWidth: 420 }}
          />
          <Button
            onClick={() => setSearchEmail("")}
          >
            Reset
          </Button>
          <Button
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
        width={980}
        style={{ top: 40 }}
        styles={{ body: { padding: 16, maxHeight: '72vh', overflowY: 'auto' } }}
      >
        {selectedClient && (() => {
          const hasName = Boolean((selectedClient.first_name || "").trim() || (selectedClient.last_name || "").trim());
          const hasPhone = Boolean((selectedClient.phone || "").trim());
          const hasCompany = Boolean((selectedClient.company_name || "").trim());
          const hasPosition = Boolean((selectedClient.position || "").trim());
          const hasIndustry = Boolean((selectedClient.industry || "").trim());
          const hasEmployees = selectedClient.employees !== undefined && selectedClient.employees !== null && String(selectedClient.employees).trim() !== "";
          const hasWebsite = Boolean((selectedClient.website || "").trim());
          const addressParts = [selectedClient.address, selectedClient.city, selectedClient.state, selectedClient.postalcode].filter(Boolean);
          const hasAddress = addressParts.length > 0;
          const hasRevenue = Boolean((selectedClient.revenue ?? "").toString().trim());
          const hasInvestment = Boolean((selectedClient.investment_ask ?? "").toString().trim());
          const hasFundStage = Boolean((selectedClient.fund_stage || "").trim());
          const hasAnyFinancial = hasRevenue || hasInvestment || hasFundStage;

          return (
          <Descriptions
            bordered
              column={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 2 }}
            size="middle"
              className="mt-2"
              labelStyle={{ width: 180, padding: '12px 16px' }}
              contentStyle={{ padding: '12px 16px', whiteSpace: 'normal', wordBreak: 'break-word' }}
            extra={
                undefined
              }
            >
              {hasName && (
            <Descriptions.Item label="Full Name" span={2}>
                  {(selectedClient.first_name || "").trim()} {(selectedClient.last_name || "").trim()}
            </Descriptions.Item>
              )}

                {selectedClient.email && (
                <Descriptions.Item label="Email" span={2}>
                  <div className="flex items-center" style={{ gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ overflowWrap: 'anywhere' }}>{selectedClient.email}</span>
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
                        {selectedClient.email_verified ? "Verified" : "Not Verified"}
                    </Button>
                    </div>
                  </div>
                </Descriptions.Item>
                )}

              {hasPhone && (
            <Descriptions.Item label="Phone">
                  {selectedClient.phone}
            </Descriptions.Item>
              )}

              {(hasCompany || hasPosition) && (
            <Descriptions.Item label="Company" span={2}>
                  <div className="flex items-center gap-3 flex-wrap">
                    {hasCompany && <Text strong>{selectedClient.company_name}</Text>}
                    {hasPosition && <Text type="secondary">{selectedClient.position}</Text>}
              </div>
            </Descriptions.Item>
              )}

              {hasIndustry && (
            <Descriptions.Item label="Industry">
                  <Tag color="blue">{selectedClient.industry}</Tag>
            </Descriptions.Item>
              )}

              {hasEmployees && (
            <Descriptions.Item label="Employees">
                  {selectedClient.employees}
            </Descriptions.Item>
              )}

              {hasWebsite && (
            <Descriptions.Item label="Website">
                  <a href={selectedClient.website} target="_blank" rel="noreferrer">
                  {selectedClient.website}
                </a>
                </Descriptions.Item>
              )}

              {hasAddress && (
                <Descriptions.Item label="Address" span={2}>
                  <span style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                    {addressParts.join(", ")}
                  </span>
                </Descriptions.Item>
              )}

              {/* Financial values shown as individual fields (no 'Financial Info' group) */}
              {hasRevenue && (
                <Descriptions.Item label="Revenue">
                  {selectedClient.revenue}
                </Descriptions.Item>
              )}
              {hasInvestment && (
                <Descriptions.Item label="Investment">
                  {selectedClient.investment_ask}
                </Descriptions.Item>
              )}
              {hasFundStage && (
                <Descriptions.Item label="Fund Stage">
                  {selectedClient.fund_stage}
            </Descriptions.Item>
              )}

              {/* Onboarding Info */}
              {selectedClient.createdAt && (
                <Descriptions.Item label="Onboarding Info">
                  {(() => {
                    const onboardedDate = new Date(selectedClient.createdAt);
                    const today = new Date();
                    const diffDays = Math.floor((today as any - onboardedDate as any) / (1000 * 60 * 60 * 24));
                    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
                  })()}
            </Descriptions.Item>
              )}

              {/* Is Archived */}
              {typeof selectedClient.archive !== 'undefined' && (
                <Descriptions.Item label="Is Archived">
                  <Tag color={selectedClient.archive ? 'red' : 'green'}>
                    {selectedClient.archive ? 'Yes' : 'No'}
                  </Tag>
            </Descriptions.Item>
              )}
          </Descriptions>
          );
        })()}
      </Modal>
      <Modal
        title={<span className="text-lg font-semibold">Edit Client</span>}
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={() => editForm.submit()}
        okText="Save"
      >
        <Form form={editForm} layout="vertical" onFinish={handleEditSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item name="first_name" label="First Name">
              <Input />
            </Form.Item>
            <Form.Item name="last_name" label="Last Name">
              <Input />
            </Form.Item>
            <Form.Item name="email" label="Email" rules={[{ type: 'email' }] }>
              <Input />
            </Form.Item>
            <Form.Item name="phone" label="Contact">
              <Input />
            </Form.Item>
            <Form.Item name="company_name" label="Company Name">
              <Input />
            </Form.Item>
            <Form.Item name="industry" label="Sector">
              <Input />
            </Form.Item>
            <Form.Item name="fund_stage" label="Fund Stage">
              <Select
                options={[
                  { value: 'Pre-seed', label: 'Pre-seed' },
                  { value: 'Seed', label: 'Seed' },
                  { value: 'Series A', label: 'Series A' },
                  { value: 'Series B', label: 'Series B' },
                  { value: 'Growth', label: 'Growth' },
                ]}
              />
            </Form.Item>
            <Form.Item name="revenue" label="Revenue">
              <Input />
            </Form.Item>
            <Form.Item name="investment_ask" label="Investment Ask">
              <Input />
            </Form.Item>
            <Form.Item name="archive" label="Archive" valuePropName="checked">
              <Input type="checkbox" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
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

