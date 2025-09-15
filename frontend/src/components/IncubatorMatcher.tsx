"use client";

import React, { useState } from "react";
import { Card, Button, Table, Select, Form, message, Progress, Tag } from "antd";
import { RobotOutlined } from "@ant-design/icons";
import { scoreIncubatorMatch, type ClientProfile } from "../lib/matching";

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL as string) || "/api";
const { Option } = Select;

interface CompanyProfile {
  sector: string;
  stage: string;
  location: string;
  fundingAmount: string;
}

export default function IncubatorMatcher() {
  const [data, setData] = useState<any[]>([]);
  const [aiMatching, setAiMatching] = useState(false);
  const [form] = Form.useForm<CompanyProfile>();
  const [ruleForm] = Form.useForm<ClientProfile>();
  const [ruleLoading, setRuleLoading] = useState(false);
  const [ruleResults, setRuleResults] = useState<any[]>([]);

  // removed legacy fetchMatches and companyId

  const aiMatchIncubators = async () => {
    const values = await form.validateFields();
    setAiMatching(true);
    try {
      const response = await fetch(`${BACKEND_URL}/ai/match-incubators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyProfile: values,
          preferences: {
            minMatchScore: 40,
            maxResults: 50,
          },
        }),
      });
      const result = await response.json();

      if (result.success) {
        setData(result.matches || []);
        message.success(`Found ${result.totalMatches ?? (result.matches || []).length} matching incubators`);
      } else {
        message.error(result.error || "Failed to match incubators");
      }
    } catch (error) {
      message.error("AI matching failed");
    } finally {
      setAiMatching(false);
    }
  };

  const columns = [
    {
      title: "#",
      key: "serial",
      width: 70,
      align: "center" as const,
      render: (_: any, __: any, index: number) => index + 1,
    },
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
      title: "Incubator",
      key: "incubator",
      render: (record: any) => (
        <div>
          <div className="font-semibold">{record.incubatorName || record.name}</div>
          <div className="text-sm text-gray-600">{record.sectorFocus || record.focus}</div>
        </div>
      ),
    },
    {
      title: "Partner",
      key: "partner",
      render: (record: any) => (
        <div>
          <div className="font-medium">{record.partnerName}</div>
          <div className="text-sm text-gray-600">{record.partnerEmail}</div>
        </div>
      ),
    },
    {
      title: "Focus",
      key: "focus",
      render: (record: any) => {
        const raw = record.sectorFocus ?? record.sector_focus ?? record.focus ?? record.sectors;
        const list = Array.isArray(raw)
          ? raw
          : typeof raw === "string"
          ? raw.split(/[,;]+/).map((s) => s.trim()).filter(Boolean)
          : [];
        if (!list.length) return <span className="text-gray-400">—</span>;
        return (
          <div>
            {list.slice(0, 2).map((sector: string, index: number) => (
              <Tag key={index}>{sector}</Tag>
            ))}
          </div>
        );
      },
    },
    {
      title: "Can Contact",
      key: "canContact",
      render: (record: any) => {
        const can = Boolean(record.canContact);
        return can ? <Tag color="green">Yes</Tag> : <span className="text-gray-400">—</span>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Legacy Matching removed */}

      {/* AI matching removed: using rule-based matching only */}

      <Card title="Rule-based Matching (Local)">
        <Form form={ruleForm} layout="vertical" className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Form.Item name="sector" label="Sector" rules={[{ required: true }]}>
              <Select placeholder="Select sector">
                <Option value="fintech">Fintech</Option>
                <Option value="healthtech">Healthtech</Option>
                <Option value="saas">SaaS</Option>
                <Option value="ai">AI/ML</Option>
              </Select>
            </Form.Item>
            <Form.Item name="stage" label="Stage" rules={[{ required: true }]}>
              <Select placeholder="Select stage">
                <Option value="idea">Idea</Option>
                <Option value="mvp">MVP</Option>
                <Option value="seed">Seed</Option>
                <Option value="series a">Series A</Option>
              </Select>
            </Form.Item>
            <Form.Item name="location" label="Location" rules={[{ required: true }]}>
              <Select placeholder="Location">
                <Option value="us">US</Option>
                <Option value="europe">Europe</Option>
                <Option value="asia">Asia</Option>
                <Option value="india">India</Option>
              </Select>
            </Form.Item>
            <Form.Item name="fundingAmount" label="Amount" rules={[{ required: true }]}>
              <Select placeholder="Amount">
                <Option value="100k">$100K</Option>
                <Option value="500k">$500K</Option>
                <Option value="1m">$1M</Option>
              </Select>
            </Form.Item>
          </div>
          <div className="text-center">
            <Button
              type="primary"
              loading={ruleLoading}
              onClick={async () => {
                try {
                  const values = await ruleForm.validateFields();
                  setRuleLoading(true);
                  // Fetch incubators dataset
                  const res = await fetch(`${BACKEND_URL}/api/incubators`, { cache: 'no-store' });
                  const json = await res.json().catch(() => ({} as any));
                  const docs = json.data || json.docs || [];
                  const scored = docs.map((inc: any) => {
                    const { score } = scoreIncubatorMatch(values as ClientProfile, inc);
                    return { ...inc, matchScore: score };
                  });
                  scored.sort((a: any, b: any) => (b.matchScore || 0) - (a.matchScore || 0));
                  setRuleResults(scored);
                  message.success(`Computed ${scored.length} incubator matches`);
                } catch (e) {
                  // ignore; validation errors are surfaced by antd
                } finally {
                  setRuleLoading(false);
                }
              }}
            >
              Rule-based Match
            </Button>
          </div>
        </Form>

        {ruleResults.length > 0 && (
          <Table
            rowKey={(r: any, index) => String(index ?? 0)}
            dataSource={ruleResults.filter((r) => (r.matchScore ?? r.score ?? 0) > 0)}
            columns={columns}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 800 }}
          />
        )}
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

