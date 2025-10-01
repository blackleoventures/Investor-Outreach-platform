"use client";

import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Alert, Steps, Typography, message, Select } from 'antd';
import { MailOutlined, KeyOutlined, CheckCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { api } from '@/lib/api';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;
const { Option } = Select;

interface GmailConnectProps {
  companyId?: string;
  onSetupComplete?: () => void;
}

export default function GmailConnect({ companyId, onSetupComplete }: GmailConnectProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [credentialsSet, setCredentialsSet] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const response = await api.get('/clients');
      setCompanies(response.data.data || []);
      
      if (companyId) {
        const company = response.data.data?.find((c: any) => c._id === companyId);
        if (company) {
          setSelectedCompany(company);
          setCredentialsSet(company.email_sending_enabled || false);
          if (company.email_sending_enabled) {
            setCurrentStep(3);
          }
        }
      } else if (response.data.data?.length > 0) {
        setSelectedCompany(response.data.data[0]);
        setCredentialsSet(response.data.data[0].email_sending_enabled || false);
      }
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  const handleSaveCredentials = async (values: { gmailAppPassword: string }) => {
    if (!selectedCompany) {
      message.error('Please select a company first');
      return;
    }

    setLoading(true);
    try {
      const response = await api.put('/client-email/credentials', {
        companyId: selectedCompany._id,
        gmailAppPassword: values.gmailAppPassword.replace(/\s/g, '') // Remove spaces
      });

      if (response.data.success) {
        message.success('Gmail credentials saved successfully!');
        setCredentialsSet(true);
        setCurrentStep(3);
        onSetupComplete?.();
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to save credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleTestCredentials = async () => {
    if (!selectedCompany) {
      message.error('Please select a company first');
      return;
    }

    setTesting(true);
    try {
      const response = await api.post('/client-email/test-credentials', {
        companyId: selectedCompany._id
      });

      if (response.data.success) {
        message.success('Test email sent! Check your inbox.');
        setCurrentStep(4);
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Test failed');
    } finally {
      setTesting(false);
    }
  };

  const steps = [
    {
      title: 'Select Company',
      description: 'Choose company for Gmail setup'
    },
    {
      title: 'Enable 2FA',
      description: 'Enable 2-Factor Authentication in Gmail'
    },
    {
      title: 'Generate App Password',
      description: 'Create App Password for email sending'
    },
    {
      title: 'Save Credentials',
      description: 'Enter and save your App Password'
    },
    {
      title: 'Test Connection',
      description: 'Verify your setup works'
    }
  ];

  return (
    <Card title="Gmail Setup for Email Sending" className="max-w-4xl mx-auto">
      <Steps current={currentStep} className="mb-8">
        {steps.map((step, index) => (
          <Step
            key={index}
            title={step.title}
            description={step.description}
            icon={currentStep === index ? <LoadingOutlined /> : undefined}
          />
        ))}
      </Steps>

      <div className="space-y-6">
        {/* Step 0: Company Selection */}
        <Card size="small" className="bg-blue-50">
          <Title level={4}>
            <MailOutlined className="mr-2" />
            Step 1: Select Company
          </Title>
          <div className="space-y-4">
            <Text>Choose the company for which you want to setup Gmail sending:</Text>
            <Select
              value={selectedCompany?._id}
              onChange={(value) => {
                const company = companies.find((c: any) => c._id === value);
                setSelectedCompany(company);
                setCredentialsSet(company?.email_sending_enabled || false);
                if (company?.email_sending_enabled) {
                  setCurrentStep(3);
                } else {
                  setCurrentStep(1);
                }
              }}
              className="w-full"
              size="large"
              placeholder="Select a company"
            >
              {companies.map((company: any) => (
                <Option key={company._id} value={company._id}>
                  {company.company_name} ({company.email})
                </Option>
              ))}
            </Select>
            
            {selectedCompany && (
              <div className="p-3 bg-white rounded border">
                <Text strong>Selected Company:</Text>
                <br />
                <Text>Name: {selectedCompany.company_name}</Text>
                <br />
                <Text>Email: {selectedCompany.email}</Text>
                <br />
                <Text>Status: {credentialsSet ? '✅ Setup Complete' : '⚠️ Setup Required'}</Text>
              </div>
            )}
            
            {selectedCompany && !credentialsSet && (
              <Button 
                type="primary" 
                onClick={() => setCurrentStep(1)}
              >
                Continue Setup
              </Button>
            )}
          </div>
        </Card>

        {/* Step 1: 2FA Instructions */}
        {currentStep >= 1 && (
          <Card size="small" className="bg-green-50">
            <Title level={4}>
              <KeyOutlined className="mr-2" />
              Step 2: Enable 2-Factor Authentication
            </Title>
            <div className="space-y-2">
              <Text>1. Go to <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="text-blue-600">Google Account Security</a></Text>
              <br />
              <Text>2. Find "2-Step Verification" and click "Get started"</Text>
              <br />
              <Text>3. Follow the setup process with your phone number</Text>
              <br />
              <Text>4. Complete verification via SMS or call</Text>
            </div>
            <Button 
              type="primary" 
              className="mt-4"
              onClick={() => setCurrentStep(2)}
            >
              2FA Enabled, Next Step
            </Button>
          </Card>
        )}

        {/* Step 2: App Password Instructions */}
        {currentStep >= 2 && (
          <Card size="small" className="bg-yellow-50">
            <Title level={4}>
              <CheckCircleOutlined className="mr-2" />
              Step 3: Generate App Password
            </Title>
            <div className="space-y-2">
              <Text>1. In the same Security page, find "App passwords"</Text>
              <br />
              <Text>2. Click "Select app" → Choose "Mail"</Text>
              <br />
              <Text>3. Click "Select device" → Choose "Other (custom name)"</Text>
              <br />
              <Text>4. Type "Email Marketing App" as the name</Text>
              <br />
              <Text>5. Click "Generate" and copy the 16-character password</Text>
            </div>
            <Alert
              message="Important"
              description="The App Password will look like: abcd efgh ijkl mnop (16 characters with spaces)"
              type="warning"
              className="mt-4"
            />
            <Button 
              type="primary" 
              className="mt-4"
              onClick={() => setCurrentStep(3)}
            >
              App Password Generated, Next Step
            </Button>
          </Card>
        )}

        {/* Step 3: Enter Credentials */}
        {currentStep >= 3 && selectedCompany && (
          <Card size="small" className="bg-purple-50">
            <Title level={4}>
              <CheckCircleOutlined className="mr-2" />
              Step 4: Enter Your App Password
            </Title>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSaveCredentials}
              className="mt-4"
            >
              <Form.Item
                label="Gmail App Password"
                name="gmailAppPassword"
                rules={[
                  { required: true, message: 'Please enter your App Password' },
                  { 
                    validator: (_, value) => {
                      if (!value) return Promise.resolve();
                      const cleanValue = value.replace(/\s/g, '');
                      if (cleanValue.length !== 16) {
                        return Promise.reject('App Password must be exactly 16 characters');
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <Input.Password
                  placeholder="abcd efgh ijkl mnop"
                  size="large"
                  maxLength={19} // 16 chars + 3 spaces
                />
              </Form.Item>
              
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  size="large"
                  block
                >
                  Save Gmail Credentials
                </Button>
              </Form.Item>
            </Form>
          </Card>
        )}

        {/* Step 4: Test Connection */}
        {credentialsSet && selectedCompany && (
          <Card size="small" className="bg-green-50">
            <Title level={4}>
              <CheckCircleOutlined className="mr-2 text-green-600" />
              Step 5: Test Your Setup
            </Title>
            <Paragraph>
              Send a test email to verify your Gmail credentials are working correctly.
            </Paragraph>
            <Button
              type="primary"
              loading={testing}
              onClick={handleTestCredentials}
              size="large"
              className="bg-green-600 hover:bg-green-700"
            >
              Send Test Email
            </Button>
          </Card>
        )}

        {/* Success Message */}
        {currentStep >= 4 && (
          <Alert
            message="Setup Complete!"
            description="Your Gmail is now configured for sending emails. You can now send bulk emails to investors using your Gmail account."
            type="success"
            showIcon
            className="text-center"
          />
        )}
      </div>
    </Card>
  );
}