"use client";

import React, { useState } from "react";
import { Card, Input, Button, Table, Select, Form, message, Progress, Tag, Tooltip, Space } from "antd";
import { SearchOutlined, RobotOutlined, UserOutlined, MailOutlined } from "@ant-design/icons";

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL as string) || "/api";
 

interface CompanyProfile {
  sector: string;
  stage: string;
  location: string;
  fundingAmount: string;
  competitors?: string[];
}

export default function InvestorMatcher() {
  const [companyId, setCompanyId] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiMatching, setAiMatching] = useState(false);
  const [form] = Form.useForm();

  const fetchMatches = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/match/${companyId}/scored`, { cache: "no-store" });
      const json = await res.json();
      setData(json || []);
    } finally {
      setLoading(false);
    }
  };

  const aiMatchInvestors = async () => {
    const values = await form.validateFields();
    setAiMatching(true);
    try {
      const response = await fetch(`${BACKEND_URL}/ai/match-investors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          companyProfile: values,
          preferences: {
            minMatchScore: 40,
            maxResults: 50
          }
        }),
      });
      const result = await response.json();
      
      if (result.success) {
        setData(result.matches);
        message.success(`Found ${result.totalMatches} matching investors`);
      } else {
        message.error("Failed to match investors");
      }
    } catch (error) {
      message.error("AI matching failed");
    } finally {
      setAiMatching(false);
    }
  };

  // Auto-run AI match whenever all required fields are selected
  const handleValuesChange = async () => {
    const values = form.getFieldsValue();
    if (values.sector && values.stage && values.location && values.fundingAmount && !aiMatching) {
      await aiMatchInvestors();
    }
  };

  const columns = [
    {
      title: "Match Score",
      dataIndex: "matchScore",
      key: "matchScore",
      width: 120,
      render: (score: number) => (
        <Progress 
          type="circle" 
          percent={score || 0} 
          size={40}
          strokeColor={score >= 70 ? "#52c41a" : score >= 50 ? "#faad14" : "#ff4d4f"}
        />
      ),
      sorter: (a: any, b: any) => (b.matchScore || b.score || 0) - (a.matchScore || a.score || 0),
    },
    {
      title: "Investor",
      key: "investor",
      render: (record: any) => (
        <div>
          <div className="font-semibold">{record.investor_name || record.firm_name}</div>
          <div className="text-sm text-gray-600">{record.fund_type}</div>
        </div>
      ),
    },
    {
      title: "Partner",
      key: "partner",
      render: (record: any) => (
        <div>
          <div className="font-medium">{record.partner_name}</div>
          <div className="text-sm text-gray-600">{record.partner_email}</div>
        </div>
      ),
    },
    {
      title: "Focus",
      dataIndex: "sector_focus",
      key: "sector_focus",
      render: (sectors: string[]) => (
        <div>
          {(sectors || []).slice(0, 2).map((sector, index) => (
            <Tag key={index}>{sector}</Tag>
          ))}
        </div>
      ),
    },
    {
      title: "Can Contact",
      dataIndex: "canContact",
      key: "canContact",
      render: (canContact: boolean) => (
        <Tag color={canContact ? "green" : "red"}>
          {canContact ? "Yes" : "No"}
        </Tag>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card title="Legacy Matching" size="small">
        <div className="flex items-center gap-2 mb-3">
          <Input placeholder="Company ID" value={companyId} onChange={(e: any) => setCompanyId(e.target.value)} />
          <Button onClick={fetchMatches} loading={loading}>Match</Button>
        </div>
      </Card>

      <Card title="AI-Powered Matching">
        <Form form={form} layout="vertical" className="mb-4" onValuesChange={handleValuesChange}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Form.Item name="sector" label="Sector" rules={[{ required: true }]}>
              <Select placeholder="Select sector" options={[
                { value: 'fintech', label: 'Fintech' },
                { value: 'healthtech', label: 'Healthtech' },
                { value: 'saas', label: 'SaaS' },
                { value: 'ai', label: 'AI/ML' }
              ]} />
            </Form.Item>
            <Form.Item name="stage" label="Stage" rules={[{ required: true }]}>
              <Select placeholder="Select stage" options={[
                { value: 'seed', label: 'Seed' },
                { value: 'series-a', label: 'Series A' },
                { value: 'series-b', label: 'Series B' }
              ]} />
            </Form.Item>
            <Form.Item name="location" label="Location" rules={[{ required: true }]}>
              <Select placeholder="Location" options={[
                { value: 'us', label: 'US' },
                { value: 'eu', label: 'Europe' },
                { value: 'asia', label: 'Asia' }
              ]} />
            </Form.Item>
            <Form.Item name="fundingAmount" label="Amount" rules={[{ required: true }]}>
              <Select placeholder="Amount" options={[
                { value: '500k', label: '$500K' },
                { value: '1m', label: '$1M' },
                { value: '5m', label: '$5M' }
              ]} />
            </Form.Item>
          </div>
          {/* Removed explicit AI Match button; auto-run on field change */}
        </Form>
      </Card>

      {data.length > 0 && (
        <Card title={`${data.length} Matches Found`}>
          <Table
            rowKey={(r: any, index) => String(index ?? 0)}
            dataSource={data}
            columns={columns}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 800 }}
          />
        </Card>
      )}
    </div>
  );
}

