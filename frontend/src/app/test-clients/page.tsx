"use client";

import { useEffect, useState } from "react";
import { Button, Card, Typography, message } from "antd";
import { useRouter } from "next/navigation";

const { Title, Text } = Typography;

export default function Page() {
  const router = useRouter();
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    try {
      const seed = [
        {
          id: "demo-1",
          company_name: "Demo FinTech",
          first_name: "Sarah",
          last_name: "Mehta",
          email: "demo1@company.com",
          phone: "+91 9000000001",
          fund_stage: "Seed",
          industry: "Fintech",
          location: "Singapore",
          revenue: "$2M",
          investment_ask: "$500k",
          createdAt: new Date().toISOString(),
          archive: false
        },
        {
          id: "demo-2",
          company_name: "Demo SaaS",
          first_name: "Arjun",
          last_name: "Verma",
          email: "demo2@company.com",
          phone: "+91 9000000002",
          fund_stage: "Growth",
          industry: "SaaS",
          location: "Germany",
          revenue: "500k",
          investment_ask: "500",
          createdAt: new Date().toISOString(),
          archive: false
        }
      ];

      localStorage.setItem("clients", JSON.stringify(seed));
      sessionStorage.setItem("currentClient", JSON.stringify(seed[0]));
      setSeeded(true);
      message.success("Seeded demo clients into localStorage");
    } catch (e) {
      message.error("Failed to seed demo data");
    }
  }, []);

  return (
    <div className="p-6 max-w-xl mx-auto">
      <Card>
        <Title level={4} className="!mb-2">Seed Demo Clients</Title>
        <Text>Demo clients have been saved to localStorage. Use this to verify that Revenue and Investment Ask show exactly as entered.</Text>
        <div className="mt-4 flex gap-2">
          <Button type="primary" onClick={() => router.push('/dashboard/all-client')}>Go to All Clients</Button>
          {seeded && <Button onClick={() => {
            localStorage.removeItem('clients');
            message.success('Cleared demo clients');
          }}>Clear Demo Data</Button>}
        </div>
      </Card>
    </div>
  );
}

