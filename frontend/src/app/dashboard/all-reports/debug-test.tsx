"use client";

import { useState, useEffect } from "react";
import { Card, Button, Typography, Table, message } from "antd";

const { Title, Text } = Typography;

export default function DebugTest() {
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const checkRealData = async () => {
    setLoading(true);
    const results: any = {};
    
    try {
      // 1. Check localStorage campaigns
      const campaigns = localStorage.getItem('campaigns');
      results.localStorage = {
        campaigns: campaigns ? JSON.parse(campaigns) : null,
        reports: localStorage.getItem('reports') ? JSON.parse(localStorage.getItem('reports')!) : null
      };

      // 2. Check investors API
      try {
        const investorsRes = await fetch('http://localhost:5000/api/investors?limit=10');
        if (investorsRes.ok) {
          const investorsData = await investorsRes.json();
          results.investorsAPI = {
            status: 'success',
            count: investorsData.docs?.length || investorsData.data?.length || 0,
            sample: investorsData.docs?.[0] || investorsData.data?.[0] || null
          };
        } else {
          results.investorsAPI = { status: 'failed', error: investorsRes.status };
        }
      } catch (e) {
        results.investorsAPI = { status: 'error', error: e.message };
      }

      // 3. Check email tracking API
      try {
        const trackingRes = await fetch('http://localhost:5000/api/email-tracking/reports');
        if (trackingRes.ok) {
          const trackingData = await trackingRes.json();
          results.emailTracking = {
            status: 'success',
            data: trackingData
          };
        } else {
          results.emailTracking = { status: 'failed', error: trackingRes.status };
        }
      } catch (e) {
        results.emailTracking = { status: 'error', error: e.message };
      }

      // 4. Check incubators API
      try {
        const incubatorsRes = await fetch('http://localhost:5000/api/incubators?limit=10');
        if (incubatorsRes.ok) {
          const incubatorsData = await incubatorsRes.json();
          results.incubatorsAPI = {
            status: 'success',
            count: incubatorsData.docs?.length || incubatorsData.data?.length || 0,
            sample: incubatorsData.docs?.[0] || incubatorsData.data?.[0] || null
          };
        } else {
          results.incubatorsAPI = { status: 'failed', error: incubatorsRes.status };
        }
      } catch (e) {
        results.incubatorsAPI = { status: 'error', error: e.message };
      }

      setData(results);
      message.success('Data check completed');
      
    } catch (error) {
      message.error('Failed to check data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const createTestCampaign = () => {
    const testCampaign = {
      id: 'test-' + Date.now(),
      name: 'Test Real Campaign',
      clientName: 'Test Client',
      status: 'completed',
      createdAt: new Date().toISOString(),
      sentEmails: [
        {
          email: 'test1@investor.com',
          firmName: 'Test Venture Capital',
          contactPerson: 'John Test',
          sentAt: new Date().toISOString()
        },
        {
          email: 'test2@investor.com', 
          firmName: 'Test Angel Fund',
          contactPerson: 'Jane Test',
          sentAt: new Date().toISOString()
        }
      ]
    };

    const existing = JSON.parse(localStorage.getItem('campaigns') || '[]');
    existing.push(testCampaign);
    localStorage.setItem('campaigns', JSON.stringify(existing));
    
    message.success('Test campaign created in localStorage');
    checkRealData();
  };

  useEffect(() => {
    checkRealData();
  }, []);

  return (
    <div className="p-6">
      <Card title="Real Data Debug Test">
        <div className="mb-4 space-x-2">
          <Button onClick={checkRealData} loading={loading}>
            Check Real Data
          </Button>
          <Button onClick={createTestCampaign} type="primary">
            Create Test Campaign
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <Title level={5}>1. localStorage Data:</Title>
            <pre className="bg-gray-100 p-2 text-xs overflow-auto max-h-32">
              {JSON.stringify(data.localStorage, null, 2)}
            </pre>
          </div>

          <div>
            <Title level={5}>2. Investors API:</Title>
            <pre className="bg-gray-100 p-2 text-xs overflow-auto max-h-32">
              {JSON.stringify(data.investorsAPI, null, 2)}
            </pre>
          </div>

          <div>
            <Title level={5}>3. Email Tracking API:</Title>
            <pre className="bg-gray-100 p-2 text-xs overflow-auto max-h-32">
              {JSON.stringify(data.emailTracking, null, 2)}
            </pre>
          </div>

          <div>
            <Title level={5}>4. Incubators API:</Title>
            <pre className="bg-gray-100 p-2 text-xs overflow-auto max-h-32">
              {JSON.stringify(data.incubatorsAPI, null, 2)}
            </pre>
          </div>
        </div>

        <div className="mt-4">
          <Title level={5}>Issues Found:</Title>
          <ul className="list-disc pl-4">
            {!data.localStorage?.campaigns?.length && (
              <li className="text-red-600">No campaigns in localStorage</li>
            )}
            {data.investorsAPI?.status !== 'success' && (
              <li className="text-red-600">Investors API not working: {data.investorsAPI?.error}</li>
            )}
            {data.emailTracking?.status !== 'success' && (
              <li className="text-red-600">Email tracking API not working: {data.emailTracking?.error}</li>
            )}
            {data.incubatorsAPI?.status !== 'success' && (
              <li className="text-red-600">Incubators API not working: {data.incubatorsAPI?.error}</li>
            )}
          </ul>
        </div>
      </Card>
    </div>
  );
}