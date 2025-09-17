'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Radio, DatePicker, TimePicker, message, Typography, Descriptions } from 'antd';
import { ClockCircleOutlined, SendOutlined } from '@ant-design/icons';
import { useRouter, useSearchParams } from 'next/navigation';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function ScheduleSendPage() {
  const [loading, setLoading] = useState(false);
  const [scheduleType, setScheduleType] = useState('now');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [campaignId, setCampaignId] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    setCampaignId(searchParams.get('campaignId') || '');
    setClientName(searchParams.get('clientName') || '');
    setLocation(searchParams.get('location') || '');
  }, [searchParams]);

  const handleSend = async () => {
    setLoading(true);
    try {
      const scheduleData = {
        type: scheduleType,
        date: selectedDate,
        time: selectedTime
      };

      const response = await fetch(`/api/campaign/${campaignId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule: scheduleData })
      });

      if (response.ok) {
        message.success('Campaign sent successfully!');
        // Update campaign status in both storages
        const savedCampaign = sessionStorage.getItem('currentCampaign');
        if (savedCampaign) {
          try {
            const campaignData = JSON.parse(savedCampaign);
            campaignData.status = 'Active';
            sessionStorage.setItem('currentCampaign', JSON.stringify(campaignData));
            
            // Update in localStorage too
            const campaigns = JSON.parse(localStorage.getItem('campaigns') || '[]');
            const index = campaigns.findIndex(c => c.id === campaignData.id);
            if (index !== -1) {
              campaigns[index].status = 'Active';
              localStorage.setItem('campaigns', JSON.stringify(campaigns));
            }
          } catch (e) {
            console.error('Failed to update campaign status:', e);
          }
        }
        router.push(`/dashboard/all-reports?campaignId=${campaignId}`);
      }
    } catch (error) {
      message.error('Failed to send campaign');
    } finally {
      setLoading(false);
    }
  };

  // Clear campaign data when component unmounts (optional)
  useEffect(() => {
    return () => {
      // Optionally clear campaign data when leaving the flow
      // sessionStorage.removeItem('currentCampaign');
    };
  }, []);

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <Card title="⏰ Schedule & Send" className="mb-6">
          <Descriptions column={1} bordered className="mb-6">
            <Descriptions.Item label="Campaign">{clientName}_Seed_Outreach</Descriptions.Item>
            <Descriptions.Item label="Location">{location}</Descriptions.Item>
            <Descriptions.Item label="Recipients">2 investors</Descriptions.Item>
            <Descriptions.Item label="Status">Ready to send</Descriptions.Item>
          </Descriptions>

          <div className="space-y-4">
            <div>
              <Text strong>When would you like to send this campaign?</Text>
            </div>
            
            <Radio.Group value={scheduleType} onChange={(e) => setScheduleType(e.target.value)}>
              <div className="space-y-3">
                <Radio value="now">Send Now</Radio>
                <Radio value="custom">Custom Date & Time</Radio>
                <Radio value="daily">Daily (Coming Soon)</Radio>
                <Radio value="weekly">Weekly (Coming Soon)</Radio>
              </div>
            </Radio.Group>

            {scheduleType === 'custom' && (
              <div className="ml-6 space-y-3">
                <div>
                  <Text>Select Date:</Text>
                  <DatePicker 
                    className="ml-2" 
                    onChange={setSelectedDate}
                    disabledDate={(current) => current && current < dayjs().startOf('day')}
                  />
                </div>
                <div>
                  <Text>Select Time:</Text>
                  <TimePicker 
                    className="ml-2" 
                    format="HH:mm"
                    onChange={setSelectedTime}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-between items-center">
            <div className="flex gap-2">
              <Button onClick={() => router.push('/dashboard/allCampaign')}>All Campaigns</Button>
              <Button onClick={() => router.push('/dashboard/all-reports')}>View Reports</Button>
            </div>
            <Button 
              type="primary" 
              size="large" 
              icon={scheduleType === 'now' ? <SendOutlined /> : <ClockCircleOutlined />}
              loading={loading}
              onClick={handleSend}
            >
              {scheduleType === 'now' ? '🚀 Send Campaign Now' : '⏰ Schedule Campaign'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}