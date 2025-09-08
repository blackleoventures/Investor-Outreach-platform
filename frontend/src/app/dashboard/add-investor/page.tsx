"use client";

import { useState } from "react";
import { Card, Typography, Button, Form, Input, Modal, Dropdown, Checkbox, Upload, message } from "antd";
import { UserOutlined, FileTextOutlined, ArrowLeftOutlined, PlusOutlined, SettingOutlined, DeleteOutlined, DownloadOutlined, UploadOutlined, FileExcelOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";

const { Title, Text } = Typography;

export default function AddInvestorPage() {
  const router = useRouter();
  const [showManualForm, setShowManualForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form] = Form.useForm();
  const [formRows, setFormRows] = useState([1, 2, 3, 4]);

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
    ticketSize: true
  });

  const handleManualEntry = () => {
    setShowManualForm(true);
  };



  const handleFileUpload = async (file: File) => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const formData = new FormData();
    
    setUploading(true);
    message.loading('Uploading file...', 0);
    
    try {
      let response;
      
      if (fileExtension === 'csv') {
        formData.append('file', file);
        response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/investors/upload-csv`, {
          method: 'POST',
          body: formData,
        });
      } else {
        message.destroy();
        message.error('Only CSV files are supported. Please convert Excel to CSV format.');
        setUploading(false);
        return false;
      }
      
      message.destroy();
      
      if (response.ok) {
        const result = await response.json();
        
        // Show success modal with details
        Modal.success({
          title: '🎉 Upload Successful!',
          content: (
            <div>
              <p><strong>File:</strong> {file.name}</p>
              <p><strong>Type:</strong> {fileExtension.toUpperCase()}</p>
              <p><strong>Status:</strong> {result.message || 'Data imported successfully'}</p>
              <p className="text-green-600 font-medium">Redirecting to All Investors...</p>
            </div>
          ),
          onOk: () => router.push('/dashboard/all-investors'),
        });
        
        setTimeout(() => router.push('/dashboard/all-investors'), 2000);
      } else {
        const error = await response.json();
        message.error(error.error || `Failed to upload ${fileExtension.toUpperCase()} file`);
      }
    } catch (error) {
      message.destroy();
      message.error(`Failed to upload ${fileExtension?.toUpperCase() || ''} file`);
    } finally {
      setUploading(false);
    }
    
    return false;
  };

  const handleSubmit = (values: any) => {
    console.log('Form submitted:', values);
  };

  const addFormRow = () => {
    const newRowId = Math.max(...formRows) + 1;
    setFormRows([...formRows, newRowId]);
  };

  const deleteFormRow = (rowId: number) => {
    if (formRows.length > 1) {
      setFormRows(formRows.filter(id => id !== rowId));
    }
  };

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
              <Title level={2} className="mb-2">Import Contacts</Title>
              <Text className="text-gray-600">Choose your preferred method to add contacts</Text>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
            <Card 
              className="text-center p-8 hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-blue-300"
              onClick={handleManualEntry}
            >
              <div className="mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserOutlined className="text-3xl text-blue-600" />
                </div>
                <Title level={3} className="mb-2">Manual Entry</Title>
                <Text className="text-gray-600">
                  Add contacts individually with detailed information
                </Text>
              </div>
            </Card>

            <Card className="text-center p-8 hover:shadow-lg transition-shadow border-2">
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileTextOutlined className="text-3xl text-green-600" />
                </div>
                <Title level={3} className="mb-2">CSV Import</Title>
                <Text className="text-gray-600 mb-4">
                  Upload CSV files (Excel: Save As → CSV format)
                </Text>
                <Upload
                  accept=".csv"
                  beforeUpload={handleFileUpload}
                  showUploadList={false}
                  disabled={uploading}
                >
                  <Button 
                    icon={<UploadOutlined />}
                    className="w-full"
                    type="primary"
                    loading={uploading}
                    disabled={uploading}
                    style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                  >
                    {uploading ? 'Uploading...' : 'Upload CSV File'}
                  </Button>
                </Upload>
                <Text className="text-xs text-gray-500 mt-2">
                  Only CSV format supported. Convert Excel to CSV first.
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
              overflowX: 'auto',
              overflowY: 'hidden'
            }
          }}
        >
          <div className="p-4" style={{ 
            maxWidth: '100%',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <div className="grid gap-2 mb-4 font-semibold text-gray-700 text-xs" style={{
              gridTemplateColumns: `repeat(${Object.values(visibleColumns).filter(Boolean).length + 1}, minmax(120px, 1fr))`,
              minWidth: `${(Object.values(visibleColumns).filter(Boolean).length + 1) * 130}px`
            }}>
              {visibleColumns.investorName && <div>Investor Name (Required)</div>}
              {visibleColumns.partnerName && <div>Partner Name (Required)</div>}
              {visibleColumns.partnerEmail && <div>Partner Email (Required)</div>}
              {visibleColumns.phoneNumber && <div>Phone Number (Optional)</div>}
              {visibleColumns.fundType && <div>Fund Type (Required)</div>}
              {visibleColumns.fundStage && <div>Fund Stage (Required)</div>}
              {visibleColumns.country && <div>Country (Required)</div>}
              {visibleColumns.state && <div>State (Optional)</div>}
              {visibleColumns.city && <div>City (Optional)</div>}
              {visibleColumns.ticketSize && <div>Ticket Size (Optional)</div>}
              <div>Actions</div>
            </div>
            
            <Form form={form} onFinish={handleSubmit}>
              {formRows.map((row) => (
                <div key={row} className="grid gap-2 mb-4" style={{
                  gridTemplateColumns: `repeat(${Object.values(visibleColumns).filter(Boolean).length + 1}, minmax(120px, 1fr))`,
                  minWidth: `${(Object.values(visibleColumns).filter(Boolean).length + 1) * 130}px`
                }}>
                  {visibleColumns.investorName && (
                    <Form.Item name={`investorName_${row}`} className="mb-0">
                      <Input placeholder="Investor Name" />
                    </Form.Item>
                  )}
                  {visibleColumns.partnerName && (
                    <Form.Item name={`partnerName_${row}`} className="mb-0">
                      <Input placeholder="Partner Name" />
                    </Form.Item>
                  )}
                  {visibleColumns.partnerEmail && (
                    <Form.Item name={`partnerEmail_${row}`} className="mb-0">
                      <Input placeholder="Partner Email" />
                    </Form.Item>
                  )}
                  {visibleColumns.phoneNumber && (
                    <Form.Item name={`phoneNumber_${row}`} className="mb-0">
                      <Input placeholder="Phone Number" />
                    </Form.Item>
                  )}
                  {visibleColumns.fundType && (
                    <Form.Item name={`fundType_${row}`} className="mb-0">
                      <Input placeholder="Fund Type" />
                    </Form.Item>
                  )}
                  {visibleColumns.fundStage && (
                    <Form.Item name={`fundStage_${row}`} className="mb-0">
                      <Input placeholder="Fund Stage" />
                    </Form.Item>
                  )}
                  {visibleColumns.country && (
                    <Form.Item name={`country_${row}`} className="mb-0">
                      <Input placeholder="Country" />
                    </Form.Item>
                  )}
                  {visibleColumns.state && (
                    <Form.Item name={`state_${row}`} className="mb-0">
                      <Input placeholder="State" />
                    </Form.Item>
                  )}
                  {visibleColumns.city && (
                    <Form.Item name={`city_${row}`} className="mb-0">
                      <Input placeholder="City" />
                    </Form.Item>
                  )}
                  {visibleColumns.ticketSize && (
                    <Form.Item name={`ticketSize_${row}`} className="mb-0">
                      <Input placeholder="Ticket Size" />
                    </Form.Item>
                  )}
                  <div className="flex items-center justify-center">
                    <Button 
                      type="text" 
                      danger 
                      icon={<DeleteOutlined />} 
                      onClick={() => deleteFormRow(row)}
                      disabled={formRows.length === 1}
                      className="text-red-500 hover:text-red-700"
                      size="small"
                    />
                  </div>
                </div>
              ))}
            </Form>
            
            <div className="text-center mb-6">
              <Button 
                type="link" 
                icon={<PlusOutlined />} 
                className="text-blue-500"
                onClick={addFormRow}
              >
                Add more field
              </Button>
            </div>
            
            <div className="mb-6">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-gray-400 h-2 rounded-full" style={{ width: '25%' }}></div>
              </div>
            </div>
            
            <div className="flex gap-4">
              <Button 
                type="primary" 
                onClick={() => form.submit()}
                style={{
                  backgroundColor: "#ac6a1e",
                  color: "#fff",
                  borderColor: "#ac6a1e"
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
          </div>
        </Modal>
      )}
    </div>
  );
}