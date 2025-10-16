"use client";

import { useState } from "react";
import {
  Card,
  Upload,
  message,
  Progress,
  Divider,
  Space,
  Typography,
  Row,
  Col,
  Button,
} from "antd";
import {
  UploadOutlined,
  FileTextOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  RobotOutlined,
  BarChartOutlined,
  QuestionCircleOutlined,
  BulbOutlined,
  SendOutlined,
  CopyOutlined,
  MailOutlined,
} from "@ant-design/icons";
import type { UploadProps } from "antd";

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

const BACKEND_URL = "http://localhost:5000/api/ai/analyze-pitch";

interface PitchAnalysis {
  summary: {
    problem: string;
    solution: string;
    market: string;
    traction: string;
    status: "RED" | "YELLOW" | "GREEN";
    total_score: number;
  };
  scorecard: Record<string, number>;
  suggested_questions: string[];
  highlights: string[];
  email_subject: string;
  email_body: string;
}

interface AIPitchAnalysisProps {
  onTemplateGenerated?: (template: { subject: string; body: string }) => void;
}

export default function AIPitchAnalysis({
  onTemplateGenerated,
}: AIPitchAnalysisProps) {
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [pitchAnalysis, setPitchAnalysis] = useState<PitchAnalysis | null>(
    null
  );
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [extractedText, setExtractedText] = useState<string>("");

  // Simple text file parsing
  const parseTextFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (!text || text.trim().length === 0) {
          reject(
            new Error(
              "The text file appears to be empty. Please check the file and try again."
            )
          );
          return;
        }
        resolve(text);
      };
      reader.onerror = () =>
        reject(
          new Error(
            "Failed to read the text file. Please check that the file is not corrupted and try again."
          )
        );
      reader.readAsText(file, "UTF-8");
    });
  };

  // PDF parsing using only react-pdftotext (reliable and simple)
  const parsePDFFile = async (file: File): Promise<string> => {
    try {
      console.log("Starting PDF text extraction with react-pdftotext...");

      // Dynamic import of react-pdftotext to avoid SSR issues
      const { default: pdfToText } = await import("react-pdftotext");

      const text = await pdfToText(file);

      if (!text || text.trim().length === 0) {
        throw new Error(
          "We couldn't extract any text from this PDF. The file might be image-based, scanned, or contain only graphics."
        );
      }

      console.log(
        "PDF text extracted successfully:",
        text.length,
        "characters"
      );
      return text.trim();
    } catch (error: any) {
      console.error("PDF parsing error:", error);

      // Handle specific error cases
      if (error.message && error.message.includes("Failed to extract")) {
        throw new Error(
          "We couldn't extract text from this PDF. It might be image-based, password protected, or corrupted."
        );
      } else if (error.message && error.message.includes("Invalid")) {
        throw new Error(
          "This doesn't appear to be a valid PDF file. Please check the file and try again."
        );
      } else if (error.name === "InvalidPDFException") {
        throw new Error(
          "Invalid PDF format. Please ensure the file is a valid PDF document."
        );
      } else if (error.name === "PasswordException") {
        throw new Error(
          "This PDF is password protected. Please use an unprotected PDF file."
        );
      } else {
        throw new Error(
          "Unable to process the PDF file. Please ensure it's a text-based PDF document."
        );
      }
    }
  };

  // Word document parsing
  const parseWordFile = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();

      // Dynamic import to avoid SSR issues
      const { default: mammoth } = await import("mammoth");

      const result = await mammoth.extractRawText({ arrayBuffer });

      if (!result.value || result.value.trim().length === 0) {
        throw new Error(
          "The Word document appears to be empty or we couldn't extract any text from it."
        );
      }

      // Log any conversion messages/warnings
      if (result.messages && result.messages.length > 0) {
        console.log("Word extraction messages:", result.messages);
      }

      return result.value.trim();
    } catch (error: any) {
      if (error.message.includes("not a valid")) {
        throw new Error(
          "This file doesn't appear to be a valid Word document. Please check the file format."
        );
      } else if (error.message.includes("corrupted")) {
        throw new Error(
          "The Word document appears to be corrupted. Please try with a different file."
        );
      } else {
        throw new Error(
          "We couldn't read the Word document. Please check that it's not corrupted and try again."
        );
      }
    }
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    // File size validation (10MB limit)
    const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSizeInBytes) {
      throw new Error(
        `File size is too large (${(file.size / 1024 / 1024).toFixed(
          1
        )}MB). Please use a file smaller than 10MB.`
      );
    }

    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    try {
      let extractedText = "";

      if (fileExtension === "txt") {
        extractedText = await parseTextFile(file);
      } else if (fileExtension === "pdf") {
        extractedText = await parsePDFFile(file);
      } else if (fileExtension === "doc" || fileExtension === "docx") {
        extractedText = await parseWordFile(file);
      } else {
        throw new Error(
          `Unsupported file type: .${fileExtension}. Please use PDF, Word (.doc, .docx), or Text (.txt) files.`
        );
      }

      // Validate extracted content
      if (!extractedText || extractedText.trim().length < 10) {
        throw new Error(
          "The file doesn't contain enough readable text. Please check the file content and try again."
        );
      }

      // Console log the extracted data
      console.log("=== EXTRACTED FILE DATA ===");
      console.log("File Name:", file.name);
      console.log("File Size:", (file.size / 1024).toFixed(1), "KB");
      console.log("File Type:", file.type || fileExtension?.toUpperCase());
      console.log("Extracted Text Length:", extractedText.length, "characters");
      console.log("First 500 characters:");
      console.log(extractedText.substring(0, 500));
      console.log("=========================");

      return extractedText;
    } catch (error: any) {
      console.error("File extraction error:", error);
      throw error;
    }
  };

  // Real API call for analysis
  const callAnalysisAPI = async (
    extractedText: string,
    fileName: string
  ): Promise<PitchAnalysis> => {
    try {
      console.log("=== API CALL ===");
      console.log("Endpoint:", BACKEND_URL);
      console.log("Method: POST");
      console.log("Payload:", {
        fileName,
        textLength: extractedText.length,
      });

      const response = await fetch(BACKEND_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName,
          textContent: extractedText,
        }),
      });

      console.log("Response Status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error("API Error Response:", errorData);

        // Handle specific error responses
        if (response.status === 429) {
          throw new Error(
            errorData?.message ||
              "Our AI service is currently at capacity. Please try again in a few minutes."
          );
        } else if (response.status === 503) {
          throw new Error(
            errorData?.message ||
              "The AI analysis service is temporarily unavailable. Please try again shortly."
          );
        } else if (response.status === 400) {
          throw new Error(
            errorData?.message ||
              "Invalid file content. Please ensure your pitch deck contains sufficient text."
          );
        } else if (response.status === 500) {
          throw new Error(
            errorData?.message ||
              "An error occurred during analysis. Please try again."
          );
        } else {
          throw new Error(
            errorData?.message ||
              "Failed to analyze the pitch deck. Please try again."
          );
        }
      }

      const result = await response.json();
      console.log("API Response received successfully");
      console.log("========================");

      if (!result.success || !result.data) {
        throw new Error(
          result.message || "Failed to receive analysis data from the server."
        );
      }

      return result.data as PitchAnalysis;
    } catch (error: any) {
      console.error("API Call Error:", error);

      // Network errors
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        throw new Error(
          "Unable to connect to the analysis service. Please check your internet connection and try again."
        );
      }

      // Re-throw the error with the message
      throw error;
    }
  };

  const handleFileUpload = async (file: File) => {
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    const allowedExtensions = ["pdf", "doc", "docx", "txt"];

    // Validate file type
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      message.error(
        `Unsupported file type. Please upload PDF, Word (.doc, .docx), or Text (.txt) files only.`
      );
      return false;
    }

    // Validate file size before processing
    const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSizeInBytes) {
      message.error(
        `File is too large (${(file.size / 1024 / 1024).toFixed(
          1
        )}MB). Please use a file smaller than 10MB.`
      );
      return false;
    }

    setAnalysisLoading(true);
    setUploadedFileName(file.name);
    setPitchAnalysis(null);
    setExtractedText("");

    try {
      // Step 1: Extract text from file
      message.loading("Processing file...", 0);
      const extractedText = await extractTextFromFile(file);

      // Step 2: Show extracted text preview
      setExtractedText(extractedText);
      message.destroy();
      message.success(
        `File processed successfully. Extracted ${extractedText.length} characters of text.`
      );

      // Step 3: Call real API for analysis
      message.loading(
        "Analyzing content with AI... This may take a moment.",
        0
      );
      const analysis = await callAnalysisAPI(extractedText, file.name);

      // Step 4: Set analysis results
      setPitchAnalysis(analysis);
      message.destroy();
      message.success("Analysis completed successfully!");
    } catch (error: any) {
      console.error("File processing error:", error);
      message.destroy();

      // Display user-friendly error messages
      message.error(
        error.message ||
          "Something went wrong while processing your file. Please try again."
      );
    } finally {
      setAnalysisLoading(false);
    }

    return false;
  };

  const uploadProps: UploadProps = {
    name: "file",
    multiple: false,
    accept: ".pdf,.doc,.docx,.txt",
    beforeUpload: handleFileUpload,
    showUploadList: false,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "GREEN":
        return (
          <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 48 }} />
        );
      case "YELLOW":
        return <WarningOutlined style={{ color: "#faad14", fontSize: 48 }} />;
      case "RED":
        return (
          <CloseCircleOutlined style={{ color: "#ff4d4f", fontSize: 48 }} />
        );
      default:
        return (
          <CheckCircleOutlined style={{ color: "#1890ff", fontSize: 48 }} />
        );
    }
  };

  const getProgressColor = (score: number) => {
    if (score >= 70) return "#52c41a";
    if (score >= 40) return "#faad14";
    return "#ff4d4f";
  };

  const handleCopySubject = () => {
    if (pitchAnalysis?.email_subject) {
      navigator.clipboard.writeText(pitchAnalysis.email_subject);
      message.success("Email subject copied to clipboard!");
    }
  };

  const handleCopyBody = () => {
    if (pitchAnalysis?.email_body) {
      navigator.clipboard.writeText(pitchAnalysis.email_body);
      message.success("Email body copied to clipboard!");
    }
  };

  const handleUseTemplate = () => {
    if (!pitchAnalysis) return;

    console.log("=== USE TEMPLATE CLICKED ===");
    console.log("Pitch Analysis Data:", pitchAnalysis);
    console.log("Email Subject:", pitchAnalysis.email_subject);
    console.log("Email Body:", pitchAnalysis.email_body);

    if (onTemplateGenerated) {
      const template = {
        subject: pitchAnalysis.email_subject,
        body: pitchAnalysis.email_body,
      };

      console.log("Calling onTemplateGenerated with:", template);
      onTemplateGenerated(template);
    } else {
      console.warn("onTemplateGenerated callback is not defined!");
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#ffffff" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        {/* Header Section */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ marginBottom: 24 }}>
            <RobotOutlined style={{ fontSize: 64, color: "#1890ff" }} />
          </div>
          <Title level={1} style={{ color: "#000000", marginBottom: 16 }}>
            AI-Powered Pitch Deck Analysis
          </Title>
          <Paragraph
            style={{
              fontSize: 18,
              color: "#000000",
              maxWidth: 800,
              margin: "0 auto 32px",
            }}
          >
            Upload your pitch deck to receive instant investment readiness
            scoring, detailed analysis, and actionable insights powered by
            artificial intelligence.
          </Paragraph>
        </div>

        {/* Upload Section */}
        <Card
          style={{
            marginBottom: 32,
            border: "1px solid #000000",
            borderRadius: 8,
          }}
        >
          <Dragger {...uploadProps} style={{ padding: 32 }}>
            <p className="ant-upload-drag-icon">
              <UploadOutlined style={{ color: "#1890ff", fontSize: 48 }} />
            </p>
            <Title level={4} style={{ color: "#000000", marginBottom: 8 }}>
              Click or drag file to upload
            </Title>
            <Text style={{ color: "#000000", fontSize: 16 }}>
              Supported formats: PDF, Word (.doc, .docx), Text (.txt) | Max
              size: 10MB
            </Text>
          </Dragger>

          {analysisLoading && (
            <div style={{ textAlign: "center", marginTop: 32 }}>
              <LoadingOutlined
                style={{ fontSize: 48, color: "#1890ff", marginBottom: 16 }}
              />
              <div>
                <Text strong style={{ fontSize: 18, color: "#000000" }}>
                  Analyzing your pitch deck...
                </Text>
                <Paragraph style={{ color: "#666", marginTop: 8 }}>
                  This may take 10-30 seconds depending on the content length.
                </Paragraph>
              </div>
            </div>
          )}

          {uploadedFileName && !analysisLoading && !pitchAnalysis && (
            <div
              style={{
                marginTop: 24,
                padding: 16,
                backgroundColor: "#f0f0f0",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
              }}
            >
              <FileTextOutlined style={{ fontSize: 24, color: "#1890ff" }} />
              <Text strong style={{ fontSize: 16, color: "#000000" }}>
                {uploadedFileName}
              </Text>
            </div>
          )}
        </Card>

        {/* Analysis Results */}
        {pitchAnalysis && (
          <div>
            {/* Overall Score Card */}
            <Card
              style={{
                marginBottom: 32,
                border: "1px solid #000000",
                borderRadius: 8,
              }}
            >
              <Row gutter={32} align="middle">
                <Col xs={24} md={8} style={{ textAlign: "center" }}>
                  {getStatusIcon(pitchAnalysis.summary.status)}
                  <Title
                    level={2}
                    style={{ color: "#000000", marginTop: 16, marginBottom: 0 }}
                  >
                    {pitchAnalysis.summary.total_score}/100
                  </Title>
                  <Text style={{ fontSize: 16, color: "#000000" }}>
                    Investment Readiness Score
                  </Text>
                </Col>
                <Col xs={24} md={16}>
                  <Progress
                    percent={pitchAnalysis.summary.total_score}
                    strokeColor={getProgressColor(
                      pitchAnalysis.summary.total_score
                    )}
                    strokeWidth={20}
                    style={{ marginBottom: 24 }}
                  />
                  <Space
                    direction="vertical"
                    size="middle"
                    style={{ width: "100%" }}
                  >
                    <div>
                      <Text strong style={{ color: "#000000" }}>
                        Status:{" "}
                      </Text>
                      <Text
                        style={{
                          color:
                            pitchAnalysis.summary.status === "GREEN"
                              ? "#52c41a"
                              : pitchAnalysis.summary.status === "YELLOW"
                              ? "#faad14"
                              : "#ff4d4f",
                          fontSize: 16,
                          fontWeight: 600,
                        }}
                      >
                        {pitchAnalysis.summary.status}
                      </Text>
                    </div>
                  </Space>
                </Col>
              </Row>
            </Card>

            {/* Summary Section */}
            <Card
              title={
                <Space>
                  <FileTextOutlined style={{ color: "#1890ff" }} />
                  <span style={{ color: "#000000" }}>Executive Summary</span>
                </Space>
              }
              style={{
                marginBottom: 32,
                border: "1px solid #000000",
                borderRadius: 8,
              }}
            >
              <Space
                direction="vertical"
                size="large"
                style={{ width: "100%" }}
              >
                <div>
                  <Text strong style={{ color: "#000000", fontSize: 16 }}>
                    Problem
                  </Text>
                  <Paragraph
                    style={{ color: "#000000", marginTop: 8, marginBottom: 0 }}
                  >
                    {pitchAnalysis.summary.problem}
                  </Paragraph>
                </div>
                <Divider style={{ margin: 0 }} />
                <div>
                  <Text strong style={{ color: "#000000", fontSize: 16 }}>
                    Solution
                  </Text>
                  <Paragraph
                    style={{ color: "#000000", marginTop: 8, marginBottom: 0 }}
                  >
                    {pitchAnalysis.summary.solution}
                  </Paragraph>
                </div>
                <Divider style={{ margin: 0 }} />
                <div>
                  <Text strong style={{ color: "#000000", fontSize: 16 }}>
                    Market
                  </Text>
                  <Paragraph
                    style={{ color: "#000000", marginTop: 8, marginBottom: 0 }}
                  >
                    {pitchAnalysis.summary.market}
                  </Paragraph>
                </div>
                <Divider style={{ margin: 0 }} />
                <div>
                  <Text strong style={{ color: "#000000", fontSize: 16 }}>
                    Traction
                  </Text>
                  <Paragraph
                    style={{ color: "#000000", marginTop: 8, marginBottom: 0 }}
                  >
                    {pitchAnalysis.summary.traction}
                  </Paragraph>
                </div>
              </Space>
            </Card>

            {/* Detailed Scorecard */}
            <Card
              title={
                <Space>
                  <BarChartOutlined style={{ color: "#1890ff" }} />
                  <span style={{ color: "#000000" }}>Detailed Scorecard</span>
                </Space>
              }
              style={{
                marginBottom: 32,
                border: "1px solid #000000",
                borderRadius: 8,
              }}
            >
              <Space
                direction="vertical"
                size="large"
                style={{ width: "100%" }}
              >
                {Object.entries(pitchAnalysis.scorecard).map(
                  ([criteria, score]) => (
                    <div key={criteria}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <Text strong style={{ color: "#000000", fontSize: 15 }}>
                          {criteria}
                        </Text>
                        <Text strong style={{ color: "#1890ff", fontSize: 16 }}>
                          {score}/10
                        </Text>
                      </div>
                      <Progress
                        percent={score * 10}
                        strokeColor="#1890ff"
                        trailColor="#f0f0f0"
                        strokeWidth={12}
                        showInfo={false}
                        strokeLinecap="square"
                      />
                    </div>
                  )
                )}
              </Space>
            </Card>

            {/* Two Column Layout for Highlights and Questions */}
            <Row gutter={32}>
              <Col xs={24} lg={12}>
                <Card
                  title={
                    <Space>
                      <BulbOutlined style={{ color: "#1890ff" }} />
                      <span style={{ color: "#000000" }}>Key Highlights</span>
                    </Space>
                  }
                  style={{
                    marginBottom: 32,
                    border: "1px solid #000000",
                    borderRadius: 8,
                    height: "100%",
                  }}
                >
                  <Space
                    direction="vertical"
                    size="middle"
                    style={{ width: "100%" }}
                  >
                    {pitchAnalysis.highlights.map((highlight, index) => (
                      <div
                        key={index}
                        style={{
                          padding: 16,
                          backgroundColor: "#f0f0f0",
                          borderRadius: 8,
                          border: "1px solid #d9d9d9",
                        }}
                      >
                        <Space align="start">
                          <CheckCircleOutlined
                            style={{
                              color: "#1890ff",
                              fontSize: 18,
                              marginTop: 2,
                            }}
                          />
                          <Text style={{ color: "#000000" }}>{highlight}</Text>
                        </Space>
                      </div>
                    ))}
                  </Space>
                </Card>
              </Col>

              <Col xs={24} lg={12}>
                <Card
                  title={
                    <Space>
                      <QuestionCircleOutlined style={{ color: "#1890ff" }} />
                      <span style={{ color: "#000000" }}>
                        Suggested Questions
                      </span>
                    </Space>
                  }
                  style={{
                    marginBottom: 32,
                    border: "1px solid #000000",
                    borderRadius: 8,
                    height: "100%",
                  }}
                >
                  <Space
                    direction="vertical"
                    size="middle"
                    style={{ width: "100%" }}
                  >
                    {pitchAnalysis.suggested_questions.map(
                      (question, index) => (
                        <div
                          key={index}
                          style={{
                            padding: 16,
                            backgroundColor: "#f0f0f0",
                            borderRadius: 8,
                            border: "1px solid #d9d9d9",
                          }}
                        >
                          <Space align="start">
                            <QuestionCircleOutlined
                              style={{
                                color: "#1890ff",
                                fontSize: 18,
                                marginTop: 2,
                              }}
                            />
                            <Text style={{ color: "#000000" }}>{question}</Text>
                          </Space>
                        </div>
                      )
                    )}
                  </Space>
                </Card>
              </Col>
            </Row>

            {/* Email Template Section */}
            <Card
              title={
                <Space>
                  <MailOutlined style={{ color: "#1890ff" }} />
                  <span style={{ color: "#000000" }}>
                    Generated Email Template
                  </span>
                </Space>
              }
              style={{
                marginBottom: 32,
                marginTop: 32,
                border: "1px solid #000000",
                borderRadius: 8,
              }}
            >
              <Space
                direction="vertical"
                size="large"
                style={{ width: "100%" }}
              >
                {/* Email Subject */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <Text strong style={{ color: "#000000", fontSize: 16 }}>
                      Email Subject
                    </Text>
                    <Button
                      icon={<CopyOutlined />}
                      onClick={handleCopySubject}
                      size="small"
                    >
                      Copy Subject
                    </Button>
                  </div>
                  <div
                    style={{
                      padding: 16,
                      backgroundColor: "#f0f0f0",
                      borderRadius: 8,
                      border: "1px solid #d9d9d9",
                    }}
                  >
                    <Text style={{ color: "#000000", fontSize: 15 }}>
                      {pitchAnalysis.email_subject}
                    </Text>
                  </div>
                </div>

                <Divider style={{ margin: 0 }} />

                {/* Email Body */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <Text strong style={{ color: "#000000", fontSize: 16 }}>
                      Email Body
                    </Text>
                    <Button
                      icon={<CopyOutlined />}
                      onClick={handleCopyBody}
                      size="small"
                    >
                      Copy Body
                    </Button>
                  </div>
                  <div
                    style={{
                      padding: 20,
                      backgroundColor: "#f0f0f0",
                      borderRadius: 8,
                      border: "1px solid #d9d9d9",
                      whiteSpace: "pre-wrap",
                      fontFamily: "monospace",
                      fontSize: 14,
                      lineHeight: 1.6,
                    }}
                  >
                    <Text style={{ color: "#000000" }}>
                      {pitchAnalysis.email_body}
                    </Text>
                  </div>
                </div>
              </Space>
            </Card>

            <div style={{ textAlign: "center", marginTop: 48 }}>
              <Button
                type="primary"
                size="large"
                icon={<SendOutlined />}
                onClick={handleUseTemplate}
                style={{
                  backgroundColor: "#1890ff",
                  borderColor: "#1890ff",
                  height: 56,
                  paddingLeft: 40,
                  paddingRight: 40,
                  fontSize: 18,
                  fontWeight: 600,
                  borderRadius: 8,
                }}
              >
                Use this template in Email Composer
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
