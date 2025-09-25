"use client";

import React, { useState, useEffect } from "react";
import { Card, Button, Table, Select, Form, message, Tag } from "antd";
import { Checkbox, Dropdown } from "antd";
import { scoreInvestorMatch, scoreIncubatorMatch, type ClientProfile } from "@/lib/matching";

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL as string) || "/api";
const apiBase = BACKEND_URL.startsWith("http") ? `${BACKEND_URL}/api` : BACKEND_URL;

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
  const [selectedInvestors, setSelectedInvestors] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  // New state: clients & selection + filters
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [campaignId, setCampaignId] = useState<string>("");
  const [matchFilters, setMatchFilters] = useState<{ sector: boolean; stage: boolean; location: boolean; amount: boolean }>({ sector: false, stage: false, location: false, amount: false });

  // Helper to read values with broad fallbacks (case-insensitive keys supported)
  const getValue = (obj: any, keys: string[]): any => {
    if (!obj) return undefined;
    const lowerMap: Record<string, any> = {};
    for (const k of Object.keys(obj)) lowerMap[k.toLowerCase()] = (obj as any)[k];
    for (const key of keys) {
      const val = lowerMap[key.toLowerCase()];
      if (val != null && String(val).toString().trim() !== '') return val;
    }
    return undefined;
  };

  // Infer an email by scanning all primitive values for an '@'
  const inferEmail = (obj: any): string | undefined => {
    if (!obj) return undefined;
    const tryVal = (v: any) => {
      const s = String(v || '').trim();
      if (s.includes('@') && s.length <= 120) return s;
      return undefined;
    };
    for (const key of Object.keys(obj)) {
      const v = (obj as any)[key];
      if (typeof v === 'string') {
        const found = tryVal(v);
        if (found) return found;
      }
    }
    return undefined;
  };

  // Infer a displayable name from typical name fields or any short alphabetic string
  const inferName = (obj: any): string | undefined => {
    const first = getValue(obj, ['first_name','firstname','given_name','first']);
    const last = getValue(obj, ['last_name','lastname','surname','last']);
    if (first || last) return [first, last].filter(Boolean).join(' ').trim() || undefined;

    const candidate = getValue(obj, ['contact_name','person','owner','manager','ceo','founder']);
    if (candidate) return String(candidate);

    // Fallback: scan for a short alphabetic token that's not an email
    for (const key of Object.keys(obj)) {
      const val = (obj as any)[key];
      if (typeof val === 'string') {
        const s = val.trim();
        if (s && !s.includes('@') && /[a-zA-Z]/.test(s) && s.length <= 40) {
          return s;
        }
      }
    }
    return undefined;
  };

  // Infer a person name from the email local-part (e.g., john.doe@ → John Doe)
  const inferPersonFromEmail = (email?: string): string | undefined => {
    if (!email) return undefined;
    const local = String(email).split('@')[0] || '';
    const cleaned = local.replace(/[_.-]+/g, ' ').trim();
    if (!cleaned) return undefined;
    return cleaned.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  // Infer stage by scanning all string fields for common stage keywords
  const inferStage = (obj: any): string | undefined => {
    const text = Object.values(obj).filter(v => typeof v === 'string').join(' ').toLowerCase();
    if (!text) return undefined;
    if (/(pre\s*seed|preseed)/.test(text)) return 'Pre-Seed';
    if (/seed/.test(text)) return 'Seed';
    if (/(series\s*a|series-a)/.test(text)) return 'Series A';
    if (/(series\s*b|series-b)/.test(text)) return 'Series B';
    if (/(series\s*c|series-c)/.test(text)) return 'Series C';
    if (/growth|late|pre-ipo|ipo/.test(text)) return 'Growth';
    return undefined;
  };

  // Attempt to extract focus sectors by scanning description-like fields
  const inferFocus = (obj: any): string[] => {
    const candidates = [
      getValue(obj, ['description','about','notes','summary','bio','thesis','areas','area_focus','categories','category','tags']),
    ].filter(Boolean);
    const text = String(candidates.join(', ')).toLowerCase();
    if (!text) return [];
    const sectors = ['fintech','saas','healthcare','ai','ml','edtech','ecommerce','mobility','cleantech','biotech','deeptech','gaming','cybersecurity','devtools','cloud'];
    const found = sectors.filter(s => text.includes(s));
    return Array.from(new Set(found)).slice(0, 2);
  };

  const loadClients = async () => {
    try {
      // Offline mode: use localStorage
      const localClients = JSON.parse(localStorage.getItem('clients') || '[]');
      setClients(Array.isArray(localClients) ? localClients : []);
      setCounts((c) => ({ ...c, clients: Array.isArray(localClients) ? localClients.length : 0 }));
    } catch (e) {
      setClients([]);
      setCounts((c) => ({ ...c, clients: 0 }));
    }
  };

  // Load counts on component mount
  React.useEffect(() => {
    loadClients();

    // read campaignId from URL if present
    try {
      const params = new URLSearchParams(window.location.search);
      setCampaignId(params.get('campaignId') || "");
    } catch {}

    // Auto-refresh clients on window focus
    const onFocus = () => { loadClients(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // Build a normalized client profile for scoring
  const buildClientProfile = (client: any): ClientProfile => {
    const sector = client?.industry || client?.sector || "";
    const stage = client?.fund_stage || client?.stage || "";
    const location = client?.location || "";
    const fundingAmount = client?.investment_ask?.toString?.() || client?.fundingAmount || "";
    return { sector, stage, location, fundingAmount };
  };

  const runRuleMatching = async () => {
    try {
      setRuleLoading(true);
      
      // Try to fetch real data from API
      let docs = [];
      try {
        const dataRes = await fetch(mode === 'investor' ? `${apiBase}/investors?limit=100000&page=1` : `${apiBase}/incubators`, { cache: 'no-store' });
        const dataJson = await dataRes.json().catch(() => ({} as any));
        docs = dataJson.docs || dataJson.data || [];
      } catch (apiError) {
        console.log('API failed, using mock data');
      }
      
      // If no real data, use mock data
      if (!docs || docs.length === 0) {
        docs = [
          {
            investor_name: "TechVentures Capital",
            partner_name: "John Smith", 
            partner_email: "john@techventures.com",
            fund_stage: "Seed, Series A",
            sector_focus: "SaaS, Fintech",
            location: "San Francisco, CA"
          },
          {
            investor_name: "Innovation Partners",
            partner_name: "Sarah Johnson",
            partner_email: "sarah@innovation.com", 
            fund_stage: "Seed",
            sector_focus: "AI, Healthcare",
            location: "New York, NY"
          }
        ];
      }

      // Choose client for scoring
      const chosenClient = selectedClientId
        ? clients.find((c) => String(c._id || c.id || c.email || (c.company_name && c.company_name.replace(/\s+/g, '-'))) === String(selectedClientId))
        : (clients[0] || null);
      
      if (!chosenClient) {
        message.warning('No client found to match against');
        setRuleResults([]);
        return;
      }
      
      const client = buildClientProfile(chosenClient);

      // Score each investor/incubator
      const scored = docs.map((row: any) => {
        const result = mode === 'investor'
          ? scoreInvestorMatch(client, row)
          : scoreIncubatorMatch(client, row as any);
        const { score, breakdown } = result as any;
        const flags = {
          sector: (breakdown?.sector || 0) > 0,
          stage: (breakdown?.stage || 0) > 0,
          location: (breakdown?.location || 0) > 0,
          amount: (breakdown?.amount || 0) > 0,
        };
        const satisfied = (
          (matchFilters.sector && flags.sector ? 1 : 0) +
          (matchFilters.stage && flags.stage ? 1 : 0) +
          (matchFilters.location && flags.location ? 1 : 0) +
          (matchFilters.amount && flags.amount ? 1 : 0)
        );
        return { ...row, matchScore: Math.round(score), __flags: flags, __satisfied: satisfied };
      });

      // Sort by score
      scored.sort((a: any, b: any) => {
        if ((b.__satisfied ?? 0) !== (a.__satisfied ?? 0)) return (b.__satisfied ?? 0) - (a.__satisfied ?? 0);
        const scoreDiff = (b.matchScore || 0) - (a.matchScore || 0);
        if (scoreDiff !== 0) return scoreDiff;
        const nameA = (mode === 'investor' ? (a.investor_name || a.firm_name || a.fund_name || a.organization || a.company || a.name) : (a.incubatorName || a.name)) || '';
        const nameB = (mode === 'investor' ? (b.investor_name || b.firm_name || b.fund_name || b.organization || b.company || b.name) : (b.incubatorName || b.name)) || '';
        return nameA.localeCompare(nameB);
      });

      setRuleResults(scored.map(({ __flags, __satisfied, ...rest }: any) => rest));
      setSelectedInvestors([]);
      const matchedCount = scored.filter((r: any) => Math.round(r.matchScore ?? r.score ?? 0) > 0).length;
      message.success(`Matched ${matchedCount} of ${docs.length} ${mode === 'investor' ? 'investors' : 'incubators'}`);
    } catch (e) {
      console.error('Match error:', e);
      message.error('Failed to compute matches');
    } finally {
      setRuleLoading(false);
    }
  };

  const columns = [
    {
      title: "#",
      key: "serial",
      width: 60,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    {
      title: "Name",
      key: "investor",
      render: (record: any) => {
        const firm = getValue(record, ['investor_name','firm_name','fund_name','organization','company','name','investor','fund']) || inferName(record);
        return <span className="font-semibold">{firm || 'Investor'}</span>;
      },
    },
    {
      title: "Partner",
      key: "partner",
      render: (record: any) => {
        const partner = getValue(record, ['partner_name','partnername','partner name','contact_name','contact name','person','partner','contact','owner','manager','ceo','founder']);
        return <span>{partner || '—'}</span>;
      },
    },
    {
      title: "Email",
      key: "partnerEmail",
      render: (record: any) => {
        const email = getValue(record, ['partner_email','email','contact_email','work_email','gmail','mail','partnerEmail','primary_email','workEmail','email_id']) || inferEmail(record);
        return <span className="text-sm text-gray-700">{email || '—'}</span>;
      },
    },
    {
      title: "Focus",
      key: "focus",
      render: (record: any) => {
        let rawPrimary = getValue(record, ['sector_focus','sector focus','sectorFocus','focus','focus_area','focus area','primary_focus','primary focus','fund_focus','sectors','industry','sector','vertical','fund_type','category','areas','area_focus','thesis']);
        if (rawPrimary && typeof rawPrimary === 'object' && !Array.isArray(rawPrimary)) {
          rawPrimary = Object.values(rawPrimary).filter(Boolean).join(', ');
        }
        let list = Array.isArray(rawPrimary)
          ? rawPrimary
          : typeof rawPrimary === "string"
          ? rawPrimary.split(/[,;\/]+/).map((s) => s.trim()).filter(Boolean)
          : [];
        if (!list.length) list = inferFocus(record);
        return (
          <div>
            {list.length ? list.slice(0, 2).map((sector: string, index: number) => (
              <Tag key={index}>{sector}</Tag>
            )) : <span>—</span>}
          </div>
        );
      },
    },
    {
      title: "Stage",
      key: "stage",
      render: (record: any) => {
        let raw = getValue(record, ['fund_stage','stage','investment_stage','current_stage','round','round_preference','stage_preference','preferred_stage']);
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
          raw = Object.values(raw).filter(Boolean);
        }
        let value = Array.isArray(raw) ? raw.filter(Boolean).join(', ') : (raw ? String(raw) : '');
        if (!value) value = inferStage(record) || '—';
        return <span>{value}</span>;
      },
    },
    {
      title: "Location",
      key: "location",
      render: (record: any) => {
        const rawLoc = getValue(record, ['location','geography','region','hq_location','headquarters']);
        const parts = [
          getValue(record, ['city','city_name']),
          getValue(record, ['state_city','state_province','state','stateName']),
          getValue(record, ['country','countryName']),
          rawLoc
        ]
          .filter((p) => !!p && String(p).trim().length > 0)
          .map((p) => String(p));
        const uniq = Array.from(new Set(parts));
        return <span>{uniq.length ? uniq.join(', ') : '—'}</span>;
      },
    },
    {
      title: "Score",
      key: "score",
      width: 100,
      render: (record: any) => Math.round(record.matchScore ?? record.score ?? 0),
      sorter: (a: any, b: any) => (Math.round(a.matchScore ?? a.score ?? 0)) - (Math.round(b.matchScore ?? b.score ?? 0)),
      defaultSortOrder: 'descend' as const,
    },
  ];

  const filterDropdown = (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 w-64">
      <div className="mb-2 font-medium text-gray-700">Filters</div>
      <div className="flex flex-col gap-2">
        <Checkbox checked={matchFilters.sector} onChange={(e) => setMatchFilters((f) => ({ ...f, sector: e.target.checked }))}>Sector match</Checkbox>
        <Checkbox checked={matchFilters.stage} onChange={(e) => setMatchFilters((f) => ({ ...f, stage: e.target.checked }))}>Stage match</Checkbox>
        <Checkbox checked={matchFilters.location} onChange={(e) => setMatchFilters((f) => ({ ...f, location: e.target.checked }))}>Location match</Checkbox>
        <Checkbox checked={matchFilters.amount} onChange={(e) => setMatchFilters((f) => ({ ...f, amount: e.target.checked }))}>Amount fit</Checkbox>
      </div>
      <div className="mt-3 text-right">
        <Button size="small" onClick={() => setMatchFilters({ sector: false, stage: false, location: false, amount: false })}>Clear</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card 
        title={
          <div className="flex items-center justify-between w-full">
            <span className="font-semibold">Match</span>
            <div className="flex items-center gap-3">
              <Dropdown dropdownRender={() => filterDropdown} placement="bottomRight" trigger={["click"]}>
                <Button>Filters</Button>
              </Dropdown>
              <Button
                type="primary"
                style={{ backgroundColor: '#1677ff', borderColor: '#1677ff', color: '#fff' }}
                loading={ruleLoading}
                onClick={runRuleMatching}
              >
                Compute Matches
              </Button>
            </div>
          </div>
        }
      >
        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Mode</span>
            <Select
              value={mode}
              onChange={(v) => setMode(v)}
              options={[
                { value: 'investor', label: 'Investors' },
                { value: 'incubator', label: 'Incubators' },
              ]}
              style={{ width: 200 }}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Client</span>
            <Select
              showSearch
              placeholder="Select client"
              value={selectedClientId || undefined}
              onChange={setSelectedClientId}
              optionFilterProp="label"
              style={{ minWidth: 240 }}
              options={clients.map((c) => ({
                value: String(c._id || c.id || c.email || (c.company_name && c.company_name.replace(/\s+/g, '-')) || Math.random()),
                label: c.company_name || c.name || c.company || c.clientName || c.email || 'Client'
              }))}
            />
            <Button onClick={async () => { await loadClients(); message.success('Clients refreshed'); }}>Refresh</Button>
          </div>
        </div>

        {ruleResults.length > 0 && (
          <div>
            <div className="mb-2 flex justify-between items-center">
              <div className="text-sm text-gray-700">
                {(() => {
                  const selected = selectedInvestors.length;
                  const total = ruleResults.length;
                  const matched = ruleResults.filter((r: any) => Math.round(r.matchScore ?? r.score ?? 0) > 0).length;
                  return <span>Selected: <span className="font-semibold">{selected}</span> / Matched: <span className="font-semibold">{matched}</span> / Total: <span className="font-semibold">{total}</span></span>;
                })()}
              </div>
              <Button 
                type="primary" 
                size="large"
                disabled={selectedInvestors.length === 0}
                style={{ 
                  backgroundColor: selectedInvestors.length > 0 ? '#52c41a' : undefined, 
                  borderColor: selectedInvestors.length > 0 ? '#52c41a' : undefined 
                }}
                onClick={async () => {
                  try {
                    const selectedData = selectedInvestors.map(inv => ({
                      id: inv.id || Math.random().toString(),
                      name: mode === 'investor' 
                        ? (getValue(inv, ['investor_name','firm_name','fund_name','organization','company','name']) || 'Investor')
                        : (getValue(inv, ['incubatorName','name','company_name','organization']) || 'Incubator'),
                      email: getValue(inv, ['partner_email','email','contact_email','partnerEmail']) || inferEmail(inv) || ''
                    })).filter(inv => inv.email);
                    
                    if (selectedData.length === 0) {
                      message.error('No valid email addresses found in selected investors');
                      return;
                    }
                    
                    // Get selected client info
                    const chosenClient = selectedClientId
                      ? clients.find((c) => String(c._id || c.id || c.email || (c.company_name && c.company_name.replace(/\s+/g, '-'))) === String(selectedClientId))
                      : (clients[0] || null);
                    
                    const clientName = chosenClient?.company_name || chosenClient?.name || 'Default Client';
                    
                    // Offline mode: Direct to email composer with data in URL
                    const emailList = selectedData.map(inv => inv.email).join(',');
                    const names = selectedData.map(inv => inv.name).join('|');
                    
                    message.success(`${selectedData.length} investors selected for email`);
                    window.location.href = `/dashboard/campaign/ai-email-campaign?emails=${encodeURIComponent(emailList)}&names=${encodeURIComponent(names)}&clientName=${encodeURIComponent(clientName)}`;
                    
                  } catch (error) {
                    console.error('Error processing selected investors:', error);
                    message.error('Failed to process selected investors');
                  }
                }}
              >
                Next Email {selectedInvestors.length > 0 ? `(${selectedInvestors.length})` : ''}
              </Button>
            </div>
            <Table
              rowKey={(r: any, index) => String(index ?? 0)}
              dataSource={ruleResults}
              columns={columns}
              pagination={{ pageSize: pagination.pageSize, current: pagination.current, onChange: (page, pageSize) => setPagination({ current: page, pageSize: pageSize || 10 }) }}
              scroll={{ x: 800 }}
              rowSelection={{
                onChange: (keys, rows) => {
                    setSelectedInvestors(rows);
                },
                selectedRowKeys: selectedInvestors.map((_, index) => String(index)),
              }}
            />
          </div>
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