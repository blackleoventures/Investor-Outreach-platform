"use client";

import { Card, Typography, Button, Row, Col, Tag } from "antd";
import { MailOutlined, RocketOutlined, BulbOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const { Title, Text } = Typography;

const SelectCampaign = () => {
  const router = useRouter();
  const { currentUser } = useAuth();

  const campaignTypes = [
    {
      id: "email",
      title: "Email Campaign",
      description: "Create and send personalized email campaigns to your contacts",
      icon: <MailOutlined style={{ fontSize: "2rem", color: "#1890ff" }} />,
      route: "/dashboard/campaign/email-form",
      features: ["Personalized emails", "Template support", "Analytics tracking"]
    },
    {
      id: "ai-email",
      title: "AI Email Campaign",
      description: "Generate AI-powered email content for better engagement",
      icon: <BulbOutlined style={{ fontSize: "2rem", color: "#52c41a" }} />,
      route: "/dashboard/campaign/ai-email-campaign",
      features: ["AI-generated content", "Smart personalization", "Auto optimization"]
    },
    {
      id: "advanced",
      title: "Advanced Campaign",
      description: "Create complex multi-step campaigns with advanced features",
      icon: <RocketOutlined style={{ fontSize: "2rem", color: "#fa8c16" }} />,
      route: "/dashboard/allCampaign",
      features: ["Multi-step workflows", "Advanced targeting", "A/B testing"]
    }
  ];

  const handleSelectCampaign = (route) => {
    router.push(route);
  };

  return (
    <div className="p-6">
      <Card>
        <div className="text-center mb-8">
          <Title level={2}>Select Campaign Type</Title>
          <Text type="secondary" className="text-lg">
            Choose the type of campaign you want to create
          </Text>
        </div>

        <Row gutter={[24, 24]} justify="center">
          {campaignTypes.map((campaign) => (
            <Col xs={24} sm={12} lg={8} key={campaign.id}>
              <Card
                hoverable
                className="h-full cursor-pointer transition-all duration-300 hover:shadow-lg"
                onClick={() => handleSelectCampaign(campaign.route)}
                bodyStyle={{ padding: "2rem", textAlign: "center" }}
              >
                <div className="mb-4">
                  {campaign.icon}
                </div>
                <Title level={4} className="mb-3">
                  {campaign.title}
                </Title>
                <Text type="secondary" className="block mb-4">
                  {campaign.description}
                </Text>
                <div className="mb-4">
                  {campaign.features.map((feature, index) => (
                    <Tag key={index} color="blue" className="mb-1">
                      {feature}
                    </Tag>
                  ))}
                </div>
                <Button
                  type="primary"
                  size="large"
                  className="w-full"
                  style={{ backgroundColor: "#ac6a1e" }}
                >
                  Select
                </Button>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
};

export default function Page() {
  return <SelectCampaign />;
}

