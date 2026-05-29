"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { message, Spin, Typography, Card, Row, Col, Divider, Tag, Button, Progress, Space, Result } from "antd";
import Link from "next/link";
import {
    ArrowLeftOutlined,
    MailOutlined,
    PhoneOutlined,
    LinkedinOutlined,
    GlobalOutlined,
    FileTextOutlined,
    CheckCircleOutlined,
    WarningOutlined,
    CloseCircleOutlined,
    BarChartOutlined,
    BulbOutlined,
    QuestionCircleOutlined,
    RobotOutlined,
    LockOutlined,
    MinusCircleOutlined
} from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// Reusing interfaces from ClientAIPitchAnalysis / AllClients
// ideally these should be in a shared types file
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
    suggested_questions: string[];
    highlights: string[];
    email_subject?: string;
    email_body?: string;
}

interface Client {
    id: string;
    companyName: string;
    founderName: string;
    email: string;
    phone: string;
    industry: string;
    fundingStage: string;
    revenue: string;
    investment: string;
    city: string;
    description?: string;
    website?: string;
    linkedin?: string;
    pitchAnalyses?: PitchAnalysis[];
    status: string;
}

export default function DealDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [client, setClient] = useState<Client | null>(null);
    const [latestAnalysis, setLatestAnalysis] = useState<PitchAnalysis | null>(null);
    const [authRequired, setAuthRequired] = useState(false);

    useEffect(() => {
        if (id) {
            fetchClientDetails();
        }
    }, [id]);

    const fetchClientDetails = async () => {
        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) {
                // No authenticated user: stop the spinner and show an explanatory state
                // instead of hanging forever. Auth is still required to view the deal.
                setAuthRequired(true);
                setLoading(false);
                return;
            }
            const token = await user.getIdToken();

            // We might need a specific endpoint for single client by ID if not available
            // Assuming GET /clients/:id exists based on DELETE /clients/:id logic in all-client page
            const response = await fetch(`${API_BASE_URL}/clients/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                const clientData = data.data;
                setClient(clientData);

                // Get the latest analysis if available
                if (clientData.pitchAnalyses && clientData.pitchAnalyses.length > 0) {
                    // Sort by date if needed, or just take the last one
                    // Assuming array is ordered or we take the last pushed
                    setLatestAnalysis(clientData.pitchAnalyses[clientData.pitchAnalyses.length - 1]);
                }
            } else {
                message.error("Failed to load deal details");
                router.push("/dashboard/deal-room");
            }
        } catch (error) {
            console.error("Error fetching client details:", error);
            message.error("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "GREEN":
                return <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 24 }} />;
            case "YELLOW":
                return <WarningOutlined style={{ color: "#faad14", fontSize: 24 }} />;
            case "RED":
                return <CloseCircleOutlined style={{ color: "#ff4d4f", fontSize: 24 }} />;
            default:
                return <MinusCircleOutlined style={{ color: "#94a3b8", fontSize: 24 }} />;
        }
    };

    const getProgressColor = (score: number) => {
        if (score >= 70) return "#52c41a";
        if (score >= 40) return "#faad14";
        return "#ff4d4f";
    };

    const BrandHeader = () => (
        <header className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-lg">
                    R
                </div>
                <span className="text-lg font-semibold text-brand-700">Black Leo Venture</span>
            </div>
        </header>
    );

    const BrandFooter = () => (
        <footer className="mt-12 border-t border-gray-200 bg-white">
            <div className="max-w-7xl mx-auto px-6 py-6 text-center text-sm text-gray-500">
                <p className="mb-1">
                    <span className="font-semibold text-brand-700">Black Leo Venture</span> · Investor Outreach Platform
                </p>
                <p className="text-xs text-gray-400">
                    This deal information is shared confidentially with invited investors.
                </p>
            </div>
        </footer>
    );

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col bg-gray-50">
                <BrandHeader />
                <div className="flex-1 flex flex-col gap-3 justify-center items-center">
                    <Spin size="large" />
                    <p className="text-gray-500 text-sm">Loading deal details...</p>
                </div>
            </div>
        );
    }

    if (authRequired) {
        return (
            <div className="min-h-screen flex flex-col bg-gray-50">
                <BrandHeader />
                <div className="flex-1 flex justify-center items-center p-6">
                    <Card className="max-w-md w-full text-center shadow-md">
                        <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4">
                            <LockOutlined style={{ fontSize: 26, color: "#4f46e5" }} />
                        </div>
                        <Title level={4} style={{ marginBottom: 8 }}>Sign in to view this deal</Title>
                        <Paragraph type="secondary" className="mb-6">
                            Please sign in to view this deal, or this link may have expired.
                        </Paragraph>
                        <Link href="/auth/investor-login">
                            <Button type="primary" size="large" style={{ backgroundColor: "#4f46e5", borderColor: "#4f46e5" }}>
                                Investor Sign In
                            </Button>
                        </Link>
                    </Card>
                </div>
                <BrandFooter />
            </div>
        );
    }

    if (!client) {
        return (
            <div className="min-h-screen flex flex-col bg-gray-50">
                <BrandHeader />
                <div className="flex-1 flex justify-center items-center p-6">
                    <Result
                        status="404"
                        title="Deal not found"
                        subTitle="This deal may have been removed, or the link may have expired."
                        extra={
                            <Link href="/auth/investor-login">
                                <Button type="primary" style={{ backgroundColor: "#4f46e5", borderColor: "#4f46e5" }}>
                                    Investor Sign In
                                </Button>
                            </Link>
                        }
                    />
                </div>
                <BrandFooter />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <BrandHeader />
            <div className="max-w-7xl mx-auto p-6">
                <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={() => router.back()}
                    className="mb-6"
                >
                    Back to Deal Room
                </Button>

                <Row gutter={[24, 24]}>
                    {/* Left Column: Company Info */}
                    <Col xs={24} lg={8}>
                        <Card className="mb-6 sticky top-6">
                            <div className="text-center mb-6">
                                <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto flex items-center justify-center text-3xl font-bold text-gray-500 mb-4">
                                    {client.companyName.charAt(0)}
                                </div>
                                <Title level={3} style={{ marginBottom: 4 }}>{client.companyName}</Title>
                                <Text type="secondary" className="block mb-2">{client.industry} • {client.city}</Text>
                                <Tag color="#4f46e5">{client.fundingStage}</Tag>
                            </div>

                            <Divider />

                            <div className="space-y-4">
                                <div>
                                    <Text type="secondary" className="block text-xs uppercase">Founder</Text>
                                    <Text strong className="text-lg">{client.founderName}</Text>
                                </div>

                                <div>
                                    <Text type="secondary" className="block text-xs uppercase">Ask</Text>
                                    <Text strong className="text-lg text-green-600">{client.investment}</Text>
                                </div>

                                <div>
                                    <Text type="secondary" className="block text-xs uppercase">Revenue</Text>
                                    <Text strong>{client.revenue || "Not disclosed"}</Text>
                                </div>

                                <Divider />

                                <div className="space-y-2">
                                    {client.email && (
                                        <div className="flex items-center gap-2">
                                            <MailOutlined /> <a href={`mailto:${client.email}`}>{client.email}</a>
                                        </div>
                                    )}
                                    {client.phone && (
                                        <div className="flex items-center gap-2">
                                            <PhoneOutlined /> {client.phone}
                                        </div>
                                    )}
                                    {client.website && (
                                        <div className="flex items-center gap-2">
                                            <GlobalOutlined /> <a href={client.website} target="_blank" rel="noopener noreferrer">Website</a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    </Col>

                    {/* Right Column: AI Analysis & Details */}
                    <Col xs={24} lg={16}>
                        {/* AI Analysis Section */}
                        {latestAnalysis ? (
                            <Card className="mb-6 border-brand-100 shadow-md">
                                <div className="flex items-center gap-3 mb-6">
                                    <RobotOutlined style={{ fontSize: 24, color: '#4f46e5' }} />
                                    <Title level={3} style={{ marginBottom: 0 }}>AI Investment Analysis</Title>
                                </div>

                                {/* Score Overview */}
                                <div className="bg-gray-50 p-6 rounded-xl mb-8">
                                    <Row gutter={[24, 24]} align="middle">
                                        <Col xs={24} md={8} className="text-center border-r border-gray-200">
                                            <div className="mb-2">{getStatusIcon(latestAnalysis.summary.status)}</div>
                                            <div className="text-4xl font-bold text-gray-900 mb-1">
                                                {latestAnalysis.summary.total_score}<span className="text-lg text-gray-400">/100</span>
                                            </div>
                                            <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Readiness Score</div>
                                        </Col>
                                        <Col xs={24} md={16}>
                                            <div className="mb-2 flex justify-between">
                                                <Text strong>Investment Status</Text>
                                                <Text strong style={{
                                                    color: latestAnalysis.summary.status === "GREEN" ? "#52c41a" :
                                                        latestAnalysis.summary.status === "YELLOW" ? "#faad14" : "#ff4d4f"
                                                }}>
                                                    {latestAnalysis.summary.status}
                                                </Text>
                                            </div>
                                            <Progress
                                                percent={latestAnalysis.summary.total_score}
                                                strokeColor={getProgressColor(latestAnalysis.summary.total_score)}
                                                showInfo={false}
                                                strokeWidth={12}
                                            />
                                            <Paragraph type="secondary" className="mt-3 mb-0">
                                                Analyzed on {new Date(latestAnalysis.analyzedAt || Date.now()).toLocaleDateString()}
                                            </Paragraph>
                                        </Col>
                                    </Row>
                                </div>

                                {/* Executive Summary */}
                                <div className="mb-8">
                                    <Title level={4}><FileTextOutlined /> Executive Summary</Title>
                                    <div className="grid gap-4">
                                        <Card type="inner" title="Problem" size="small">
                                            {latestAnalysis.summary.problem}
                                        </Card>
                                        <Card type="inner" title="Solution" size="small">
                                            {latestAnalysis.summary.solution}
                                        </Card>
                                        <Row gutter={16}>
                                            <Col xs={24} md={12}>
                                                <Card type="inner" title="Market" size="small" className="h-full">
                                                    {latestAnalysis.summary.market}
                                                </Card>
                                            </Col>
                                            <Col xs={24} md={12}>
                                                <Card type="inner" title="Traction" size="small" className="h-full">
                                                    {latestAnalysis.summary.traction}
                                                </Card>
                                            </Col>
                                        </Row>
                                    </div>
                                </div>

                                {/* Scorecard */}
                                <div className="mb-8">
                                    <Title level={4}><BarChartOutlined /> Detailed Scorecard</Title>
                                    <Row gutter={[16, 16]}>
                                        {Object.entries(latestAnalysis.scorecard).map(([key, score]) => (
                                            <Col xs={24} sm={12} key={key}>
                                                <div className="bg-white border rounded p-3">
                                                    <div className="flex justify-between mb-1">
                                                        <span className="font-medium text-gray-700">{key}</span>
                                                        <span className="font-bold text-brand-600">{score}/10</span>
                                                    </div>
                                                    <Progress percent={score * 10} showInfo={false} size="small" strokeColor="#4f46e5" />
                                                </div>
                                            </Col>
                                        ))}
                                    </Row>
                                </div>

                                {/* Highlights & Questions */}
                                <Row gutter={[24, 24]}>
                                    <Col xs={24} md={12}>
                                        <Title level={5}><BulbOutlined /> Key Highlights</Title>
                                        <ul className="list-none p-0 space-y-2">
                                            {latestAnalysis.highlights.map((h, i) => (
                                                <li key={i} className="flex items-start gap-2 bg-gray-50 p-2 rounded">
                                                    <CheckCircleOutlined className="text-green-500 mt-1" />
                                                    <span className="text-sm">{h}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Title level={5}><QuestionCircleOutlined /> Suggested Questions</Title>
                                        <ul className="list-none p-0 space-y-2">
                                            {latestAnalysis.suggested_questions.map((q, i) => (
                                                <li key={i} className="flex items-start gap-2 bg-brand-50 p-2 rounded">
                                                    <QuestionCircleOutlined className="text-brand-600 mt-1" />
                                                    <span className="text-sm">{q}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </Col>
                                </Row>
                            </Card>
                        ) : (
                            <Card className="text-center py-12">
                                <RobotOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                                <Title level={4} type="secondary">No AI Analysis Available</Title>
                                <Paragraph type="secondary">
                                    This founder has not uploaded a pitch deck for analysis yet.
                                </Paragraph>
                            </Card>
                        )}
                    </Col>
                </Row>
            </div>
            <BrandFooter />
        </div>
    );
}
