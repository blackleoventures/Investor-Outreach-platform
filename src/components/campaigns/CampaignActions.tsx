// components/campaigns/CampaignActions.tsx

"use client";

import { useState } from "react";
import { Button, Modal, message } from "antd";
import {
  CheckCircleOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { auth } from "@/lib/firebase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface CampaignActionsProps {
  campaignId: string;
  campaignName: string;
  campaignStatus: string;
  stats: {
    sent: number;
    delivered: number;
    opened: number;
    replied: number;
    failed: number;
    pending: number;
  };
  totalRecipients: number;
  userRole: string; // 'admin', 'subadmin', or 'client'
  onStatusChange: () => void; // Callback to refresh campaign data
}

export default function CampaignActions({
  campaignId,
  campaignName,
  campaignStatus,
  stats,
  totalRecipients,
  userRole,
  onStatusChange,
}: CampaignActionsProps) {
  const [loading, setLoading] = useState(false);

  const isAdminOrSubadmin =
    userRole === "admin" || userRole === "subadmin" || userRole === "owner";
  const canMarkComplete = isAdminOrSubadmin && campaignStatus !== "completed";

  const getAuthToken = async () => {
    const user = auth.currentUser;
    if (!user) {
      message.error("Please login to continue");
      return null;
    }
    return await user.getIdToken();
  };

  //  Handle Mark as Complete
  const handleMarkComplete = () => {
    Modal.confirm({
      title: "Mark Campaign as Completed",
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p className="mb-4">
            Are you sure you want to mark this campaign as completed?
          </p>
          <div className="bg-blue-50 p-4 rounded mb-4">
            <p className="font-semibold mb-2">Current Statistics:</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Total Recipients: {totalRecipients}</div>
              <div>Sent: {stats.sent}</div>
              <div>Delivered: {stats.delivered}</div>
              <div>Opened: {stats.opened}</div>
              <div>Replied: {stats.replied}</div>
              <div>Failed: {stats.failed}</div>
              <div>Pending: {stats.pending}</div>
            </div>
          </div>
          <p className="text-red-600 font-semibold">
            ⚠️ Warning: This action cannot be undone!
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Once completed, the campaign will stop sending emails and cannot be
            resumed.
          </p>
        </div>
      ),
      okText: "Yes, Mark as Completed",
      okType: "danger",
      cancelText: "Cancel",
      width: 600,

      okButtonProps: {
        style: {
          backgroundColor: "#1890ff",
          borderColor: "#1890ff",
          color: "white",
        },
        className: "hover:!bg-blue-600",
      },
      cancelButtonProps: {
        style: {
          backgroundColor: "#f5f5f5",
          color: "#000",
          borderColor: "#d9d9d9",
        },
        className: "hover:!bg-gray-200",
      },

      onOk: async () => {
        try {
          setLoading(true);
          const token = await getAuthToken();
          if (!token) return;

          const response = await fetch(
            `${API_BASE_URL}/campaigns/${campaignId}/mark-complete`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              errorData.error || "Failed to mark campaign as complete",
            );
          }

          message.success("Campaign marked as completed successfully!");
          onStatusChange();
        } catch (error: any) {
          console.error("Mark complete error:", error);
          message.error(error.message || "Failed to mark campaign as complete");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  //  Handle Pause / Resume Campaign
  const handlePauseResume = () => {
    const newStatus = campaignStatus === "paused" ? "active" : "paused";
    const action = newStatus === "paused" ? "pause" : "resume";

    Modal.confirm({
      title: `${action === "pause" ? "Pause" : "Resume"} Campaign`,
      content: `Are you sure you want to ${action} "${campaignName}"?`,
      okText: `Yes, ${action === "pause" ? "Pause" : "Resume"}`,
      cancelText: "Cancel",

      okButtonProps: {
        style: {
          backgroundColor: action === "pause" ? "#fa8c16" : "#52c41a",
          borderColor: action === "pause" ? "#fa8c16" : "#52c41a",
          color: "white",
        },
        className:
          action === "pause" ? "hover:!bg-orange-600" : "hover:!bg-green-600",
      },
      cancelButtonProps: {
        style: {
          backgroundColor: "#f5f5f5",
          color: "#000",
          borderColor: "#d9d9d9",
        },
        className: "hover:!bg-gray-200",
      },

      onOk: async () => {
        try {
          setLoading(true);
          const token = await getAuthToken();
          if (!token) return;

          const response = await fetch(
            `${API_BASE_URL}/campaigns/${campaignId}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ status: newStatus }),
            },
          );

          if (!response.ok) {
            throw new Error(`Failed to ${action} campaign`);
          }

          message.success(`Campaign ${action}d successfully`);
          onStatusChange();
        } catch (error: any) {
          console.error(`${action} error:`, error);
          message.error(error.message || `Failed to ${action} campaign`);
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // Handle Reschedule Campaign
  const handleReschedule = () => {
    Modal.confirm({
      title: "Reschedule Pending Emails",
      icon: <ReloadOutlined />,
      content: (
        <div>
          <p className="mb-4">
            This will reschedule all <strong>pending</strong> emails to use the
            correct sending window.
          </p>
          <div className="bg-blue-50 p-4 rounded mb-4">
            <p className="font-semibold mb-2">What happens:</p>
            <ul className="text-sm list-disc pl-4">
              <li>Only pending recipients are affected</li>
              <li>
                Only emails scheduled for <strong>tomorrow onwards</strong> are
                rescheduled
              </li>
              <li>Today's emails are NOT touched</li>
              <li>Already sent/delivered/replied emails are NOT touched</li>
              <li>
                Emails will be spread within your campaign's sending window
              </li>
            </ul>
          </div>
          <p className="text-sm text-gray-600">
            Pending emails: {stats.pending}
          </p>
        </div>
      ),
      okText: "Yes, Reschedule",
      cancelText: "Cancel",
      width: 500,

      okButtonProps: {
        style: {
          backgroundColor: "#722ed1",
          borderColor: "#722ed1",
          color: "white",
        },
      },
      cancelButtonProps: {
        style: {
          backgroundColor: "#f5f5f5",
          color: "#000",
          borderColor: "#d9d9d9",
        },
      },

      onOk: async () => {
        try {
          setLoading(true);
          const token = await getAuthToken();
          if (!token) return;

          const response = await fetch(
            `${API_BASE_URL}/campaigns/${campaignId}/reschedule`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || "Failed to reschedule campaign");
          }

          message.success(
            `${data.stats?.rescheduled || 0} emails rescheduled successfully!`,
          );
          onStatusChange();
        } catch (error: any) {
          console.error("Reschedule error:", error);
          message.error(error.message || "Failed to reschedule campaign");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  return (
    <div className="flex gap-2">
      {/* Pause/Resume Button - Available to all users */}
      {campaignStatus !== "completed" && (
        <Button
          icon={
            campaignStatus === "paused" ? (
              <PlayCircleOutlined />
            ) : (
              <PauseCircleOutlined />
            )
          }
          onClick={handlePauseResume}
          loading={loading}
          style={{
            backgroundColor:
              campaignStatus === "paused" ? "#52c41a" : "#fa8c16",
            borderColor: campaignStatus === "paused" ? "#52c41a" : "#fa8c16",
            color: "white",
          }}
        >
          {campaignStatus === "paused" ? "Resume" : "Pause"}
        </Button>
      )}

      {/* Mark Complete Button - Admin/Subadmin Only */}

      <Button
        icon={<CheckCircleOutlined />}
        onClick={handleMarkComplete}
        loading={loading}
        style={{
          backgroundColor: "#1890ff",
          borderColor: "#1890ff",
          color: "white",
        }}
      >
        Mark as Complete
      </Button>

      {/* Reschedule Button - Admin/Subadmin Only, Active/Paused Campaigns */}
      {/* 
      {process.env.NODE_ENV === "development" && (
        <Button
          icon={<ReloadOutlined />}
          onClick={handleReschedule}
          loading={loading}
          style={{
            backgroundColor: "#722ed1",
            borderColor: "#722ed1",
            color: "white",
          }}
        >
          Reschedule
        </Button>
      )} */}
    </div>
  );
}
