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
                } else {
                    message.error("Failed to load founder profile");
                    router.push("/dashboard/deal-room");
                }
            } else {
                message.error("Failed to load founder profile");
                router.push("/dashboard/deal-room");
            }
        } catch (error) {
            console.error("Error fetching client details:", error);
            message.error("Failed to load founder profile");
            router.push("/dashboard/deal-room");
        } finally {
            setLoading(false);
        }
    };

    const handleAIAnalyze = async () => {
        setAnalyzing(true);
        try {
            const user = auth.currentUser;
            if (!user) {
                message.error("Please sign in to analyze the deck.");
                return;
            }
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
                                    disabled={!client.dealRoomPermission}
                                    className={`${!client.dealRoomPermission ? 'bg-gray-400 border-gray-400' : 'bg-black hover:bg-gray-800 border-black'} h-10 px-6`}
                                >
                                    {analyzing ? "Loading..." : "AI Analyze Deck"}
                                </Button>
                            </div>

                            {latestAnalysis && (
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
                                    <div className="mb-6">
                                        <Title level={5} className="mb-3">Key Highlights</Title>
                                        <Card bg-gray-50 bordered={false} className="bg-blue-50 border-blue-100">
                                            <ul className="space-y-2 pl-4 m-0">
                                                {(latestAnalysis.highlights || []).slice(0, 3).map((h: string, i: number) => (
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

                                    {/* Suggested Questions */}
                                    {latestAnalysis.suggested_questions && latestAnalysis.suggested_questions.length > 0 && (
                                        <div>
                                            <Title level={5} className="mb-3">Suggested Questions for Founder</Title>
                                            <div className="space-y-3">
                                                {latestAnalysis.suggested_questions.map((q: string, i: number) => (
                                                    <div key={i} className="p-3 bg-gray-50 border border-gray-100 rounded-lg flex gap-3 items-start">
                                                        <div className="bg-black text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                                                            {i + 1}
                                                        </div>
                                                        <Text className="text-sm italic text-gray-700">"{q}"</Text>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
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
        </div >
    );
}
