"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import {
    message,
    Spin,
    Typography,
    Card,
    Row,
    Col,
    Divider,
    Tag,
    Button,
    Space,
    Empty
} from "antd";
import {
    ArrowLeftOutlined,
    MailOutlined,
    PhoneOutlined,
    EnvironmentOutlined,
    GlobalOutlined,
    FilePdfOutlined,
    RobotOutlined,
    RocketOutlined,
    BarChartOutlined,
    DollarOutlined
} from "@ant-design/icons";
import { TransformedClient, ApiResponse, PitchAnalysis } from "@/types/client";

const { Title, Text, Paragraph } = Typography;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const DUMMY_STARTUPS: any[] = [
    {
        id: "dummy-1",
        companyName: "Nexus AI",
        founderName: "Sarah Chen",
        industry: "Artificial Intelligence",
        fundingStage: "Seed",
        city: "San Francisco",
        revenue: "$1.5M ARR",
        investment: "$1.5M",
        email: "sarah@nexusai.io",
        phone: "+1 (555) 123-4567",
        pitchDeckFileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        pitchDeckFileName: "Nexus_AI_Pitch_Deck.pdf",
        dealRoomPermission: true,
        status: "active",
    },
    {
        id: "dummy-2",
        companyName: "GreenGrid",
        founderName: "Michael Rivera",
        industry: "CleanTech",
        fundingStage: "Series A",
        city: "Austin",
        revenue: "$1.2M ARR",
        investment: "$5M",
        email: "michael@greengrid.com",
        phone: "+1 (555) 987-6543",
        pitchDeckFileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        pitchDeckFileName: "GreenGrid_SeriesA_Deck.pdf",
        dealRoomPermission: true,
        status: "active",
    },
    {
        id: "dummy-3",
        companyName: "BioFlow",
        founderName: "Dr. Elena Rossi",
        industry: "Healthcare",
        fundingStage: "Pre-seed",
        city: "Boston",
        revenue: "$15k ARR",
        investment: "$500K",
        email: "elena@bioflow.med",
        phone: "+1 (555) 555-0000",
        pitchDeckFileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        pitchDeckFileName: "BioFlow_Introduction.pdf",
        dealRoomPermission: true,
        status: "approved",
    },
    {
        id: "dummy-4",
        companyName: "FinScale",
        founderName: "James Wilson",
        industry: "FinTech",
        fundingStage: "Seed",
        city: "Singapore",
        revenue: "$500k ARR",
        investment: "$2M",
        email: "james@finscale.sg",
        phone: "+65 6789 0123",
        pitchDeckFileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        pitchDeckFileName: "FinScale_Deck.pdf",
        dealRoomPermission: true,
        status: "active",
    },
    {
        id: "dummy-5",
        companyName: "Omnicart",
        founderName: "Anya Gupta",
        industry: "E-commerce",
        fundingStage: "Series B",
        city: "Bangalore",
        revenue: "$1.5M ARR",
        investment: "$12M",
        email: "anya@omnicart.in",
        phone: "+91 80 1234 5678",
        pitchDeckFileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        pitchDeckFileName: "Omnicart_Growth_Deck.pdf",
        dealRoomPermission: true,
        status: "active",
    }
];

export default function FounderProfilePage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [client, setClient] = useState<TransformedClient | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [latestAnalysis, setLatestAnalysis] = useState<PitchAnalysis | null>(null);

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
                // Check if it's a dummy startup
                const dummy = DUMMY_STARTUPS.find(s => s.id === id);
                if (dummy) {
                    setClient(dummy as any);
                    setLoading(false);
                    return;
                }
                message.error("Please sign in to view this profile.");
                router.push("/dashboard/deal-room");
                return;
            }
            const token = await user.getIdToken();

            const response = await fetch(`${API_BASE_URL}/clients/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json() as ApiResponse<TransformedClient>;
                if (data.success && data.data) {
                    setClient(data.data);
                    // Analysis is now fetched on-demand via handleAIAnalyze
                } else {
                    handleFetchError();
                }
            } else {
                handleFetchError();
            }
        } catch (error) {
            console.error("Error fetching client details:", error);
            handleFetchError();
        } finally {
            setLoading(false);
        }
    };

    const handleFetchError = () => {
        const dummy = DUMMY_STARTUPS.find(s => s.id === id);
        if (dummy) {
            setClient(dummy as any);
        } else {
            message.error("Failed to load founder profile");
            router.push("/dashboard/deal-room");
        }
    };

    const handleAIAnalyze = async () => {
        if (!client?.pitchDeckFileUrl) {
            message.warning("No pitch deck available for analysis.");
            return;
        }

        setAnalyzing(true);
        try {
            // Check for dummy startup first
            const dummy = DUMMY_STARTUPS.find(s => s.id === id);
            if (dummy) {
                setTimeout(() => {
                    const mockAnalysis: PitchAnalysis = {
                        summary: {
                            problem: "Lack of efficient cross-border payment solutions.",
                            solution: "AI-powered liquidity management and settlement.",
                            market: "Global B2B payments market ($150T).",
                            traction: "Pilot programs with 5 regional banks.",
                            status: "GREEN",
                            total_score: 85
                        },
                        scorecard: {
                            "Problem & Solution Fit": 9,
                            "Market Size & Opportunity": 8,
                            "Business Model": 8,
                            "Traction & Metrics": 8,
                            Team: 9,
                            "Competitive Advantage": 8,
                            "Go-To-Market Strategy": 7,
                            "Financials & Ask": 8,
                            "Exit Potential": 7,
                            "Alignment with Investor": 8
                        },
                        highlights: [
                            "Strong market positioning in the B2B liquidity space.",
                            "Scalable business model with high recurring revenue potential.",
                            "Proven technical team with deep sector expertise."
                        ],
                        suggested_questions: [
                            "How do you handle local currency fluctuations?",
                            "What is your customer acquisition cost?",
                            "How do you ensure regulatory compliance?"
                        ]
                    };
                    setLatestAnalysis(mockAnalysis);
                    setAnalyzing(false);
                    message.success("Analysis retrieved successfully.");
                }, 1500);
                return;
            }

            const user = auth.currentUser;
            if (!user) return;
            const token = await user.getIdToken();

            message.info("Retrieving AI analysis...");

            const response = await fetch(`${API_BASE_URL}/deal-room/analysis/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    setLatestAnalysis(data.data);
                    message.success("Analysis retrieved successfully.");
                } else {
                    message.error("No analysis available for this startup.");
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                message.error(errorData.error?.message || "Failed to retrieve analysis.");
            }
        } catch (error) {
            console.error("AI Analysis Retrieval Error:", error);
            message.error("An error occurred while fetching analysis.");
        } finally {
            setAnalyzing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex justify-center items-center bg-gray-50">
                <Space direction="vertical" align="center">
                    <Spin size="large" />
                    <Text type="secondary">Loading founder profile...</Text>
                </Space>
            </div>
        );
    }

    if (!client) return null;

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="flex items-center justify-between mb-8">
                    <Button
                        icon={<ArrowLeftOutlined />}
                        onClick={() => router.back()}
                        className="flex items-center"
                    >
                        Back to Deal Room
                    </Button>
                    <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Founder Profile</Title>
                    <div className="w-[100px]"></div> {/* Spacer */}
                </div>

                <Row gutter={[32, 32]}>
                    {/* Left Column: Founder & Company Details */}
                    <Col xs={24} lg={10}>
                        <Card className="shadow-sm border-0 rounded-xl overflow-hidden">
                            <div className="bg-black p-6 text-white">
                                <Space direction="vertical" size={2}>
                                    <Text className="text-gray-400 uppercase text-xs tracking-widest font-bold">Company</Text>
                                    <Title level={3} style={{ color: 'white', margin: 0 }}>{client.companyName}</Title>
                                </Space>
                            </div>

                            <div className="p-6">
                                <section className="mb-8">
                                    <Title level={5} type="secondary" className="uppercase text-xs mb-4">Founder Details</Title>
                                    <Space direction="vertical" className="w-full" size={16}>
                                        <div>
                                            <Text type="secondary" className="block text-xs">Full Name</Text>
                                            <Text strong className="text-lg">{client.founderName}</Text>
                                        </div>
                                        <Row gutter={16}>
                                            <Col span={12}>
                                                <Text type="secondary" className="block text-xs">Email</Text>
                                                <Space>
                                                    <MailOutlined className="text-gray-400" />
                                                    <Text>{client.email}</Text>
                                                </Space>
                                            </Col>
                                            <Col span={12}>
                                                <Text type="secondary" className="block text-xs">Phone</Text>
                                                <Space>
                                                    <PhoneOutlined className="text-gray-400" />
                                                    <Text>{client.phone}</Text>
                                                </Space>
                                            </Col>
                                        </Row>
                                    </Space>
                                </section>

                                <Divider />

                                <section className="mb-8">
                                    <Title level={5} type="secondary" className="uppercase text-xs mb-4">Investment Ask & Financials</Title>
                                    <Row gutter={[24, 24]}>
                                        <Col span={12}>
                                            <Card bg-gray-50 bordered={false} bodyStyle={{ padding: '16px' }} className="h-full bg-gray-50">
                                                <Text type="secondary" className="block text-xs">Funding Stage</Text>
                                                <Tag color="blue" className="mt-1">{client.fundingStage}</Tag>
                                            </Card>
                                        </Col>
                                        <Col span={12}>
                                            <Card bg-gray-50 bordered={false} bodyStyle={{ padding: '16px' }} className="h-full bg-gray-50">
                                                <Text type="secondary" className="block text-xs">Investment Ask</Text>
                                                <Text strong className="text-lg text-green-600">{client.investment}</Text>
                                            </Card>
                                        </Col>
                                        <Col span={12}>
                                            <Card bg-gray-50 bordered={false} bodyStyle={{ padding: '16px' }} className="h-full bg-gray-50">
                                                <Text type="secondary" className="block text-xs">Revenue</Text>
                                                <Space className="mt-1">
                                                    <BarChartOutlined className="text-blue-500" />
                                                    <Text strong>{client.revenue || "N/A"}</Text>
                                                </Space>
                                            </Card>
                                        </Col>
                                        <Col span={12}>
                                            <Card bg-gray-50 bordered={false} bodyStyle={{ padding: '16px' }} className="h-full bg-gray-50">
                                                <Text type="secondary" className="block text-xs">Industry</Text>
                                                <Space className="mt-1">
                                                    <RocketOutlined className="text-purple-500" />
                                                    <Text strong>{client.industry}</Text>
                                                </Space>
                                            </Card>
                                        </Col>
                                    </Row>
                                </section>

                                <Divider />

                                <section>
                                    <Title level={5} type="secondary" className="uppercase text-xs mb-4">Location</Title>
                                    <Space>
                                        <EnvironmentOutlined className="text-red-500" />
                                        <Text strong>{client.city}</Text>
                                    </Space>
                                </section>
                            </div>
                        </Card>
                    </Col>

                    {/* Right Column: Pitch Deck & AI Analysis */}
                    <Col xs={24} lg={14}>
                        {/* Pitch Deck Section */}
                        <Card
                            title={<Space><FilePdfOutlined /> Pitch Deck</Space>}
                            className="shadow-sm border-0 rounded-xl mb-8"
                            bodyStyle={{ padding: 0 }}
                        >
                            {client.pitchDeckFileUrl ? (
                                <div className="aspect-[16/9] w-full bg-gray-100 relative">
                                    <iframe
                                        src={`${client.pitchDeckFileUrl}#toolbar=0`}
                                        className="w-full h-full border-none"
                                        title="Pitch Deck Viewer"
                                    />
                                    <div className="absolute bottom-4 right-4">
                                        <Button
                                            icon={<GlobalOutlined />}
                                            href={client.pitchDeckFileUrl}
                                            target="_blank"
                                            type="default"
                                            size="small"
                                        >
                                            Open Full PDF
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-20 text-center">
                                    <Empty description="No pitch deck uploaded for this founder." />
                                </div>
                            )}
                        </Card>

                        {/* AI Analysis Section */}
                        <Card
                            className="shadow-sm border-0 rounded-xl bg-white"
                            bodyStyle={{ padding: '24px' }}
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                                <Space direction="vertical" size={0}>
                                    <Title level={4} style={{ margin: 0 }}>AI Investment Analysis</Title>
                                    <Text type="secondary">Intelligent assessment of the opportunity</Text>
                                </Space>
                                <Button
                                    type="primary"
                                    icon={<RobotOutlined />}
                                    loading={analyzing}
                                    onClick={handleAIAnalyze}
                                    className="bg-black hover:bg-gray-800 border-black h-10 px-6"
                                    disabled={!client.pitchDeckFileUrl}
                                >
                                    {latestAnalysis ? "Re-analyze Deck" : "AI Analyze Deck"}
                                </Button>
                            </div>

                            {latestAnalysis ? (
                                <div className="space-y-8 animate-in fade-in duration-500">
                                    {/* Score Overview */}
                                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                                        <Row align="middle" gutter={24}>
                                            <Col span={8} className="text-center border-r border-gray-200">
                                                <div className="text-5xl font-black text-black">
                                                    {latestAnalysis.summary.total_score}
                                                    <span className="text-base text-gray-400 font-normal">/100</span>
                                                </div>
                                                <Text type="secondary" className="uppercase text-[10px] tracking-widest font-bold">Total Score</Text>
                                            </Col>
                                            <Col span={16}>
                                                <Space direction="vertical" className="w-full">
                                                    <div className="flex justify-between items-center">
                                                        <Text strong>Investment Readiness</Text>
                                                        <Tag color={latestAnalysis.summary.status === "GREEN" ? "success" : "warning"}>
                                                            {latestAnalysis.summary.status}
                                                        </Tag>
                                                    </div>
                                                    <Paragraph className="text-sm text-gray-600 mb-0">
                                                        {latestAnalysis.summary.solution}
                                                    </Paragraph>
                                                </Space>
                                            </Col>
                                        </Row>
                                    </div>

                                    {/* Scorecard */}
                                    <div>
                                        <Title level={5} className="mb-4">Scorecard Metrics</Title>
                                        <Row gutter={[16, 16]}>
                                            {Object.entries(latestAnalysis.scorecard).slice(0, 4).map(([key, value]) => (
                                                <Col span={12} key={key}>
                                                    <div className="p-3 bg-white border border-gray-100 rounded-lg">
                                                        <div className="flex justify-between mb-1">
                                                            <Text className="text-xs text-gray-500">{key}</Text>
                                                            <Text strong className="text-xs">{value}/10</Text>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-black rounded-full"
                                                                style={{ width: `${value * 10}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </Col>
                                            ))}
                                        </Row>
                                    </div>

                                    {/* Highlights */}
                                    <Card bg-gray-50 bordered={false} className="bg-blue-50 border-blue-100">
                                        <Title level={5} className="mb-3">Key Highlights</Title>
                                        <ul className="space-y-2 pl-4 m-0">
                                            {latestAnalysis.highlights.slice(0, 3).map((h, i) => (
                                                <li key={i} className="text-sm text-blue-800">
                                                    <Space align="start">
                                                        <span className="text-blue-400">•</span>
                                                        {h}
                                                    </Space>
                                                </li>
                                            ))}
                                        </ul>
                                    </Card>
                                </div>
                            ) : (
                                <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-xl">
                                    <Empty
                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                        description={
                                            <Space direction="vertical" size={4}>
                                                <Text type="secondary">No analysis data available yet.</Text>
                                                <Text type="secondary" className="text-xs">Click the button above to generate AI insights.</Text>
                                            </Space>
                                        }
                                    />
                                </div>
                            )}
                        </Card>
                    </Col>
                </Row>
            </div>

            <style jsx global>{`
                .ant-card-head {
                    border-bottom: 1px solid #f0f0f0 !important;
                    min-height: 56px !important;
                }
                .ant-card-head-title {
                    font-weight: 700 !important;
                }
            `}</style>
        </div>
    );
}
