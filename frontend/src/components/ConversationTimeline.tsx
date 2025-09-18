"use client";

import React, { useState, useEffect } from "react";
import { Card, Timeline, Tag, Button, Input, message, Modal, Progress, Avatar, Tooltip } from "antd";
import { MessageOutlined, MailOutlined, EyeOutlined, DownloadOutlined, UserOutlined, ClockCircleOutlined, EditOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "/api";

interface ConversationEvent {
  id: string;
  type: "email_sent" | "email_opened" | "email_clicked" | "deck_viewed" | "deck_downloaded" | "reply_received" | "note_added";
  timestamp: Date;
  title: string;
  description: string;
  metadata?: {
    subject?: string;
    openRate?: number;
    clickRate?: number;
    attachments?: string[];
  };
  sender: "founder" | "investor";
  investorId: string;
  investorName: string;
  investorEmail: string;
}

interface ConversationTimelineProps {
  dealRoomId: string;
  investorId?: string;
}

export default function ConversationTimeline({ dealRoomId, investorId }: ConversationTimelineProps) {
  const [events, setEvents] = useState<ConversationEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [selectedInvestor, setSelectedInvestor] = useState<string | null>(null);

  useEffect(() => {
    if (dealRoomId) {
      fetchConversationHistory();
    }
  }, [dealRoomId, investorId]);

  const fetchConversationHistory = async () => {
    setLoading(true);
    try {
      const url = investorId 
        ? `${BACKEND_URL}/conversations/${dealRoomId}/investor/${investorId}`
        : `${BACKEND_URL}/conversations/${dealRoomId}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error("Failed to fetch conversation history:", error);
    } finally {
      setLoading(false);
    }
  };

  const addNote = async () => {
    if (!newNote.trim() || !selectedInvestor) return;

    try {
      const response = await fetch(`${BACKEND_URL}/conversations/${dealRoomId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          investorId: selectedInvestor,
          note: newNote.trim(),
          addedBy: "current-user"
        }),
      });

      if (response.ok) {
        message.success("Note added successfully");
        setNewNote("");
        setShowNoteModal(false);
        fetchConversationHistory();
      }
    } catch (error) {
      message.error("Failed to add note");
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "email_sent": return <MailOutlined className="text-blue-500" />;
      case "email_opened": return <EyeOutlined className="text-green-500" />;
      case "email_clicked": return <MessageOutlined className="text-orange-500" />;
      case "deck_viewed": return <EyeOutlined className="text-purple-500" />;
      case "deck_downloaded": return <DownloadOutlined className="text-indigo-500" />;
      case "reply_received": return <MessageOutlined className="text-red-500" />;
      case "note_added": return <EditOutlined className="text-gray-500" />;
      default: return <ClockCircleOutlined className="text-gray-400" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case "email_sent": return "blue";
      case "email_opened": return "green";
      case "email_clicked": return "orange";
      case "deck_viewed": return "purple";
      case "deck_downloaded": return "indigo";
      case "reply_received": return "red";
      case "note_added": return "gray";
      default: return "gray";
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const timelineItems = events.map((event, index) => ({
    dot: getEventIcon(event.type),
    color: getEventColor(event.type),
    children: (
      <motion.div
        key={event.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.1 }}
        className="pb-4"
      >
        <Card size="small" className="shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Avatar size="small" icon={<UserOutlined />} />
                <span className="font-medium text-gray-800">{event.investorName}</span>
                <Tag color={getEventColor(event.type)}>
                  {event.type.replace('_', ' ').toUpperCase()}
                </Tag>
                <span className="text-xs text-gray-500">{formatTimestamp(event.timestamp)}</span>
              </div>
              
              <h4 className="font-semibold text-gray-800 mb-1">{event.title}</h4>
              <p className="text-sm text-gray-600 mb-2">{event.description}</p>
              
              {event.metadata && (
                <div className="space-y-2">
                  {event.metadata.subject && (
                    <div className="text-xs text-gray-500">
                      <strong>Subject:</strong> {event.metadata.subject}
                    </div>
                  )}
                  
                  {event.metadata.openRate !== undefined && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Open Rate:</span>
                      <Progress 
                        percent={event.metadata.openRate} 
                        size="small" 
                        strokeColor="#52c41a"
                        showInfo={false}
                      />
                      <span className="text-xs text-green-600">{event.metadata.openRate}%</span>
                    </div>
                  )}
                  
                  {event.metadata.attachments && event.metadata.attachments.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Attachments:</span>
                      {event.metadata.attachments.map((attachment, i) => (
                        <Tag key={i}>{attachment}</Tag>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Tooltip title="Add Note">
                <Button 
                  size="small" 
                  icon={<EditOutlined />}
                  onClick={() => {
                    setSelectedInvestor(event.investorId);
                    setShowNoteModal(true);
                  }}
                />
              </Tooltip>
            </div>
          </div>
        </Card>
      </motion.div>
    ),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Conversation Timeline</h3>
          <p className="text-gray-600">Track all interactions with investors</p>
        </div>
        <Button 
          type="primary" 
          icon={<EditOutlined />}
          onClick={() => setShowNoteModal(true)}
        >
          Add Note
        </Button>
      </div>

      <Card className="shadow-lg">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading conversation history...</p>
          </div>
        ) : events.length > 0 ? (
          <Timeline items={timelineItems} mode="left" />
        ) : (
          <div className="text-center py-12">
            <MessageOutlined className="text-4xl text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No Conversations Yet</h3>
            <p className="text-gray-500">Start engaging with investors to see the conversation timeline</p>
          </div>
        )}
      </Card>

      {/* Add Note Modal */}
      <Modal
        title="Add Note"
        open={showNoteModal}
        onCancel={() => {
          setShowNoteModal(false);
          setNewNote("");
          setSelectedInvestor(null);
        }}
        onOk={addNote}
        okText="Add Note"
        okButtonProps={{ disabled: !newNote.trim() }}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Note
            </label>
            <Input.TextArea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note about this conversation or investor..."
              autoSize={{ minRows: 3, maxRows: 6 }}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}