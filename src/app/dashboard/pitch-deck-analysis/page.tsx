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
  Empty,
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
  BulbOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import type { UploadProps } from "antd";

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL + "/ai/analyze-pitch";

interface PitchAnalysis {
  fileName?: string;
  analyzedAt?: string;
  summary: {
    problem: string;
    solution: string;
    market: string;
    traction: string;
    status: "RED" | "YELLOW" | "GREEN";
    total_score: number;
  };
  scorecard: Record<string, number>;
  highlights: string[];
}

export default function PitchDeckAnalysisPage() {
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<PitchAnalysis | null>(
    null
  );
  const [uploadedFileName, setUploadedFileName] = useState<string>("");

  const parseTextFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (!text || text.trim().length === 0) {
          reject(new Error("The text file appears to be empty."));
          return;
        }
        resolve(text);
      };
      reader.onerror = () => reject(new Error("Failed to read the text file."));
      reader.readAsText(file, "UTF-8");
    });
  };

  const parsePDFFile = async (file: File): Promise<string> => {
    try {
      const { default: pdfToText } = await import("react-pdftotext");
      const text = await pdfToText(file);
      if (!text || text.trim().length === 0) {
        throw new Error("We couldn't extract any text from this PDF.");
      }
      return text.trim();
    } catch (error: any) {
      throw new Error("Unable to process the PDF file.");
    }
  };

  const parseWordFile = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const { default: mammoth } = await import("mammoth");
      const result = await mammoth.extractRawText({ arrayBuffer });
      if (!result.value || result.value.trim().length === 0) {
        throw new Error("The Word document appears to be empty.");
      }
      return result.value.trim();
    } catch (error: any) {
      throw new Error("We couldn't read the Word document.");
    }
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    const maxSizeInBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      throw new Error(
        "File size is too large. Please use a file smaller than 10MB."
      );
    }

    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    let extractedText = "";

    if (fileExtension === "txt") {
      extractedText = await parseTextFile(file);
    } else if (fileExtension === "pdf") {
      extractedText = await parsePDFFile(file);
    } else if (fileExtension === "doc" || fileExtension === "docx") {
      extractedText = await parseWordFile(file);
    } else {
      throw new Error(`Unsupported file type: .${fileExtension}`);
    }

    if (!extractedText || extractedText.trim().length < 10) {
      throw new Error("The file doesn't contain enough readable text.");
    }

    return extractedText;
  };

  const callAnalysisAPI = async (
    extractedText: string,
    fileName: string
  ): Promise<PitchAnalysis> => {
    try {
      const response = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, textContent: extractedText }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message || "Failed to analyze the pitch deck."
        );
      }

      const result = await response.json();
      if (!result.success || !result.data) {
        throw new Error("Failed to receive analysis data from the server.");
      }

      return result.data as PitchAnalysis;
    } catch (error: any) {
      throw error;
    }
  };

  const handleFileUpload = async (file: File) => {
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    const allowedExtensions = ["pdf", "doc", "docx", "txt"];

    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      message.error(
        "Unsupported file type. Please upload PDF, Word, or Text files only."
      );
      return false;
    }

    const maxSizeInBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      message.error("File is too large. Please use a file smaller than 10MB.");
      return false;
    }

    setAnalysisLoading(true);
    setUploadedFileName(file.name);
    setCurrentAnalysis(null);

    try {
      message.loading("Processing file...", 0);
      const extractedText = await extractTextFromFile(file);

      message.destroy();
      message.success(`File processed successfully!`);

      message.loading(
        "Analyzing content with AI... This may take a moment.",
        0
      );
      const analysis = await callAnalysisAPI(extractedText, file.name);

      const analysisWithMetadata = {
        ...analysis,
        fileName: file.name,
        analyzedAt: new Date().toISOString(),
      };

      setCurrentAnalysis(analysisWithMetadata);

      message.destroy();
      message.success("Analysis completed successfully!");
    } catch (error: any) {
      console.error("File processing error:", error);
      message.destroy();
      message.error(error.message || "Something went wrong.");
      setCurrentAnalysis(null);
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
    disabled: analysisLoading,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "GREEN":
        return (
          <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 24 }} />
        );
      case "YELLOW":
        return <WarningOutlined style={{ color: "#faad14", fontSize: 24 }} />;
      case "RED":
        return (
          <CloseCircleOutlined style={{ color: "#ff4d4f", fontSize: 24 }} />
        );
      default:
        return (
          <CheckCircleOutlined style={{ color: "#1890ff", fontSize: 24 }} />
        );
    }
  };

  const getProgressColor = (score: number) => {
    if (score >= 70) return "#52c41a";
    if (score >= 40) return "#faad14";
    return "#ff4d4f";
  };

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>
        <RobotOutlined /> AI-Powered Pitch Deck Analysis
      </Title>

      {/* Upload Section */}
      <Card style={{ marginBottom: 24, border: "1px solid #d9d9d9" }}>
        <Dragger {...uploadProps} style={{ padding: 24 }}>
          <p className="ant-upload-drag-icon">
            <UploadOutlined style={{ color: "#1890ff", fontSize: 48 }} />
          </p>
          <Title level={5} style={{ marginBottom: 8 }}>
            Click or drag file to upload
          </Title>
          <Text style={{ fontSize: 14 }}>
            Supported formats: PDF, Word (.doc, .docx), Text (.txt) | Max size:
            10MB
          </Text>
        </Dragger>

        {analysisLoading && (
          <div style={{ textAlign: "center", marginTop: 24 }}>
            <LoadingOutlined
              style={{ fontSize: 48, color: "#1890ff", marginBottom: 16 }}
            />
            <div>
              <Text strong style={{ fontSize: 16 }}>
                Analyzing your pitch deck...
              </Text>
              <Paragraph style={{ color: "#666", marginTop: 8 }}>
                This may take 10-30 seconds depending on the content length.
              </Paragraph>
            </div>
          </div>
        )}

        {uploadedFileName && !analysisLoading && !currentAnalysis && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              backgroundColor: "#f0f0f0",
              borderRadius: 8,
              textAlign: "center",
            }}
          >
            <FileTextOutlined style={{ fontSize: 20, color: "#1890ff" }} />
            <Text strong style={{ marginLeft: 8 }}>
              {uploadedFileName}
            </Text>
          </div>
        )}
      </Card>

      {/* Analysis Results */}
      {currentAnalysis && (
        <div>
          <Title level={4} style={{ marginBottom: 16, color: "#52c41a" }}>
            <CheckCircleOutlined /> Analysis Results
          </Title>

          <Card style={{ border: "1px solid #d9d9d9", borderRadius: 8 }}>
            <Row gutter={32} align="middle">
              <Col xs={24} md={8} style={{ textAlign: "center" }}>
                {getStatusIcon(currentAnalysis.summary.status)}
                <Title level={3} style={{ marginTop: 16, marginBottom: 0 }}>
                  {currentAnalysis.summary.total_score}/100
                </Title>
                <Text style={{ fontSize: 14, color: "#666" }}>
                  Investment Readiness Score
                </Text>
              </Col>
              <Col xs={24} md={16}>
                <Progress
                  percent={currentAnalysis.summary.total_score}
                  strokeColor={getProgressColor(
                    currentAnalysis.summary.total_score
                  )}
                  strokeWidth={16}
                  style={{ marginBottom: 16 }}
                />
                <Space
                  direction="vertical"
                  size="small"
                  style={{ width: "100%" }}
                >
                  <div>
                    <Text strong>Status: </Text>
                    <Text
                      style={{
                        color:
                          currentAnalysis.summary.status === "GREEN"
                            ? "#52c41a"
                            : currentAnalysis.summary.status === "YELLOW"
                            ? "#faad14"
                            : "#ff4d4f",
                        fontWeight: 800,
                      }}
                    >
                      {currentAnalysis.summary.status}
                    </Text>
                    <Text
                      type="secondary"
                      style={{
                        marginLeft: 8,
                        fontWeight: 800,
                        color: "black",
                        textTransform: "capitalize",
                      }}
                    >
                      {currentAnalysis.summary.status === "GREEN"
                        ? "- Investment ready"
                        : currentAnalysis.summary.status === "YELLOW"
                        ? "- Promising, needs refinement"
                        : "- Not ready"}
                    </Text>
                  </div>
                  {currentAnalysis.fileName && (
                    <div>
                      <FileTextOutlined />{" "}
                      <Text type="secondary">{currentAnalysis.fileName}</Text>
                    </div>
                  )}
                  {currentAnalysis.analyzedAt && (
                    <div>
                      <CalendarOutlined />{" "}
                      <Text type="secondary">
                        {new Date(
                          currentAnalysis.analyzedAt
                        ).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </div>
                  )}
                </Space>
              </Col>
            </Row>

            <Divider />

            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              <div>
                <Text strong style={{ fontSize: 16 }}>
                  Problem
                </Text>
                <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                  {currentAnalysis.summary.problem}
                </Paragraph>
              </div>
              <div>
                <Text strong style={{ fontSize: 16 }}>
                  Solution
                </Text>
                <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                  {currentAnalysis.summary.solution}
                </Paragraph>
              </div>
              <div>
                <Text strong style={{ fontSize: 16 }}>
                  Market
                </Text>
                <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                  {currentAnalysis.summary.market}
                </Paragraph>
              </div>
              <div>
                <Text strong style={{ fontSize: 16 }}>
                  Traction
                </Text>
                <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                  {currentAnalysis.summary.traction}
                </Paragraph>
              </div>
            </Space>

            <Divider />

            <Title level={5}>
              <BarChartOutlined /> Detailed Scorecard
            </Title>
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              {Object.entries(currentAnalysis.scorecard).map(
                ([criteria, score]) => (
                  <div key={criteria}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <Text strong>{criteria}</Text>
                      <Text strong style={{ color: "#1890ff" }}>
                        {score}/10
                      </Text>
                    </div>
                    <Progress
                      percent={score * 10}
                      strokeColor="#1890ff"
                      trailColor="#f0f0f0"
                      strokeWidth={10}
                      showInfo={false}
                    />
                  </div>
                )
              )}
            </Space>

            <Divider />

            <Title level={5}>
              <BulbOutlined /> Key Highlights
            </Title>
            <Space direction="vertical" size="small" style={{ width: "100%" }}>
              {currentAnalysis.highlights.map((highlight, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 12,
                    backgroundColor: "#f0f0f0",
                    borderRadius: 6,
                  }}
                >
                  <Space align="start">
                    <CheckCircleOutlined
                      style={{ color: "#52c41a", fontSize: 16 }}
                    />
                    <Text>{highlight}</Text>
                  </Space>
                </div>
              ))}
            </Space>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {!currentAnalysis && !analysisLoading && (
        <Empty
          description="Upload a pitch deck to see AI-powered analysis results"
          style={{ padding: 32 }}
        />
      )}
    </div>
  );
}
