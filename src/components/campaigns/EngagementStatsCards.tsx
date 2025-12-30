"use client";

import { useState, useEffect } from "react";
import { Card, Statistic, Button, Badge, message } from "antd";
import {
  EyeOutlined,
  MessageOutlined,
  UserOutlined,
  TeamOutlined,
} from "@ant-design/icons";
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

  // Store ETags for caching
  const [repliesEtag, setRepliesEtag] = useState<string | null>(null);
  const [cachedReplies, setCachedReplies] = useState<any[]>([]);
  const [engagementEtag, setEngagementEtag] = useState<string | null>(null);
  const [cachedEngagement, setCachedEngagement] =
    useState<EngagementData | null>(null);

  const fetchEngagementData = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      if (!token) return;

      // Build headers with ETag for conditional request
      const engagementHeaders: HeadersInit = {
        Authorization: `Bearer ${token}`,
      };
      if (engagementEtag) {
        engagementHeaders["If-None-Match"] = engagementEtag;
      }

      // Fetch engagement details (openers) with caching
      const engagementResponse = await fetch(
        `${API_BASE_URL}/campaigns/${campaignId}/engagement-details`,
        { headers: engagementHeaders }
      );

      let engagementResult = cachedEngagement;

      // Only parse if not 304 Not Modified
      if (engagementResponse.status === 304) {
        console.log(
          "[Engagement] Using cached engagement data (304 Not Modified)"
        );
      } else if (engagementResponse.ok) {
        engagementResult = await engagementResponse.json();
        setCachedEngagement(engagementResult);

        // Store new ETag
        const newEtag = engagementResponse.headers.get("ETag");
        if (newEtag) {
          setEngagementEtag(newEtag);
        }
      } else {
        throw new Error("Failed to fetch engagement details");
      }

      if (!engagementResult) {
        throw new Error("No engagement data available");
      }

      // Fetch replies from new API with caching
      const repliesHeaders: HeadersInit = {
        Authorization: `Bearer ${token}`,
      };

      // Use ETag for conditional request (saves Firebase reads!)
      if (repliesEtag) {
        repliesHeaders["If-None-Match"] = repliesEtag;
      }

      const repliesResponse = await fetch(
        `${API_BASE_URL}/campaigns/${campaignId}/replies`,
        { headers: repliesHeaders }
      );

      let repliesData = cachedReplies;

      // Only parse if not 304 Not Modified
      if (repliesResponse.status !== 304) {
        if (repliesResponse.ok) {
          const result = await repliesResponse.json();
          repliesData = result.replies || [];
          setCachedReplies(repliesData);

          // Store new ETag for next request
          const newEtag = repliesResponse.headers.get("ETag");
          if (newEtag) {
            setRepliesEtag(newEtag);
          }
        }
      } else {
        console.log(
          "[Engagement] Using cached replies data (304 Not Modified)"
        );
      }

      setData({
        uniqueOpeners: engagementResult.uniqueOpeners,
        uniqueRepliers:
          repliesData.length > 0
            ? repliesData
            : engagementResult.uniqueRepliers,
        summary: engagementResult.summary,
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
                  ? Math.round(
                      (summary.totalOpeners / summary.totalRecipients) * 100
                    )
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
                  ? Math.round(
                      (summary.totalRepliers / summary.totalRecipients) * 100
                    )
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
