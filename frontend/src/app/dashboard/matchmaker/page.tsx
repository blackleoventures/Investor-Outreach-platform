import React from "react";
import InvestorMatcher from "@/components/InvestorMatcher";

export default function MatchmakerPage() {
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-semibold mb-4">Matchmaker</h1>
      <p className="text-gray-600 mb-6">Select a client, compute dynamic scores, filter, and save audience to a campaign.</p>
      <InvestorMatcher />
    </div>
  );
}
