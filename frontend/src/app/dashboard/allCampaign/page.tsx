"use client";

import { Card, Table, Typography, Button, Space, Tag, Tooltip } from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined, PlusOutlined, MailOutlined, FileTextOutlined, RobotOutlined } from "@ant-design/icons";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const { Title, Text } = Typography;

const Campaigns = () => {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);

  const columns = [
    {
      title: "S.No.",
      key: "serial",
      render: (_, __, index) => index + 1,
      width: 60,
    },
    {
      title: "Campaign Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (type) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const color = status === "active" ? "green" : status === "draft" ? "orange" : "red";
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: "Recipients",
      dataIndex: "recipients",
      key: "recipients",
    },
    {
      title: "Created Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Tooltip title="View Campaign">
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
            />
          </Tooltip>
          <Tooltip title="Edit Campaign">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Delete Campaign">
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const handleView = (campaign) => {
    console.log("Viewing campaign:", campaign);
    // TODO: Implement campaign viewing logic
  };

  const handleEdit = (campaign) => {
    console.log("Editing campaign:", campaign);
    // TODO: Implement campaign editing logic
  };

  const handleDelete = (campaign) => {
    console.log("Deleting campaign:", campaign);
    // TODO: Implement campaign deletion logic
  };

  // Mock data for now
  useEffect(() => {
    setCampaigns([
      {
        id: 1,
        name: "Q4 Investor Outreach",
        type: "Email",
        status: "active",
        recipients: 150,
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        name: "Product Launch Campaign",
        type: "Email",
        status: "draft",
        recipients: 75,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ]);
  }, []);

  return (
    <div className="p-6">
      <Card
        title={
          <Title level={4} className="!mb-0">
            <MailOutlined className="mr-2" />
            All Campaigns
          </Title>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push("/dashboard/campaign/ai-email-campaign")}
            style={{ backgroundColor: "#ac6a1e" }}
          >
            Create Campaign
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={campaigns}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} campaigns`,
          }}
          locale={{ emptyText: "No campaigns found" }}
        />
      </Card>
    </div>
  );
};

export default function Page() {
  return <Campaigns />;
}

