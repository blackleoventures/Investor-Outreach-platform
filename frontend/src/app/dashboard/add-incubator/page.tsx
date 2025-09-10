'use client';

import { useState } from 'react';
import { Card, Typography, Button, Form, Input, Modal, Upload, message } from 'antd';
import { PlusOutlined, UploadOutlined, FileExcelOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';

const { Title, Text } = Typography;
const { Dragger } = Upload;

export default function AddIncubator() {
  const router = useRouter();
  const [showManualForm, setShowManualForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form] = Form.useForm();

  const handleManualEntry = () => {
    setShowManualForm(true);
  };

  const handleFileUpload = async (file: File) => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const formData = new FormData();
    setUploading(true);
    message.loading('Uploading file...', 0);
    try {
      formData.append('file', file);
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/incubators/upload-file`, {
        method: 'POST',
        body: formData,
      });

      message.destroy();

      if (response.ok) {
        const result = await response.json();
        Modal.success({
          title: '🎉 Upload Successful!',
          content: (
            <div>
              <p><strong>File:</strong> {file.name}</p>
              <p><strong>Type:</strong> {fileExtension?.toUpperCase()}</p>
              <p><strong>Status:</strong> {result.message || 'Data imported successfully'}</p>
              <p className="text-green-600 font-medium">Redirecting to All Incubators...</p>
            </div>
          ),
          onOk: () => router.push('/dashboard/all-incubators'),
        });
        setTimeout(() => router.push('/dashboard/all-incubators'), 2000);
      } else {
        const error = await response.json();
        message.error(error.error || error.message || `Failed to upload ${fileExtension?.toUpperCase()} file`);
      }
    } catch (error) {
      message.destroy();
      message.error(`Failed to upload ${fileExtension?.toUpperCase() || ''} file`);
    } finally {
      setUploading(false);
    }

    return false;
  };

  const onFinish = async (values: any) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/incubators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error('Failed to add incubator');
      message.success('Incubator added successfully!');
      form.resetFields();
      router.push('/dashboard/all-incubators');
    } catch (e: any) {
      message.error(e.message || 'Failed to add incubator');
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center mb-4">
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
          Back
        </Button>
      </div>

      <Title level={2} className="mb-1">Import Contacts</Title>
      <Text type="secondary">Choose your preferred method to add contacts</Text>

      {!showManualForm && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <Card className="h-full">
            <div className="flex flex-col items-center justify-center h-64">
              <div className="text-5xl mb-4">👤</div>
              <Title level={4}>Manual Entry</Title>
              <Text className="mb-4">Add contacts individually with detailed information</Text>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleManualEntry}>
                Add Manually
              </Button>
            </div>
          </Card>

          <Card className="h-full">
            <div className="flex flex-col items-center justify-center h-64">
              <div className="text-5xl mb-4"><FileExcelOutlined /></div>
              <Title level={4}>File Import</Title>
              <Text className="mb-4">Upload CSV or Excel files - both formats supported</Text>
              <Dragger 
                multiple={false}
                accept=".csv,.xlsx,.xls"
                beforeUpload={(file: File) => {
                  handleFileUpload(file);
                  return false;
                }}
                disabled={uploading}
                style={{ width: '100%' }}
              >
                <Button type="primary" icon={<UploadOutlined />} loading={uploading}>
                  Upload CSV/Excel
                </Button>
                <div className="text-xs text-gray-500 mt-2">Supports: .csv, .xlsx, .xls files</div>
              </Dragger>
            </div>
          </Card>
        </div>
      )}

      {showManualForm && (
        <Card title="Add New Incubator" className="max-w-2xl mt-6">
          <Form form={form} layout="vertical" onFinish={onFinish} autoComplete="off">
            <Form.Item label="Incubator Name" name="incubatorName" rules={[{ required: true, message: 'Please enter incubator name!' }]}>
              <Input placeholder="Enter incubator name" />
            </Form.Item>
            <Form.Item label="Partner Name" name="partnerName" rules={[{ required: true, message: 'Please enter partner name!' }]}>
              <Input placeholder="Enter partner name" />
            </Form.Item>
            <Form.Item label="Partner Email" name="partnerEmail" rules={[{ required: true, message: 'Please enter partner email!' }, { type: 'email', message: 'Please enter a valid email!' }]}>
              <Input placeholder="Enter partner email" />
            </Form.Item>
            <Form.Item label="Phone Number" name="phoneNumber" rules={[{ required: true, message: 'Please enter phone number!' }]}>
              <Input placeholder="Enter phone number" />
            </Form.Item>
            <Form.Item label="Sector Focus" name="sectorFocus" rules={[{ required: true, message: 'Please enter sector focus!' }]}>
              <Input placeholder="Enter sector focus" />
            </Form.Item>
            <Form.Item label="Country" name="country" rules={[{ required: true, message: 'Please enter country!' }]}>
              <Input placeholder="Enter country" />
            </Form.Item>
            <Form.Item label="State/City" name="stateCity" rules={[{ required: true, message: 'Please enter state/city!' }]}>
              <Input placeholder="Enter state/city" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={uploading} block>
                Add Incubator
              </Button>
            </Form.Item>
          </Form>
        </Card>
      )}
    </div>
  );
}