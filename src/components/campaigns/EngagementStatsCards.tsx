"use client";

import { useState, useEffect } from "react";
import { Card, Statistic, Button, Badge, message } from "antd";
import { EyeOutlined, MessageOutlined, UserOutlined, TeamOutlined } from "@ant-design/icons";
import { auth } from "@/lib/firebase";
import EngagementDetailsModal from "./EngagementDetailsModal";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface EngagementStatsCardsProps {
  campaignId: string;
  campaignName: string;
}

interface EngagementData {
  uniqueOpeners: any[];
  uniqueRepliers: any[];
  summary: {
    totalRecipients: number;
    totalOpeners: number;
    totalRepliers: number;
    totalOpens: number;
    totalReplies: number;
    averageOpensPerPerson: number;
  };
}

export default function EngagementStatsCards({
  campaignId,
  campaignName,
}: EngagementStatsCardsProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<EngagementData | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<"openers" | "repliers">("openers");

  useEffect(() => {
    fetchEngagementData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const getAuthToken = async () => {
    const user = auth.currentUser;
    if (!user) {
      message.error("Please login to continue");
      return null;
    }
    return await user.getIdToken();
  };

  const fetchEngagementData = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(
        `${API_BASE_URL}/campaigns/${campaignId}/engagement-details`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch engagement details");
      }

      const result = await response.json();
      setData({
        uniqueOpeners: result.uniqueOpeners,
        uniqueRepliers: result.uniqueRepliers,
        summary: result.summary,
      });
    } catch (error: any) {
      console.error("Fetch engagement error:", error);
      message.error(error.message || "Failed to load engagement data");
    } finally {
      setLoading(false);
    }
  };

  const handleViewOpeners = () => {
    setModalType("openers");
    setModalVisible(true);
  };

  const handleViewRepliers = () => {
    setModalType("repliers");
    setModalVisible(true);
  };

  if (!data) {
    return (
      <Card loading={loading}>
        <p className="text-center text-gray-500">Loading engagement data...</p>
      </Card>
    );
  }

  const { summary } = data;

  return (
    <>
      <Card title="📊 Enhanced Engagement Metrics" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <Statistic
              title="Unique Openers"
              value={summary.totalOpeners}
              prefix={<EyeOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
            <div className="mt-3">
              <Button
                type="link"
                size="small"
                onClick={handleViewOpeners}
                disabled={summary.totalOpeners === 0}
                className="p-0 mt-2"
              >
                View WHO opened →
              </Button>
            </div>
          </Card>

          <Card>
            <Statistic
              title="Unique Repliers"
              value={summary.totalRepliers}
              prefix={<MessageOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
            <div className="mt-3">
              <Button
                type="link"
                size="small"
                onClick={handleViewRepliers}
                disabled={summary.totalRepliers === 0}
                className="p-0"
              >
                View WHO replied →
              </Button>
            </div>
          </Card>

          <Card>
            <Statistic
              title="Open Rate"
              value={
                summary.totalRecipients > 0
                  ? Math.round((summary.totalOpeners / summary.totalRecipients) * 100)
                  : 0
              }
              suffix="%"
              prefix={<UserOutlined />}
              valueStyle={{ color: "#722ed1" }}
            />
            <div className="mt-3">
              <Badge
                status={
                  summary.totalOpeners / summary.totalRecipients >= 0.3
                    ? "success"
                    : summary.totalOpeners / summary.totalRecipients >= 0.15
                    ? "warning"
                    : "error"
                }
                text={
                  summary.totalOpeners / summary.totalRecipients >= 0.3
                    ? "Excellent"
                    : summary.totalOpeners / summary.totalRecipients >= 0.15
                    ? "Good"
                    : "Needs Improvement"
                }
              />
            </div>
          </Card>

          <Card>
            <Statistic
              title="Reply Rate"
              value={
                summary.totalRecipients > 0
                  ? Math.round((summary.totalRepliers / summary.totalRecipients) * 100)
                  : 0
              }
              suffix="%"
              prefix={<TeamOutlined />}
              valueStyle={{ color: "#fa8c16" }}
            />
            <div className="mt-3">
              <Badge
                status={
                  summary.totalRepliers / summary.totalRecipients >= 0.05
                    ? "success"
                    : summary.totalRepliers / summary.totalRecipients >= 0.02
                    ? "warning"
                    : "error"
                }
                text={
                  summary.totalRepliers / summary.totalRecipients >= 0.05
                    ? "Excellent"
                    : summary.totalRepliers / summary.totalRecipients >= 0.02
                    ? "Good"
                    : "Needs Improvement"
                }
              />
            </div>
          </Card>
        </div>
      </Card>

      <EngagementDetailsModal
        visible={modalVisible}
        type={modalType}
        campaignName={campaignName}
        openers={data.uniqueOpeners}
        repliers={data.uniqueRepliers}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
}
