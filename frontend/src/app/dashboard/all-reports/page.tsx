"use client";

import { Card, Table, Typography, Button, Space, Tag, Statistic, Row, Col } from "antd";
import { EyeOutlined, FileTextOutlined, EditOutlined, BarChartOutlined } from "@ant-design/icons";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

const { Title } = Typography;

interface Report {
  id: number;
  name: string;
  type: string;
  createdAt: string;
  status: string;
}

const AllReports = () => {
  const [reports, setReports] = useState<Report[]>([]);
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
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={status === "completed" ? "green" : "orange"}>
          {status}
        </Tag>
      ),
    },
    {
      title: "Client",
      dataIndex: "clientName",
      key: "clientName",
      render: (client: string) => client || '-',
    },
    {
      title: "Metrics",
      key: "metrics",
      render: (_: any, record: any) => {
        const metrics = record.metrics;
        if (!metrics) return '-';
        return (
          <Space size="small">
            <Tag color="blue">Sent: {metrics.sent || 0}</Tag>
            <Tag color="green">Open: {metrics.openRate || 0}%</Tag>
            <Tag color="orange">Reply: {metrics.replies || 0}</Tag>
          </Space>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            View Details
          </Button>
        </Space>
      ),
    },
  ];

  const handleView = (report: any) => {
    const metrics = report.metrics;
    if (!metrics) return;
    
    const content = `
📊 Campaign Report: ${report.name}
👤 Client: ${report.clientName || 'N/A'}
📅 Date: ${new Date(report.createdAt).toLocaleDateString()}

📈 Email Metrics:
• Emails Sent: ${metrics.sent || 0}
• Delivered: ${metrics.delivered || 0}
• Failed: ${metrics.failed || 0}
• Open Rate: ${metrics.openRate || 0}%
• Click Rate: ${metrics.clickRate || 0}%
• Replies: ${metrics.replies || 0}

📧 Recipients:
${(report.recipients || []).slice(0, 5).join('\n')}
${(report.recipients || []).length > 5 ? `\n...and ${(report.recipients || []).length - 5} more` : ''}
    `;
    
    navigator.clipboard.writeText(content).then(() => {
      alert('Report details copied to clipboard!');
    }).catch(() => {
      alert(content);
    });
  };

  // Load real reports from localStorage
  useEffect(() => {
    try {
      const savedReports = JSON.parse(localStorage.getItem('reports') || '[]');
      setReports(savedReports);
    } catch (e) {
      console.error('Failed to load reports:', e);
      setReports([]);
    }
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
            showTotal: (total: number) => `Total ${total} reports`,
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

