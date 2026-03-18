"use client";

import { useState, useEffect } from "react";
import { Card, Table, Button, Input, message, Tag, Space, Spin } from "antd";
import {
  SearchOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface ClientSelectionProps {
  selectedClient: any;
  onClientSelect: (client: any) => void;
  onNext: () => void;
  getAuthToken: () => Promise<string | null>;
}

export default function ClientSelection({
  selectedClient,
  onClientSelect,
  onNext,
  getAuthToken,
}: ClientSelectionProps) {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [filteredClients, setFilteredClients] = useState<any[]>([]);

  useEffect(() => {
    fetchEligibleClients();
  }, []);

  useEffect(() => {
    if (searchText) {
      const filtered = clients.filter(
        (client) =>
          client.companyName.toLowerCase().includes(searchText.toLowerCase()) ||
          client.founderName.toLowerCase().includes(searchText.toLowerCase()) ||
          client.industry.toLowerCase().includes(searchText.toLowerCase()),
      );
      setFilteredClients(filtered);
    } else {
      setFilteredClients(clients);
    }
  }, [searchText, clients]);

  const fetchEligibleClients = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(
        `${API_BASE_URL}/campaigns/eligible-clients`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch clients");
      }

      const data = await response.json();
      setClients(data.clients || []);
      setFilteredClients(data.clients || []);
    } catch (error: any) {
      console.error("Error fetching clients:", error);
      message.error(error.message || "Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClient = async (client: any) => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      if (!token) return;

      // Fetch full client details
      const response = await fetch(
        `${API_BASE_URL}/campaigns/client-details/${client.id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch client details");
      }

      const data = await response.json();
      onClientSelect(data.client);
      message.success(`Selected: ${client.companyName}`);
    } catch (error: any) {
      console.error("Error selecting client:", error);
      message.error(error.message || "Failed to select client");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: "Company Name",
      dataIndex: "companyName",
      key: "companyName",
      width: 180,
      ellipsis: true,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: "Founder",
      dataIndex: "founderName",
      key: "founderName",
      width: 120,
      ellipsis: true,
    },
    {
      title: "Industry",
      dataIndex: "industry",
      key: "industry",
      width: 200,
      render: (text: string) => {
        if (!text) return <Tag color="blue">-</Tag>;
        const industries = text
          .split(",")
          .map((i) => i.trim())
          .filter(Boolean);
        if (industries.length === 0) return <Tag color="blue">{text}</Tag>;
        return (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "4px",
              maxWidth: "200px",
            }}
          >
            {industries.slice(0, 3).map((industry, idx) => (
              <Tag key={idx} color="blue" style={{ margin: 0 }}>
                {industry.length > 15
                  ? `${industry.slice(0, 15)}...`
                  : industry}
              </Tag>
            ))}
            {industries.length > 3 && (
              <Tag color="blue" style={{ margin: 0 }}>
                +{industries.length - 3}
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: "Funding Stage",
      dataIndex: "fundingStage",
      key: "fundingStage",
      width: 120,
      render: (text: string) => <Tag color="green">{text}</Tag>,
    },
    {
      title: "Daily Limit",
      dataIndex: ["emailConfiguration", "dailyEmailLimit"],
      key: "dailyLimit",
      width: 110,
      render: (limit: number) => `${limit} emails/day`,
    },
    {
      title: "SMTP Status",
      dataIndex: ["emailConfiguration", "testStatus"],
      key: "smtpStatus",
      width: 110,
      render: (status: string) => (
        <Tag color={status === "passed" ? "success" : "error"}>
          {status === "passed" ? "Verified" : "Not Verified"}
        </Tag>
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 100,
      fixed: "right",
      render: (_: any, record: any) => (
        <Button
          type="primary"
          size="small"
          onClick={() => handleSelectClient(record)}
          disabled={selectedClient?.id === record.id}
          icon={
            selectedClient?.id === record.id ? <CheckCircleOutlined /> : null
          }
          style={{
            backgroundColor:
              selectedClient?.id === record.id ? "#52c41a" : "#1890ff",
            borderColor:
              selectedClient?.id === record.id ? "#52c41a" : "#1890ff",
          }}
        >
          {selectedClient?.id === record.id ? "Selected" : "Select"}
        </Button>
      ),
    },
  ];

  if (loading && clients.length === 0) {
    return (
      <Card>
        <div className="flex justify-center items-center py-12">
          <Spin size="large" tip="Loading eligible clients..." />
        </div>
      </Card>
    );
  }

  return (
    <div>
      <Card title="Select Client for Campaign" className="mb-6">
        <Input
          placeholder="Search by company name, founder, or industry..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          size="large"
          className="mb-4"
        />

        <Table
          columns={columns}
          dataSource={filteredClients}
          rowKey="id"
          loading={loading}
          scroll={{ x: "max-content" }}
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
            showTotal: (total) => `Total ${total} eligible clients`,
          }}
        />
      </Card>

      {selectedClient && (
        <Card title="Selected Client Summary" className="mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600">Company</p>
              <p className="font-semibold">{selectedClient.companyName}</p>
            </div>
            <div>
              <p className="text-gray-600">Industry</p>
              <p className="font-semibold">{selectedClient.industry}</p>
            </div>
            <div>
              <p className="text-gray-600">Funding Stage</p>
              <p className="font-semibold">{selectedClient.fundingStage}</p>
            </div>
            <div>
              <p className="text-gray-600">Daily Email Limit</p>
              <p className="font-semibold">
                {selectedClient.emailConfiguration?.dailyEmailLimit} emails/day
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="flex justify-end">
        <Button
          type="primary"
          size="large"
          onClick={onNext}
          disabled={!selectedClient}
          icon={<ArrowRightOutlined />}
          style={{
            backgroundColor: selectedClient ? "#1890ff" : undefined,
            borderColor: selectedClient ? "#1890ff" : undefined,
          }}
        >
          Next: Select Audience
        </Button>
      </div>
    </div>
  );
}
