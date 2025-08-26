"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Alert, Button, Divider, Spin, Typography } from "antd";

type CampaignReportData = {
  companyName: string;
  totalEmailsSent: number;
  totalReplies: number;
  creditsUsed?: number;
  remindersSent?: number;
  campaignName?: string;
  sentAt?: string;
};

const { Title, Text } = Typography;

export default function CampaignReportPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [report, setReport] = useState<CampaignReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    if (!id || !apiUrl) return;

    let isMounted = true;

    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${apiUrl}/campaign/${id}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "omit",
        });

        if (!res.ok) {
          if (res.status === 401) {
            throw new Error("You need to be logged in to view this report");
          }
          if (res.status === 403) {
            throw new Error("You do not have permission to view this report");
          }
          const body = await res.text();
          throw new Error(body || "Failed to load report data");
        }

        const data = (await res.json()) as CampaignReportData;
        if (isMounted) setReport(data);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Error loading report";
        if (isMounted) setError(message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchReport();
    return () => {
      isMounted = false;
    };
  }, [id, apiUrl]);

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large">
          <div className="p-5 text-center">Loading report data...</div>
        </Spin>
      </div>
    );

  if (error)
    return (
      <Alert
        message="Error"
        description={error}
        type="error"
        showIcon
        className="max-w-4xl mx-auto mt-8"
      />
    );

  if (!report)
    return (
      <Alert
        message="Report Not Found"
        description="No report data available for this campaign."
        type="warning"
        showIcon
        className="max-w-4xl mx-auto mt-8"
      />
    );

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <div className="bg-gray-900 p-8 mb-6 rounded-t-lg text-white">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-white">Black Leo Venture</h1>
        </div>
        <div className="flex justify-center items-center mt-12 mb-6">
          <div className="relative">
            <div className="bg-purple-500 rounded-lg p-4 w-36 h-24 flex items-center justify-center">
              <span className="text-white font-bold">Black Leo Venture</span>
            </div>
            <div className="absolute -top-1 -right-1 bg-pink-600 rounded-full w-8 h-8 flex items-center justify-center">
              <span className="text-white">✓</span>
            </div>
          </div>
        </div>
      </div>

      <div className="py-4 px-6">
        <Text className="text-lg">Here is the summary for your campaign:</Text>

        <div className="mt-6">
          <Title level={4} className="text-gray-700">
            {report.companyName}:
          </Title>

          <div className="mt-4 space-y-3 text-gray-500">
            <p># Firms contacted: {report.totalEmailsSent}</p>
            <p># Credits used: {report.creditsUsed ?? 2000}</p>
            <p># Reminders sent: {report.remindersSent ?? 0}</p>
            <p>
              # People who have responded to outreaches: {report.totalReplies}
            </p>
            <p>
              # Response Rate: {report.totalEmailsSent > 0
                ? ((report.totalReplies / report.totalEmailsSent) * 100).toFixed(2)
                : "0.0"} %
            </p>

            {/* Placeholder for a detailed report link; implement when route exists */}
          </div>

          <Divider />

          <div className="mt-4">
            <p className="text-gray-700 font-medium">Investor connects:</p>
            <p className="mt-2 text-gray-500"># Total Credits: {report.creditsUsed ?? 10000}</p>
          </div>

          <div className="mt-8 text-gray-500">
            <p>All the best!</p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Button onClick={() => router.back()} className="border-gray-300">
          Back
        </Button>
      </div>
    </div>
  );
}

