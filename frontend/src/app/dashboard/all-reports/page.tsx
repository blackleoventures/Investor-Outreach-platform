"use client";

import { Card, Table, Typography, Button, Space, Tag, Statistic, Row, Col } from "antd";
import { EyeOutlined, FileTextOutlined, EditOutlined, BarChartOutlined } from "@ant-design/icons";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

const { Title } = Typography;

const AllReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const campaignId = searchParams.get('campaignId');

  const columns = [
    {
      title: "S.No.",
      key: "serial",
      render: (_: any, __: any, index: number) => index + 1,
      width: 60,
    },
    {
      title: "Report Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (type: string) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: "Created Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={status === "completed" ? "green" : "orange"}>
          {status}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            View
          </Button>
        </Space>
      ),
    },
  ];

  const handleView = (report) => {
    console.log("Viewing report:", report);
    // TODO: Implement report viewing logic
  };

  // Mock data for now
  useEffect(() => {
    setReports([
      {
        id: 1,
        name: "Campaign Performance Report",
        type: "Campaign",
        createdAt: new Date().toISOString(),
        status: "completed",
      },
      {
        id: 2,
        name: "Client Engagement Report",
        type: "Analytics",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        status: "pending",
      },
    ]);
  }, []);

  return (
    <div className="p-6">
      <Card
        title={
          <Title level={4} className="!mb-0">
            <FileTextOutlined className="mr-2" />
            All Reports
          </Title>
        }
      >
        <Table
          columns={columns}
          dataSource={reports}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} reports`,
          }}
          locale={{ emptyText: "No reports found" }}
        />
      </Card>
    </div>
  );
};

export default function Page() {
  return <AllReports />;
}

