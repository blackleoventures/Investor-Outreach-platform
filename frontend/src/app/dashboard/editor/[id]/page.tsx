"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Input, Button, Space, message } from "antd";

export default function EditorPage() {
  const params = useParams();
  const id = params?.id as string;
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(`/api/ai/email-template/${id}`);
        const json = await res.json();
        if (json.success) {
          setSubject(json.data.subject || "");
          setBody(json.data.body || "");
        } else {
          message.error(json.error || "Failed to load template");
        }
      } finally {
        setLoading(false);
      }
    };
    if (id) run();
  }, [id]);

  const save = async () => {
    const res = await fetch(`/api/ai/email-template/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, body }),
    });
    const json = await res.json();
    if (json.success) message.success("Saved");
    else message.error(json.error || "Save failed");
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-3">
      <h2 className="text-xl font-semibold">Email Template Editor</h2>
      <Space direction="vertical" style={{ width: 800, maxWidth: "100%" }}>
        <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" />
        <Input.TextArea value={body} onChange={e => setBody(e.target.value)} rows={16} placeholder="Body" />
        <Button type="primary" onClick={save}>Save</Button>
      </Space>
    </div>
  );
}


