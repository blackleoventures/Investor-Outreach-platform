"use client";

import { useState } from "react";
import { Button, Card, Typography, Table, message } from "antd";
import { apiFetch, getApiBase } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const { Title } = Typography;

export default function TestInvestors() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [apiFetchData, setApiFetchData] = useState([]);
  const [fetchData, setFetchData] = useState([]);

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

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 100 },
    { title: 'Investor Name', dataIndex: 'investor_name', key: 'investor_name' },
    { title: 'Partner Name', dataIndex: 'partner_name', key: 'partner_name' },
    { title: 'Email', dataIndex: 'partner_email', key: 'partner_email' },
    { title: 'Raw Name', key: 'raw_name', render: (_, record) => record.name || '-' },
  ];

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
          </div>

          {apiFetchData.length > 0 && (
            <div>
              <Title level={5}>apiFetch Results ({apiFetchData.length} records):</Title>
              <Table
                dataSource={apiFetchData.slice(0, 10)}
                columns={columns}
                rowKey={(r) => r.id || r._id || Math.random()}
                pagination={false}
                size="small"
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
        </div>
      </Card>
    </div>
  );
}