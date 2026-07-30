"use client";

import { Card, Radio, Button, Space, Alert, Select, Checkbox, message } from "antd";
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  UserSwitchOutlined,
  RobotOutlined,
  TeamOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

interface TargetAudienceProps {
  targetType: "investors" | "incubators" | "both";
  onTargetSelect: (type: "investors" | "incubators" | "both") => void;
  searchMode: "sector" | "state" | "both";
  onSearchModeChange: (mode: "sector" | "state" | "both") => void;
  selectedStates: string[];
  onStatesChange: (states: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function TargetAudience({
  targetType,
  onTargetSelect,
  searchMode,
  onSearchModeChange,
  selectedStates,
  onStatesChange,
  onNext,
  onBack,
}: TargetAudienceProps) {
  const allStatesSelected = selectedStates.length === INDIAN_STATES.length;

  const handleNext = () => {
    if (searchMode !== "sector" && selectedStates.length === 0) {
      message.error("Please select at least one state for state-based search");
      return;
    }
    onNext();
  };

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

      <Card
        title={
          <span>
            <EnvironmentOutlined className="mr-2" />
            Search Mode
          </span>
        }
        className="mb-6"
      >
        <Radio.Group
          value={searchMode}
          onChange={(e) => onSearchModeChange(e.target.value)}
          className="mb-4"
        >
          <Space direction="vertical">
            <Radio value="sector">
              <strong>Sector-Based</strong> (Default) — match contacts by your
              client&apos;s sector, stage, location and ticket size
            </Radio>
            <Radio value="state">
              <strong>State-Based</strong> — show all contacts from the selected
              states, even if their preferred sectors don&apos;t match
            </Radio>
            <Radio value="both">
              <strong>Both</strong> — sector matches plus all contacts from the
              selected states (duplicates removed)
            </Radio>
          </Space>
        </Radio.Group>

        {searchMode !== "sector" && (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Select States</span>
              <Checkbox
                checked={allStatesSelected}
                indeterminate={selectedStates.length > 0 && !allStatesSelected}
                onChange={(e) =>
                  onStatesChange(e.target.checked ? [...INDIAN_STATES] : [])
                }
              >
                Select All States
              </Checkbox>
            </div>
            <Select
              mode="multiple"
              allowClear
              showSearch
              placeholder="Search and select states (e.g. West Bengal, Odisha, Assam)"
              value={selectedStates}
              onChange={onStatesChange}
              style={{ width: "100%" }}
              maxTagCount={6}
              options={INDIAN_STATES.map((state) => ({
                label: state,
                value: state,
              }))}
            />
            <p className="text-gray-500 text-sm mt-2">
              Useful for state-specific government grants and schemes — startups
              often need incubation support from a center located in that state.
            </p>
          </div>
        )}
      </Card>

      <div className="flex justify-between">
        <Button size="large" onClick={onBack} icon={<ArrowLeftOutlined />}>
          Back
        </Button>
        <Button
          type="primary"
          size="large"
          onClick={handleNext}
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
