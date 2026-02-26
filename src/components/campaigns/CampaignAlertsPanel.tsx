// components/campaigns/CampaignAlertsPanel.tsx
"use client";

import { useState, useEffect } from "react";
import { Alert, Button, Space, Typography, Collapse, Tag, Badge } from "antd";
import {
  WarningOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from "@ant-design/icons";
import { auth } from "@/lib/firebase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface CampaignAlert {
  id: string;
  type: string;
  friendlyMessage: string;
  howToFix: string;
  severity: "critical" | "warning" | "info";
  rawError: string;
  source: string;
  occurrenceCount: number;
  firstOccurredAt: string;
  lastOccurredAt: string;
}

interface CampaignAlertsPanelProps {
  campaignId: string;
}

export default function CampaignAlertsPanel({
  campaignId,
}: CampaignAlertsPanelProps) {
  const [alerts, setAlerts] = useState<CampaignAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRawErrors, setExpandedRawErrors] = useState<Set<string>>(
    new Set(),
  );
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    // Wait for Firebase auth to be ready before fetching alerts
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchAlerts(user);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const getAuthToken = async () => {
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  };

  const fetchAlerts = async (user?: any) => {
    try {
      setLoading(true);
      const currentUser = user || auth.currentUser;
      if (!currentUser) return;
      const token = await currentUser.getIdToken();

      const response = await fetch(
        `${API_BASE_URL}/campaigns/${campaignId}/alerts`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!response.ok) return;

      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (
    alertId: string,
    action: "resolve" | "dismiss",
  ) => {
    try {
      setActionLoading(alertId);
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(
        `${API_BASE_URL}/campaigns/${campaignId}/alerts`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ alertId, action }),
        },
      );

      if (response.ok) {
        // Remove the alert from the list
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      }
    } catch (error) {
      console.error("Failed to update alert:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleRawError = (alertId: string) => {
    setExpandedRawErrors((prev) => {
      const next = new Set(prev);
      if (next.has(alertId)) {
        next.delete(alertId);
      } else {
        next.add(alertId);
      }
      return next;
    });
  };

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case "critical":
        return {
          type: "error" as const,
          icon: <CloseCircleOutlined />,
          color: "#ff4d4f",
          tagColor: "red",
        };
      case "warning":
        return {
          type: "warning" as const,
          icon: <WarningOutlined />,
          color: "#faad14",
          tagColor: "orange",
        };
      default:
        return {
          type: "info" as const,
          icon: <InfoCircleOutlined />,
          color: "#1890ff",
          tagColor: "blue",
        };
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Don't render anything if no alerts
  if (!loading && alerts.length === 0) return null;
  if (loading) return null; // Don't show loading skeleton — too noisy

  return (
    <div className="mb-4 space-y-2">
      {alerts.map((alert) => {
        const config = getSeverityConfig(alert.severity);
        const isExpanded = expandedRawErrors.has(alert.id);

        return (
          <Alert
            key={alert.id}
            type={config.type}
            showIcon
            icon={config.icon}
            closable={false}
            message={
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{alert.friendlyMessage}</span>
                  {alert.occurrenceCount > 1 && (
                    <Badge
                      count={`${alert.occurrenceCount}x`}
                      style={{
                        backgroundColor: config.color,
                        fontSize: "11px",
                      }}
                    />
                  )}
                </div>
                <Space size="small">
                  <Button
                    size="small"
                    type="text"
                    icon={
                      isExpanded ? <EyeInvisibleOutlined /> : <EyeOutlined />
                    }
                    onClick={() => toggleRawError(alert.id)}
                  >
                    {isExpanded ? "Hide Details" : "Details"}
                  </Button>
                  <Button
                    size="small"
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    loading={actionLoading === alert.id}
                    onClick={() => handleAction(alert.id, "resolve")}
                    style={{
                      backgroundColor: "#52c41a",
                      borderColor: "#52c41a",
                    }}
                  >
                    Resolved
                  </Button>
                  <Button
                    size="small"
                    onClick={() => handleAction(alert.id, "dismiss")}
                    loading={actionLoading === alert.id}
                  >
                    Dismiss
                  </Button>
                </Space>
              </div>
            }
            description={
              <div className="mt-2">
                {/* How to Fix */}
                <div className="bg-white/60 rounded-md p-3 border border-gray-100">
                  <Typography.Text
                    strong
                    className="text-xs uppercase text-gray-400 block mb-1"
                  >
                    How to Fix
                  </Typography.Text>
                  <Typography.Text className="text-sm">
                    {alert.howToFix}
                  </Typography.Text>
                </div>

                {/* Raw Error (expandable - for developers) */}
                {isExpanded && (
                  <div className="mt-2 bg-gray-900 rounded-md p-3 text-white font-mono text-xs overflow-x-auto">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag color="default" className="text-xs">
                        Source: {alert.source}
                      </Tag>
                      <Tag color="default" className="text-xs">
                        Type: {alert.type}
                      </Tag>
                      <span className="text-gray-400 text-xs">
                        First: {formatDate(alert.firstOccurredAt)} | Last:{" "}
                        {formatDate(alert.lastOccurredAt)}
                      </span>
                    </div>
                    <pre className="whitespace-pre-wrap text-red-300 m-0">
                      {alert.rawError}
                    </pre>
                  </div>
                )}
              </div>
            }
          />
        );
      })}
    </div>
  );
}
