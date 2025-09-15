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

  // Fully suppress UI - immediately navigate and render nothing
  return null;
};

export default function Page() {
  return <SelectCampaign />;
}