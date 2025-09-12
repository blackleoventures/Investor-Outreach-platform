"use client";

import { Card, Typography, Button, Row, Col, Tag } from "antd";
import { BulbOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import React from "react";

const { Title, Text } = Typography;

const SelectCampaign = () => {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Since only one campaign type exists, navigate there immediately
  useEffect(() => {
    if (mounted) {
      router.replace('/dashboard/campaign/ai-email-campaign');
    }
  }, [mounted, router]);

  // Show only AI Email Campaign
  const campaignTypes = [
    {
      id: "ai-email",
      title: "AI Email Campaign", 
      description: "Generate AI-powered email content for better engagement",
      icon: <BulbOutlined style={{ fontSize: isMobile ? "1.5rem" : "2rem", color: "#52c41a" }} />,
      route: "/dashboard/campaign/ai-email-campaign",
      features: ["AI-generated content", "Smart personalization", "Auto optimization"]
    }
  ];

  const handleSelectCampaign = (route: string) => {
    router.push(route);
  };

  if (!mounted) return null;

  return (
    <div className="p-4 sm:p-6" style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Card className="w-full" style={{ border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div className="text-center mb-6 sm:mb-8">
          <Title level={2} style={{ fontSize: isMobile ? '20px' : '28px', color: '#1f2937', marginBottom: '8px' }}>
            Select Campaign Type
          </Title>
          <Text type="secondary" style={{ fontSize: isMobile ? '14px' : '16px' }}>
            Choose the type of campaign you want to create
          </Text>
        </div>

        <div className="w-full max-w-4xl mx-auto">
          <Row gutter={[16, 16]} justify="center">
            {campaignTypes.map((campaign) => (
              <Col xs={24} sm={12} lg={8} key={campaign.id}>
                <Card
                  hoverable
                  className="h-full cursor-pointer transition-all duration-300 hover:shadow-lg"
                  onClick={() => handleSelectCampaign(campaign.route)}
                  style={{ 
                    borderRadius: isMobile ? '8px' : '12px',
                    border: '1px solid #e5e7eb',
                    minHeight: isMobile ? '250px' : '280px'
                  }}
                  bodyStyle={{ 
                    padding: isMobile ? "16px" : "24px", 
                    textAlign: "center",
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    height: '100%'
                  }}
                >
                  <div>
                    <div className="mb-4">
                      {campaign.icon}
                    </div>
                    <Title level={4} style={{ fontSize: isMobile ? '16px' : '18px', margin: '0 0 12px 0' }}>
                      {campaign.title}
                    </Title>
                    <Text type="secondary" style={{ fontSize: isMobile ? '13px' : '14px', lineHeight: '1.4', display: 'block', marginBottom: '16px' }}>
                      {campaign.description}
                    </Text>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px', marginBottom: '16px' }}>
                      {campaign.features.map((feature, index) => (
                        <Tag key={index} color="blue" style={{ fontSize: '11px', margin: '2px' }}>
                          {feature}
                        </Tag>
                      ))}
                    </div>
                  </div>
                  <Button
                    type="primary"
                    size={isMobile ? "middle" : "large"}
                    className="w-full"
                    style={{ 
                      backgroundColor: "#ac6a1e",
                      borderColor: "#ac6a1e",
                      height: isMobile ? '36px' : '40px',
                      fontSize: isMobile ? '14px' : '16px'
                    }}
                  >
                    Select
                  </Button>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </Card>
    </div>
  );
};

export default function Page() {
  return <SelectCampaign />;
}