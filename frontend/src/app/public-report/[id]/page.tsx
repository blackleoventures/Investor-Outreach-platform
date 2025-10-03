"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Alert, Spin, Typography, Button } from "antd";

const { Title, Text } = Typography;

export default function PublicReportPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    if (!id || !apiUrl) return;

    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${apiUrl}/api/public-reports/${id}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          throw new Error("Failed to load report");
        }

        const data = await res.json();
        setReport(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [id, apiUrl]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large">
          <div className="p-5 text-center">Loading report...</div>
        </Spin>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error"
        description={error}
        type="error"
        showIcon
        className="max-w-4xl mx-auto mt-8"
      />
    );
  }

  if (!report) {
    return (
      <Alert
        message="Report Not Found"
        description="No report data available."
        type="warning"
        showIcon
        className="max-w-4xl mx-auto mt-8"
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white min-h-screen">
      <div className="bg-gray-900 p-8 mb-6 rounded-lg text-white">
        <Title level={2} className="text-white mb-4">
          Campaign Report
        </Title>
        <Text className="text-gray-300">
          Public report for campaign: {report.campaignName || id}
        </Text>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <Title level={3} className="mb-6">Campaign Summary</Title>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600">
              {report.totalEmailsSent || 0}
            </div>
            <div className="text-sm text-gray-600">Emails Sent</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600">
              {report.totalReplies || 0}
            </div>
            <div className="text-sm text-gray-600">Replies</div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-3xl font-bold text-purple-600">
              {report.totalEmailsSent > 0 
                ? ((report.totalReplies / report.totalEmailsSent) * 100).toFixed(1)
                : "0.0"}%
            </div>
            <div className="text-sm text-gray-600">Response Rate</div>
          </div>
          
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-3xl font-bold text-orange-600">
              {report.creditsUsed || 0}
            </div>
            <div className="text-sm text-gray-600">Credits Used</div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Text strong>Company: </Text>
            <Text>{report.companyName || "N/A"}</Text>
          </div>
          
          <div>
            <Text strong>Campaign Date: </Text>
            <Text>{report.sentAt ? new Date(report.sentAt).toLocaleDateString() : "N/A"}</Text>
          </div>
          
          <div>
            <Text strong>Reminders Sent: </Text>
            <Text>{report.remindersSent || 0}</Text>
          </div>
        </div>

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <Text className="text-gray-600">
            This is a public report that can be shared with anyone. 
            The link to this report is: 
          </Text>
          <div className="mt-2 p-2 bg-white border rounded font-mono text-sm">
            {typeof window !== 'undefined' ? window.location.href : ''}
          </div>
          <Button 
            className="mt-2" 
            onClick={() => navigator.clipboard.writeText(window.location.href)}
          >
            Copy Link
          </Button>
        </div>
      </div>
    </div>
  );
}