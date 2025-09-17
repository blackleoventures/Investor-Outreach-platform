"use client";

import { useMemo, useState } from "react";
import { Button, Card, Typography, Table, message, Tag, Space } from "antd";
import { apiFetch, getApiBase } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const { Title } = Typography;

export default function TestInvestors() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [apiFetchData, setApiFetchData] = useState([]);
  const [fetchData, setFetchData] = useState([]);
  const [normalized, setNormalized] = useState([]);

  const testApiFetch = async () => {
    setLoading(true);
    try {
      const response = await apiFetch(`/api/investors?limit=100000&page=1`);
      const result = await response.json();
      const data = result.docs || result.data || [];
      setApiFetchData(data);
      console.log("apiFetch data:", data);
      message.success(`apiFetch loaded ${data.length} investors`);
    } catch (e) {
      console.error("apiFetch error:", e);
      message.error("apiFetch failed");
    } finally {
      setLoading(false);
    }
  };

  const testFetch = async () => {
    setLoading(true);
    try {
      const base = await getApiBase();
      const res = await fetch(`${base}/api/investors?limit=100000&page=1`, { 
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const investors = data.docs || data.data || [];
      setFetchData(investors);
      console.log("fetch data:", investors);
      message.success(`fetch loaded ${investors.length} investors`);
    } catch (e) {
      console.error("fetch error:", e);
      message.error("fetch failed");
    } finally {
      setLoading(false);
    }
  };

  // Same normalization used in Select Investors modal
  const normalizeAll = () => {
    const source = apiFetchData.length ? apiFetchData : fetchData;
    if (!source.length) {
      message.warning("Load investors first (apiFetch or fetch)");
      return;
    }
    const getPickers = (raw:any) => {
      const lowerMap: Record<string, any> = {};
      Object.entries(raw || {}).forEach(([k,v]) => {
        lowerMap[k.toString().trim().toLowerCase()] = v;
      });
      const pick = (...candidates: string[]) => {
        for (const c of candidates) {
          const key = c.toLowerCase();
          if (Object.prototype.hasOwnProperty.call(lowerMap, key)) {
            const val = lowerMap[key];
            if (val != null && val !== '') return val;
          }
        }
        return undefined;
      };
      return { pick };
    };

    const seen = new Set();
    const uniq:any[] = [];
    for (const item of source) {
      const { pick } = getPickers(item);
      const anyEmail = (pick('partner_email','email','partnerEmail','investor_email','contact_email','primary_email','email_id','emailId','emailAddress','e-mail','mail') || '').toString().toLowerCase();
      const key = `${(item.id ?? item._id ?? '').toString()}-${anyEmail}`;
      if (!seen.has(key)) { seen.add(key); uniq.push(item); }
    }

    const out = uniq.map((r:any) => {
      const { pick } = getPickers(r);
      const first = pick('first_name','firstname');
      const last = pick('last_name','lastname');
      const investorName = pick('investor_name','investorname','firm_name','firm','fund_name','fund','organization','organization_name','company','company_name','name','investor');
      const contactName = pick('partner_name','partnername','partner','contact_name','contact','person') || `${first||''} ${last||''}`.trim();
      const email = pick('partner_email','email','partnerEmail','investor_email','contact_email','primary_email','email_id','emailId','emailAddress','e-mail','mail');
      return {
        id: r.id ?? r._id ?? undefined,
        investor_name: investorName,
        partner_name: contactName,
        displayName: investorName || contactName,
        displayEmail: email || undefined,
        raw: r,
      };
    });
    setNormalized(out);
    message.success(`Normalized ${out.length} records`);
    console.log('Normalized sample:', out.slice(0,3));
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: 'Investor Name', dataIndex: 'investor_name', key: 'investor_name', width: 150 },
    { title: 'Partner Name', dataIndex: 'partner_name', key: 'partner_name', width: 150 },
    { title: 'Email', dataIndex: 'partner_email', key: 'partner_email', width: 200 },
    { title: 'Raw Data', key: 'raw', width: 300, render: (_, record) => JSON.stringify(record).substring(0, 100) + '...' },
  ];

  const normColumns = [
    { title: 'Investor Name', dataIndex: 'displayName', key: 'displayName', width: 220 },
    { title: 'Investor Email', dataIndex: 'displayEmail', key: 'displayEmail', width: 260 },
  ];

  const stats = useMemo(() => {
    const total = normalized.length;
    let withName = 0, withEmail = 0;
    for (const r of normalized) {
      if (r.displayName) withName++;
      if (r.displayEmail) withEmail++;
    }
    return { total, withName, withEmail, missingName: total - withName, missingEmail: total - withEmail };
  }, [normalized]);

  return (
    <div className="p-6">
      <Card title={<Title level={4}>Test Investor Data Sources</Title>}>
        <div className="space-y-4">
          <div className="flex gap-4">
            <Button type="primary" onClick={testApiFetch} loading={loading}>
              Test apiFetch (All Investors Page Method)
            </Button>
            <Button onClick={testFetch} loading={loading}>
              Test fetch (Campaign Page Method)
            </Button>
            <Button onClick={normalizeAll}>
              Normalize & Validate (Select Investors logic)
            </Button>
          </div>

          {apiFetchData.length > 0 && (
            <div>
              <Title level={5}>apiFetch Results ({apiFetchData.length} records):</Title>
              <div className="mb-4 p-4 bg-gray-100 rounded">
                <strong>Sample Raw Data:</strong>
                <pre className="text-xs mt-2">{JSON.stringify(apiFetchData[0], null, 2)}</pre>
              </div>
              <Table
                dataSource={apiFetchData.slice(0, 10)}
                columns={columns}
                rowKey={(r) => r.id || r._id || Math.random()}
                pagination={false}
                size="small"
                scroll={{ x: 800 }}
              />
            </div>
          )}

          {fetchData.length > 0 && (
            <div>
              <Title level={5}>fetch Results ({fetchData.length} records):</Title>
              <Table
                dataSource={fetchData.slice(0, 10)}
                columns={columns}
                rowKey={(r) => r.id || r._id || Math.random()}
                pagination={false}
                size="small"
              />
            </div>
          )}

          {normalized.length > 0 && (
            <div>
              <Title level={5}>Normalized View ({normalized.length})</Title>
              <div className="mb-3">
                <Space size="small">
                  <Tag color="blue">Total: {stats.total}</Tag>
                  <Tag color="green">With Name: {stats.withName}</Tag>
                  <Tag color="green">With Email: {stats.withEmail}</Tag>
                  <Tag color="orange">Missing Name: {stats.missingName}</Tag>
                  <Tag color="orange">Missing Email: {stats.missingEmail}</Tag>
                </Space>
              </div>
              <Table
                dataSource={normalized.slice(0, 50)}
                columns={normColumns}
                rowKey={(r:any)=> r.id || r.displayEmail || Math.random()}
                pagination={{ pageSize: 10 }}
                size="small"
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}