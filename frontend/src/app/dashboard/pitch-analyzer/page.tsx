'use client';

import { useState } from 'react';
import { Upload, Card, Button, Spin, Alert, Typography, Progress, Tag } from 'antd';
import { InboxOutlined, MailOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

export default function PitchAnalyzer() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [enhancing, setEnhancing] = useState(false);
  const [enhancedEmails, setEnhancedEmails] = useState(null);

  const handleUpload = async (file) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setUploadedFile(file);

    const formData = new FormData();
    formData.append('deck', file);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/ai/analyze-deck`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Analysis failed');
      
      const data = await response.json();
      setResult(data.data);
    } catch (err) {
      setError(err.message);
      setUploadedFile(null);
    } finally {
      setLoading(false);
    }

    return false;
  };

  const handleEnhanceEmail = async () => {
    if (!result?.email) return;
    
    setEnhancing(true);
    setEnhancedEmails(null);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/ai/enhance-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalEmail: result.email,
          pitchData: result.rawTextPreview || '',
        }),
      });

      if (!response.ok) throw new Error('Enhancement failed');
      
      const data = await response.json();
      setEnhancedEmails(data.data);
    } catch (err) {
      setError('Email enhancement failed: ' + err.message);
    } finally {
      setEnhancing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'green': return 'success';
      case 'yellow': return 'warning';
      case 'red': return 'error';
      default: return 'default';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Title level={2}>AI Pitch Deck Analyzer</Title>
      <Text type="secondary">Upload your pitch deck for AI-powered investor analysis</Text>

      <Card className="mt-6">
        <Dragger
          beforeUpload={handleUpload}
          accept=".pdf,.pptx,.txt,.md,.docx"
          showUploadList={false}
          disabled={loading}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Click or drag pitch deck to upload</p>
          <p className="ant-upload-hint">Supports PDF, PPTX, TXT, MD, DOCX files</p>
        </Dragger>
        
        {uploadedFile && (
          <div className="mt-4 p-3 bg-blue-50 rounded border">
            <Text strong>Uploaded File: </Text>
            <Text>{uploadedFile.name}</Text>
            <Text type="secondary" className="ml-2">({(uploadedFile.size / 1024).toFixed(1)} KB)</Text>
          </div>
        )}
      </Card>

      {loading && (
        <Card className="mt-6 text-center">
          <Spin size="large" />
          <p className="mt-4">Analyzing your pitch deck...</p>
        </Card>
      )}

      {error && (
        <Alert className="mt-6" message="Analysis Error" description={error} type="error" showIcon />
      )}

      {result && (
        <div className="mt-6 space-y-6">
          {(result.schema || result.analysis) && (
            <Card title={result.schema ? "AI Analysis Results" : "Analysis Results"}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Title level={4}>Overall Score</Title>
                  <div className="flex items-center gap-4">
                    <Progress
                      type="circle"
                      percent={result.schema?.summary?.total_score || result.analysis?.total || 0}
                      format={(percent) => `${percent}/100`}
                    />
                    <Tag color={getStatusColor(result.schema?.summary?.status || result.analysis?.status)} size="large">
                      {result.schema?.summary?.status || result.analysis?.status?.toUpperCase() || 'N/A'}
                    </Tag>
                  </div>
                </div>

                <div>
                  <Title level={4}>Key Highlights</Title>
                  {(result.schema?.highlights || ['Analysis completed', 'Scores calculated', 'Feedback generated']).map((highlight, idx) => (
                    <Tag key={idx} className="mb-2 block">{highlight}</Tag>
                  ))}
                </div>
              </div>

              {(result.schema?.scorecard || result.analysis?.breakdown) && (
                <div className="mt-6">
                  <Title level={4}>Detailed Scorecard</Title>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.schema?.scorecard ? 
                      Object.entries(result.schema.scorecard).map(([criterion, score]) => (
                        <div key={criterion} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <Text>{criterion}</Text>
                          <Tag color={score >= 7 ? 'green' : score >= 4 ? 'orange' : 'red'}>
                            {score}/10
                          </Tag>
                        </div>
                      )) :
                      result.analysis?.breakdown?.map((item) => (
                        <div key={item.key} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <Text>{item.name}</Text>
                          <Tag color={item.score >= 7 ? 'green' : item.score >= 4 ? 'orange' : 'red'}>
                            {item.score}/10
                          </Tag>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}

              {(result.schema?.suggested_questions || result.analysis?.questions) && (
                <div className="mt-6">
                  <Title level={4}>Suggested Investor Questions</Title>
                  <ul className="list-disc pl-6">
                    {(result.schema?.suggested_questions || result.analysis?.questions)?.map((q, idx) => (
                      <li key={idx} className="mb-2">{q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )}

          {result.email && (
            <Card 
              title={<><MailOutlined /> Generated Email Template</>}
              extra={
                <div className="flex gap-2">
                  <Button 
                    onClick={() => navigator.clipboard.writeText(`${result.email.subject}\n\n${result.email.body}`)}
                  >
                    Copy Email
                  </Button>
                  <Button 
                    type="primary"
                    style={{ backgroundColor: '#1890ff', borderColor: '#1890ff' }}
                    onClick={() => handleEnhanceEmail()}
                    loading={enhancing}
                  >
                    Enhance Email
                  </Button>
                </div>
              }
            >
              <div className="space-y-4">
                <div>
                  <Text strong>Subject:</Text>
                  <Paragraph copyable className="mt-2 p-3 bg-gray-50 rounded">
                    {result.email.subject}
                  </Paragraph>
                </div>
                <div>
                  <Text strong>Body:</Text>
                  <Paragraph copyable className="mt-2 p-3 bg-gray-50 rounded whitespace-pre-wrap">
                    {result.email.body}
                  </Paragraph>
                </div>
              </div>
            </Card>
          )}

          {enhancedEmails && (
            <Card title="Enhanced Email Options" className="mt-6">
              <div className="space-y-6">
                {enhancedEmails.options?.map((email, idx) => (
                  <div key={idx} className="border rounded p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-3">
                        <Text strong>Option {idx + 1}: {email.style}</Text>
                        <Tag color={email.score >= 85 ? 'green' : email.score >= 70 ? 'orange' : 'blue'} size="large">
                          {email.score}/100
                        </Tag>
                      </div>
                      <Button 
                        size="small"
                        onClick={() => navigator.clipboard.writeText(`${email.subject}\n\n${email.body}`)}
                      >
                        Copy
                      </Button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Text type="secondary">Subject:</Text>
                        <div className="mt-1 p-2 bg-gray-50 rounded text-sm">
                          {email.subject}
                        </div>
                      </div>
                      <div>
                        <Text type="secondary">Body:</Text>
                        <div className="mt-1 p-2 bg-gray-50 rounded text-sm whitespace-pre-wrap">
                          {email.body}
                        </div>
                      </div>
                      {email.improvements && (
                        <div>
                          <Text type="secondary">Key Improvements:</Text>
                          <ul className="mt-1 text-sm text-gray-600">
                            {email.improvements.map((improvement, i) => (
                              <li key={i} className="ml-4">• {improvement}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {result.analysis?.summary && (
            <Card title="Analysis Summary" className="mt-6">
              <Paragraph className="whitespace-pre-wrap">{result.analysis.summary}</Paragraph>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}