"use client";

import { Card, Statistic } from "antd";
import { MailOutlined, EyeOutlined, UserOutlined } from "@ant-design/icons";

interface FollowupStatsCardsProps {
  totalDeliveredNotOpened: number;
  totalOpenedNotReplied: number;
  totalCandidates: number;
}

export default function FollowupStatsCards({
  totalDeliveredNotOpened,
  totalOpenedNotReplied,
  totalCandidates,
}: FollowupStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <Statistic
          title="Delivered but Not Opened"
          value={totalDeliveredNotOpened}
          prefix={<MailOutlined />}
          valueStyle={{ color: "#1890ff" }}
          suffix="recipients"
        />
        <p className="text-sm text-gray-500 mt-2">
          Haven't opened email yet (>48 hours)
        </p>
      </Card>

      <Card>
        <Statistic
          title="Opened but Not Replied"
          value={totalOpenedNotReplied}
          prefix={<EyeOutlined />}
          valueStyle={{ color: "#52c41a" }}
          suffix="recipients"
        />
        <p className="text-sm text-gray-500 mt-2">
          Opened but no response (>72 hours)
        </p>
      </Card>

      <Card>
        <Statistic
          title="Total Follow-up Candidates"
          value={totalCandidates}
          prefix={<UserOutlined />}
          valueStyle={{ color: "#722ed1" }}
          suffix="recipients"
        />
        <p className="text-sm text-gray-500 mt-2">
          Ready for follow-up emails
        </p>
      </Card>
    </div>
  );
}
