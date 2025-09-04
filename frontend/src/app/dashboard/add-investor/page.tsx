"use client";

import { useState } from "react";
import { Card, Typography, Button, Form, Input, Modal, Dropdown, Checkbox } from "antd";
import { UserOutlined, FileTextOutlined, ArrowLeftOutlined, PlusOutlined, SettingOutlined, DeleteOutlined, EditOutlined, SaveOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";

const { Title, Text } = Typography;

export default function AddInvestorPage() {
  const router = useRouter();
  const [showManualForm, setShowManualForm] = useState(false);
  const [form] = Form.useForm();
  const [formRows, setFormRows] = useState([1, 2, 3, 4]);
  const [editingRows, setEditingRows] = useState<number[]>([]);
  const [visibleColumns, setVisibleColumns] = useState({
    partnerEmail: true,
    investorName: true,
    partnerName: true,
    fundType: true,
    fundStage: true,
    website: false,
    fundFocus: false,
    portfolioCompanies: false,
    location: false,
    twitterLink: false,
    linkedinLink: false,
    facebookLink: false,
    numberOfInvestments: false,
    numberOfExits: false,
    fundDescription: false,
    foundingYear: false
  });

  const handleManualEntry = () => {
    setShowManualForm(true);
  };

  const handleCSVUpload = () => {
    console.log('CSV Upload clicked');
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

  const toggleEditRow = (rowId: number) => {
    if (editingRows.includes(rowId)) {
      setEditingRows(editingRows.filter(id => id !== rowId));
    } else {
      setEditingRows([...editingRows, rowId]);
    }
  };

  const saveRow = (rowId: number) => {
    setEditingRows(editingRows.filter(id => id !== rowId));
    console.log(`Row ${rowId} saved`);
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
                  checked={visibleColumns.partnerEmail}
                  onChange={(e) => handleColumnVisibilityChange('partnerEmail', e.target.checked)}
                >
                  Partner Email (Required)
                </Checkbox>
              </div>
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
                  checked={visibleColumns.website}
                  onChange={(e) => handleColumnVisibilityChange('website', e.target.checked)}
                >
                  Website (If Available)
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.fundFocus}
                  onChange={(e) => handleColumnVisibilityChange('fundFocus', e.target.checked)}
                >
                  Fund Focus (Sectors)
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.portfolioCompanies}
                  onChange={(e) => handleColumnVisibilityChange('portfolioCompanies', e.target.checked)}
                >
                  Portfolio Companies
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.location}
                  onChange={(e) => handleColumnVisibilityChange('location', e.target.checked)}
                >
                  Location
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.twitterLink}
                  onChange={(e) => handleColumnVisibilityChange('twitterLink', e.target.checked)}
                >
                  Twitter Link
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.linkedinLink}
                  onChange={(e) => handleColumnVisibilityChange('linkedinLink', e.target.checked)}
                >
                  Linkedin Link
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.facebookLink}
                  onChange={(e) => handleColumnVisibilityChange('facebookLink', e.target.checked)}
                >
                  Facebook Link
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.numberOfInvestments}
                  onChange={(e) => handleColumnVisibilityChange('numberOfInvestments', e.target.checked)}
                >
                  Number Of Investments
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.numberOfExits}
                  onChange={(e) => handleColumnVisibilityChange('numberOfExits', e.target.checked)}
                >
                  Number Of Exits
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.fundDescription}
                  onChange={(e) => handleColumnVisibilityChange('fundDescription', e.target.checked)}
                >
                  Fund Description
                </Checkbox>
              </div>
              <div className="flex items-center py-1">
                <Checkbox
                  checked={visibleColumns.foundingYear}
                  onChange={(e) => handleColumnVisibilityChange('foundingYear', e.target.checked)}
                >
                  Founding Year
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

            <Card 
              className="text-center p-8 hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-green-300"
              onClick={handleCSVUpload}
            >
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileTextOutlined className="text-3xl text-green-600" />
                </div>
                <Title level={3} className="mb-2">CSV Import</Title>
                <Text className="text-gray-600">
                  Bulk upload contacts using CSV file format
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
        >
          <div className="p-4 overflow-x-auto">
            <div className="flex gap-4 mb-4 font-semibold text-gray-700 min-w-max">
              {visibleColumns.partnerEmail && <div className="w-48 flex-shrink-0">Partner Email (Required)</div>}
              {visibleColumns.investorName && <div className="w-48 flex-shrink-0">Investor Name (Required)</div>}
              {visibleColumns.partnerName && <div className="w-48 flex-shrink-0">Partner Name (Required)</div>}
              {visibleColumns.fundType && <div className="w-48 flex-shrink-0">Fund Type (Required)</div>}
              {visibleColumns.fundStage && <div className="w-48 flex-shrink-0">Fund Stage (Required)</div>}
              {visibleColumns.website && <div className="w-48 flex-shrink-0">Website (If Available)</div>}
              {visibleColumns.fundFocus && <div className="w-48 flex-shrink-0">Fund Focus (Sectors)</div>}
              {visibleColumns.portfolioCompanies && <div className="w-48 flex-shrink-0">Portfolio Companies</div>}
              {visibleColumns.location && <div className="w-48 flex-shrink-0">Location</div>}
              {visibleColumns.twitterLink && <div className="w-48 flex-shrink-0">Twitter Link</div>}
              {visibleColumns.linkedinLink && <div className="w-48 flex-shrink-0">Linkedin Link</div>}
              {visibleColumns.facebookLink && <div className="w-48 flex-shrink-0">Facebook Link</div>}
              {visibleColumns.numberOfInvestments && <div className="w-48 flex-shrink-0">Number Of Investments</div>}
              {visibleColumns.numberOfExits && <div className="w-48 flex-shrink-0">Number Of Exits</div>}
              {visibleColumns.fundDescription && <div className="w-48 flex-shrink-0">Fund Description</div>}
              {visibleColumns.foundingYear && <div className="w-48 flex-shrink-0">Founding Year</div>}
              <div className="w-24 flex-shrink-0">Actions</div>
            </div>
            
            <Form form={form} onFinish={handleSubmit}>
              {formRows.map((row) => (
                <div key={row} className="flex gap-4 mb-4 min-w-max">
                  {visibleColumns.partnerEmail && (
                    <Form.Item name={`partnerEmail_${row}`} className="w-48 flex-shrink-0">
                      <Input placeholder="Partner Email" />
                    </Form.Item>
                  )}
                  {visibleColumns.investorName && (
                    <Form.Item name={`investorName_${row}`} className="w-48 flex-shrink-0">
                      <Input placeholder="Investor Name" />
                    </Form.Item>
                  )}
                  {visibleColumns.partnerName && (
                    <Form.Item name={`partnerName_${row}`} className="w-48 flex-shrink-0">
                      <Input placeholder="Partner Name" />
                    </Form.Item>
                  )}
                  {visibleColumns.fundType && (
                    <Form.Item name={`fundType_${row}`} className="w-48 flex-shrink-0">
                      <Input placeholder="Fund Type" />
                    </Form.Item>
                  )}
                  {visibleColumns.fundStage && (
                    <Form.Item name={`fundStage_${row}`} className="w-48 flex-shrink-0">
                      <Input placeholder="Fund Stage" />
                    </Form.Item>
                  )}
                  {visibleColumns.website && (
                    <Form.Item name={`website_${row}`} className="w-48 flex-shrink-0">
                      <Input placeholder="Website" />
                    </Form.Item>
                  )}
                  {visibleColumns.fundFocus && (
                    <Form.Item name={`fundFocus_${row}`} className="w-48 flex-shrink-0">
                      <Input placeholder="Fund Focus" />
                    </Form.Item>
                  )}
                  {visibleColumns.portfolioCompanies && (
                    <Form.Item name={`portfolioCompanies_${row}`} className="w-48 flex-shrink-0">
                      <Input placeholder="Portfolio Companies" />
                    </Form.Item>
                  )}
                  {visibleColumns.location && (
                    <Form.Item name={`location_${row}`} className="w-48 flex-shrink-0">
                      <Input placeholder="Location" />
                    </Form.Item>
                  )}
                  {visibleColumns.twitterLink && (
                    <Form.Item name={`twitterLink_${row}`} className="w-48 flex-shrink-0">
                      <Input placeholder="Twitter Link" />
                    </Form.Item>
                  )}
                  {visibleColumns.linkedinLink && (
                    <Form.Item name={`linkedinLink_${row}`} className="w-48 flex-shrink-0">
                      <Input placeholder="Linkedin Link" />
                    </Form.Item>
                  )}
                  {visibleColumns.facebookLink && (
                    <Form.Item name={`facebookLink_${row}`} className="w-48 flex-shrink-0">
                      <Input placeholder="Facebook Link" />
                    </Form.Item>
                  )}
                  {visibleColumns.numberOfInvestments && (
                    <Form.Item name={`numberOfInvestments_${row}`} className="w-48 flex-shrink-0">
                      <Input placeholder="Number Of Investments" />
                    </Form.Item>
                  )}
                  {visibleColumns.numberOfExits && (
                    <Form.Item name={`numberOfExits_${row}`} className="w-48 flex-shrink-0">
                      <Input placeholder="Number Of Exits" />
                    </Form.Item>
                  )}
                  {visibleColumns.fundDescription && (
                    <Form.Item name={`fundDescription_${row}`} className="w-48 flex-shrink-0">
                      <Input placeholder="Fund Description" />
                    </Form.Item>
                  )}
                  {visibleColumns.foundingYear && (
                    <Form.Item name={`foundingYear_${row}`} className="w-48 flex-shrink-0">
                      <Input placeholder="Founding Year" />
                    </Form.Item>
                  )}
                  <div className="flex items-center justify-center gap-1 w-24 flex-shrink-0">
                    {editingRows.includes(row) ? (
                      <Button 
                        type="text" 
                        icon={<SaveOutlined />} 
                        onClick={() => saveRow(row)}
                        className="text-green-500 hover:text-green-700"
                        size="small"
                      />
                    ) : (
                      <Button 
                        type="text" 
                        icon={<EditOutlined />} 
                        onClick={() => toggleEditRow(row)}
                        className="text-blue-500 hover:text-blue-700"
                        size="small"
                      />
                    )}
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
                  htmlType="submit"
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
            </Form>
          </div>
        </Modal>
      )}
    </div>
  );
}