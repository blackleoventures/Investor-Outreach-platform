// components/ScheduleConfig.tsx
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
  InfoCircleOutlined,
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
    scheduleConfig?.dailyLimit ||
      selectedClient.emailConfiguration?.dailyEmailLimit ||
      80
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

  useEffect(() => {
    if (startInstantly) {
      setStartDate(dayjs());
    }
  }, [startInstantly]);

  const calculateSchedule = () => {
    if (!matchResults?.totalMatches) return;

    const totalRecipients = matchResults.totalMatches;

    if (startInstantly) {
      // FIXED: More realistic calculation with 10-second intervals
      const intervalSeconds = 10; // Changed from 5 to 10
      const totalSeconds = totalRecipients * intervalSeconds;
      const totalMinutes = Math.ceil(totalSeconds / 60);
      const calculatedDuration = Math.max(
        1,
        Math.ceil(totalMinutes / (60 * 24))
      );

      setDuration(calculatedDuration);
      setEndDate(dayjs().add(totalMinutes, "minute"));
      return;
    }

    const calculatedDuration = Math.ceil(totalRecipients / dailyLimit);
    setDuration(calculatedDuration);

    let endDateCalc = dayjs(startDate);
    let remainingDays = calculatedDuration;

    while (remainingDays > 0) {
      endDateCalc = endDateCalc.add(1, "day");
      if (
        pauseOnWeekends &&
        (endDateCalc.day() === 0 || endDateCalc.day() === 6)
      ) {
        continue;
      }
      remainingDays--;
    }

    setEndDate(endDateCalc);
  };

  const checkConflicts = async () => {
    const clientLimit =
      selectedClient.emailConfiguration?.dailyEmailLimit || 80;

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

    const total = Object.values(newAllocation).reduce(
      (sum, val) => sum + val,
      0
    );
    if (total !== 100) {
      const diff = 100 - total;
      const others = Object.keys(newAllocation).filter((k) => k !== type);
      const adjustment = Math.floor(diff / others.length);

      others.forEach((key) => {
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

    if (!startInstantly && (dailyLimit < 10 || dailyLimit > 200)) {
      message.error("Daily limit must be between 10 and 200 emails");
      return;
    }

    const config = {
      campaignName: campaignName.trim(),
      dailyLimit: startInstantly ? 0 : dailyLimit,
      startDate: startDate.format("YYYY-MM-DD"),
      endDate: endDate?.format("YYYY-MM-DD"),
      duration,
      sendingWindow: startInstantly
        ? { start: "00:00", end: "23:59" }
        : sendingWindow,
      pauseOnWeekends: startInstantly ? false : pauseOnWeekends,
      priorityAllocation,
      startInstantly,
    };

    onScheduleUpdate(config);
    onNext();
  };

  const getEstimatedTime = () => {
    if (!matchResults?.totalMatches) return "0";

    const totalRecipients = matchResults.totalMatches;
    const intervalSeconds = 10; // Changed from 5 to 10
    const totalSeconds = totalRecipients * intervalSeconds;
    const totalMinutes = Math.ceil(totalSeconds / 60);

    if (totalMinutes < 60) {
      return `${totalMinutes} min`;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  return (
    <div>
      <Card title="Campaign Configuration" className="mb-6">
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Campaign Name
          </label>
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
                  <strong>
                    Start sending emails immediately after campaign creation
                  </strong>
                  <p className="text-xs text-gray-600 ml-6 mt-1">
                    Emails will start sending 30 seconds after campaign is created. 
                    All scheduling settings below will be ignored.
                  </p>
                </Checkbox>
              </div>
            }
            type="info"
            showIcon={false}
          />
        </div>

        {startInstantly && (
          <Alert
            message="Instant Start Mode Active"
            description={`Emails will be sent with 10-second intervals starting 30 seconds after campaign creation. Estimated completion time: ${getEstimatedTime()}. Daily limits, sending windows, and weekend settings are disabled.`}
            type="warning"
            showIcon
            icon={<InfoCircleOutlined />}
            className="mb-6"
          />
        )}

        <Divider />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Daily Sending Limit{" "}
              {startInstantly && (
                <span className="text-orange-600 text-xs">
                  (Disabled for instant start)
                </span>
              )}
            </label>
            <InputNumber
              value={dailyLimit}
              onChange={(value) => setDailyLimit(value || 50)}
              min={10}
              max={200}
              size="large"
              style={{ width: "100%" }}
              addonAfter="emails/day"
              disabled={startInstantly}
            />
            <p className="text-sm text-gray-500 mt-1">
              Client's SMTP limit:{" "}
              {selectedClient.emailConfiguration?.dailyEmailLimit} emails/day
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Start Date{" "}
              {startInstantly && (
                <span className="text-orange-600 text-xs">
                  (Auto-set to today)
                </span>
              )}
            </label>
            <DatePicker
              value={startDate}
              onChange={(date) => setStartDate(date || dayjs().add(1, "day"))}
              size="large"
              style={{ width: "100%" }}
              disabled={startInstantly}
              disabledDate={(current) =>
                current && current < dayjs().startOf("day")
              }
            />
            {startInstantly && (
              <p className="text-xs text-orange-600 mt-1">
                Instant start: Sending begins in 30 seconds
              </p>
            )}
          </div>
        </div>

        {conflictWarning && !startInstantly && (
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

      <Card title="Schedule Summary" className="mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {matchResults?.totalMatches || 0}
            </p>
            <p className="text-gray-600">Total Recipients</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {startInstantly ? getEstimatedTime() : `${duration} days`}
            </p>
            <p className="text-gray-600">
              {startInstantly ? "Est. Time" : "Duration"}
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">
              {startInstantly ? "In 30s" : startDate.format("MMM DD")}
            </p>
            <p className="text-gray-600">Start</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">
              {startInstantly
                ? dayjs()
                    .add(30, 'second')
                    .add(
                      Math.ceil(((matchResults?.totalMatches || 0) * 10) / 60),
                      "minute"
                    )
                    .format("HH:mm")
                : endDate?.format("MMM DD") || "TBD"}
            </p>
            <p className="text-gray-600">
              {startInstantly ? "Complete At" : "End Date"}
            </p>
          </div>
        </div>

        {startInstantly && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
            <p className="text-sm text-green-800">
              <ThunderboltOutlined className="mr-2" />
              <strong>Instant Mode:</strong> {matchResults?.totalMatches || 0}{" "}
              emails will be sent with 10-second intervals starting 30 seconds after campaign creation. 
              This delay ensures the campaign is fully saved before sending begins.
            </p>
          </div>
        )}
      </Card>

      {!startInstantly && (
        <>
          <Card title="Sending Configuration" className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Start Time
                </label>
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
                <label className="block text-sm font-medium mb-2">
                  End Time
                </label>
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
              <label className="block text-sm font-medium mb-2">
                Weekend Behavior
              </label>
              <Radio.Group
                value={pauseOnWeekends}
                onChange={(e) => setPauseOnWeekends(e.target.value)}
              >
                <Radio value={false}>Send on all days including weekends</Radio>
                <Radio value={true}>Pause on Saturdays and Sundays</Radio>
              </Radio.Group>
            </div>
          </Card>
        </>
      )}

      <Card title="Priority Distribution" className="mb-6">
        <Alert
          message="Control sending order by priority"
          description={
            startInstantly
              ? "High priority contacts will be sent first, followed by medium and low priority in rapid succession."
              : "High priority contacts will be sent first each day, followed by medium and low priority."
          }
          type="info"
          showIcon
          className="mb-4"
        />

        <div className="space-y-6">
          <div>
            <div className="flex justify-between mb-2">
              <span className="font-medium">High Priority</span>
              <span className="font-bold text-green-600">
                {priorityAllocation.high}%
              </span>
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
              <span className="font-bold text-orange-600">
                {priorityAllocation.medium}%
              </span>
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
              <span className="font-bold text-gray-600">
                {priorityAllocation.low}%
              </span>
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
            Total:{" "}
            {Object.values(priorityAllocation).reduce(
              (sum, val) => sum + val,
              0
            )}
            %
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
      <style dangerouslySetInnerHTML={{ __html: timePickerStyles }} />
    </div>
  );
}

const timePickerStyles = `
  .ant-picker-footer .ant-btn-primary {
    background-color: #1890ff !important;
    border-color: #1890ff !important;
    color: white !important;
  }
  
  .ant-picker-footer .ant-btn-primary:hover {
    background-color: #40a9ff !important;
    border-color: #40a9ff !important;
  }
  
  .ant-picker-time-panel-column > li.ant-picker-time-panel-cell-selected .ant-picker-time-panel-cell-inner {
    background-color: #1890ff !important;
  }
`;