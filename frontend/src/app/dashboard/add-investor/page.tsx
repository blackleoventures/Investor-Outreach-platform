"use client";

import { useState } from "react";
import { Card, Typography, Button, Form, Input, Modal, Dropdown, Checkbox, Upload, message } from "antd";
import { UserOutlined, FileTextOutlined, ArrowLeftOutlined, PlusOutlined, SettingOutlined, DeleteOutlined, DownloadOutlined, UploadOutlined, FileExcelOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

const { Title, Text } = Typography;

export default function AddInvestorPage() {
  const router = useRouter();
  const [showManualForm, setShowManualForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form] = Form.useForm();
  // Single unified form instead of multiple rows

  const [visibleColumns, setVisibleColumns] = useState({
    investorName: true,
    partnerName: true,
    partnerEmail: true,
    phoneNumber: true,
    fundType: true,
    fundStage: true,
    country: true,
    state: true,
    city: true,
    ticketSize: true,
    fundFocusSectors: true
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
      const response = await apiFetch(`/api/investors/upload-file`, {
        method: 'POST',
        body: formData,
      });
      
      message.destroy();
      
      if (response.ok) {
        const result = await response.json();
        
        // Show success modal with details
        Modal.success({
          title: '🎉 Upload Successful!',
          content: (
            <div>
              <p><strong>File:</strong> {file.name}</p>
              <p><strong>Type:</strong> {fileExtension ? fileExtension.toUpperCase() : ''}</p>
              <p><strong>Status:</strong> {result.message || 'Data imported successfully'}</p>
              <p className="text-green-600 font-medium">Redirecting to All Investors...</p>
            </div>
          ),
          onOk: () => router.push('/dashboard/all-investors'),
        });
        
        setTimeout(() => router.push('/dashboard/all-investors'), 2000);
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

  const handleSubmit = async (values: any) => {
    try {
      // Map fund focus field to sector_focus expected by list pages
      const payloadObj = { ...values } as any;
      if (payloadObj.fund_focus_sectors) {
        payloadObj.sector_focus = payloadObj.fund_focus_sectors;
        delete payloadObj.fund_focus_sectors;
      }
      // Send as an array of one object to existing bulk endpoint
      const payload = [payloadObj];
      const response = await apiFetch(`/api/investors/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        message.success('Investor added successfully');
        form.resetFields();
        setShowManualForm(false);
        // Navigate to All Investors so the new record is visible
        router.push('/dashboard/all-investors');
      } else {
        const err = await response.json().catch(() => ({} as any));
        message.error(err.error || 'Failed to add investor');
      }
    } catch (e) {
      message.error('Failed to add investor');
    }
  };

  // Removed multi-row logic (single form only)

  const handleColumnVisibilityChange = (columnKey: string, checked: boolean) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: checked
    }));
  };

  const customizeColumnsMenu = {
    items: [
      {
        key: 'customize-panel',
        label: (
          <div className="w-64" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <div className="p-2 border-b border-gray-200 mb-2">
              <Text strong className="text-gray-800">Select Columns</Text>
            </div>
            <div className="space-y-1 px-2 pb-2">
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.investorName}
                  onChange={(e) => handleColumnVisibilityChange('investorName', e.target.checked)}
                >
                  Investor Name (Required)
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.partnerName}
                  onChange={(e) => handleColumnVisibilityChange('partnerName', e.target.checked)}
                >
                  Partner Name (Required)
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.partnerEmail}
                  onChange={(e) => handleColumnVisibilityChange('partnerEmail', e.target.checked)}
                >
                  Partner Email (Required)
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.phoneNumber}
                  onChange={(e) => handleColumnVisibilityChange('phoneNumber', e.target.checked)}
                >
                  Phone Number (Optional)
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.fundType}
                  onChange={(e) => handleColumnVisibilityChange('fundType', e.target.checked)}
                >
                  Fund Type (Required)
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.fundStage}
                  onChange={(e) => handleColumnVisibilityChange('fundStage', e.target.checked)}
                >
                  Fund Stage (Required)
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.country}
                  onChange={(e) => handleColumnVisibilityChange('country', e.target.checked)}
                >
                  Country (Required)
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.state}
                  onChange={(e) => handleColumnVisibilityChange('state', e.target.checked)}
                >
                  State (Optional)
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.city}
                  onChange={(e) => handleColumnVisibilityChange('city', e.target.checked)}
                >
                  City (Optional)
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.ticketSize}
                  onChange={(e) => handleColumnVisibilityChange('ticketSize', e.target.checked)}
                >
                  Ticket Size (Optional)
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.fundFocusSectors}
                  onChange={(e) => handleColumnVisibilityChange('fundFocusSectors', e.target.checked)}
                >
                  Fund Focus (Sectors)
                </Checkbox>
              </div>
            </div>
          </div>
        ),
      },
    ],
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
              <Title level={2} className="mb-2">Import Investors</Title>
              <Text className="text-gray-600">Choose your preferred method to add investors</Text>
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
                  Add investors individually with detailed information
                </Text>
              </div>
              <div className="flex justify-center">
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={handleManualEntry}
                  style={{ backgroundColor: '#1677ff', borderColor: '#1677ff', color: '#fff' }}
                >
                  Add Investor
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
                  Tip: Use the All Investors page to verify uploaded records.
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
                menu={customizeColumnsMenu}
                trigger={['click']}
                placement="bottomRight"
              >
                <Button type="text" icon={<SettingOutlined />} size="small">
                  Customize Columns
                </Button>
              </Dropdown>
            </div>
          }
          open={true}
          onCancel={() => setShowManualForm(false)}
          footer={null}
          width={1200}
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
                {visibleColumns.investorName && (
                  <Form.Item 
                    name="investor_name" 
                    label="Investor Name (Required)"
                    className="mb-3"
                    rules={[]}
                  >
                    <Input placeholder="Enter investor name" />
                  </Form.Item>
                )}
                {visibleColumns.partnerName && (
                  <Form.Item 
                    name="partner_name" 
                    label="Partner Name (Required)"
                    className="mb-3"
                    rules={[]}
                  >
                    <Input placeholder="Enter partner name" />
                  </Form.Item>
                )}
                {visibleColumns.partnerEmail && (
                  <Form.Item 
                    name="partner_email" 
                    label="Partner Email (Required)"
                    className="mb-3"
                    rules={[{ type: 'email', message: 'Enter a valid email' }]}
                  >
                    <Input placeholder="Enter partner email" type="email" />
                  </Form.Item>
                )}
                {visibleColumns.phoneNumber && (
                  <Form.Item 
                    name="phone_number" 
                    label="Phone Number (Optional)"
                    className="mb-3"
                  >
                    <Input placeholder="Enter phone number" />
                  </Form.Item>
                )}
                {visibleColumns.fundType && (
                  <Form.Item 
                    name="fund_type" 
                    label="Fund Type (Required)"
                    className="mb-3"
                    rules={[]}
                  >
                    <Input placeholder="Enter fund type" />
                  </Form.Item>
                )}
                {visibleColumns.fundStage && (
                  <Form.Item 
                    name="fund_stage" 
                    label="Fund Stage (Required)"
                    className="mb-3"
                    rules={[]}
                  >
                    <Input placeholder="Enter fund stage" />
                  </Form.Item>
                )}
                {visibleColumns.country && (
                  <Form.Item 
                    name="country" 
                    label="Country (Required)"
                    className="mb-3"
                    rules={[]}
                  >
                    <Input placeholder="Enter country" />
                  </Form.Item>
                )}
                {visibleColumns.state && (
                  <Form.Item 
                    name="state" 
                    label="State (Optional)"
                    className="mb-3"
                  >
                    <Input placeholder="Enter state" />
                  </Form.Item>
                )}
                {visibleColumns.city && (
                  <Form.Item 
                    name="city" 
                    label="City (Optional)"
                    className="mb-3"
                  >
                    <Input placeholder="Enter city" />
                  </Form.Item>
                )}
                {visibleColumns.ticketSize && (
                  <Form.Item 
                    name="ticket_size" 
                    label="Ticket Size (Optional)"
                    className="mb-3"
                  >
                    <Input placeholder="Enter ticket size" />
                  </Form.Item>
                )}
                {visibleColumns.fundFocusSectors && (
                  <Form.Item 
                    name="fund_focus_sectors" 
                    label="Fund Focus (Sectors)"
                    className="mb-3"
                  >
                    <Input placeholder="e.g. FinTech, SaaS, AI" />
                  </Form.Item>
                )}
              </div>

              <div className="flex gap-4 mt-4">
                <Button 
                  type="primary" 
                  htmlType="submit"
                  style={{
                    backgroundColor: "#1677ff",
                    color: "#fff",
                    borderColor: "#1677ff"
                  }}
                >
                  Submit
                </Button>
                <Button 
                  onClick={() => setShowManualForm(false)}
                  style={{
                    borderColor: "#dc2626",
                    color: "#dc2626"
                  }}
                >
                  Cancel
                </Button>
              </div>
            </Form>
          </div>
        </Modal>
      )}
    </div>
  );
}