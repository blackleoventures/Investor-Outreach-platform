"use client";

import React, { useState } from "react";
import { Card, Button, Table, Select, Form, message, Tag } from "antd";
import { scoreInvestorMatch, scoreIncubatorMatch, type ClientProfile } from "@/lib/matching";

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL as string) || "/api";
 

interface CompanyProfile {
  sector: string;
  stage: string;
  location: string;
  fundingAmount: string;
  competitors?: string[];
}

export default function InvestorMatcher() {
  const [data, setData] = useState<any[]>([]);
  const [aiMatching, setAiMatching] = useState(false);
  const [form] = Form.useForm();
  const [ruleForm] = Form.useForm<ClientProfile>();
  const [ruleLoading, setRuleLoading] = useState(false);
  const [ruleResults, setRuleResults] = useState<any[]>([]);
  const [mode, setMode] = useState<'investor' | 'incubator'>("investor");

  // removed legacy fetchMatches and companyId

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

  const columns = (
    mode === 'investor'
      ? [
          {
            title: "Sr. No.",
            key: "serial",
            width: 70,
            align: "center" as const,
            render: (_: any, __: any, index: number) => index + 1,
          },
          {
            title: "Investor",
            key: "investor",
            render: (record: any) => (
              <span className="font-semibold">{record.investor_name || record.firm_name}</span>
            ),
          },
          {
            title: "Partner",
            key: "partner",
            render: (record: any) => (
              <div className="font-medium">{record.partner_name}</div>
            ),
          },
          {
            title: "Partner Email",
            key: "partnerEmail",
            render: (record: any) => (
              <span className="text-sm text-gray-700">{record.partner_email || '—'}</span>
            ),
          },
          {
            title: "Focus",
            key: "focus",
            render: (record: any) => {
              const rawPrimary = record.sector_focus ?? record.sectorFocus ?? record.focus ?? record.fund_focus ?? record.sectors;
              let list = Array.isArray(rawPrimary)
                ? rawPrimary
                : typeof rawPrimary === "string"
                ? rawPrimary.split(/[,;\/]+/).map((s) => s.trim()).filter(Boolean)
                : [];
              // Fallbacks if sector focus missing
              if (!list.length) {
                const fallback = record.fund_type ?? record.fundType ?? record.fund_category ?? record.vertical;
                if (fallback && typeof fallback === 'string') {
                  list = fallback.split(/[,;\/]+/).map((s: string) => s.trim()).filter(Boolean);
                }
              }
              if (!list.length) {
                const stage = record.fund_stage ?? record.stage;
                if (stage && typeof stage === 'string') {
                  list = [stage];
                }
              }
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
            title: "Score",
            key: "score",
            width: 100,
            render: (record: any) => Math.round(record.matchScore ?? record.score ?? 0),
            sorter: (a: any, b: any) => (Math.round(a.matchScore ?? a.score ?? 0)) - (Math.round(b.matchScore ?? b.score ?? 0)),
          },
        ]
      : [
          {
            title: "Sr. No.",
            key: "serial",
            width: 70,
            align: "center" as const,
            render: (_: any, __: any, index: number) => index + 1,
          },
          {
            title: "Incubator",
            key: "incubator",
            render: (record: any) => (
              <span className="font-semibold">{record.incubatorName || record.name}</span>
            ),
          },
          {
            title: "Partner",
            key: "partner",
            render: (record: any) => (
              <div className="font-medium">{record.partnerName}</div>
            ),
          },
          {
            title: "Partner Email",
            key: "partnerEmail",
            render: (record: any) => (
              <span className="text-sm text-gray-700">{record.partnerEmail || '—'}</span>
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
            title: "Score",
            key: "score",
            width: 100,
            render: (record: any) => Math.round(record.matchScore ?? record.score ?? 0),
            sorter: (a: any, b: any) => (Math.round(a.matchScore ?? a.score ?? 0)) - (Math.round(b.matchScore ?? b.score ?? 0)),
          },
        ]
  );

  return (
    <div className="space-y-6">
      {/* Legacy Matching removed */}

      {/* AI matching removed: using rule-based matching only */}

      <Card title="Match">
        <div className="mb-4 flex gap-3 items-center">
          <span className="text-sm text-gray-600">Match with:</span>
          <Select
            value={mode}
            onChange={(v) => setMode(v)}
            options={[
              { value: 'investor', label: 'Investors' },
              { value: 'incubator', label: 'Incubators' },
            ]}
            style={{ width: 180 }}
          />
        </div>
        <Form form={ruleForm} layout="vertical" className="mb-4">
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
                { value: 'series a', label: 'Series A' },
                { value: 'series b', label: 'Series B' }
              ]} />
            </Form.Item>
            <Form.Item name="location" label="Location" rules={[{ required: true }]}>
              <Select placeholder="Location" options={[
                { value: 'us', label: 'US' },
                { value: 'europe', label: 'Europe' },
                { value: 'asia', label: 'Asia' },
                { value: 'india', label: 'India' },
                { value: 'global', label: 'Global' },
              ]} />
            </Form.Item>
            <Form.Item name="fundingAmount" label="Amount" rules={[{ required: true }]}>
              <Select placeholder="Amount" options={[
                { value: '200k', label: '$200K' },
                { value: '500k', label: '$500K' },
                { value: '1m', label: '$1M' }
              ]} />
            </Form.Item>
          </div>
          <div className="text-center">
            <Button
              type="primary"
              style={{ backgroundColor: '#1677ff', borderColor: '#1677ff', color: '#fff' }}
              loading={ruleLoading}
              onClick={async () => {
                try {
                  const values = await ruleForm.validateFields();
                  setRuleLoading(true);
                  const url = mode === 'investor'
                    ? `${BACKEND_URL}/api/investors?limit=100000&page=1`
                    : `${BACKEND_URL}/api/incubators`;
                  console.log('Fetching from:', url);
                  const res = await fetch(url, { cache: 'no-store' });
                  const json = await res.json().catch(() => ({} as any));
                  console.log('API Response:', json);
                  const docs = json.docs || json.data || [];
                  console.log('Docs found:', docs.length);
                  const scored = docs.map((row: any) => {
                    const result = mode === 'investor'
                      ? scoreInvestorMatch(values as ClientProfile, row)
                      : scoreIncubatorMatch(values as ClientProfile, row);
                    return { ...row, matchScore: result.score };
                  });
                  // Show ALL results including 0 scores, sorted by score descending
                  scored.sort((a: any, b: any) => (b.matchScore || 0) - (a.matchScore || 0));
                  setRuleResults(scored);
                  console.log('Final scored results:', scored.length);
                  message.success(`Computed ${scored.length} ${mode === 'investor' ? 'investor' : 'incubator'} matches`);
                } catch (e) {
                  console.error('Match error:', e);
                  message.error('Failed to fetch data');
                } finally {
                  setRuleLoading(false);
                }
              }}
            >
              Match
            </Button>
          </div>
        </Form>

        {ruleResults.length > 0 && (
          <Table
            rowKey={(r: any, index) => String(index ?? 0)}
            dataSource={ruleResults}
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

