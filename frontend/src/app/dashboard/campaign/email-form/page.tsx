"use client";

import React, { useState } from "react";
import { Card, Input, Button, Table, Upload, message, Tabs, Progress, Tag, Space, Divider } from "antd";
import { MailOutlined, UserOutlined, BarChartOutlined, UploadOutlined, SendOutlined, ContactsOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";


const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "/api";

export default function EmailFormPage() {
  const [activeTab, setActiveTab] = useState("1");
  const [emailData, setEmailData] = useState({
    subject: "",
    body: "",
    recipients: "",
    campaignName: ""
  });
  const [contactLists, setContactLists] = useState([
    { key: '1', name: 'Startup Founders', count: 45, created: '2024-01-15', status: 'active' },
    { key: '2', name: 'Tech Investors', count: 23, created: '2024-01-10', status: 'active' }
  ]);
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState([
    { key: '1', name: 'Welcome Series', sent: 120, delivered: 115, opened: 45, clicked: 12, date: '2024-01-20' },
    { key: '2', name: 'Product Update', sent: 89, delivered: 87, opened: 32, clicked: 8, date: '2024-01-18' }
  ]);

  const sendBasicEmail = async () => {
    if (!emailData.subject || !emailData.body || !emailData.recipients) {
      message.warning("Please fill all required fields");
      return;
    }

    setLoading(true);
    
    // Simulate API call with mock success
    setTimeout(() => {
      const recipientCount = emailData.recipients.split(',').filter(email => email.trim()).length;
      const newCampaign = {
        key: Date.now().toString(),
        name: emailData.campaignName || 'Untitled Campaign',
        sent: recipientCount,
        delivered: Math.floor(recipientCount * 0.95),
        opened: Math.floor(recipientCount * 0.25),
        clicked: Math.floor(recipientCount * 0.05),
        date: new Date().toISOString().split('T')[0]
      };
      
      setCampaigns(prev => [newCampaign, ...prev]);
      setEmailData({ subject: "", body: "", recipients: "", campaignName: "" });
      message.success(`Email campaign sent to ${recipientCount} recipients!`);
      setLoading(false);
    }, 2000);
  };

  const uploadContactList = (file: File) => {
    // Simulate file upload processing
    message.loading('Processing contact list...', 1);
    
    setTimeout(() => {
      const newList = {
        key: Date.now().toString(),
        name: file.name.replace(/\.[^/.]+$/, ""),
        count: Math.floor(Math.random() * 100) + 10,
        created: new Date().toISOString().split('T')[0],
        status: 'active'
      };
      
      setContactLists(prev => [newList, ...prev]);
      message.success(`Contact list "${newList.name}" uploaded with ${newList.count} contacts!`);
    }, 1500);
  };

  const tabItems = [
    {
      key: "1",
      label: (
        <span>
          <MailOutlined />
          Compose Email
        </span>
      ),
      children: (
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-sm">
            <div className="space-y-6">
              <div className="text-center pb-4">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Create Email Campaign</h3>
                <p className="text-gray-600">Send personalized emails to your contact lists</p>
              </div>
              
              <Divider />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Name</label>
                  <Input
                    placeholder="e.g., Monthly Newsletter"
                    value={emailData.campaignName}
                    onChange={(e) => setEmailData({...emailData, campaignName: e.target.value})}
                    size="large"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Subject</label>
                  <Input
                    placeholder="Enter email subject line"
                    value={emailData.subject}
                    onChange={(e) => setEmailData({...emailData, subject: e.target.value})}
                    size="large"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Content</label>
                <Input.TextArea
                  placeholder="Write your email message here..."
                  rows={10}
                  value={emailData.body}
                  onChange={(e) => setEmailData({...emailData, body: e.target.value})}
                  className="resize-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Recipients</label>
                <Input.TextArea
                  placeholder="Enter email addresses separated by commas (e.g., john@example.com, jane@example.com)"
                  rows={3}
                  value={emailData.recipients}
                  onChange={(e) => setEmailData({...emailData, recipients: e.target.value})}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {emailData.recipients ? `${emailData.recipients.split(',').length} recipients` : '0 recipients'}
                </p>
              </div>
              
              <div className="flex justify-center pt-4">
                <Button 
                  type="primary" 
                  icon={<SendOutlined />}
                  onClick={sendBasicEmail} 
                  loading={loading}
                  size="large"
                  className="px-8 h-12 text-lg font-medium bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? 'Sending...' : 'Send Email Campaign'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ),
    },
    {
      key: "2",
      label: (
        <span>
          <ContactsOutlined />
          Contact Lists
        </span>
      ),
      children: (
        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Manage Contact Lists</h3>
                <p className="text-gray-600">Upload and organize your email contacts</p>
              </div>
              <Upload
                accept=".csv,.xlsx,.txt"
                beforeUpload={(file) => {
                  uploadContactList(file);
                  return false;
                }}
                showUploadList={false}
              >
                <Button 
                  type="primary" 
                  icon={<UploadOutlined />} 
                  size="large"
                  className="bg-green-600 hover:bg-green-700"
                >
                  Upload Contact List
                </Button>
              </Upload>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h4 className="font-medium text-blue-800 mb-2">📋 Upload Instructions</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Supported formats: CSV, Excel (.xlsx), Text (.txt)</li>
                <li>• First column should contain email addresses</li>
                <li>• Optional: Second column for names</li>
                <li>• Maximum file size: 5MB</li>
              </ul>
            </div>
          </Card>
          
          <Card title={`Your Contact Lists (${contactLists.length})`}>
            <Table
              dataSource={contactLists}
              columns={[
                { 
                  title: "List Name", 
                  dataIndex: "name", 
                  key: "name",
                  render: (name) => <span className="font-medium">{name}</span>
                },
                { 
                  title: "Contacts", 
                  dataIndex: "count", 
                  key: "count",
                  render: (count) => <Tag color="blue">{count} contacts</Tag>
                },
                { 
                  title: "Status", 
                  dataIndex: "status", 
                  key: "status",
                  render: (status) => <Tag color={status === 'active' ? 'green' : 'orange'}>{status}</Tag>
                },
                { 
                  title: "Created", 
                  dataIndex: "created", 
                  key: "created",
                  render: (date) => new Date(date).toLocaleDateString()
                },
                {
                  title: "Actions",
                  key: "actions",
                  render: () => (
                    <Space>
                      <Button size="small" type="link">View</Button>
                      <Button size="small" type="link">Export</Button>
                      <Button size="small" type="link" danger>Delete</Button>
                    </Space>
                  )
                }
              ]}
              pagination={{ pageSize: 10 }}
              className="shadow-sm"
            />
          </Card>
        </div>
      ),
    },
    {
      key: "3",
      label: (
        <span>
          <BarChartOutlined />
          Campaign History
        </span>
      ),
      children: (
        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Campaign Performance</h3>
                <p className="text-gray-600">Track your email campaign results</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card className="text-center bg-blue-50 border-blue-200">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {campaigns.reduce((sum, c) => sum + c.sent, 0)}
                </div>
                <div className="text-gray-600 font-medium">Total Sent</div>
              </Card>
              <Card className="text-center bg-green-50 border-green-200">
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {campaigns.reduce((sum, c) => sum + c.delivered, 0)}
                </div>
                <div className="text-gray-600 font-medium">Delivered</div>
              </Card>
              <Card className="text-center bg-orange-50 border-orange-200">
                <div className="text-3xl font-bold text-orange-600 mb-1">
                  {campaigns.reduce((sum, c) => sum + c.opened, 0)}
                </div>
                <div className="text-gray-600 font-medium">Opened</div>
              </Card>
              <Card className="text-center bg-purple-50 border-purple-200">
                <div className="text-3xl font-bold text-purple-600 mb-1">
                  {campaigns.reduce((sum, c) => sum + c.clicked, 0)}
                </div>
                <div className="text-gray-600 font-medium">Clicked</div>
              </Card>
            </div>
          </Card>
          
          <Card title={`Recent Campaigns (${campaigns.length})`}>
            <Table
              dataSource={campaigns}
              columns={[
                { 
                  title: "Campaign Name", 
                  dataIndex: "name", 
                  key: "name",
                  render: (name) => <span className="font-medium">{name}</span>
                },
                { 
                  title: "Sent", 
                  dataIndex: "sent", 
                  key: "sent",
                  render: (sent) => <Tag color="blue">{sent}</Tag>
                },
                { 
                  title: "Delivered", 
                  dataIndex: "delivered", 
                  key: "delivered",
                  render: (delivered, record) => (
                    <div>
                      <Tag color="green">{delivered}</Tag>
                      <div className="text-xs text-gray-500">
                        {record.sent > 0 ? Math.round((delivered / record.sent) * 100) : 0}%
                      </div>
                    </div>
                  )
                },
                { 
                  title: "Opened", 
                  dataIndex: "opened", 
                  key: "opened",
                  render: (opened, record) => (
                    <div>
                      <Tag color="orange">{opened}</Tag>
                      <div className="text-xs text-gray-500">
                        {record.delivered > 0 ? Math.round((opened / record.delivered) * 100) : 0}%
                      </div>
                    </div>
                  )
                },
                { 
                  title: "Clicked", 
                  dataIndex: "clicked", 
                  key: "clicked",
                  render: (clicked, record) => (
                    <div>
                      <Tag color="purple">{clicked}</Tag>
                      <div className="text-xs text-gray-500">
                        {record.opened > 0 ? Math.round((clicked / record.opened) * 100) : 0}%
                      </div>
                    </div>
                  )
                },
                { 
                  title: "Date", 
                  dataIndex: "date", 
                  key: "date",
                  render: (date) => new Date(date).toLocaleDateString()
                },
                {
                  title: "Actions",
                  key: "actions",
                  render: () => (
                    <Space>
                      <Button size="small" type="link">View Details</Button>
                      <Button size="small" type="link">Duplicate</Button>
                    </Space>
                  )
                }
              ]}
              pagination={{ pageSize: 10 }}
              className="shadow-sm"
            />
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8 text-center"
      >
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          📧 Email Campaign
        </h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Simple and effective email marketing. Create campaigns, manage contacts, and track basic performance metrics.
        </p>
        <div className="flex justify-center mt-6">
          <div className="bg-white px-6 py-3 rounded-full shadow-sm border">
            <span className="text-sm font-medium text-gray-700">✨ Perfect for basic email marketing needs</span>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab} 
            items={tabItems}
            size="large"
            type="card"
            className="email-campaign-tabs"
          />
        </Card>
      </motion.div>
    </div>
  );
}