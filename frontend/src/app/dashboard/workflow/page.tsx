"use client";

import { useState, useEffect } from "react";
import { Card, Button, Typography, Descriptions, message } from "antd";
import { useRouter, useSearchParams } from "next/navigation";

const { Title } = Typography;

export default function WorkflowPage() {
  const [loading, setLoading] = useState(false);
  const [campaign, setCampaign] = useState<any>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const clientId = searchParams.get('clientId');
  const clientName = searchParams.get('clientName');
  const stage = searchParams.get('stage');
  const location = searchParams.get('location');

  useEffect(() => {
    if (clientId && clientName) {
      createCampaign();
    } else {
      // Check if we have campaign data in sessionStorage
      const savedCampaign = sessionStorage.getItem('currentCampaign');
      if (savedCampaign) {
        try {
          const campaignData = JSON.parse(savedCampaign);
          setCampaign(campaignData);
        } catch (e) {
          console.error('Failed to load saved campaign:', e);
        }
      }
    }
  }, [clientId, clientName]);

  const createCampaign = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          clientName,
          stage,
          location
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setCampaign(result.campaign);
        // Save campaign data to sessionStorage for persistence
        sessionStorage.setItem('currentCampaign', JSON.stringify(result.campaign));
        // Also save to localStorage for cross-page persistence
        const existingCampaigns = JSON.parse(localStorage.getItem('campaigns') || '[]');
        existingCampaigns.unshift(result.campaign);
        localStorage.setItem('campaigns', JSON.stringify(existingCampaigns));
        message.success('Campaign created successfully!');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      message.error('Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (campaign) {
      router.push(`/dashboard/investor-management?campaignId=${campaign.id}&clientName=${clientName}&stage=${stage}&location=${location}`);
    }
  };

  const handleViewCampaigns = () => {
    router.push('/dashboard/allCampaign');
  };

  if (loading) {
    return <div className="p-6 text-center">Creating campaign...</div>;
  }

  return (
    <div className="p-6">
      <Card title="📋 Campaign Creation" className="max-w-2xl mx-auto">
        {campaign && (
          <>
            <Descriptions column={1} bordered>
              <Descriptions.Item label="Campaign Name">{campaign.name}</Descriptions.Item>
              <Descriptions.Item label="Type">{campaign.type}</Descriptions.Item>
              <Descriptions.Item label="Status">{campaign.status}</Descriptions.Item>
              <Descriptions.Item label="Recipients">{campaign.recipients}</Descriptions.Item>
              <Descriptions.Item label="Created Date">{new Date(campaign.createdAt).toLocaleDateString()}</Descriptions.Item>
            </Descriptions>

            <div className="mt-6 flex justify-between items-center">
              <div className="flex gap-2">
                <Button onClick={() => router.push('/dashboard/all-client')}>← All Clients</Button>
                <Button onClick={handleViewCampaigns}>Manage Campaigns</Button>
              </div>
              <Button type="primary" size="large" onClick={handleNext}>
                Next: Matchmaking →
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}