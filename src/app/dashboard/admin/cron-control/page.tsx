"use client";

import { useState, useEffect } from "react";
import { Card, Button, message, Spin, Tag, Divider } from "antd";
import {
  ThunderboltOutlined,
  MailOutlined,
  InboxOutlined,
  BarChartOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";

interface JobResult {
  timestamp: string;
  job: string;
  status: "success" | "error";
  message: string;
  duration?: number;
  data?: any;
}

export default function CronControlPage() {
  const [sendEmailsLoading, setSendEmailsLoading] = useState(false);
  const [checkRepliesLoading, setCheckRepliesLoading] = useState(false);
  const [updateStatsLoading, setUpdateStatsLoading] = useState(false);
  
  const [sendEmailsResult, setSendEmailsResult] = useState<any>(null);
  const [checkRepliesResult, setCheckRepliesResult] = useState<any>(null);
  const [updateStatsResult, setUpdateStatsResult] = useState<any>(null);
  
  const [activityLog, setActivityLog] = useState<JobResult[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Auto-refresh every 30 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshAllStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const refreshAllStatus = async () => {
    // This could fetch latest stats from campaigns
    message.info("Auto-refreshing status...");
  };

  const addToActivityLog = (result: JobResult) => {
    setActivityLog(prev => [result, ...prev.slice(0, 19)]); // Keep last 20
  };

  const triggerSendEmails = async () => {
    try {
      setSendEmailsLoading(true);
      message.loading({ content: "Sending pending emails...", key: "send" });

      const startTime = Date.now();
      const response = await fetch("/api/cron/send-emails");
      const data = await response.json();
      const duration = Math.round((Date.now() - startTime) / 1000);

      if (data.success) {
        setSendEmailsResult(data);
        message.success({
          content: `✓ Sent ${data.sent} emails${data.failed ? `, ${data.failed} failed` : ""}`,
          key: "send",
          duration: 3,
        });

        addToActivityLog({
          timestamp: new Date().toISOString(),
          job: "Send Emails",
          status: "success",
          message: `Sent ${data.sent} emails, ${data.failed || 0} failed`,
          duration,
          data,
        });
      } else {
        throw new Error(data.error || "Failed to send emails");
      }
    } catch (error: any) {
      console.error("Send emails error:", error);
      message.error({
        content: `✗ Error: ${error.message}`,
        key: "send",
        duration: 5,
      });

      addToActivityLog({
        timestamp: new Date().toISOString(),
        job: "Send Emails",
        status: "error",
        message: error.message,
      });
    } finally {
      setSendEmailsLoading(false);
    }
  };

  const triggerCheckReplies = async () => {
    try {
      setCheckRepliesLoading(true);
      message.loading({ content: "Checking for replies...", key: "replies" });

      const startTime = Date.now();
      const response = await fetch("/api/cron/check-replies");
      const data = await response.json();
      const duration = Math.round((Date.now() - startTime) / 1000);

      if (data.success) {
        setCheckRepliesResult(data);
        message.success({
          content: `✓ Checked ${data.campaignsChecked} campaigns, found ${data.repliesDetected} replies`,
          key: "replies",
          duration: 3,
        });

        addToActivityLog({
          timestamp: new Date().toISOString(),
          job: "Check Replies",
          status: "success",
          message: `${data.campaignsChecked} campaigns checked, ${data.repliesDetected} replies found`,
          duration,
          data,
        });
      } else {
        throw new Error(data.error || "Failed to check replies");
      }
    } catch (error: any) {
      console.error("Check replies error:", error);
      message.error({
        content: `✗ Error: ${error.message}`,
        key: "replies",
        duration: 5,
      });

      addToActivityLog({
        timestamp: new Date().toISOString(),
        job: "Check Replies",
        status: "error",
        message: error.message,
      });
    } finally {
      setCheckRepliesLoading(false);
    }
  };

  const triggerUpdateStats = async () => {
    try {
      setUpdateStatsLoading(true);
      message.loading({ content: "Updating statistics...", key: "stats" });

      const startTime = Date.now();
      const response = await fetch("/api/cron/update-stats");
      const data = await response.json();
      const duration = Math.round((Date.now() - startTime) / 1000);

      if (data.success) {
        setUpdateStatsResult(data);
        message.success({
          content: `✓ Updated ${data.campaignsUpdated} campaigns${data.campaignsCompleted ? `, ${data.campaignsCompleted} completed` : ""}`,
          key: "stats",
          duration: 3,
        });

        addToActivityLog({
          timestamp: new Date().toISOString(),
          job: "Update Stats",
          status: "success",
          message: `${data.campaignsUpdated} campaigns updated, ${data.campaignsCompleted || 0} completed`,
          duration,
          data,
        });
      } else {
        throw new Error(data.error || "Failed to update stats");
      }
    } catch (error: any) {
      console.error("Update stats error:", error);
      message.error({
        content: `✗ Error: ${error.message}`,
        key: "stats",
        duration: 5,
      });

      addToActivityLog({
        timestamp: new Date().toISOString(),
        job: "Update Stats",
        status: "error",
        message: error.message,
      });
    } finally {
      setUpdateStatsLoading(false);
    }
  };

  const triggerAllJobs = async () => {
    await triggerSendEmails();
    await new Promise(resolve => setTimeout(resolve, 2000));
    await triggerCheckReplies();
    await new Promise(resolve => setTimeout(resolve, 2000));
    await triggerUpdateStats();
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Cron Job Control Panel</h1>
        <p className="text-gray-600">
          Manually trigger email campaign jobs for testing and development
        </p>
        <Tag color="orange" className="mt-2">
          Development Mode
        </Tag>
      </div>

      {/* Main Control Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Send Emails Card */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <MailOutlined style={{ fontSize: 20, color: "#1890ff" }} />
              <span>Send Emails</span>
            </div>
          }
          bordered
        >
          <p className="text-gray-600 mb-4">
            Processes up to 50 pending emails and sends them via SMTP
          </p>

          {sendEmailsResult && (
            <div className="mb-4 p-3 bg-blue-50 rounded">
              <div className="text-sm space-y-1">
                <p>
                  <strong>Sent:</strong> {sendEmailsResult.sent}
                </p>
                <p>
                  <strong>Failed:</strong> {sendEmailsResult.failed || 0}
                </p>
                <p>
                  <strong>Duration:</strong> {sendEmailsResult.duration}s
                </p>
              </div>
            </div>
          )}

          <Button
            type="primary"
            size="large"
            block
            onClick={triggerSendEmails}
            loading={sendEmailsLoading}
            icon={<MailOutlined />}
            style={{
              backgroundColor: "#1890ff",
              borderColor: "#1890ff",
            }}
          >
            Send Now
          </Button>
        </Card>

        {/* Check Replies Card */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <InboxOutlined style={{ fontSize: 20, color: "#52c41a" }} />
              <span>Check Replies</span>
            </div>
          }
          bordered
        >
          <p className="text-gray-600 mb-4">
            Scans client inboxes via IMAP for email replies
          </p>

          {checkRepliesResult && (
            <div className="mb-4 p-3 bg-green-50 rounded">
              <div className="text-sm space-y-1">
                <p>
                  <strong>Campaigns:</strong> {checkRepliesResult.campaignsChecked}
                </p>
                <p>
                  <strong>Replies:</strong> {checkRepliesResult.repliesDetected}
                </p>
                <p>
                  <strong>Duration:</strong> {checkRepliesResult.duration}s
                </p>
              </div>
            </div>
          )}

          <Button
            type="primary"
            size="large"
            block
            onClick={triggerCheckReplies}
            loading={checkRepliesLoading}
            icon={<InboxOutlined />}
            style={{
              backgroundColor: "#52c41a",
              borderColor: "#52c41a",
            }}
          >
            Check Now
          </Button>
        </Card>

        {/* Update Stats Card */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <BarChartOutlined style={{ fontSize: 20, color: "#fa8c16" }} />
              <span>Update Stats</span>
            </div>
          }
          bordered
        >
          <p className="text-gray-600 mb-4">
            Recalculates all campaign metrics and rates
          </p>

          {updateStatsResult && (
            <div className="mb-4 p-3 bg-orange-50 rounded">
              <div className="text-sm space-y-1">
                <p>
                  <strong>Updated:</strong> {updateStatsResult.campaignsUpdated}
                </p>
                <p>
                  <strong>Completed:</strong> {updateStatsResult.campaignsCompleted || 0}
                </p>
                <p>
                  <strong>Duration:</strong> {updateStatsResult.duration}s
                </p>
              </div>
            </div>
          )}

          <Button
            type="primary"
            size="large"
            block
            onClick={triggerUpdateStats}
            loading={updateStatsLoading}
            icon={<BarChartOutlined />}
            style={{
              backgroundColor: "#fa8c16",
              borderColor: "#fa8c16",
            }}
          >
            Update Now
          </Button>
        </Card>
      </div>

      {/* Bulk Actions */}
      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">Bulk Actions</h3>
            <p className="text-gray-600 text-sm">
              Run all cron jobs sequentially (useful for comprehensive testing)
            </p>
          </div>
          <Button
            size="large"
            onClick={triggerAllJobs}
            loading={sendEmailsLoading || checkRepliesLoading || updateStatsLoading}
            icon={<ThunderboltOutlined />}
            style={{
              backgroundColor: "#722ed1",
              borderColor: "#722ed1",
              color: "white",
            }}
          >
            Run All Jobs
          </Button>
        </div>
      </Card>

      {/* Activity Log */}
      <Card
        title={
          <div className="flex items-center justify-between">
            <span>Activity Log</span>
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => setActivityLog([])}
            >
              Clear Log
            </Button>
          </div>
        }
      >
        {activityLog.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No activity yet. Trigger a job to see logs here.
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {activityLog.map((log, index) => (
              <div
                key={index}
                className={`p-3 rounded border ${
                  log.status === "success"
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {log.status === "success" ? (
                      <CheckCircleOutlined className="text-green-600" />
                    ) : (
                      <CloseCircleOutlined className="text-red-600" />
                    )}
                    <div>
                      <p className="font-semibold">{log.job}</p>
                      <p className="text-sm text-gray-600">{log.message}</p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <p>{formatTimestamp(log.timestamp)}</p>
                    {log.duration && <p>{log.duration}s</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Instructions Card */}
      <Card className="mt-6" title="Testing Instructions">
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
          <li>Create a campaign with instant start enabled in the dashboard</li>
          <li>Wait 1 minute for the scheduled time to pass</li>
          <li>Click <strong>"Send Now"</strong> to send the first batch of 50 emails</li>
          <li>Check your test email inboxes for received emails</li>
          <li>Open an email to trigger the tracking pixel (opens are tracked automatically)</li>
          <li>Reply to an email from your test inbox</li>
          <li>Click <strong>"Check Replies"</strong> to detect the reply via IMAP</li>
          <li>Click <strong>"Update Stats"</strong> to recalculate campaign metrics</li>
          <li>Check the campaign detail page to see updated statistics</li>
          <li>Repeat steps 3-9 to send more batches until campaign complete</li>
        </ol>

        <Divider />

        <div className="bg-blue-50 p-4 rounded">
          <h4 className="font-semibold mb-2 text-blue-900">Production Note</h4>
          <p className="text-sm text-blue-800">
            In production (Vercel), these jobs run automatically via Vercel Cron:
          </p>
          <ul className="list-disc list-inside text-sm text-blue-800 mt-2 space-y-1">
            <li><strong>Send Emails:</strong> Every 5 minutes</li>
            <li><strong>Check Replies:</strong> Every 15 minutes</li>
            <li><strong>Update Stats:</strong> Every 1 hour</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
