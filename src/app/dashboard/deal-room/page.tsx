"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Select, Tag, Card, Row, Col, Typography, Spin, Empty, Button } from "antd";
import { SearchOutlined, FilterOutlined, ArrowRightOutlined, EnvironmentOutlined, DollarOutlined } from "@ant-design/icons";
import { auth } from "@/lib/firebase";

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface Client {
    id: string;
    companyName: string;
    founderName: string;
    industry: string;
    fundingStage: string;
    description: string;
    city: string;
    investment: string;
    logoUrl?: string;
    status: string;
    dealRoomPermission?: boolean; // Added
}

const DUMMY_STARTUPS: Client[] = [
    {
        id: "dummy-1",
        companyName: "Nexus AI",
        founderName: "Sarah Chen",
        industry: "Artificial Intelligence",
        fundingStage: "Seed",
        description: "Building next-generation autonomous agents for enterprise workflow optimization.",
        city: "San Francisco",
        investment: "$1.5M",
        status: "active",
        dealRoomPermission: true
    },
    {
        id: "dummy-2",
        companyName: "GreenGrid",
        founderName: "Michael Rivera",
        industry: "CleanTech",
        fundingStage: "Series A",
        description: "Smart battery management systems for residential energy storage.",
        city: "Austin",
        investment: "$5M",
        status: "active",
        dealRoomPermission: true
    },
    {
        id: "dummy-3",
        companyName: "BioFlow",
        founderName: "Dr. Elena Rossi",
        industry: "Healthcare",
        fundingStage: "Pre-seed",
        description: "Microfluidic devices for rapid diagnostic testing in rural areas.",
        city: "Boston",
        investment: "$500K",
        status: "approved",
        dealRoomPermission: true
    },
    {
        id: "dummy-4",
        companyName: "FinScale",
        founderName: "James Wilson",
        industry: "FinTech",
        fundingStage: "Seed",
        description: "Scalable payment infrastructure for cross-border e-commerce in Southeast Asia.",
        city: "Singapore",
        investment: "$2M",
        status: "active",
        dealRoomPermission: true
    },
    {
        id: "dummy-5",
        companyName: "Omnicart",
        founderName: "Anya Gupta",
        industry: "E-commerce",
        fundingStage: "Series B",
        description: "Unified commerce platform for omnichannel retailers.",
        city: "Bangalore",
        investment: "$12M",
        status: "active",
        dealRoomPermission: true
    }
];

export default function DealRoomDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [startups, setStartups] = useState<Client[]>([]);
    const [filteredStartups, setFilteredStartups] = useState<Client[]>([]);
    const [searchText, setSearchText] = useState("");
    const [industryFilter, setIndustryFilter] = useState<string | null>(null);
    const [stageFilter, setStageFilter] = useState<string | null>(null);
    const [cityFilter, setCityFilter] = useState<string | null>(null); // Added City Filter

    useEffect(() => {
        fetchStartups();
    }, []);

    useEffect(() => {
        filterStartups();
    }, [searchText, industryFilter, stageFilter, cityFilter, startups]);

    const fetchStartups = async () => {
        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) {
                // For development/demo: if no user is signed in, show dummy data
                setStartups(DUMMY_STARTUPS);
                setLoading(false);
                return;
            }
            const token = await user.getIdToken();

            const response = await fetch(`${API_BASE_URL}/clients`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                // Filter: Approved AND Deal Room Permission Permission
                const approvedClients = (data.data || []).filter((client: Client) =>
                    (client.status === "approved" || client.status === "active") &&
                    client.dealRoomPermission === true
                );

                // If no real data, use dummy data
                if (approvedClients.length === 0) {
                    setStartups(DUMMY_STARTUPS);
                } else {
                    setStartups(approvedClients);
                }
            } else {
                console.error("Failed to fetch startups, using dummy data");
                setStartups(DUMMY_STARTUPS);
            }
        } catch (error) {
            console.error("Error fetching startups, using dummy data:", error);
            setStartups(DUMMY_STARTUPS);
        } finally {
            setLoading(false);
        }
    };

    const filterStartups = () => {
        let result = startups;

        if (searchText) {
            const lowerSearch = searchText.toLowerCase();
            result = result.filter(
                (s) =>
                    s.companyName?.toLowerCase().includes(lowerSearch) ||
                    s.founderName?.toLowerCase().includes(lowerSearch) ||
                    s.industry?.toLowerCase().includes(lowerSearch)
            );
        }

        if (industryFilter) {
            result = result.filter((s) => s.industry === industryFilter);
        }

        if (stageFilter) {
            result = result.filter((s) => s.fundingStage === stageFilter);
        }

        if (cityFilter) {
            result = result.filter((s) => s.city === cityFilter);
        }

        setFilteredStartups(result);
    };

    const uniqueIndustries = Array.from(new Set(startups.map((s) => s.industry).filter(Boolean)));
    const uniqueStages = Array.from(new Set(startups.map((s) => s.fundingStage).filter(Boolean)));
    const uniqueCities = Array.from(new Set(startups.map((s) => s.city).filter(Boolean)));

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <Title level={2} style={{ marginBottom: 8 }}>Founder Deal Room</Title>
                    <Text type="secondary" style={{ fontSize: 16 }}>
                        Curated investment opportunities for you.
                    </Text>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center flex-wrap">
                    <Search
                        placeholder="Search by company, founder, or keyword..."
                        allowClear
                        onChange={(e) => setSearchText(e.target.value)}
                        style={{ width: '100%', maxWidth: 350 }}
                        prefix={<SearchOutlined className="text-gray-400" />}
                    />

                    <Select
                        placeholder="Filter by Industry"
                        allowClear
                        style={{ width: 180 }}
                        onChange={setIndustryFilter}
                    >
                        {uniqueIndustries.map(ind => (
                            <Option key={ind} value={ind}>{ind}</Option>
                        ))}
                    </Select>

                    <Select
                        placeholder="Funding Stage"
                        allowClear
                        style={{ width: 180 }}
                        onChange={setStageFilter}
                    >
                        {uniqueStages.map(stage => (
                            <Option key={stage} value={stage}>{stage}</Option>
                        ))}
                    </Select>

                    <Select
                        placeholder="Filter by City"
                        allowClear
                        style={{ width: 180 }}
                        onChange={setCityFilter}
                    >
                        {uniqueCities.map(city => (
                            <Option key={city} value={city}>{city}</Option>
                        ))}
                    </Select>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Spin size="large" tip="Loading opportunities..." />
                    </div>
                ) : filteredStartups.length > 0 ? (
                    <Row gutter={[24, 24]}>
                        {filteredStartups.map((startup) => (
                            <Col xs={24} sm={12} lg={8} key={startup.id}>
                                <Card
                                    hoverable
                                    className="h-full flex flex-col"
                                    bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                                    onClick={() => router.push(`/dashboard/deal-room/${startup.id}`)}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <Title level={4} style={{ marginBottom: 4 }}>{startup.companyName}</Title>
                                            <Text type="secondary" className="text-xs uppercase tracking-wide">{startup.industry}</Text>
                                        </div>
                                        {startup.fundingStage && (
                                            <Tag color="blue">{startup.fundingStage}</Tag>
                                        )}
                                    </div>

                                    <Paragraph ellipsis={{ rows: 3 }} className="text-gray-600 mb-4 flex-grow">
                                        {startup.description || "No description provided."}
                                    </Paragraph>

                                    <div className="mt-auto space-y-3">
                                        <div className="flex items-center text-gray-500 text-sm">
                                            <EnvironmentOutlined className="mr-2" /> {startup.city || "Remote"}
                                        </div>
                                        {startup.investment && (
                                            <div className="flex items-center text-gray-900 font-medium">
                                                <DollarOutlined className="mr-2 text-green-600" /> Ask: {startup.investment}
                                            </div>
                                        )}

                                        <Button
                                            type="primary"
                                            block
                                            className="mt-4 flex items-center justify-center bg-black hover:bg-gray-800 border-black"
                                            onClick={() => router.push(`/dashboard/deal-room/${startup.id}`)}
                                        >
                                            View Profile <ArrowRightOutlined className="ml-2" />
                                        </Button>
                                    </div>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                ) : (
                    <Empty description="No startups found matching your criteria." />
                )}
            </div>
        </div>
    );
}
