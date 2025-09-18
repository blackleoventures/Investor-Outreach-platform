"use client";

import React, { useState } from 'react';
import { Upload, Button, message, Progress, Card, Typography, Alert } from 'antd';
import { InboxOutlined, FileExcelOutlined, FilePdfOutlined, FileTextOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Dragger } = Upload;
const { Title, Text } = Typography;

interface UploadStats {
  success: boolean;
  message: string;
  fileType: string;
  recordsProcessed: number;
  uploadedAt: string;
}

const InvestorFileUpload: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStats, setUploadStats] = useState<UploadStats | null>(null);

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setUploadProgress(0);
    setUploadStats(null);

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/investors/upload-file`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 1)
            );
            setUploadProgress(progress);
          },
        }
      );

      setUploadStats(response.data);
      message.success(response.data.message);
    } catch (error: any) {
      console.error('Upload error:', error);
      message.error(
        error.response?.data?.error || 'Failed to upload file'
      );
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: '.csv,.xlsx,.xls,.json',
    beforeUpload: (file: File) => {
      const isValidType = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/json'
      ].includes(file.type) || file.name.match(/\.(csv|xlsx|xls|json)$/i);

      if (!isValidType) {
        message.error('Please upload CSV, Excel, or JSON files only!');
        return false;
      }

      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('File must be smaller than 10MB!');
        return false;
      }

      handleUpload(file);
      return false; // Prevent default upload
    },
    onDrop(e: any) {
      console.log('Dropped files', e.dataTransfer.files);
    },
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'xlsx':
      case 'xls':
        return <FileExcelOutlined style={{ color: '#52c41a' }} />;
      case 'csv':
        return <FileTextOutlined style={{ color: '#1890ff' }} />;
      case 'json':
        return <FilePdfOutlined style={{ color: '#722ed1' }} />;
      default:
        return <InboxOutlined />;
    }
  };

  return (
    <div className="investor-file-upload">
      <Card>
        <Title level={3}>Upload Investor Data</Title>
        <Text type="secondary">
          Upload investor data in CSV, Excel (.xlsx/.xls), or JSON format
        </Text>

        <div style={{ margin: '20px 0' }}>
          <Dragger {...uploadProps} disabled={uploading}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">
              Click or drag file to this area to upload
            </p>
            <p className="ant-upload-hint">
              Support for CSV, Excel (.xlsx/.xls), and JSON files. 
              Maximum file size: 10MB
            </p>
          </Dragger>
        </div>

        {uploading && (
          <div style={{ margin: '20px 0' }}>
            <Progress 
              percent={uploadProgress} 
              status="active"
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
            <Text>Uploading and processing file...</Text>
          </div>
        )}

        {uploadStats && (
          <Alert
            message="Upload Successful!"
            description={
              <div>
                <p><strong>File Type:</strong> {uploadStats.fileType.toUpperCase()}</p>
                <p><strong>Records Processed:</strong> {uploadStats.recordsProcessed}</p>
                <p><strong>Upload Time:</strong> {new Date(uploadStats.uploadedAt).toLocaleString()}</p>
              </div>
            }
            type="success"
            showIcon
            icon={getFileIcon(uploadStats.fileType)}
            style={{ marginTop: 20 }}
          />
        )}

        <div style={{ marginTop: 20 }}>
          <Title level={5}>Supported File Formats:</Title>
          <ul>
            <li><FileTextOutlined style={{ color: '#1890ff' }} /> <strong>CSV:</strong> Comma-separated values with headers</li>
            <li><FileExcelOutlined style={{ color: '#52c41a' }} /> <strong>Excel:</strong> .xlsx or .xls files with data in first sheet</li>
            <li><FilePdfOutlined style={{ color: '#722ed1' }} /> <strong>JSON:</strong> Array of investor objects</li>
          </ul>
        </div>

        <div style={{ marginTop: 20 }}>
          <Title level={5}>Required Fields:</Title>
          <Text code>partner_email</Text> is required for all records.
        </div>
      </Card>
    </div>
  );
};

export default InvestorFileUpload;