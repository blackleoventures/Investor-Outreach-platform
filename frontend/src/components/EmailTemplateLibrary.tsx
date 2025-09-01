"use client";

import React, { useState, useEffect } from "react";
import { Card, Input, Select, Button, Tag, Modal, message, Spin, Empty } from "antd";
import { SearchOutlined, PlusOutlined, CopyOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";

const { Search } = Input;
const { Option } = Select;

interface EmailTemplate {
  _id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  variables: Array<{
    name: string;
    description: string;
    defaultValue: string;
    required: boolean;
  }>;
  tone: string;
  isPreBuilt: boolean;
  usageCount: number;
  tags: string[];
}

interface EmailTemplateLibraryProps {
  onTemplateSelect?: (template: EmailTemplate) => void;
  companyId?: string;
}

export default function EmailTemplateLibrary({ onTemplateSelect, companyId }: EmailTemplateLibraryProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedTone, setSelectedTone] = useState<string>("");
  const [previewModal, setPreviewModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [tones, setTones] = useState<string[]>([]);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "/api";

  useEffect(() => {
    loadMockData();
  }, [companyId]);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchQuery, selectedCategory, selectedTone]);

  const loadMockData = () => {
    setLoading(true);
    
    // Mock templates data
    const mockTemplates: EmailTemplate[] = [
      {
        _id: '1',
        name: 'Initial Investor Outreach',
        category: 'Initial Outreach',
        subject: 'Investment Opportunity in {{company_name}} - {{industry}} Startup',
        body: `Hi {{investor_name}},\n\nI hope this email finds you well. I'm {{founder_name}}, founder of {{company_name}}, and I'm reaching out because your investment focus aligns perfectly with our mission.\n\nWe're building {{company_description}} and have achieved {{key_traction}}. We're currently raising {{funding_amount}} to {{use_of_funds}}.\n\nI'd love to share our pitch deck and discuss how {{company_name}} fits into your portfolio.\n\nBest regards,\n{{founder_name}}`,
        variables: [
          { name: 'investor_name', description: 'Investor\'s name', defaultValue: '', required: true },
          { name: 'company_name', description: 'Your company name', defaultValue: '', required: true },
          { name: 'founder_name', description: 'Your name', defaultValue: '', required: true }
        ],
        tone: 'Professional',
        isPreBuilt: true,
        usageCount: 45,
        tags: ['startup', 'funding', 'pitch']
      },
      {
        _id: '2',
        name: 'Follow-up After Pitch',
        category: 'Follow-up',
        subject: 'Following up on {{company_name}} - Additional Information',
        body: `Hi {{investor_name}},\n\nThank you for taking the time to review our pitch deck. I wanted to follow up and provide some additional information you requested.\n\n{{additional_info}}\n\nI'm happy to schedule a call to discuss any questions you might have.\n\nLooking forward to hearing from you.\n\nBest,\n{{founder_name}}`,
        variables: [
          { name: 'investor_name', description: 'Investor\'s name', defaultValue: '', required: true },
          { name: 'additional_info', description: 'Additional information', defaultValue: '', required: false }
        ],
        tone: 'Friendly',
        isPreBuilt: true,
        usageCount: 23,
        tags: ['follow-up', 'information']
      },
      {
        _id: '3',
        name: 'Thank You Note',
        category: 'Thank You',
        subject: 'Thank you for your time - {{company_name}}',
        body: `Dear {{investor_name}},\n\nThank you for taking the time to meet with us and learn about {{company_name}}. Your insights and questions were incredibly valuable.\n\n{{meeting_recap}}\n\nWe appreciate your consideration and look forward to the possibility of working together.\n\nWarm regards,\n{{founder_name}}`,
        variables: [
          { name: 'investor_name', description: 'Investor\'s name', defaultValue: '', required: true },
          { name: 'meeting_recap', description: 'Brief meeting recap', defaultValue: '', required: false }
        ],
        tone: 'Professional',
        isPreBuilt: true,
        usageCount: 12,
        tags: ['thank-you', 'meeting']
      }
    ];
    
    const mockCategories = ['Initial Outreach', 'Follow-up', 'Thank You', 'Investor Update'];
    const mockTones = ['Professional', 'Friendly', 'Persuasive', 'Casual'];
    
    setTimeout(() => {
      setTemplates(mockTemplates);
      setCategories(mockCategories);
      setTones(mockTones);
      setLoading(false);
    }, 500);
  };

  const filterTemplates = () => {
    let filtered = [...templates];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(query) ||
        template.subject.toLowerCase().includes(query) ||
        template.body.toLowerCase().includes(query) ||
        template.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    if (selectedTone) {
      filtered = filtered.filter(template => template.tone === selectedTone);
    }

    setFilteredTemplates(filtered);
  };

  const handleTemplateSelect = (template: EmailTemplate) => {
    if (onTemplateSelect) {
      onTemplateSelect(template);
    }
  };

  const handlePreview = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setPreviewModal(true);
  };

  const handleDuplicate = (template: EmailTemplate) => {
    const duplicatedTemplate: EmailTemplate = {
      ...template,
      _id: Date.now().toString(),
      name: `${template.name} (Copy)`,
      isPreBuilt: false,
      usageCount: 0
    };
    
    setTemplates(prev => [duplicatedTemplate, ...prev]);
    message.success("Template duplicated successfully");
  };

  const handleDelete = (template: EmailTemplate) => {
    if (template.isPreBuilt) {
      message.warning("Cannot delete pre-built templates");
      return;
    }

    setTemplates(prev => prev.filter(t => t._id !== template._id));
    message.success("Template deleted successfully");
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      "Initial Outreach": "blue",
      "Follow-up": "orange",
      "Thank You": "green",
      "Investor Update": "purple",
      "Custom": "default",
    };
    return colors[category] || "default";
  };

  const getToneColor = (tone: string) => {
    const colors: Record<string, string> = {
      "Professional": "blue",
      "Persuasive": "red",
      "Friendly": "green",
      "Casual": "orange",
    };
    return colors[tone] || "default";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Email Template Library</h2>
          <p className="text-gray-600">Choose from pre-built templates or create your own</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />}>
          Create Template
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Search
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            prefix={<SearchOutlined />}
          />
          
          <Select
            placeholder="All Categories"
            value={selectedCategory}
            onChange={setSelectedCategory}
            allowClear
          >
            {categories.map(category => (
              <Option key={category} value={category}>{category}</Option>
            ))}
          </Select>
          
          <Select
            placeholder="All Tones"
            value={selectedTone}
            onChange={setSelectedTone}
            allowClear
          >
            {tones.map(tone => (
              <Option key={tone} value={tone}>{tone}</Option>
            ))}
          </Select>
          
          <Button onClick={loadMockData} loading={loading}>
            Refresh
          </Button>
        </div>
      </Card>

      {/* Templates Grid */}
      {loading ? (
        <div className="text-center py-20">
          <Spin size="large" />
          <p className="mt-4 text-gray-600">Loading templates...</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Empty
          description="No templates found"
          className="py-20"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card
              key={template._id}
              hoverable
              className="h-full"
              actions={[
                <Button
                  key="preview"
                  type="text"
                  icon={<EyeOutlined />}
                  onClick={() => handlePreview(template)}
                >
                  Preview
                </Button>,
                <Button
                  key="select"
                  type="primary"
                  onClick={() => handleTemplateSelect(template)}
                >
                  Use Template
                </Button>,
                <Button
                  key="duplicate"
                  type="text"
                  icon={<CopyOutlined />}
                  onClick={() => handleDuplicate(template)}
                >
                  Duplicate
                </Button>,
                !template.isPreBuilt && (
                  <Button
                    key="delete"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(template)}
                  >
                    Delete
                  </Button>
                ),
              ].filter(Boolean)}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-lg text-gray-800 line-clamp-2">
                    {template.name}
                  </h3>
                  {template.isPreBuilt && (
                    <Tag color="blue">Pre-built</Tag>
                  )}
                </div>
                
                <p className="text-gray-600 text-sm line-clamp-2">
                  {template.subject}
                </p>
                
                <div className="flex flex-wrap gap-2">
                  <Tag color={getCategoryColor(template.category)}>
                    {template.category}
                  </Tag>
                  <Tag color={getToneColor(template.tone)}>
                    {template.tone}
                  </Tag>
                  {template.tags.slice(0, 2).map((tag, index) => (
                    <Tag key={index} color="default">
                      {tag}
                    </Tag>
                  ))}
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Used {template.usageCount} times</span>
                  {template.variables.length > 0 && (
                    <span>{template.variables.length} variables</span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      <Modal
        title={`Preview: ${selectedTemplate?.name}`}
        open={previewModal}
        onCancel={() => setPreviewModal(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewModal(false)}>
            Close
          </Button>,
          selectedTemplate && (
            <Button
              key="use"
              type="primary"
              onClick={() => {
                handleTemplateSelect(selectedTemplate);
                setPreviewModal(false);
              }}
            >
              Use This Template
            </Button>
          ),
        ]}
        width={800}
      >
        {selectedTemplate && (
          <div className="space-y-4">
            <div>
              <strong>Subject:</strong>
              <p className="mt-1 p-2 bg-gray-50 rounded">{selectedTemplate.subject}</p>
            </div>
            
            <div>
              <strong>Body:</strong>
              <div className="mt-1 p-3 bg-gray-50 rounded max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm">{selectedTemplate.body}</pre>
              </div>
            </div>
            
            {selectedTemplate.variables.length > 0 && (
              <div>
                <strong>Variables:</strong>
                <div className="mt-1 space-y-2">
                  {selectedTemplate.variables.map((variable, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{variable.name}:</span>
                      <span className="text-gray-600">{variable.description}</span>
                      {variable.required && <Tag color="red" size="small">Required</Tag>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
} 