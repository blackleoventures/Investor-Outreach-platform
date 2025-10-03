"use client";

import { useState } from "react";
import { Card, Typography, Button, Form, Input, Modal, Upload, message, Dropdown, Checkbox } from "antd";
import { UserOutlined, FileTextOutlined, ArrowLeftOutlined, PlusOutlined, UploadOutlined, SettingOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

const { Title, Text } = Typography;

export default function AddIncubatorPage() {
  const router = useRouter();
  const [showManualForm, setShowManualForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form] = Form.useForm();
  const [visibleFields, setVisibleFields] = useState({
    incubatorName: true,
    partnerName: true,
    partnerEmail: true,
    phoneNumber: true,
    sectorFocus: true,
    country: true,
    stateCity: true,
  });

  const handleManualEntry = () => {
    setShowManualForm(true);
  };

  const handleFileUpload = async (file: File) => {
    const rawExt = file.name.split('.').pop();
    const fileExtension = (rawExt ? rawExt : '').toLowerCase();
    const formData = new FormData();
    setUploading(true);
    message.loading('Uploading file...', 0);
    try {
      formData.append('file', file);
      formData.append('excel', file);
      const base = process.env.NEXT_PUBLIC_BACKEND_URL || '/api';
      const response = await fetch(`${base}/api/incubators/upload`, {
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
              <p><strong>Type:</strong> {fileExtension ? fileExtension.toUpperCase() : ''}</p>
              <p><strong>Status:</strong> {result.message || 'Data imported successfully'}</p>
              <p className="text-green-600 font-medium">Redirecting to All Incubators...</p>
            </div>
          ),
          onOk: () => router.push('/dashboard/all-incubators'),
        });
        setTimeout(() => router.push('/dashboard/all-incubators'), 2000);
      } else {
        const error = await response.json();
        message.error(error.error || `Failed to upload ${fileExtension ? fileExtension.toUpperCase() : ''} file`);
      }
    } catch (error) {
      message.destroy();
      message.error(`Failed to upload ${fileExtension?.toUpperCase() || ''} file`);
    } finally {
      setUploading(false);
    }

    return false;
  };

  const handleFieldVisibilityChange = (fieldKey: string, checked: boolean) => {
    setVisibleFields(prev => ({ ...prev, [fieldKey]: checked }));
  };

  const customizeFieldsMenu = {
    items: [
      {
        key: 'customize-panel',
        label: (
          <div className="w-64" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <div className="p-2 border-b border-gray-200 mb-2">
              <Text strong className="text-gray-800">Select Fields</Text>
            </div>
            <div className="space-y-1 px-2 pb-2">
              <div className="flex items-center py-1">
                <Checkbox checked={visibleFields.incubatorName} onChange={(e) => handleFieldVisibilityChange('incubatorName', e.target.checked)}>Incubator Name</Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox checked={visibleFields.partnerName} onChange={(e) => handleFieldVisibilityChange('partnerName', e.target.checked)}>Partner Name</Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox checked={visibleFields.partnerEmail} onChange={(e) => handleFieldVisibilityChange('partnerEmail', e.target.checked)}>Partner Email</Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox checked={visibleFields.phoneNumber} onChange={(e) => handleFieldVisibilityChange('phoneNumber', e.target.checked)}>Phone Number</Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox checked={visibleFields.sectorFocus} onChange={(e) => handleFieldVisibilityChange('sectorFocus', e.target.checked)}>Sector Focus</Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox checked={visibleFields.country} onChange={(e) => handleFieldVisibilityChange('country', e.target.checked)}>Country</Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox checked={visibleFields.stateCity} onChange={(e) => handleFieldVisibilityChange('stateCity', e.target.checked)}>State/City</Checkbox>
              </div>
            </div>
          </div>
        ),
      },
    ],
  };

  const handleSubmit = async (values: any) => {
    try {
      const response = await apiFetch(`/api/incubators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });

      if (response.ok) {
        message.success('Incubator added successfully!');
        form.resetFields();
        setShowManualForm(false);
        router.push('/dashboard/all-incubators');
      } else {
        const err = await response.json().catch(() => ({} as any));
        message.error(err.error || 'Failed to add incubator');
      }
    } catch (e) {
      message.error('Failed to add incubator');
    }
  };

  return (
    <div className="p-6">
      {!showManualForm ? (
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />}
              onClick={() => router.back()}
              className="mb-4"
            >
              Back to Previous Page
        </Button>
            
            <div className="text-center">
              <Title level={2} className="mb-2">Import Incubators</Title>
              <Text className="text-gray-600">Choose your preferred method to add incubators</Text>
            </div>
      </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
            <Card 
              className="text-center p-8 hover:shadow-lg transition-shadow border-2 hover:border-blue-300"
            >
              <div className="mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserOutlined className="text-3xl text-blue-600" />
                </div>
                <Title level={3} className="mb-2">Manual Entry</Title>
                <Text className="text-gray-600">
                  Add incubators individually with detailed information
                </Text>
              </div>
              <div className="flex justify-center">
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={handleManualEntry}
                  style={{ backgroundColor: '#1677ff', borderColor: '#1677ff', color: '#fff' }}
                >
                  Add Incubator
              </Button>
            </div>
          </Card>

            <Card className="text-center p-0 hover:shadow-lg transition-shadow border-2 overflow-hidden">
              <div className="p-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileTextOutlined className="text-3xl text-green-600" />
                </div>
                <Title level={3} className="mb-2">File Import</Title>
                <Text className="text-gray-600 mb-4 block">
                  Upload CSV or Excel files - both formats supported
                </Text>
                <Upload.Dragger
                accept=".csv,.xlsx,.xls"
                  beforeUpload={handleFileUpload}
                  showUploadList={false}
                disabled={uploading}
                  multiple={false}
                >
                  <p className="ant-upload-drag-icon">
                    <UploadOutlined />
                  </p>
                  <p className="ant-upload-text">Click or drag file to this area to upload</p>
                  <p className="ant-upload-hint text-xs text-gray-500">Supports .csv, .xlsx, .xls • Max size ~5MB recommended</p>
                </Upload.Dragger>
                <Text className="text-xs text-gray-500 mt-2 block">
                  Tip: Use the All Incubators page to verify uploaded records.
                </Text>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <Modal
          title={
            <div className="flex items-center gap-2">
              <Dropdown
                menu={customizeFieldsMenu}
                trigger={['click']}
                placement="bottomRight"
              >
                <Button type="text" icon={<SettingOutlined />} size="small">
                  Customize Fields
                </Button>
              </Dropdown>
            </div>
          }
          open={true}
          onCancel={() => setShowManualForm(false)}
          footer={null}
          width={900}
          style={{ top: 20 }}
          styles={{ 
            body: { 
              padding: 0,
              maxHeight: '70vh',
              overflowX: 'hidden',
              overflowY: 'auto'
            }
          }}
        >
          <div className="p-4" style={{ maxWidth: '100%', width: '100%', boxSizing: 'border-box' }}>
            <Form form={form} onFinish={handleSubmit} layout="vertical">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleFields.incubatorName && (
                  <Form.Item name="incubator_name" label="Incubator Name" className="mb-3">
              <Input placeholder="Enter incubator name" />
            </Form.Item>
                )}
                {visibleFields.partnerName && (
                  <Form.Item name="partner_name" label="Partner Name" className="mb-3" rules={[{ required: true, message: 'Please enter partner name!' }]}>
              <Input placeholder="Enter partner name" />
            </Form.Item>
                )}
                {visibleFields.partnerEmail && (
                  <Form.Item name="partner_email" label="Partner Email" className="mb-3" rules={[{ required: true, message: 'Please enter partner email!' }, { type: 'email', message: 'Enter a valid email' }]}>
                    <Input placeholder="Enter partner email" type="email" />
            </Form.Item>
                )}
                {visibleFields.phoneNumber && (
                  <Form.Item name="phone_number" label="Phone Number" className="mb-3">
              <Input placeholder="Enter phone number" />
            </Form.Item>
                )}
                {visibleFields.sectorFocus && (
                  <Form.Item name="sector_focus" label="Sector Focus" className="mb-3">
              <Input placeholder="Enter sector focus" />
            </Form.Item>
                )}
                {visibleFields.country && (
                  <Form.Item name="country" label="Country" className="mb-3" rules={[{ required: true, message: 'Please enter country!' }]}>
              <Input placeholder="Enter country" />
            </Form.Item>
                )}
                {visibleFields.stateCity && (
                  <Form.Item name="state_city" label="State/City" className="mb-3">
              <Input placeholder="Enter state/city" />
            </Form.Item>
                )}
              </div>
              <div className="flex gap-3 mt-2">
                <Button type="primary" htmlType="submit" style={{ backgroundColor: '#1677ff', borderColor: '#1677ff', color: '#fff' }}>Add Incubator</Button>
                <Button onClick={() => setShowManualForm(false)}>Cancel</Button>
              </div>
          </Form>
          </div>
        </Modal>
      )}
    </div>
  );
}