"use client";

import { useState, useEffect } from "react";
import { Card, Tabs, Typography, Button, Input, Table, Tag, Badge, Space, message, Spin } from "antd";
import { UserOutlined, SearchOutlined, FilterOutlined, StarOutlined, MailOutlined, EyeOutlined, PlusOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";

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
  const [matches, setMatches] = useState<any[]>([]);
  const [selectedMatches, setSelectedMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [campaignId, setCampaignId] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [stage, setStage] = useState<string>('');
  const [location, setLocation] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCampaignId(params.get('campaignId') || '');
    setClientName(params.get('clientName') || '');
    setStage(params.get('stage') || '');
    setLocation(params.get('location') || '');
    
    if (params.get('campaignId')) {
      loadMatches();
    }
  }, []);

  const loadMatches = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/campaign/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sector: 'SaaS',
          stage: stage || 'Seed',
          location: location || 'US',
          amount: '1M'
        })
      });
      
      const result = await response.json();
      if (result.success) {
        setMatches(result.matches);
      }
    } catch (error) {
      message.error('Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMatch = (match: any, selected: boolean) => {
    if (selected) {
      setSelectedMatches([...selectedMatches, match]);
    } else {
      setSelectedMatches(selectedMatches.filter(m => m.id !== match.id));
    }
  };

  const handleNext = async () => {
    if (selectedMatches.length === 0) {
      message.warning('Please select at least one match');
      return;
    }

    try {
      // Update campaign with selected audience
      const response = await fetch(`/api/campaign/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience: selectedMatches,
          recipients: selectedMatches.length
        })
      });

      if (response.ok) {
        // Update campaign with audience in localStorage
        const campaigns = JSON.parse(localStorage.getItem('campaigns') || '[]');
        const index = campaigns.findIndex(c => c.id === campaignId);
        if (index !== -1) {
          campaigns[index].recipients = selectedMatches.length;
          campaigns[index].audience = selectedMatches;
          localStorage.setItem('campaigns', JSON.stringify(campaigns));
        }
        
        message.success(`${selectedMatches.length} matches selected!`);
        window.location.href = `/dashboard/campaign/email-form?campaignId=${campaignId}&clientName=${clientName}&location=${location}`;
      }
    } catch (error) {
      message.error('Failed to update campaign');
    }
  };



  const getScoreColor = (score: number) => {
    if (score >= 90) return '#52c41a';
    if (score >= 80) return '#faad14';
    return '#ff4d4f';
  };

  const columns = [
    {
      title: 'Select',
      key: 'select',
      render: (_: any, record: any) => (
        <input
          type="checkbox"
          onChange={(e) => handleSelectMatch(record, e.target.checked)}
          checked={selectedMatches.some(m => m.id === record.id)}
        />
      ),
    },
    {
      title: 'Score',
      dataIndex: 'score',
      key: 'score',
      render: (score: number) => (
        <Badge 
          count={score} 
          style={{ backgroundColor: getScoreColor(score) }}
        />
      ),
      sorter: (a: any, b: any) => b.score - a.score,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email: string) => <Text copyable>{email}</Text>,
    },
    {
      title: 'Focus',
      dataIndex: 'focus',
      key: 'focus',
    },
    {
      title: 'Stage',
      dataIndex: 'stage',
      key: 'stage',
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
    },
  ];





  return (
    <div className="p-6">
      <Card title="🎯 Matchmaking" className="max-w-6xl mx-auto">
        <div className="mb-4">
          <Text>Campaign: <strong>{clientName}_{stage}_Outreach</strong></Text>
          <br />
          <Text type="secondary">Location: <strong>{location}</strong></Text>
        </div>
        
        <Table
          loading={loading}
          dataSource={matches}
          columns={columns}
          rowKey="id"
          pagination={false}
        />
        
        <div className="mt-6 flex justify-between items-center">
          <div className="flex gap-2 items-center">
            <Text>Selected: <strong>{selectedMatches.length}</strong> matches</Text>
            <Button size="small" onClick={() => router.push('/dashboard/all-reports')}>View Reports</Button>
          </div>
          <Button type="primary" size="large" onClick={handleNext} disabled={selectedMatches.length === 0}>
            Next: Email Template →
          </Button>
        </div>
      </Card>
    </div>
  );
}