"use client";

import { useState, useEffect } from "react";
import { Card, message } from "antd";
import { auth } from "@/lib/firebase";
import FollowupStatsCards from "./FollowupStatsCards";
import FollowupCandidatesTable from "./FollowupCandidatesTable";
import FollowupEmailModal from "./FollowupEmailModal";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface FollowupCandidate {
  id: string;
  name: string;
  email: string;
  organization: string;
  recipientType: string;
  status: string;
  daysSinceSent?: number;
  daysSinceOpened?: number;
  hoursSinceSent?: number;
  hoursSinceOpened?: number;
  followupType: string;
  followUpsSent: number;
  totalOpens: number;
}

interface FollowupTabProps {
  campaignId: string;
  campaignName: string;
}

export default function FollowupTab({ campaignId, campaignName }: FollowupTabProps) {
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<{
    deliveredNotOpened: FollowupCandidate[];
    openedNotReplied: FollowupCandidate[];
  }>({
    deliveredNotOpened: [],
    openedNotReplied: [],
  });
  const [summary, setSummary] = useState({
    totalDeliveredNotOpened: 0,
    totalOpenedNotReplied: 0,
    totalCandidates: 0,
  });
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState({ subject: "", body: "" });

  useEffect(() => {
    fetchCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const getAuthToken = async () => {
    const user = auth.currentUser;
    if (!user) {
      message.error("Please login to continue");
      return null;
    }
    return await user.getIdToken();
  };

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(
        `${API_BASE_URL}/campaigns/${campaignId}/followup-candidates`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch follow-up candidates");
      }

      const data = await response.json();
      setCandidates(data.candidates);
      setSummary(data.summary);
      setEmailTemplate(data.campaign.emailTemplate);
    } catch (error: any) {
      console.error("Fetch candidates error:", error);
      message.error(error.message || "Failed to load follow-up candidates");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateEmail = () => {
    if (selectedRecipients.length === 0) {
      message.warning("Please select at least one recipient");
      return;
    }
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
  };

  const handleEmailSent = () => {
    setModalVisible(false);
    setSelectedRecipients([]);
    fetchCandidates(); // Refresh data
    message.success("Follow-up emails queued successfully!");
  };

  return (
    <div className="space-y-6">
      <FollowupStatsCards
        totalDeliveredNotOpened={summary.totalDeliveredNotOpened}
        totalOpenedNotReplied={summary.totalOpenedNotReplied}
        totalCandidates={summary.totalCandidates}
      />

      <Card title="Follow-up Candidates">
        <FollowupCandidatesTable
          candidates={candidates}
          loading={loading}
          onRefresh={fetchCandidates}
          selectedRecipients={selectedRecipients}
          onSelectionChange={setSelectedRecipients}
          onGenerateEmail={handleGenerateEmail}
        />
      </Card>

      <FollowupEmailModal
        visible={modalVisible}
        campaignId={campaignId}
        campaignName={campaignName}
        recipientIds={selectedRecipients}
        originalTemplate={emailTemplate}
        onClose={handleModalClose}
        onSuccess={handleEmailSent}
      />
    </div>
  );
}
