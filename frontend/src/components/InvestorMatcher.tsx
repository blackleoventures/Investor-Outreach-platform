"use client";

import React, { useState, useEffect } from "react";
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
  const [counts, setCounts] = useState({ clients: 0, investors: 0, incubators: 0 });

  // Load counts on component mount
  React.useEffect(() => {
    const loadCounts = async () => {
      try {
        const [clientRes, investorRes, incubatorRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/clients?limit=100000&page=1`, { cache: 'no-store' }).catch(() => null),
          fetch(`${BACKEND_URL}/api/investors?limit=100000&page=1`, { cache: 'no-store' }).catch(() => null),
          fetch(`${BACKEND_URL}/api/incubators`, { cache: 'no-store' }).catch(() => null)
        ]);
        
        const clientJson = await (clientRes ? clientRes.json().catch(() => ({} as any)) : ({} as any));
        const investorJson = await (investorRes ? investorRes.json().catch(() => ({} as any)) : ({} as any));
        const incubatorJson = await (incubatorRes ? incubatorRes.json().catch(() => ({} as any)) : ({} as any));
        
        const clients = clientJson.docs || clientJson.data || [];
        const investors = investorJson.docs || investorJson.data || [];
        const incubators = incubatorJson.docs || incubatorJson.data || [];
        
        setCounts({
          clients: clients.length,
          investors: investors.length,
          incubators: incubators.length
        });
      } catch (e) {
        console.error('Failed to load counts:', e);
      }
    };
    loadCounts();
  }, []);

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
              <span className="font-semibold">{record.investor_name || record.firm_name || record.name || record.company || record.fund_name || record.organization || record.investor || record.fund || 'Investor'}</span>
            ),
          },
          {
            title: "Partner",
            key: "partner",
            render: (record: any) => (
              <div className="font-medium">{record.partner_name || record.contact_name || record.name || record.first_name || record.contact || record.partner || record.person || 'Partner'}</div>
            ),
          },
          {
            title: "Partner Email",
            key: "partnerEmail",
            render: (record: any) => (
              <span className="text-sm text-gray-700">{record.partner_email || record.email || record.contact_email || record.work_email || record.gmail || record.mail || 'email@example.com'}</span>
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
                const fallback = record.fund_type ?? record.fundType ?? record.fund_category ?? record.vertical ?? record.industry ?? record.sector;
                if (fallback && typeof fallback === 'string') {
                  list = fallback.split(/[,;\/]+/).map((s: string) => s.trim()).filter(Boolean);
                }
              }
              if (!list.length) {
                const stage = record.fund_stage ?? record.stage ?? record.investment_stage;
                if (stage && typeof stage === 'string') {
                  list = [stage];
                }
              }
              if (!list.length) list = ['General'];
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
              <span className="font-semibold">{record.incubatorName || record.name || record.company_name || 'Unknown Incubator'}</span>
            ),
          },
          {
            title: "Partner",
            key: "partner",
            render: (record: any) => (
              <div className="font-medium">{record.partnerName || record.contact_name || record.name || 'Unknown Partner'}</div>
            ),
          },
          {
            title: "Partner Email",
            key: "partnerEmail",
            render: (record: any) => (
              <span className="text-sm text-gray-700">{record.partnerEmail || record.email || record.contact_email || 'No Email'}</span>
            ),
          },
          {
            title: "Focus",
            key: "focus",
            render: (record: any) => {
              const raw = record.sectorFocus ?? record.sector_focus ?? record.focus ?? record.sectors ?? record.industry ?? record.sector;
              let list = Array.isArray(raw)
                ? raw
                : typeof raw === "string"
                ? raw.split(/[,;]+/).map((s) => s.trim()).filter(Boolean)
                : [];
              if (!list.length) {
                const stage = record.stage ?? record.fund_stage ?? record.investment_stage;
                if (stage) list = [stage];
              }
              if (!list.length) list = ['General'];
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

      <Card title="Match" extra={
        <div className="flex gap-4 text-sm">
          <span>Clients: <strong>{counts.clients}</strong></span>
          <span>Investors: <strong>{counts.investors}</strong></span>
          <span>Incubators: <strong>{counts.incubators}</strong></span>
        </div>
      }>
        <div className="mb-4 flex gap-3 items-center justify-center">
          <span className="text-sm text-gray-600">Match clients with:</span>
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
        <div className="text-center mb-4">
          <Button
            type="primary"
            style={{ backgroundColor: '#1677ff', borderColor: '#1677ff', color: '#fff' }}
            loading={ruleLoading}
            onClick={async () => {
              try {
                setRuleLoading(true);
                // Fetch clients and investors/incubators
                const [clientRes, dataRes] = await Promise.all([
                  fetch(`${BACKEND_URL}/api/clients?limit=100000&page=1`, { cache: 'no-store' }).catch(() => null),
                  fetch(mode === 'investor' ? `${BACKEND_URL}/api/investors?limit=100000&page=1` : `${BACKEND_URL}/api/incubators`, { cache: 'no-store' })
                ]);
                
                const clientJson = await (clientRes ? clientRes.json().catch(() => ({} as any)) : ({} as any));
                const dataJson = await dataRes.json().catch(() => ({} as any));
                
                const clients = clientJson.docs || clientJson.data || [];
                const docs = dataJson.docs || dataJson.data || [];
                
                // Fetch incubators count for display
                const incubatorRes = await fetch(`${BACKEND_URL}/api/incubators`, { cache: 'no-store' }).catch(() => null);
                const incubatorJson = await (incubatorRes ? incubatorRes.json().catch(() => ({} as any)) : ({} as any));
                const incubators = incubatorJson.docs || incubatorJson.data || [];
                
                setCounts({
                  clients: clients.length,
                  investors: mode === 'investor' ? docs.length : counts.investors,
                  incubators: mode === 'incubator' ? docs.length : incubators.length
                });
                
                console.log('Clients found:', clients.length, 'Data found:', docs.length);
                
                // Remove duplicates
                const uniqueDocs = docs.filter((item: any, index: number, arr: any[]) => {
                  const key = mode === 'investor' 
                    ? (item.partner_email || item.investor_name || item.firm_name)
                    : (item.partnerEmail || item.incubatorName || item.name);
                  return arr.findIndex((other: any) => {
                    const otherKey = mode === 'investor'
                      ? (other.partner_email || other.investor_name || other.firm_name)
                      : (other.partnerEmail || other.incubatorName || other.name);
                    return key === otherKey;
                  }) === index;
                });
                
                // Use first client for matching or create default
                const client = clients[0] || { industry: 'fintech', fund_stage: 'seed', city: 'us', investment_ask: 500000 };
                console.log('Using client for matching:', client);
                
                const scored = uniqueDocs.map((row: any) => {
                  let matchCount = 0;
                  const totalCriteria = 4; // Always check 4 criteria
                  
                  if (mode === 'investor') {
                    // Industry/Sector match (25 points)
                    const investorSectors = (row.sector_focus || row.sectorFocus || row.focus || row.fund_focus || row.sectors || row.industry || '').toLowerCase();
                    if (client.industry && investorSectors.includes(client.industry.toLowerCase())) matchCount++;
                    
                    // Stage match (25 points) 
                    const investorStage = (row.fund_stage || row.stage || row.investment_stage || '').toLowerCase();
                    if (client.fund_stage && investorStage.includes(client.fund_stage.toLowerCase())) matchCount++;
                    
                    // Location match (25 points)
                    const investorLocation = (row.location || row.geography || row.region || '').toLowerCase();
                    if (client.city && (investorLocation.includes(client.city.toLowerCase()) || investorLocation.includes('global') || investorLocation.includes('worldwide'))) matchCount++;
                    
                    // Investment amount match (25 points)
                    const checkSize = (row.check_size || row.checkSize || row.investment_range || '').toLowerCase();
                    if (client.investment_ask) {
                      const askAmount = client.investment_ask;
                      if ((askAmount <= 500000 && (checkSize.includes('500k') || checkSize.includes('seed'))) || 
                          (askAmount <= 1000000 && (checkSize.includes('1m') || checkSize.includes('series a'))) ||
                          (askAmount >= 1000000 && (checkSize.includes('2m') || checkSize.includes('series b')))) matchCount++;
                    }
                  } else {
                    // Incubator matching
                    const incubatorSectors = (row.sectorFocus || row.sector_focus || row.focus || row.sectors || row.industry || '').toLowerCase();
                    if (client.industry && incubatorSectors.includes(client.industry.toLowerCase())) matchCount++;
                    
                    const incubatorStage = (row.stage || row.fund_stage || row.investment_stage || '').toLowerCase();
                    if (client.fund_stage && incubatorStage.includes(client.fund_stage.toLowerCase())) matchCount++;
                    
                    const incubatorLocation = (row.location || row.geography || row.region || '').toLowerCase();
                    if (client.city && (incubatorLocation.includes(client.city.toLowerCase()) || incubatorLocation.includes('global') || incubatorLocation.includes('worldwide'))) matchCount++;
                    
                    const fundingRange = (row.fundingRange || row.funding_range || row.investment_range || '').toLowerCase();
                    if (client.investment_ask && (fundingRange.includes(client.investment_ask.toString().toLowerCase()) || fundingRange.includes('seed') || fundingRange.includes('early'))) matchCount++;
                  }
                  
                  const score = Math.round((matchCount / totalCriteria) * 100);
                  return { ...row, matchScore: score };
                });
                
                // Sort by score descending (highest first), then by name
                scored.sort((a: any, b: any) => {
                  const scoreA = a.matchScore || 0;
                  const scoreB = b.matchScore || 0;
                  if (scoreB !== scoreA) return scoreB - scoreA;
                  const nameA = (mode === 'investor' ? (a.investor_name || a.firm_name) : (a.incubatorName || a.name)) || '';
                  const nameB = (mode === 'investor' ? (b.investor_name || b.firm_name) : (b.incubatorName || b.name)) || '';
                  return nameA.localeCompare(nameB);
                });
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
            Match with Clients
          </Button>
        </div>

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

