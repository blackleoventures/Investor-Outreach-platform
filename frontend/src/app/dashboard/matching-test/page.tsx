"use client";

import { useState, useEffect } from "react";
import { Card, Tabs, Typography, Button, Input, Select, Slider, Table, Tag, Badge, Space, message, Progress, Row, Col } from "antd";
import { ExperimentOutlined, RobotOutlined, BarChartOutlined, SettingOutlined, PlayCircleOutlined } from "@ant-design/icons";
import dynamic from "next/dynamic";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// Dynamic imports for better performance
const InvestorMatcher = dynamic(() => import("@/components/InvestorMatcher"), { ssr: false });


export default function MatchingTestPage() {
  const [activeTab, setActiveTab] = useState("1");
  const [matchingResults, setMatchingResults] = useState([]);
  const [testParams, setTestParams] = useState({
    sector: "Technology",
    stage: "Series A",
    checkSize: [500000, 2000000],
    location: "San Francisco",
    teamSize: 10,
    revenue: 100000,
    growthRate: 20
  });
  const [runningTest, setRunningTest] = useState(false);
  const [testHistory, setTestHistory] = useState([]);

  // Mock matching results for demonstration
  useEffect(() => {
    setMatchingResults([
      {
        id: 1,
        investorName: "Tech Ventures Fund",
        contactPerson: "John Smith",
        email: "john@techventures.com",
        matchScore: 95,
        sectorAlignment: 100,
        stageAlignment: 90,
        checkSizeFit: 95,
        locationMatch: 100,
        lastContact: "2024-01-15",
        status: "high-priority"
      },
      {
        id: 2,
        investorName: "Growth Capital Partners",
        contactPerson: "Sarah Johnson",
        email: "sarah@growthcapital.com",
        matchScore: 87,
        sectorAlignment: 85,
        stageAlignment: 95,
        checkSizeFit: 80,
        locationMatch: 90,
        lastContact: "2024-01-10",
        status: "medium-priority"
      },
      {
        id: 3,
        investorName: "Early Stage Ventures",
        contactPerson: "Mike Chen",
        email: "mike@earlystage.com",
        matchScore: 78,
        sectorAlignment: 70,
        stageAlignment: 100,
        checkSizeFit: 75,
        locationMatch: 85,
        lastContact: "2024-01-05",
        status: "low-priority"
      }
    ]);
  }, []);

  const runMatchingTest = async () => {
    setRunningTest(true);
    message.info("Running AI matching algorithm...");
    
    // Simulate API call delay
    setTimeout(() => {
      const newTest = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        params: { ...testParams },
        results: matchingResults.length,
        topScore: Math.max(...matchingResults.map(r => r.matchScore)),
        avgScore: Math.round(matchingResults.reduce((sum, r) => sum + r.matchScore, 0) / matchingResults.length)
      };
      
      setTestHistory([newTest, ...testHistory]);
      setRunningTest(false);
      message.success(`Matching test completed! Found ${matchingResults.length} potential investors.`);
    }, 2000);
  };

  const getPriorityColor = (status) => {
    switch (status) {
      case 'high-priority': return 'success';
      case 'medium-priority': return 'warning';
      case 'low-priority': return 'default';
      default: return 'default';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'success';
    if (score >= 80) return 'warning';
    return 'error';
  };

  const columns = [
    {
      title: 'Match Score',
      dataIndex: 'matchScore',
      key: 'matchScore',
      render: (score) => (
        <Badge 
          count={`${score}%`} 
          style={{ 
            backgroundColor: getScoreColor(score) === 'success' ? '#52c41a' : 
                           getScoreColor(score) === 'warning' ? '#faad14' : '#ff4d4f'
          }}
        />
      ),
      sorter: (a, b) => a.matchScore - b.matchScore,
    },
    {
      title: 'Investor',
      dataIndex: 'investorName',
      key: 'investorName',
      render: (name, record) => (
        <div>
          <div className="font-medium">{name}</div>
          <div className="text-sm text-gray-500">{record.contactPerson}</div>
        </div>
      ),
    },
    {
      title: 'Contact',
      dataIndex: 'email',
      key: 'email',
      render: (email) => <Text copyable>{email}</Text>,
    },
    {
      title: 'Alignment Scores',
      key: 'alignment',
      render: (_, record) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Text className="text-xs">Sector: {record.sectorAlignment}%</Text>
            <Progress percent={record.sectorAlignment} size="small" showInfo={false} />
          </div>
          <div className="flex items-center gap-2">
            <Text className="text-xs">Stage: {record.stageAlignment}%</Text>
            <Progress percent={record.stageAlignment} size="small" showInfo={false} />
          </div>
        </div>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getPriorityColor(status)}>
          {status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" type="primary">Contact</Button>
          <Button size="small">View Profile</Button>
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: "1",
      label: (
        <span>
          <ExperimentOutlined />
          Matching Algorithm Test
        </span>
      ),
      children: (
        <div className="space-y-6">
          <Card title="🧪 Test Matching Algorithm" className="shadow-lg">
            <Row gutter={24}>
              <Col span={12}>
                <div className="space-y-4">
                  <div>
                    <Text strong>Sector</Text>
                    <Select
                      value={testParams.sector}
                      onChange={(value) => setTestParams({...testParams, sector: value})}
                      style={{ width: '100%', marginTop: 8 }}
                    >
                      <Option value="Technology">Technology</Option>
                      <Option value="SaaS">SaaS</Option>
                      <Option value="Fintech">Fintech</Option>
                      <Option value="Healthcare">Healthcare</Option>
                      <Option value="E-commerce">E-commerce</Option>
                    </Select>
                  </div>
                  
                  <div>
                    <Text strong>Investment Stage</Text>
                    <Select
                      value={testParams.stage}
                      onChange={(value) => setTestParams({...testParams, stage: value})}
                      style={{ width: '100%', marginTop: 8 }}
                    >
                      <Option value="Seed">Seed</Option>
                      <Option value="Series A">Series A</Option>
                      <Option value="Series B">Series B</Option>
                      <Option value="Series C">Series C</Option>
                    </Select>
                  </div>

                  <div>
                    <Text strong>Check Size Range</Text>
                    <div className="mt-2">
                      <Slider
                        range
                        min={100000}
                        max={10000000}
                        step={100000}
                        value={testParams.checkSize}
                        onChange={(value) => setTestParams({...testParams, checkSize: value})}
                        tipFormatter={(value) => `$${(value/1000000).toFixed(1)}M`}
                      />
                    </div>
                  </div>
                </div>
              </Col>
              
              <Col span={12}>
                <div className="space-y-4">
                  <div>
                    <Text strong>Location</Text>
                    <Select
                      value={testParams.location}
                      onChange={(value) => setTestParams({...testParams, location: value})}
                      style={{ width: '100%', marginTop: 8 }}
                    >
                      <Option value="San Francisco">San Francisco</Option>
                      <Option value="New York">New York</Option>
                      <Option value="Boston">Boston</Option>
                      <Option value="Austin">Austin</Option>
                      <Option value="Remote">Remote</Option>
                    </Select>
                  </div>

                  <div>
                    <Text strong>Team Size</Text>
                    <Slider
                      min={1}
                      max={100}
                      value={testParams.teamSize}
                      onChange={(value) => setTestParams({...testParams, teamSize: value})}
                      tipFormatter={(value) => `${value} people`}
                    />
                  </div>

                  <div>
                    <Text strong>Monthly Revenue</Text>
                    <Slider
                      min={0}
                      max={1000000}
                      step={10000}
                      value={testParams.revenue}
                      onChange={(value) => setTestParams({...testParams, revenue: value})}
                      tipFormatter={(value) => `$${(value/1000).toFixed(0)}K`}
                    />
                  </div>
                </div>
              </Col>
            </Row>

            <div className="mt-6 text-center">
              <Button 
                type="primary" 
                size="large" 
                icon={<PlayCircleOutlined />}
                onClick={runMatchingTest}
                loading={runningTest}
              >
                🚀 Run Matching Test
              </Button>
            </div>
          </Card>

          {matchingResults.length > 0 && (
            <Card title="📊 Matching Results" className="shadow-lg">
              <Table
                columns={columns}
                dataSource={matchingResults}
                rowKey="id"
                pagination={false}
                size="small"
              />
            </Card>
          )}
        </div>
      ),
    },
    {
      key: "2",
      label: (
        <span>
          <RobotOutlined />
          AI Matching Engine
        </span>
      ),
      children: (
        <div className="space-y-6">
          <Card title="🤖 AI-Powered Matching Engine" className="shadow-lg">
            <div className="mb-4">
              <Text>
                Our advanced AI algorithm analyzes multiple factors to find the best investor matches:
              </Text>
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                <li>• Sector alignment and expertise</li>
                <li>• Investment stage preferences</li>
                <li>• Check size compatibility</li>
                <li>• Geographic considerations</li>
                <li>• Team and traction fit</li>
                <li>• Historical investment patterns</li>
              </ul>
            </div>
            <InvestorMatcher />
          </Card>
        </div>
      ),
    },
    {
      key: "3",
      label: (
        <span>
          <BarChartOutlined />
          Test History
        </span>
      ),
      children: (
        <div className="space-y-6">
          <Card title="📈 Test History & Analytics" className="shadow-lg">
            {testHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <BarChartOutlined className="text-4xl mb-2" />
                <p>No tests run yet. Run your first matching test to see results here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {testHistory.map((test) => (
                  <Card key={test.id} size="small" className="bg-gray-50">
                    <div className="flex justify-between items-center">
                      <div>
                        <Text strong>Test #{test.id}</Text>
                        <div className="text-sm text-gray-500">
                          {new Date(test.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-600">{test.results} matches</div>
                        <div className="text-sm text-gray-500">
                          Top: {test.topScore}% | Avg: {test.avgScore}%
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </div>
      ),
    },

  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <Title level={1} className="text-3xl font-bold text-gray-800 mb-2">
          🧪 Matching Algorithm Test
        </Title>
        <Text className="text-lg text-gray-600">
          Test and optimize our AI-powered investor matching algorithm with different parameters
        </Text>
      </div>

      <Card className="shadow-xl">
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab} 
          items={tabItems}
          size="large"
          type="card"
        />
      </Card>
    </div>
  );
}