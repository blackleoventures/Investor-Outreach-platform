"use client";

import { useEffect, useState } from "react";
import { Card, Tabs, Typography, Button, Input, Table, Tag, Badge, Space } from "antd";
import { TeamOutlined, SearchOutlined, StarOutlined, EyeOutlined, MailOutlined, PlusOutlined, FilterOutlined } from "@ant-design/icons";
import IncubatorMatcher from "../../../components/IncubatorMatcher";

const { Title, Text } = Typography;
const { Search } = Input;

// Using direct import to avoid dynamic import factory issues

export default function IncubatorManagementPage() {
  const [activeTab, setActiveTab] = useState("1");
  const [incubators, setIncubators] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filtered, setFiltered] = useState<any[]>([]);

  useEffect(() => {
    // Mock data to mirror investor page structure for now
    setIncubators([
      {
        id: 1,
        incubatorName: "StartHub",
        partnerName: "Alice Brown",
        partnerEmail: "alice@starthub.com",
        sectorFocus: "SaaS",
        stage: "MVP/Seed",
        location: "San Francisco",
        score: 90,
        status: "active",
      },
      {
        id: 2,
        incubatorName: "LaunchWorks",
        partnerName: "Bob Green",
        partnerEmail: "bob@launchworks.io",
        sectorFocus: "Fintech",
        stage: "Seed",
        location: "New York",
        score: 82,
        status: "active",
      },
      {
        id: 3,
        incubatorName: "InnovateLab",
        partnerName: "Carol Lee",
        partnerEmail: "carol@innovatela.b",
        sectorFocus: "Healthtech",
        stage: "Idea/MVP",
        location: "Boston",
        score: 75,
        status: "pending",
      },
    ]);
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      setFiltered(
        incubators.filter((r) =>
          (r.incubatorName || "").toLowerCase().includes(q) ||
          (r.partnerName || "").toLowerCase().includes(q) ||
          (r.sectorFocus || "").toLowerCase().includes(q)
        )
      );
    } else {
      setFiltered(incubators);
    }
  }, [searchQuery, incubators]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return "#52c41a";
    if (score >= 80) return "#faad14";
    return "#ff4d4f";
  };

  const columns = [
    {
      title: "Score",
      dataIndex: "score",
      key: "score",
      render: (score: number) => (
        <Badge count={score} style={{ backgroundColor: getScoreColor(score) }} />
      ),
      sorter: (a: any, b: any) => a.score - b.score,
    },
    {
      title: "Incubator",
      dataIndex: "incubatorName",
      key: "incubatorName",
      render: (name: string, record: any) => (
        <div>
          <div className="font-medium">{name}</div>
          <div className="text-sm text-gray-500">{record.location}</div>
        </div>
      ),
    },
    {
      title: "Partner Email",
      dataIndex: "partnerEmail",
      key: "partnerEmail",
      render: (email: string) => <Text copyable>{email}</Text>,
    },
    {
      title: "Focus",
      key: "focus",
      render: (_: any, record: any) => (
        <div className="space-y-1">
          <Tag color="blue">{record.sectorFocus}</Tag>
          <Tag color="green">{record.stage}</Tag>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={status === "active" ? "success" : status === "pending" ? "warning" : "default"}>
          {status?.charAt(0).toUpperCase() + status?.slice(1)}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, __: any) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />}>View</Button>
          <Button size="small" icon={<MailOutlined />} type="primary">Contact</Button>
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: "1",
      label: (
        <span>
          <TeamOutlined />
          Incubator Database
        </span>
      ),
      children: (
        <div className="space-y-6">
          <Card>
            <div className="flex justify-between items-center mb-4">
              <div>
                <Title level={4}>Incubator Database</Title>
                <Text type="secondary">Browse and manage incubators and accelerators</Text>
              </div>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => (window.location.href = "/dashboard/add-incubator")}>Add Incubator</Button>
            </div>

            <div className="mb-4">
              <Search
                placeholder="Search incubators by name, partner, or sector..."
                allowClear
                enterButton={<SearchOutlined />}
                size="large"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Table
              columns={columns}
              dataSource={filtered}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} incubators`,
              }}
            />
          </Card>
        </div>
      ),
    },
    {
      key: "2",
      label: (
        <span>
          <StarOutlined />
          Smart Matching
        </span>
      ),
      children: (
        <div className="space-y-6">
          <Card title="Incubator Matching" className="shadow-lg">
            <div className="mb-4">
              <Text>Find suitable incubators using rule-based scoring.</Text>
            </div>
            <IncubatorMatcher />
          </Card>
        </div>
      ),
    },
    {
      key: "3",
      label: (
        <span>
          <FilterOutlined />
          Advanced Filters
        </span>
      ),
      children: (
        <div className="space-y-6">
          <Card title="🔍 Advanced Incubator Filtering" className="shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Text strong>Sector Focus</Text>
                <div className="mt-2 space-y-2">
                  {["Technology", "SaaS", "Fintech", "Healthcare", "E-commerce"].map((sector) => (
                    <Tag key={sector} className="cursor-pointer hover:bg-blue-50">{sector}</Tag>
                  ))}
                </div>
              </div>
              <div>
                <Text strong>Stage</Text>
                <div className="mt-2 space-y-2">
                  {["Idea", "MVP", "Seed", "Series A"].map((stage) => (
                    <Tag key={stage} className="cursor-pointer hover:bg-blue-50">{stage}</Tag>
                  ))}
                </div>
              </div>
              <div>
                <Text strong>Location</Text>
                <div className="mt-2 space-y-2">
                  {["US", "Europe", "Asia"].map((loc) => (
                    <Tag key={loc} className="cursor-pointer hover:bg-blue-50">{loc}</Tag>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <Title level={1} className="text-3xl font-bold text-gray-800 mb-2">🏢 Incubator Management</Title>
        <Text className="text-lg text-gray-600">Incubator database, AI matching, and discovery tools</Text>
      </div>

      <Card className="shadow-xl">
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} size="large" type="card" />
      </Card>
    </div>
  );
}

