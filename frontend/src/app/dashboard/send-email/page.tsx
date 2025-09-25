'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Radio, DatePicker, TimePicker, message, Typography, Descriptions } from 'antd';
import { ClockCircleOutlined, SendOutlined } from '@ant-design/icons';
import { useRouter, useSearchParams } from 'next/navigation';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function ScheduleSendPage() {
  const [loading, setLoading] = useState(false);
  const [scheduleType, setScheduleType] = useState('custom');
  const [selectedDate, setSelectedDate] = useState<any>(null);
  const [selectedTime, setSelectedTime] = useState<any>(null);
  const [campaignId, setCampaignId] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [selectedInvestors, setSelectedInvestors] = useState<any[]>([]);
  const [recipients, setRecipients] = useState<string>('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    setCampaignId(searchParams.get('campaignId') || '');
    setClientName(searchParams.get('clientName') || '');
    setLocation(searchParams.get('location') || '');
    
    // Load selected investors from URL
    const emailsFromUrl = searchParams.get('emails');
    const namesFromUrl = searchParams.get('names');
    
    if (emailsFromUrl) {
      const emailList = decodeURIComponent(emailsFromUrl).split(',').map(e => e.trim()).filter(Boolean);
      const nameList = namesFromUrl ? decodeURIComponent(namesFromUrl).split('|').map(n => n.trim()).filter(Boolean) : [];
      
      setRecipients(emailList.join(', '));
      
      const investorsFromUrl = emailList.map((email, index) => ({
        name: nameList[index] || `Investor ${index + 1}`,
        email: email
      }));
      setSelectedInvestors(investorsFromUrl);
      message.success(`Loaded ${emailList.length} selected investors`);
    }
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
            const index = campaigns.findIndex((c: any) => c.id === campaignData.id);
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
        {selectedInvestors.length > 0 && (
          <Card title="📧 Email Composer" className="mb-6">
            <div className="mb-4">
              <Text strong>Selected Investors ({selectedInvestors.length})</Text>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedInvestors.map((investor, index) => (
                  <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                    {investor.name} ({investor.email})
                  </span>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Text strong>Recipients:</Text>
                <div className="mt-1 p-2 border rounded bg-gray-50">
                  {recipients}
                </div>
              </div>
              
              <div>
                <Text strong>Subject:</Text>
                <input 
                  type="text" 
                  className="w-full mt-1 p-2 border rounded" 
                  placeholder="Enter email subject"
                />
              </div>
              
              <div>
                <Text strong>Message:</Text>
                <textarea 
                  className="w-full mt-1 p-2 border rounded" 
                  rows={6}
                  placeholder="Enter your email message"
                />
              </div>
              
              <div className="flex justify-end">
                <Button type="primary" icon={<SendOutlined />}>
                  Send Email
                </Button>
              </div>
            </div>
          </Card>
        )}
        
        <Card title="⏰ Schedule & Send" className="mb-6">
          <Descriptions column={1} bordered className="mb-6">
            <Descriptions.Item label="Campaign">{clientName}_Seed_Outreach</Descriptions.Item>
            <Descriptions.Item label="Location">{location}</Descriptions.Item>
            <Descriptions.Item label="Recipients">{selectedInvestors.length || 2} investors</Descriptions.Item>
            <Descriptions.Item label="Status">Ready to send</Descriptions.Item>
          </Descriptions>

          <div className="space-y-4">
            <div>
              <Text strong>When would you like to send this campaign?</Text>
            </div>
            
            <Radio.Group value={scheduleType} onChange={(e) => setScheduleType(e.target.value)}>
              <div className="space-y-3">
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

          <div className="mt-8 flex justify-end items-center gap-4">
            <Button onClick={() => router.push('/dashboard/allCampaign')}>All Campaigns</Button>
            <Button onClick={() => router.push('/dashboard/all-reports')}>View Reports</Button>
            <Button 
              type="primary" 
              size="large" 
              icon={<ClockCircleOutlined />}
              loading={loading}
              onClick={handleSend}
            >
              ⏰ Schedule Campaign
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}