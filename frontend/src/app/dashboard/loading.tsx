"use client";

import { Spin } from "antd";

export default function Loading() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <Spin tip="Loading dashboard..." size="large" />
    </div>
  );
}

