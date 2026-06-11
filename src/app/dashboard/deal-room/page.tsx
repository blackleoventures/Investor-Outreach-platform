"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Select, Tag, Card, Row, Col, Typography, Spin, Empty, Button } from "antd";
import { SearchOutlined, FilterOutlined, ArrowRightOutlined, EnvironmentOutlined, DollarOutlined, ReloadOutlined } from "@ant-design/icons";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

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


export default function DealRoomDashboard() {
    const router = useRouter();
    const { userData, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [startups, setStartups] = useState<Client[]>([]);
    const [filteredStartups, setFilteredStartups] = useState<Client[]>([]);
    const [searchText, setSearchText] = useState("");
    const [industryFilter, setIndustryFilter] = useState<string | null>(null);
    const [stageFilter, setStageFilter] = useState<string | null>(null);
    const [cityFilter, setCityFilter] = useState<string | null>(null); // Added City Filter
    const [fetchError, setFetchError] = useState(false);

    useEffect(() => {
        if (authLoading) return;
        // Admins and subadmins can browse the deal room directly from the sidebar.
        // Investors must arrive via their magic link, which sets the sessionStorage flag.
        const isStaff = userData?.role === "admin" || userData?.role === "subadmin";
        const hasAccess =
            typeof window !== "undefined" &&
            sessionStorage.getItem("dealRoomAccess") === "granted";
        if (!isStaff && !hasAccess) {
            router.push("/dashboard");
            return;
        }
        fetchStartups();
    }, [authLoading, userData?.role]);

    useEffect(() => {
        filterStartups();
    }, [searchText, industryFilter, stageFilter, cityFilter, startups]);

    const fetchStartups = async () => {
        setLoading(true);
        setFetchError(false);
        try {
            const user = auth.currentUser;
            if (!user) {
                router.push("/login");
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
                setStartups(data.data || []);
            } else {
                console.error("Failed to fetch startups");
                setStartups([]);
                setFetchError(true);
            }
        } catch (error) {
            console.error("Error fetching startups:", error);
            setStartups([]);
            setFetchError(true);
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
            result = result.filter((s) => {
                if (!s.industry) return false;
                const industries = s.industry.split(/[,;/]+/).map(ind => ind.trim().toLowerCase());
                return industries.includes(industryFilter.toLowerCase());
            });
        }

        if (stageFilter) {
            result = result.filter((s) => s.fundingStage === stageFilter);
        }

        if (cityFilter) {
            result = result.filter((s) => s.city === cityFilter);
        }

        setFilteredStartups(result);
    };

    const uniqueIndustries = Array.from(new Set(
        startups.flatMap((s) =>
            (s.industry || "")
                .split(/[,;/]+/)
                .map(ind => ind.trim())
                .filter(Boolean)
        )
    )).sort();
    const uniqueStages = Array.from(new Set(startups.map((s) => s.fundingStage).filter(Boolean)));
    const uniqueCities = Array.from(new Set(startups.map((s) => s.city).filter(Boolean)));

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6 md:mb-8 text-center md:text-left">
                    <Title level={2} style={{ marginBottom: 8, fontSize: 'clamp(1.5rem, 5vw, 2rem)' }}>Founder Deal Room</Title>
                    <Text type="secondary" style={{ fontSize: 'clamp(0.875rem, 3vw, 1rem)' }}>
                        Curated investment opportunities for you.
                    </Text>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-col lg:flex-row gap-4 items-center">
                    <Search
                        placeholder="Search company, founder, or keyword..."
                        allowClear
                        onChange={(e) => setSearchText(e.target.value)}
                        className="w-full lg:max-w-md"
                        prefix={<SearchOutlined className="text-gray-400" />}
                    />

                    <div className="flex flex-wrap gap-4 w-full lg:w-auto items-center justify-center md:justify-start">

                        <Select
                            placeholder="Industry"
                            allowClear
                            className="w-full sm:w-[180px]"
                            onChange={setIndustryFilter}
                        >
                            {uniqueIndustries.map(ind => (
                                <Option key={ind} value={ind}>{ind}</Option>
                            ))}
                        </Select>

                        <Select
                            placeholder="Stage"
                            allowClear
                            className="w-full sm:w-[150px]"
                            onChange={setStageFilter}
                        >
                            {uniqueStages.map(stage => (
                                <Option key={stage} value={stage}>{stage}</Option>
                            ))}
                        </Select>

                        <Select
                            placeholder="Search city..."
                            allowClear
                            showSearch
                            suffixIcon={<SearchOutlined />}
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                                (option?.value as string ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                            className="w-full sm:w-[180px]"
                            onChange={setCityFilter}
                        >
                            {uniqueCities.map(city => (
                                <Option key={city} value={city}>{city}</Option>
                            ))}
                        </Select>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col gap-3 justify-center items-center h-64">
                        <Spin size="large" />
                        <p className="text-gray-500 text-sm">Loading opportunities...</p>
                    </div>
                ) : fetchError ? (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            <span className="text-gray-600">
                                We couldn&apos;t load opportunities. Please try again.
                            </span>
                        }
                    >
                        <Button type="primary" icon={<ReloadOutlined />} onClick={fetchStartups}>
                            Retry
                        </Button>
                    </Empty>
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
                                        <div className="min-w-0">
                                            <Title level={4} style={{ marginBottom: 4 }}>{startup.companyName}</Title>
                                            <Text type="secondary" className="text-xs uppercase tracking-wide line-clamp-1" title={startup.industry}>{startup.industry}</Text>
                                        </div>
                                        {startup.fundingStage && (
                                            <Tag color="#4f46e5">{startup.fundingStage}</Tag>
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
                                            className="mt-4 flex items-center justify-center"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                router.push(`/dashboard/deal-room/${startup.id}`);
                                            }}
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
