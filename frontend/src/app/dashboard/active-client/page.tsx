// @ts-nocheck
"use client";

import {
  CheckCircleOutlined,
  EditOutlined,
  EyeOutlined,
  InboxOutlined,
  NotificationOutlined,
  PlusOutlined,
  SearchOutlined,
  SendOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";
import {
  Badge,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  message,
  Modal,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
// Lazy-load axios to reduce initial bundle size
let lazyAxios: typeof import("axios") | null = null;
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL as string;

const { Title, Text } = Typography;

const ActiveClients = () => {
  const { token } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [addCredentialsModal, setAddCredentialsModal] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  const [verifyingEmail, setVerifyingEmail] = useState(null);
  const [form] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [companyId, setCompanyId] = useState("");

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async (email = "") => {
    setLoading(true);
    try {
      if (!lazyAxios) {
        lazyAxios = await import("axios");
      }
      const url = email
        ? `${BACKEND_URL}/clients?filter=active&email=${email}`
        : `${BACKEND_URL}/clients?filter=active`;

      const response = await lazyAxios.default.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let clientData = [];

      if (response && response.data) {
        if (
          response.data.data &&
          response.data.data.clients &&
          Array.isArray(response.data.data.clients)
        ) {
          clientData = response.data.data.clients;
        } else if (Array.isArray(response.data)) {
          clientData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          clientData = response.data.data;
        } else if (typeof response.data === "object") {
          Object.keys(response.data).forEach((key) => {
            if (Array.isArray(response.data[key])) {
              clientData = response.data[key];
            }
          });
        }
      }

      clientData = clientData.map((client) => ({
        ...client,
        id: client._id,
        emailVerified: client.email_verified,
      }));

      setClients(clientData);

      if (clientData.length === 0) {
        message.info("No active clients found.");
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
      message.error(`Failed to load clients: ${error.message}`);
      setClients([]);
      setDebugInfo({
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (id) => {
    try {
      if (!lazyAxios) {
        lazyAxios = await import("axios");
      }
      await lazyAxios.default.put(
        `${BACKEND_URL}/clients/${id}`,
        {
          archive: true,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      message.success("Client Archived successfully.");
      setClients(clients.filter((client) => client.id !== id));
    } catch (error) {
      console.error("Archive error:", error);
      message.error(`Error archiving client: ${error.message}`);
    }
  };

  const checkEmailVerificationStatus = async (clientId, email) => {
    try {
      if (!lazyAxios) {
        lazyAxios = await import("axios");
      }
      const response = await lazyAxios.default.post(
        `${BACKEND_URL}/clients/get-verify-status`,
        { email: email },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success && response.data.verified) {
        setClients(
          clients.map((c) =>
            c.id === clientId ? { ...c, emailVerified: true } : c
          )
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error checking verification status:", error);
      return false;
    }
  };

  const handleView = (client) => {
    setSelectedClient(client);
    setModalVisible(true);
  };

  const handleEdit = (client) => {
    setSelectedClient(client);
    setModalVisible(false);
    setEditModalVisible(true);
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
      message.error(`Error updating client: ${error.message}`);
    }
  };

  const toggleModal = (open, value) => {
    setCompanyId(value);
    setIsModalOpen(open);
  };

  const handleCreateCampaign = async (name) => {
    try {
      if (!lazyAxios) {
        lazyAxios = await import("axios");
      }
      const response = await lazyAxios.default.post(
        `${BACKEND_URL}/campaign`,
        { name: name.name, company_id: companyId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.data.success) {
        message.success("Campaign created successfully.");
      }
      toggleModal(false);
    } catch (error) {
      console.error("Creation error:", error);
      message.error(`Error creating campaign: ${error.message}`);
    }
  };

  const handleVerifyEmail = async (client) => {
    if (!client.email) {
      message.error("Email address is missing");
      return;
    }

    setVerifyingEmail(client.id);
    try {
      if (!lazyAxios) {
        lazyAxios = await import("axios");
      }
      const response = await lazyAxios.default.post(
        `${BACKEND_URL}/clients/verify-email`,
        { clientId: client.id, email: client.email },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        message.success(`Verification email sent to ${client.email}`);

        let checkCount = 0;
        const maxChecks = 3;

        const checkInterval = setInterval(async () => {
          checkCount++;
          const isVerified = await checkEmailVerificationStatus(
            client.id,
            client.email
          );

          if (isVerified || checkCount >= maxChecks) {
            clearInterval(checkInterval);
            setVerifyingEmail(null);

            if (isVerified) {
              message.success(`Email ${client.email} has been verified!`);
            } else if (checkCount >= maxChecks) {
              message.info(
                `Verification still pending. Status will update when page refreshes.`
              );
            }
          }
        }, 10000);
      } else {
        message.error(
          response.data.message || "Failed to send verification email"
        );
        setVerifyingEmail(null);
      }
    } catch (error) {
      console.error("Email verification error:", error);
      message.error(
        `Error verifying email: ${
          error.response?.data?.message || error.message
        }`
      );
      setVerifyingEmail(null);
    }
  };

  const handleCredentialSubmit = async (data) => {
    console.log("Form Submitted with record:", data);
    const formData = {
      clientId: selectedClient.id,
      imapPassword: data.imapPassword,
    };
    try {
      if (!lazyAxios) {
        lazyAxios = await import("axios");
      }
      const response = await lazyAxios.default.put(
        `${BACKEND_URL}/clients/add-credentials`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("API Success:", response.data);
      message.success("Credentials added successfully.");
      loadClients();
    } catch (error) {
      console.error("API Error:", error.response?.data || error.message);
      message.error(`Error adding credentials: ${error.message}`);
    } finally {
      setAddCredentialsModal(false);
    }
  };

  const columns = [
    {
      title: "Client",
      key: "fullName",
      render: (_, record) => (
        <Space>
          <Badge status="success" />
          <div>
            <Text strong>{`${record.first_name || ""} ${
              record.last_name || ""
            }`}</Text>
            <br />
            <Text type="secondary">{record.company_name || "N/A"}</Text>
          </div>
        </Space>
      ),
      sorter: (a, b) =>
        `${a.first_name || ""} ${a.last_name || ""}`.localeCompare(
          `${b.first_name || ""} ${b.last_name || ""}`
        ),
    },
    {
      title: "Contact",
      key: "contact",
      width: 200,
      ellipsis: true,
      render: (_, record) => (
        <div>
          <div className="flex items-center mb-1">
            <Text>{record.email || "N/A"}</Text>
            {record.email && (
              <div className="ml-2">
                <Button
                  size="small"
                  type={record.emailVerified ? "default" : "primary"}
                  icon={
                    record.emailVerified ? (
                      <CheckCircleOutlined />
                    ) : (
                      <SendOutlined />
                    )
                  }
                  onClick={() =>
                    !record.emailVerified && handleVerifyEmail(record)
                  }
                  loading={verifyingEmail === record.id}
                  style={{
                    backgroundColor: record.emailVerified
                      ? "#f6ffed"
                      : "#1890ff",
                    color: record.emailVerified ? "#52c41a" : "#fff",
                    borderColor: record.emailVerified ? "#b7eb8f" : "#1890ff",
                  }}
                  disabled={record.emailVerified}
                >
                  {record.emailVerified ? "Verified" : "Verify Email"}
                </Button>
              </div>
            )}
          </div>
          <Text type="secondary">{record.phone || "N/A"}</Text>
        </div>
      ),
    },
    {
      title: "Business Info",
      key: "business",
      render: (_, record) => (
        <div>
          <Tag color="blue">{record.industry || "N/A"}</Tag>
          <br />
          <Text type="secondary">Employees: {record.employees || "N/A"}</Text>
        </div>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 200,
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

          <Tooltip title="Manage Campaigns">
            <Button
              shape="circle"
              icon={<NotificationOutlined />}
              onClick={() => router.push(`/dashboard/${record._id}/campaigns`)}
            />
          </Tooltip>

          <Tooltip title="Match Investors">
            <Button
              shape="circle"
              icon={<UserSwitchOutlined />}
              onClick={() => router.push(`/dashboard/matching-test/${record._id}`)}
            />
          </Tooltip>

          <Tooltip title="Archive client">
            <Button
              shape="circle"
              icon={<InboxOutlined />}
              onClick={() => handleArchive(record._id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <Card
        title={
          <Title level={4} className="!mb-0">
            Active Clients
          </Title>
        }
        extra={
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
          <Button className="ml-2" type="primary" onClick={() => loadClients()}>
            Reload Data
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={Array.isArray(clients) ? clients : []}
          loading={loading}
          rowKey={(record) =>
            record._id || Math.random().toString(36).substring(2, 9)
          }
          scroll={{ x: "max-content" }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} clients`,
          }}
          locale={{ emptyText: "No Active clients found" }}
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
                      type={
                        selectedClient.emailVerified ? "default" : "primary"
                      }
                      icon={
                        selectedClient.emailVerified ? (
                          <CheckCircleOutlined />
                        ) : (
                          <SendOutlined />
                        )
                      }
                      onClick={() =>
                        !selectedClient.emailVerified &&
                        handleVerifyEmail(selectedClient)
                      }
                      loading={verifyingEmail === selectedClient.id}
                      style={{
                        backgroundColor: selectedClient.emailVerified
                          ? "#f6ffed"
                          : "#1890ff",
                        color: selectedClient.emailVerified
                          ? "#52c41a"
                          : "#fff",
                        borderColor: selectedClient.emailVerified
                          ? "#b7eb8f"
                          : "#1890ff",
                      }}
                      disabled={selectedClient.emailVerified}
                    >
                      {selectedClient.emailVerified
                        ? "Verified"
                        : "Verify Email"}
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
                  title="Funding Stage"
                  value={selectedClient.fund_stage || "N/A"}
                />
              </Space>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      <Modal
        title="Create Campaign"
        open={isModalOpen}
        onOk={() => toggleModal(false)}
        onCancel={() => toggleModal(false)}
        footer={false}
        closable={true}
        className="w-full max-w-md mx-auto"
      >
        <Form
          form={form}
          name="create_campaign"
          onFinish={handleCreateCampaign}
          layout="vertical"
          className="space-y-6"
        >
          <Form.Item
            name="name"
            label="Campaign Name"
            rules={[
              { required: true, message: "Please enter a campaign name!" },
            ]}
            className="mb-4"
          >
            <Input
              variant="underlined"
              placeholder="Enter campaign name"
              className="w-full border-gray-300 rounded-md focus:border-gray-400 focus:ring-0"
            />
          </Form.Item>

          <div className="mb-6 text-[#ac6a1e] flex items-center gap-1">
            <span>
              Categorize your contacts under different topics to send them the
              right emails.
            </span>
          </div>

          <Form.Item className="text-right">
            <Button
              type="primary"
              htmlType="submit"
              style={{
                backgroundColor: "#ac6a1e",
                color: "#fff",
              }}
            >
              Save and Proceed
            </Button>
          </Form.Item>
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
  return <ActiveClients />;
}