"use client";

import { Card, Radio, Button, Space, Alert } from "antd";
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  UserSwitchOutlined,
  RobotOutlined,
  TeamOutlined,
} from "@ant-design/icons";

interface TargetAudienceProps {
  targetType: "investors" | "incubators" | "both";
  onTargetSelect: (type: "investors" | "incubators" | "both") => void;
  onNext: () => void;
  onBack: () => void;
}

export default function TargetAudience({
  targetType,
  onTargetSelect,
  onNext,
  onBack,
}: TargetAudienceProps) {
  const options = [
    {
      value: "investors",
      title: "Investors Only",
      icon: <UserSwitchOutlined style={{ fontSize: 48, color: "#4f46e5" }} />,
      description: "Target venture capital firms, angel investors, and investment funds",
      count: "Best for fundraising and direct investment outreach",
    },
    {
      value: "incubators",
      title: "Incubators Only",
      icon: <RobotOutlined style={{ fontSize: 48, color: "#4f46e5" }} />,
      description: "Target accelerators, incubator programs, and startup support organizations",
      count: "Best for early-stage support and program applications",
    },
    {
      value: "both",
      title: "Both Investors & Incubators",
      icon: <TeamOutlined style={{ fontSize: 48, color: "#4f46e5" }} />,
      description: "Target all types for maximum reach and exposure (Recommended)",
      count: "Widest reach across both investors and incubators",
      recommended: true,
    },
  ];

  return (
    <div>
      <Card title="Select Target Audience" className="mb-6">
        <Alert
          message="Who should receive this campaign?"
          description="Choose which types of contacts will receive your client's outreach emails. The matching algorithm will filter based on relevance."
          type="info"
          showIcon
          className="mb-6"
        />

        <Radio.Group
          value={targetType}
          onChange={(e) => onTargetSelect(e.target.value)}
          className="w-full"
        >
          <Space direction="vertical" size="large" className="w-full">
            {options.map((option) => (
              <Card
                key={option.value}
                hoverable
                className={`cursor-pointer transition-all ${
                  targetType === option.value
                    ? "border-2 border-brand-600 shadow-lg"
                    : "border border-gray-200"
                }`}
                onClick={() => onTargetSelect(option.value as any)}
              >
                <Radio value={option.value} className="w-full">
                  <div className="flex items-start gap-4 py-2">
                    <div className="mt-1">{option.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold m-0">
                          {option.title}
                        </h3>
                        {option.recommended && (
                          <span className="bg-brand-100 text-brand-800 text-xs font-semibold px-2 py-1 rounded">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 mb-2">{option.description}</p>
                      <p className="text-sm text-gray-500 font-medium">
                        {option.count}
                      </p>
                    </div>
                  </div>
                </Radio>
              </Card>
            ))}
          </Space>
        </Radio.Group>

        <Alert
          message="Note"
          description="The actual recipients are determined by the matching algorithm based on your client's profile. You'll see the exact matched contacts in the next step."
          type="warning"
          showIcon
          className="mt-6"
        />
      </Card>

      <div className="flex justify-between">
        <Button size="large" onClick={onBack} icon={<ArrowLeftOutlined />}>
          Back
        </Button>
        <Button
          type="primary"
          size="large"
          onClick={onNext}
          icon={<ArrowRightOutlined />}
          style={{
            backgroundColor: "#4f46e5",
            borderColor: "#4f46e5",
          }}
        >
          Find Matches
        </Button>
      </div>
    </div>
  );
}
