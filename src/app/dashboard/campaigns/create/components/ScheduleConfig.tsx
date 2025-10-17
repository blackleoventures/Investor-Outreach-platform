"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Button,
  Input,
  DatePicker,
  InputNumber,
  TimePicker,
  Radio,
  Slider,
  Alert,
  Divider,
  message,
  Checkbox,
} from "antd";
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

interface ScheduleConfigProps {
  selectedClient: any;
  matchResults: any;
  scheduleConfig: any;
  onScheduleUpdate: (config: any) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function ScheduleConfig({
  selectedClient,
  matchResults,
  scheduleConfig,
  onScheduleUpdate,
  onNext,
  onBack,
}: ScheduleConfigProps) {
  const [campaignName, setCampaignName] = useState(
    scheduleConfig?.campaignName || 
    `${selectedClient.companyName} - Campaign - ${dayjs().format("MMM YYYY")}`
  );
  const [dailyLimit, setDailyLimit] = useState(
    scheduleConfig?.dailyLimit || selectedClient.emailConfiguration?.dailyEmailLimit || 80
  );
  const [startDate, setStartDate] = useState(
    scheduleConfig?.startDate || dayjs().add(1, "day")
  );
  const [sendingWindow, setSendingWindow] = useState({
    start: scheduleConfig?.sendingWindow?.start || "09:00",
    end: scheduleConfig?.sendingWindow?.end || "18:00",
  });
  const [pauseOnWeekends, setPauseOnWeekends] = useState(
    scheduleConfig?.pauseOnWeekends || false
  );
  const [priorityAllocation, setPriorityAllocation] = useState({
    high: scheduleConfig?.priorityAllocation?.high || 25,
    medium: scheduleConfig?.priorityAllocation?.medium || 50,
    low: scheduleConfig?.priorityAllocation?.low || 25,
  });
  const [startInstantly, setStartInstantly] = useState(
    scheduleConfig?.startInstantly || false
  );

  const [duration, setDuration] = useState(0);
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(null);
  const [conflictWarning, setConflictWarning] = useState("");

  useEffect(() => {
    calculateSchedule();
  }, [dailyLimit, startDate, pauseOnWeekends, matchResults, startInstantly]);

  useEffect(() => {
    checkConflicts();
  }, [dailyLimit]);

  // Handle instant start toggle
  useEffect(() => {
    if (startInstantly) {
      // Set start date to now + 1 minute
      const instantStart = dayjs().add(1, "minute");
      setStartDate(instantStart);
    }
  }, [startInstantly]);

  const calculateSchedule = () => {
    if (!matchResults?.totalMatches) return;

    const totalRecipients = matchResults.totalMatches;
    const calculatedDuration = Math.ceil(totalRecipients / dailyLimit);
    setDuration(calculatedDuration);

    // Calculate end date considering weekends
    let endDateCalc = dayjs(startDate);
    let remainingDays = calculatedDuration;

    while (remainingDays > 0) {
      endDateCalc = endDateCalc.add(1, "day");
      if (pauseOnWeekends && (endDateCalc.day() === 0 || endDateCalc.day() === 6)) {
        continue; // Skip weekends
      }
      remainingDays--;
    }

    setEndDate(endDateCalc);
  };

  const checkConflicts = async () => {
    // Check if other campaigns from same client are active
    const clientLimit = selectedClient.emailConfiguration?.dailyEmailLimit || 80;
    
    if (dailyLimit > clientLimit) {
      setConflictWarning(
        `Daily limit (${dailyLimit}) exceeds client's SMTP limit (${clientLimit}). This may cause sending failures.`
      );
    } else {
      setConflictWarning("");
    }
  };

  const handlePriorityChange = (type: string, value: number) => {
    const newAllocation = { ...priorityAllocation, [type]: value };
    
    // Auto-adjust other values to maintain 100%
    const total = Object.values(newAllocation).reduce((sum, val) => sum + val, 0);
    if (total !== 100) {
      const diff = 100 - total;
      const others = Object.keys(newAllocation).filter(k => k !== type);
      const adjustment = Math.floor(diff / others.length);
      
      others.forEach(key => {
        newAllocation[key as keyof typeof newAllocation] += adjustment;
      });
    }
    
    setPriorityAllocation(newAllocation);
  };

  const handleNext = () => {
    if (!campaignName.trim()) {
      message.error("Please enter a campaign name");
      return;
    }

    if (dailyLimit < 10 || dailyLimit > 200) {
      message.error("Daily limit must be between 10 and 200 emails");
      return;
    }

    const config = {
      campaignName: campaignName.trim(),
      dailyLimit,
      startDate: startDate.format("YYYY-MM-DD"),
      endDate: endDate?.format("YYYY-MM-DD"),
      duration,
      sendingWindow,
      pauseOnWeekends,
      priorityAllocation,
      startInstantly, // Include instant start flag
    };

    onScheduleUpdate(config);
    onNext();
  };

  return (
    <div>
      {/* Campaign Name */}
      <Card title="Campaign Configuration" className="mb-6">
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Campaign Name</label>
          <Input
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            size="large"
            placeholder="Enter campaign name..."
            maxLength={100}
          />
          <p className="text-sm text-gray-500 mt-1">
            {campaignName.length}/100 characters
          </p>
        </div>

        <Divider />

        {/* Instant Start Option */}
        <div className="mb-6">
          <Alert
            message={
              <div className="flex items-center gap-2">
                <ThunderboltOutlined />
                <span className="font-semibold">Quick Start Option</span>
              </div>
            }
            description={
              <div className="mt-2">
                <Checkbox
                  checked={startInstantly}
                  onChange={(e) => setStartInstantly(e.target.checked)}
                >
                  <strong>Start sending immediately after campaign creation</strong>
                  <p className="text-xs text-gray-600 ml-6 mt-1">
                    When enabled, emails will start sending 1 minute after campaign activation
                  </p>
                </Checkbox>
              </div>
            }
            type="info"
            showIcon={false}
          />
        </div>

        <Divider />

        {/* Daily Limit */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Daily Sending Limit</label>
            <InputNumber
              value={dailyLimit}
              onChange={(value) => setDailyLimit(value || 50)}
              min={10}
              max={200}
              size="large"
              style={{ width: "100%" }}
              addonAfter="emails/day"
            />
            <p className="text-sm text-gray-500 mt-1">
              Client's SMTP limit: {selectedClient.emailConfiguration?.dailyEmailLimit} emails/day
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Start Date</label>
            <DatePicker
              value={startDate}
              onChange={(date) => setStartDate(date || dayjs().add(1, "day"))}
              size="large"
              style={{ width: "100%" }}
              disabled={startInstantly}
              disabledDate={(current) => current && current < dayjs().startOf("day")}
            />
            {startInstantly && (
              <p className="text-xs text-orange-600 mt-1">
                Auto-set to now + 1 minute (instant start enabled)
              </p>
            )}
          </div>
        </div>

        {conflictWarning && (
          <Alert
            message="Scheduling Conflict"
            description={conflictWarning}
            type="warning"
            showIcon
            icon={<WarningOutlined />}
            className="mb-6"
          />
        )}
      </Card>

      {/* Schedule Summary */}
      <Card title="Schedule Summary" className="mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {matchResults?.totalMatches || 0}
            </p>
            <p className="text-gray-600">Total Recipients</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{duration}</p>
            <p className="text-gray-600">Days Duration</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">
              {startInstantly ? "Now" : startDate.format("MMM DD")}
            </p>
            <p className="text-gray-600">Start Date</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">
              {endDate?.format("MMM DD") || "TBD"}
            </p>
            <p className="text-gray-600">End Date</p>
          </div>
        </div>
      </Card>

      {/* Sending Window */}
      <Card title="Sending Configuration" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Start Time</label>
            <TimePicker
              value={dayjs(sendingWindow.start, "HH:mm")}
              onChange={(time) =>
                setSendingWindow({
                  ...sendingWindow,
                  start: time?.format("HH:mm") || "09:00",
                })
              }
              format="HH:mm"
              size="large"
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">End Time</label>
            <TimePicker
              value={dayjs(sendingWindow.end, "HH:mm")}
              onChange={(time) =>
                setSendingWindow({
                  ...sendingWindow,
                  end: time?.format("HH:mm") || "18:00",
                })
              }
              format="HH:mm"
              size="large"
              style={{ width: "100%" }}
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Weekend Behavior</label>
          <Radio.Group
            value={pauseOnWeekends}
            onChange={(e) => setPauseOnWeekends(e.target.value)}
          >
            <Radio value={false}>Send on all days including weekends</Radio>
            <Radio value={true}>Pause on Saturdays and Sundays</Radio>
          </Radio.Group>
        </div>
      </Card>

      {/* Priority Allocation */}
      <Card title="Priority Distribution" className="mb-6">
        <Alert
          message="Control when different priority contacts receive emails"
          description="High priority contacts will be sent first, then medium, then low priority."
          type="info"
          showIcon
          className="mb-4"
        />

        <div className="space-y-6">
          <div>
            <div className="flex justify-between mb-2">
              <span className="font-medium">High Priority</span>
              <span className="font-bold text-green-600">{priorityAllocation.high}%</span>
            </div>
            <Slider
              value={priorityAllocation.high}
              onChange={(value) => handlePriorityChange("high", value)}
              min={0}
              max={100}
              marks={{ 0: "0%", 25: "25%", 50: "50%", 75: "75%", 100: "100%" }}
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span className="font-medium">Medium Priority</span>
              <span className="font-bold text-orange-600">{priorityAllocation.medium}%</span>
            </div>
            <Slider
              value={priorityAllocation.medium}
              onChange={(value) => handlePriorityChange("medium", value)}
              min={0}
              max={100}
              marks={{ 0: "0%", 25: "25%", 50: "50%", 75: "75%", 100: "100%" }}
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span className="font-medium">Low Priority</span>
              <span className="font-bold text-gray-600">{priorityAllocation.low}%</span>
            </div>
            <Slider
              value={priorityAllocation.low}
              onChange={(value) => handlePriorityChange("low", value)}
              min={0}
              max={100}
              marks={{ 0: "0%", 25: "25%", 50: "50%", 75: "75%", 100: "100%" }}
            />
          </div>
        </div>

        <div className="mt-4 text-center">
          <span className="text-lg font-semibold">
            Total: {Object.values(priorityAllocation).reduce((sum, val) => sum + val, 0)}%
          </span>
        </div>
      </Card>

      <div className="flex justify-between">
        <Button
          size="large"
          onClick={onBack}
          icon={<ArrowLeftOutlined />}
          style={{
            backgroundColor: "#6c757d",
            borderColor: "#6c757d",
            color: "white",
          }}
        >
          Back
        </Button>
        <Button
          type="primary"
          size="large"
          onClick={handleNext}
          icon={<ArrowRightOutlined />}
          style={{
            backgroundColor: "#1890ff",
            borderColor: "#1890ff",
          }}
        >
          Review Campaign
        </Button>
      </div>
    </div>
  );
}
