"use client";

import {
  Card,
  Table,
  Typography,
  Button,
  Tag,
  Statistic,
  Row,
  Col,
  Modal,
  message
} from "antd";
import {
  FileTextOutlined,
  BarChartOutlined,
  DownloadOutlined
} from "@ant-design/icons";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

const { Title, Text } = Typography;

// Prefer explicit backend base URL (matches other pages like AI Email Campaign)
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
// Helper for human-friendly timestamps in UI
function timeAgo(ts?: string) {
  try {
    const past = new Date(ts || new Date());
    const diff = Date.now() - past.getTime();
    const m = Math.floor(diff / (1000 * 60));
    if (m < 60) return `${m} minutes ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} hours ago`;
    const d = Math.floor(h / 24);
    return `${d} days ago`;
  } catch {
    return '';
  }
}

function humanizeFromEmail(email: string) {
  try {
    const local = (email || '').split('@')[0];
    return local
      .replace(/[._-]+/g, ' ')
      .replace(/\d+/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Unknown';
  } catch {
    return 'Unknown';
  }
}

interface Report {
  id: string;
  name: string;
  clientName: string;
  type: string;
  createdAt: string;
  status: string;
  metrics: {
    sent: number;
    delivered: number;
    failed: number;
    opened: number;
    clicked: number;
    replied: number;
    openRate: number;
    clickRate: number;
    responseRate: number;
  };
  recipients: InvestorActivity[];
}

interface InvestorActivity {
  id: string;
  firmName: string;
  contactPerson: string;
  email: string;
  status: 'sent' | 'delivered' | 'failed' | 'bounced';
  opened: boolean;
  openedAt?: string;
  clicked: boolean;
  clickedAt?: string;
  replied: boolean;
  repliedAt?: string;
  lastActivity?: string;
  sector: string;
  location: string;
}

const AllReports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [investorModalVisible, setInvestorModalVisible] = useState(false);
  const [investorSearch, setInvestorSearch] = useState("");
  const searchParams = useSearchParams();
  const campaignId = searchParams.get('campaignId');

  // Track selected report id without retriggering the polling effect
  const selectedReportIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedReportIdRef.current = selectedReport?.id ?? null;
  }, [selectedReport?.id]);

  const columns = [
    {
      title: "Campaign",
      dataIndex: "name",
      key: "name",
      render: (name: string, record: Report) => (
        <div>
          <Text strong style={{ fontSize: '14px' }}>{name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Client: {record.clientName}
          </Text>
        </div>
      ),
    },
    {
      title: "Total Sent",
      key: "totalSent",
      render: (_: any, record: Report) => {
        const metrics = record.metrics;
        return (
          <div style={{ textAlign: 'center' }}>
            <Text strong style={{ fontSize: '16px', color: '#4f46e5' }}>
              {metrics.sent}
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: '11px' }}>
              Emails
            </Text>
          </div>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={status === "completed" ? "green" : status === "active" ? "blue" : "orange"}>
          {(status || '').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => (
        <div>
          <Text style={{ fontSize: '12px' }}>
            {new Date(date).toLocaleDateString()}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {new Date(date).toLocaleTimeString()}
          </Text>
        </div>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: Report) => (
          <Button
            type="primary"
            size="small"
            style={{ backgroundColor: '#4f46e5', borderColor: '#4f46e5', color: '#fff' }}
          icon={<BarChartOutlined />}
          onClick={() => handleViewReport(record)}
          >
          View Report
          </Button>
      ),
    },
  ];

  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
    setDetailModalVisible(true);
  };

  const handleDownloadReport = (report: Report) => {
    const data = report.recipients.map(recipient => ({
      'Name': recipient.firmName,
      'Contacts': recipient.contactPerson,
      'Engaged': recipient.email,
      'Opened': recipient.opened ? `${recipient.contactPerson} (${recipient.openedAt ? new Date(recipient.openedAt).toLocaleDateString() : 'recently'})` : 'No'
    }));

    const csvContent = convertArrayToCSV(data);
    downloadFile(csvContent, `${report.name}_report.csv`, 'text/csv');
    message.success('Report downloaded as CSV');
  };

  const convertArrayToCSV = (data: any[]) => {
    if (!data.length) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header] || '';
        return `"${value.toString().replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Load real-time reports from API and keep modals in sync
  useEffect(() => {
    const loadReports = async () => {
      setLoading(true);
      try {
        // Fetch real campaign data from email tracking API (explicit backend URL)
        const response = await fetch(`${BACKEND_URL}/api/email-tracking/reports`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.campaigns && data.campaigns.length > 0) {
            // Use real API data with actual tracking metrics
            const apiReports = data.campaigns.map((campaign: any) => ({
              id: campaign.id,
              name: campaign.name || campaign.campaignName || 'Campaign',
              clientName: campaign.clientName || 'Client',
              type: 'Email Campaign',
              createdAt: campaign.createdAt || campaign.sentAt || new Date().toISOString(),
              status: campaign.status || 'completed',
              metrics: {
                sent: campaign.metrics?.sent || 0,
                delivered: campaign.metrics?.delivered || 0,
                failed: campaign.metrics?.failed || 0,
                opened: campaign.metrics?.opened || 0,
                clicked: campaign.metrics?.clicked || 0,
                replied: campaign.metrics?.replied || 0,
                openRate: Number(campaign.metrics?.openRate || 0),
                clickRate: Number(campaign.metrics?.clickRate || 0),
                responseRate: Number(campaign.metrics?.responseRate || 0),
              },
              recipients: campaign.recipients || []
            }));
            
            setReports(apiReports);
            // If a report is open, refresh its data from the updated list
            if (selectedReportIdRef.current) {
              const updated = apiReports.find((r: any) => r.id === selectedReportIdRef.current);
              if (updated) setSelectedReport(updated);
          }
        } else {
            // Try to fetch manual investors and create reports from them
            try {
              const investorsResponse = await fetch(`${BACKEND_URL}/api/investors?limit=100000`, {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
              });
              
              if (investorsResponse.ok) {
                const investorsData = await investorsResponse.json();
                const investors = investorsData.docs || investorsData.data || [];
                
                if (investors.length > 0) {
                  // Create a report from manual investors
                  const manualReport: Report = {
                    id: 'manual-investors',
                    name: 'Manual Investors Campaign',
                    clientName: 'All Clients',
                    type: 'Manual Entry',
                    createdAt: new Date().toISOString(),
      status: 'completed',
      metrics: {
                      sent: investors.length,
                      delivered: investors.length,
        failed: 0,
                      opened: 0,
                      clicked: 0,
                      replied: 0,
                      openRate: 0,
                      clickRate: 0,
                      responseRate: 0,
                    },
                    recipients: investors.map((investor: any, idx: number) => ({
                      id: String(investor.id || investor._id || idx),
                      firmName: investor['Investor Name'] || investor.investor_name || investor.name || 
                               (investor.email ? investor.email.split('@')[1]?.split('.')[0] : 'Unknown Firm'),
                      contactPerson: investor['Partner Name'] || investor.partner_name || investor.contact || 
                                    (investor.email ? investor.email.split('@')[0] : 'Unknown Contact'),
                      email: investor['Partner Email'] || investor.partner_email || investor.email || 'no-email@unknown.com',
                      status: 'sent' as const,
                      opened: false,
                      clicked: false,
                      replied: false,
                      sector: investor['Fund Focus (Sectors)'] || investor.fund_focus_sectors || investor.sector_focus || 'Unknown',
                      location: investor['Location'] || investor.location || 'Unknown',
                    }))
                  };
                  
                  setReports([manualReport]);
                  return;
                }
              }
            } catch (error) {
              console.error('Failed to fetch investors:', error);
            }
            
            // Try localStorage fallback (created after sending emails from composer)
            try {
              const local = JSON.parse(localStorage.getItem('reports') || '[]');
              if (Array.isArray(local) && local.length > 0) {
                const mapped = local.map((r: any) => ({
                  id: String(r.id || r.campaignId || Date.now()),
                  name: r.name || 'Campaign Report',
                  clientName: r.clientName || 'Client',
                  type: r.type || 'Email Campaign',
                  createdAt: r.createdAt || new Date().toISOString(),
                  status: r.status || 'completed',
                  metrics: {
                    sent: r.metrics?.sent || r.sent || (r.recipients?.length || 0) || 0,
                    delivered: r.metrics?.delivered || r.delivered || 0,
                    failed: r.metrics?.failed || r.failed || 0,
                    opened: r.metrics?.opened || 0,
                    clicked: r.metrics?.clicked || 0,
                    replied: r.metrics?.replies || r.metrics?.replied || 0,
                    openRate: r.metrics?.openRate || 0,
                    clickRate: r.metrics?.clickRate || 0,
                    responseRate: r.metrics?.responseRate || 0,
                  },
                  recipients: (r.recipients || []).map((email: string, idx: number) => ({
                    id: String(idx),
                    firmName: (email.split('@')[1] || 'Unknown').split('.')[0],
                    contactPerson: email.split('@')[0],
                    email,
                    status: 'sent',
                    opened: false,
      clicked: false,
      replied: false,
                    sector: 'Unknown',
                    location: 'Unknown',
                  }))
                }));
                setReports(mapped);
              } else {
                setReports([]);
              }
            } catch {
            // No real campaigns found
            setReports([]);
            }
          }
        } else {
          console.error('Failed to fetch campaigns');
          // Try to fetch manual investors directly
          try {
            const investorsResponse = await fetch(`${BACKEND_URL}/api/investors?limit=100000`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
            
            if (investorsResponse.ok) {
              const investorsData = await investorsResponse.json();
              const investors = investorsData.docs || investorsData.data || [];
              
              if (investors.length > 0) {
                // Create a report from manual investors
                const manualReport: Report = {
                  id: 'manual-investors',
                  name: 'Manual Investors Campaign',
                  clientName: 'All Clients',
                  type: 'Manual Entry',
                  createdAt: new Date().toISOString(),
                  status: 'completed',
                  metrics: {
                    sent: investors.length,
                    delivered: investors.length,
                    failed: 0,
                    opened: 0,
                    clicked: 0,
                    replied: 0,
                    openRate: 0,
                    clickRate: 0,
                    responseRate: 0,
                  },
                  recipients: investors.map((investor: any, idx: number) => ({
                    id: String(investor.id || investor._id || idx),
                    firmName: investor['Investor Name'] || investor.investor_name || investor.name || 
                             (investor.email ? investor.email.split('@')[1]?.split('.')[0] : 'Unknown Firm'),
                    contactPerson: investor['Partner Name'] || investor.partner_name || investor.contact || 
                                  (investor.email ? investor.email.split('@')[0] : 'Unknown Contact'),
                    email: investor['Partner Email'] || investor.partner_email || investor.email || 'no-email@unknown.com',
                    status: 'sent' as const,
      opened: false,
      clicked: false,
      replied: false,
                    sector: investor['Fund Focus (Sectors)'] || investor.fund_focus_sectors || investor.sector_focus || 'Unknown',
                    location: investor['Location'] || investor.location || 'Unknown',
                  }))
                };
                
                setReports([manualReport]);
                return;
              }
            }
          } catch (error) {
            console.error('Failed to fetch investors:', error);
          }
          
          // Fallback to localStorage or demo
          try {
            const local = JSON.parse(localStorage.getItem('reports') || '[]');
            if (Array.isArray(local) && local.length > 0) {
              const mapped = local.map((r: any) => ({
                id: String(r.id || r.campaignId || Date.now()),
                name: r.name || 'Campaign Report',
                clientName: r.clientName || 'Client',
                type: r.type || 'Email Campaign',
                createdAt: r.createdAt || new Date().toISOString(),
                status: r.status || 'completed',
                metrics: {
                  sent: r.metrics?.sent || r.sent || (r.recipients?.length || 0) || 0,
                  delivered: r.metrics?.delivered || r.delivered || 0,
                  failed: r.metrics?.failed || r.failed || 0,
                  opened: r.metrics?.opened || 0,
                  clicked: r.metrics?.clicked || 0,
                  replied: r.metrics?.replies || r.metrics?.replied || 0,
                  openRate: r.metrics?.openRate || 0,
                  clickRate: r.metrics?.clickRate || 0,
                  responseRate: r.metrics?.responseRate || 0,
                },
                recipients: (r.recipients || []).map((email: string, idx: number) => ({
                  id: String(idx),
                  firmName: (email.split('@')[1] || 'Unknown').split('.')[0],
                  contactPerson: email.split('@')[0],
                  email,
                  status: 'sent',
                  opened: false,
      clicked: false,
      replied: false,
                  sector: 'Unknown',
                  location: 'Unknown',
                }))
              }));
              setReports(mapped);
              if (selectedReportIdRef.current) {
                const updated = mapped.find((r: any) => r.id === selectedReportIdRef.current);
                if (updated) setSelectedReport(updated);
              }
            } else {
              setReports([]);
            }
          } catch {
            setReports([]);
          }
    }
      } catch (error) {
        console.error('Failed to load reports:', error);
        // Network error fallback
        try {
          const local = JSON.parse(localStorage.getItem('reports') || '[]');
          if (Array.isArray(local) && local.length > 0) {
            const mapped = local.map((r: any) => ({
              id: String(r.id || r.campaignId || Date.now()),
              name: r.name || 'Campaign Report',
              clientName: r.clientName || 'Client',
              type: r.type || 'Email Campaign',
              createdAt: r.createdAt || new Date().toISOString(),
              status: r.status || 'completed',
              metrics: {
                sent: r.metrics?.sent || r.sent || (r.recipients?.length || 0) || 0,
                delivered: r.metrics?.delivered || r.delivered || 0,
                failed: r.metrics?.failed || r.failed || 0,
                opened: r.metrics?.opened || 0,
                clicked: r.metrics?.clicked || 0,
                replied: r.metrics?.replies || r.metrics?.replied || 0,
                openRate: r.metrics?.openRate || 0,
                clickRate: r.metrics?.clickRate || 0,
                responseRate: r.metrics?.responseRate || 0,
              },
              recipients: (r.recipients || []).map((email: string, idx: number) => ({
                id: String(idx),
                firmName: (email.split('@')[1] || 'Unknown').split('.')[0],
                contactPerson: email.split('@')[0],
                email,
                status: 'sent',
      opened: false,
      clicked: false,
      replied: false,
                sector: 'Unknown',
                location: 'Unknown',
              }))
            }));
            setReports(mapped);
            if (selectedReportIdRef.current) {
              const updated = mapped.find((r: any) => r.id === selectedReportIdRef.current);
              if (updated) setSelectedReport(updated);
            }
          } else {
        setReports([]);
          }
        } catch {
          setReports([]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadReports();

    // Auto-refresh every 30 seconds to reflect delivered/opens/clicks/replies
    const interval = setInterval(loadReports, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6">

      {/* Main Reports Table */}
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} className="!mb-0">
            <FileTextOutlined className="mr-2" />
              Campaign Reports - Client Wise Tracking
          </Title>
            {reports.length === 0 && (
              <Button 
                type="primary" 
                onClick={async () => {
                  try {
                    const response = await fetch('/api/campaign-reports/demo', {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                      }
                    });
                    if (response.ok) {
                      message.success('Demo campaign created!');
                      // Reload reports
                      window.location.reload();
                    }
                  } catch (error) {
                    message.error('Failed to create demo campaign');
                  }
                }}
              >
                Create Demo Campaign
              </Button>
            )}
          </div>
        }
      >
        <Table
          columns={columns}
          dataSource={reports}
          loading={loading}
          rowKey="id"
          scroll={{ x: 'max-content' }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total: number) => `Total ${total} reports`,
          }}
          locale={{ emptyText: "No reports found" }}
        />
      </Card>

      {/* Campaign Summary Modal */}
      <Modal
        title={null}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
        footer={[
          <Button
            key="close"
            onClick={() => setDetailModalVisible(false)}
          >
            Close
          </Button>,
          <Button
            key="csv"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => selectedReport && handleDownloadReport(selectedReport)}
            style={{ backgroundColor: '#4f46e5', borderColor: '#4f46e5', color: '#fff' }}
          >
            CSV
          </Button>
        ]}
        width="90%"
        style={{ maxWidth: 900 }}
      >
        {selectedReport && (
          <div style={{ padding: '20px' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <Title level={4} style={{ margin: 0 }}>
                Here is the summary for your campaign:
              </Title>
            </div>

            {/* Campaign Name */}
            <div style={{ marginBottom: '30px' }}>
              <Title level={3} style={{ color: '#4f46e5', margin: 0 }}>
                {selectedReport.clientName}:
              </Title>
            </div>

            {/* Live metrics (moved Engagement into modal) */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
              <Tag color="blue">Opens: {selectedReport.metrics.opened} ({selectedReport.metrics.openRate}%)</Tag>
              <Tag color="purple">Clicks: {selectedReport.metrics.clicked} ({selectedReport.metrics.clickRate}%)</Tag>
              <Tag color="green">Replies: {selectedReport.metrics.replied} ({selectedReport.metrics.responseRate}%)</Tag>
            </div>

            {/* Email Performance Stats */}
            <div style={{ marginBottom: '30px' }}>
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <Card>
                    <Statistic
                      title="Emails Sent"
                      value={selectedReport.metrics.sent}
                      valueStyle={{ color: '#4f46e5' }}
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card>
                    <Statistic
                      title="Delivered"
                      value={selectedReport.metrics.delivered}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card>
                    <Statistic
                      title="Failed"
                      value={selectedReport.metrics.failed}
                      valueStyle={{ color: '#ff4d4f' }}
        />
      </Card>
                </Col>
              </Row>
            </div>

            {/* Stats */}
            <div style={{ fontSize: '16px', lineHeight: '2.5' }}>
              <div style={{ marginBottom: '15px' }}>
                <Text style={{ color: '#666' }}># Investors/Incubators contacted: </Text>
                <Text strong style={{ fontSize: '18px' }}>{selectedReport.metrics.sent}</Text>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <Text style={{ color: '#666' }}># Pending sends: </Text>
                <Text strong style={{ fontSize: '18px' }}>{Math.max((selectedReport.metrics.sent || 0) - (selectedReport.metrics.delivered || 0) - (selectedReport.metrics.failed || 0), 0)}</Text>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <Text style={{ color: '#666' }}># Responses received: </Text>
                <Text strong style={{ fontSize: '18px' }}>{selectedReport.metrics.replied}</Text>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <Text style={{ color: '#666' }}># Emails opened: </Text>
                <Text strong style={{ fontSize: '18px' }}>{selectedReport.metrics.opened}</Text>
              </div>

              <div style={{ marginBottom: '30px' }}>
                <Text style={{ color: '#666' }}># Response Rate: </Text>
                <Text strong style={{ fontSize: '18px' }}>{selectedReport.metrics.responseRate.toFixed(1)} %</Text>
              </div>
            </div>

            {/* View Complete Report Link */}
            <div style={{ marginBottom: '30px' }}>
              <Button
                type="link"
                style={{ padding: 0, fontSize: '16px', color: '#4f46e5' }}
                onClick={() => {
                  setDetailModalVisible(false);
                  setInvestorModalVisible(true);
                }}
              >
                View complete deal report
              </Button>
            </div>

          </div>
        )}
      </Modal>

      {/* Detailed Report Modal */}
      <Modal
        title={null}
        open={investorModalVisible}
        onCancel={() => setInvestorModalVisible(false)}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
        footer={[
          <Button
            key="close"
            onClick={() => setInvestorModalVisible(false)}
          >
            Close
          </Button>,
          <Button
            key="csv"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => selectedReport && handleDownloadReport(selectedReport)}
            style={{ backgroundColor: '#4f46e5', borderColor: '#4f46e5', color: '#fff' }}
          >
            CSV
          </Button>
        ]}
        width="90%"
        style={{ maxWidth: 1400 }}
      >
        {selectedReport && (
          <div style={{ padding: '20px' }}>
            {/* Header with Search */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
              </div>
              <div>
                <Text>Search: </Text>
                <input
                  type="text"
                  placeholder="Search..."
                  value={investorSearch}
                  onChange={(e) => setInvestorSearch(e.target.value)}
                  style={{
                    padding: '4px 8px',
                    border: '1px solid #d9d9d9',
                    borderRadius: '4px',
                    width: '200px'
                  }}
                />
              </div>
            </div>

            {/* Detailed Table */}
            <Table
              columns={[
                {
                  title: 'Investor Name',
                  dataIndex: 'firmName',
                  key: 'investorName',
                  render: (_: any, record: any) => (
                    <span>{record.firmName || record.investorName || humanizeFromEmail(record.email)}</span>
                  ),
                },
                {
                  title: 'Partner Name',
                  dataIndex: 'contactPerson',
                  key: 'partnerName',
                  render: (_: any, record: any) => (
                    <span>{record.contactPerson || record.partnerName || humanizeFromEmail(record.email)}</span>
                  )
                },
                {
                  title: 'Engaged',
                  key: 'engaged',
                  render: (_: any, record: any) => (
                    record.replied ? (
                      <span>{record.contactPerson || humanizeFromEmail(record.email)} ({record.email})</span>
                    ) : <Text type="secondary">No reply</Text>
                  )
                },
                {
                  title: 'Opened',
                  key: 'opened',
                  render: (_: any, record: any) => (
                    record.opened ? (
                      <span>{record.contactPerson || humanizeFromEmail(record.email)} ({record.openedAt ? timeAgo(record.openedAt) : 'just now'})</span>
                    ) : <Text type="secondary">Not opened</Text>
                  ),
                },
              ]}
              dataSource={selectedReport.recipients.filter((r) => {
                const q = investorSearch.trim().toLowerCase();
                if (!q) return true;
                return [r.firmName, r.contactPerson, r.email]
                  .some((v) => (v || '').toLowerCase().includes(q));
              })}
              rowKey="id"
              scroll={{ x: 'max-content' }}
              pagination={{
                pageSize: 10,
                showTotal: (total: number) => `Total ${total} entries`,
                showSizeChanger: true,
                pageSizeOptions: ['10', '25', '50', '100'],
              }}
              size="small"
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default function Page() {
  return <AllReports />;
}

