"use client";

import { useState, useEffect } from "react";
import { Card, Tabs, Typography, Button, Input, Table, Tag, Badge, Space, message, Spin } from "antd";
import { UserOutlined, SearchOutlined, FilterOutlined, StarOutlined, MailOutlined, EyeOutlined, PlusOutlined } from "@ant-design/icons";
import InvestorMatcher from "../../../components/InvestorMatcher";
import { scoreInvestorMatch, scoreIncubatorMatch } from "@/lib/matching";

const { Title, Text } = Typography;
const { Search } = Input;

// Using direct import to avoid dynamic import factory issues


type InvestorRow = {
  id: number;
  name: string;
  email: string;
  fund: string;
  sector: string;
  stage: string;
  checkSize: string;
  location: string;
  score: number;
  status: 'active' | 'pending' | 'inactive';
  lastContact: string;
};

export default function InvestorManagementPage() {
  const [activeTab, setActiveTab] = useState("1");
  const [investors, setInvestors] = useState<InvestorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredInvestors, setFilteredInvestors] = useState<InvestorRow[]>([]);

  // Mock data for demonstration
  useEffect(() => {
    setInvestors([
      {
        id: 1,
        name: "John Smith",
        email: "john@venturecapital.com",
        fund: "Tech Ventures Fund",
        sector: "Technology",
        stage: "Series A",
        checkSize: "$500K - $2M",
        location: "San Francisco",
        score: 95,
        status: "active",
        lastContact: "2024-01-15"
      },
      {
        id: 2,
        name: "Sarah Johnson",
        email: "sarah@growthpartners.com",
        fund: "Growth Partners",
        sector: "SaaS",
        stage: "Series B",
        checkSize: "$2M - $5M",
        location: "New York",
        score: 87,
        status: "active",
        lastContact: "2024-01-10"
      },
      {
        id: 3,
        name: "Michael Chen",
        email: "michael@earlystage.com",
        fund: "Early Stage Capital",
        sector: "Fintech",
        stage: "Seed",
        checkSize: "$100K - $500K",
        location: "Boston",
        score: 92,
        status: "pending",
        lastContact: "2024-01-05"
      }
    ]);
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = investors.filter(investor =>
        investor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        investor.fund.toLowerCase().includes(searchQuery.toLowerCase()) ||
        investor.sector.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredInvestors(filtered);
    } else {
      setFilteredInvestors(investors);
    }
  }, [searchQuery, investors]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 80) return 'warning';
    return 'error';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      case 'inactive': return 'default';
      default: return 'default';
    }
  };

  const columns = [
    {
      title: 'Score',
      dataIndex: 'score',
      key: 'score',
      render: (score: number) => (
        <Badge 
          count={score} 
          style={{ 
            backgroundColor: getScoreColor(score) === 'success' ? '#52c41a' : 
                           getScoreColor(score) === 'warning' ? '#faad14' : '#ff4d4f'
          }}
        />
      ),
      sorter: (a: InvestorRow, b: InvestorRow) => a.score - b.score,
    },
    {
      title: 'Investor',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: InvestorRow) => (
        <div>
          <div className="font-medium">{name}</div>
          <div className="text-sm text-gray-500">{record.fund}</div>
        </div>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email: string) => <Text copyable>{email}</Text>,
    },
    {
      title: 'Focus',
      key: 'focus',
      render: (_: any, record: InvestorRow) => (
        <div className="space-y-1">
          <Tag color="blue">{record.sector}</Tag>
          <Tag color="green">{record.stage}</Tag>
        </div>
      ),
    },
    {
      title: 'Check Size',
      dataIndex: 'checkSize',
      key: 'checkSize',
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: InvestorRow) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />}>View</Button>
          <Button size="small" icon={<MailOutlined />} type="primary">Contact</Button>
        </Space>
      ),
    },
  ];

  const BestMatchesOverview = () => {
    const [loadingBM, setLoadingBM] = useState(false);
    const [rows, setRows] = useState<any[]>([]);

    const loadData = async () => {
      setLoadingBM(true);
      try {
        // Fetch clients, investors, incubators
        const [cRes, iRes, incRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/clients?limit=100000&page=1`, { cache: 'no-store' }).catch(() => null),
          fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/investors?limit=100000&page=1`, { cache: 'no-store' }).catch(() => null),
          fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/incubators`, { cache: 'no-store' }).catch(() => null),
        ]);

        const clientsJson = await (cRes ? cRes.json().catch(() => ({} as any)) : ({} as any));
        const investorsJson = await (iRes ? iRes.json().catch(() => ({} as any)) : ({} as any));
        const incubatorsJson = await (incRes ? incRes.json().catch(() => ({} as any)) : ({} as any));

        const clients: any[] = clientsJson.docs || clientsJson.data || [
          { companyName: 'TechStartup Inc', stage: 'seed', sector: 'fintech', location: 'us', fundingAmount: '500k' },
          { companyName: 'FinTech Solutions', stage: 'series a', sector: 'fintech', location: 'india', fundingAmount: '700k' },
        ];
        const investorsArr: any[] = investorsJson.docs || investorsJson.data || [];
        const incubatorsArr: any[] = incubatorsJson.docs || incubatorsJson.data || [];

        const computed = clients.map((client) => {
          const scoredInvestors = investorsArr.map((inv) => ({
            item: inv,
            score: scoreInvestorMatch({
              companyName: client.companyName,
              stage: client.stage,
              sector: client.sector,
              location: client.location,
              fundingAmount: client.fundingAmount,
            }, inv).score,
          })).sort((a, b) => b.score - a.score);
          const bestInv = scoredInvestors[0]?.item;
          const bestInvScore = scoredInvestors[0]?.score || 0;

          const scoredIncubators = incubatorsArr.map((inc) => ({
            item: inc,
            score: scoreIncubatorMatch({
              companyName: client.companyName,
              stage: client.stage,
              sector: client.sector,
              location: client.location,
              fundingAmount: client.fundingAmount,
            }, inc).score,
          })).sort((a, b) => b.score - a.score);
          const bestInc = scoredIncubators[0]?.item;
          const bestIncScore = scoredIncubators[0]?.score || 0;

          return {
            client: client.companyName || client.name || 'Client',
            bestInvestor: bestInv?.investor_name || bestInv?.firm_name || bestInv?.name || '—',
            investorScore: bestInvScore,
            bestIncubator: bestInc?.incubatorName || bestInc?.name || '—',
            incubatorScore: bestIncScore,
          };
        });

        setRows(computed);
      } catch (e) {
        message.error('Failed to compute best matches');
      } finally {
        setLoadingBM(false);
      }
    };

    useEffect(() => {
      loadData();
    }, []);

    return (
      <Card title="Best Matches Overview">
        <Table
          loading={loadingBM}
          dataSource={rows}
          rowKey={(r, idx) => String(idx)}
          columns={[
            { title: 'Client', dataIndex: 'client', key: 'client' },
            { title: 'Best Match Investor', dataIndex: 'bestInvestor', key: 'bestInvestor' },
            { title: 'Score', dataIndex: 'investorScore', key: 'investorScore', width: 100 },
            { title: 'Best Match Incubator', dataIndex: 'bestIncubator', key: 'bestIncubator' },
            { title: 'Score', dataIndex: 'incubatorScore', key: 'incubatorScore', width: 100 },
          ]}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    );
  };

  const tabItems = [
    {
      key: "1",
      label: (
        <span>
          <StarOutlined />
          Smart Matching
        </span>
      ),
      children: (
        <div className="space-y-6">
          <Card title="Investor Matching" className="shadow-lg">
            <div className="mb-2" />
            <InvestorMatcher />
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div>
        <InvestorMatcher />
      </div>
    </div>
  );
}