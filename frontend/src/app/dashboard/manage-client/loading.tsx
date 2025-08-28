"use client";

import { Skeleton, Card } from "antd";

export default function Loading() {
  return (
    <div className="p-6">
      <Card>
        <Skeleton active paragraph={{ rows: 2 }} />
        <div className="mt-6">
          <Skeleton active title paragraph={{ rows: 8 }} />
        </div>
      </Card>
    </div>
  );
}

