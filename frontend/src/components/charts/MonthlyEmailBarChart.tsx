"use client";

import React from "react";
import { ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, BarChart, Bar } from "recharts";

type DataPoint = { name: string; emails: number };

export default function MonthlyEmailBarChart({ data }: { data: DataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="emails" fill="#4285F4" />
      </BarChart>
    </ResponsiveContainer>
  );
}

