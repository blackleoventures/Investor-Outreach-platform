"use client";

import { useMemo, useState } from "react";
import { Card, Input, Typography, Alert, Space } from "antd";

const { TextArea } = Input;
const { Title, Text } = Typography;

type PitchAnalysis = {
  summary: {
    problem?: string;
    solution?: string;
    market?: string;
    traction?: string;
    status?: string;
    total_score?: number;
  };
  highlights?: string[];
};

function buildTemplateFromAnalysis(analysis: PitchAnalysis | null, fileName?: string) {
  const pick = (v?: string) => (v && v.trim().length > 0 ? v.trim() : undefined);

  // Clean and humanize brand name from fileName
  const rawName = pick(fileName?.replace(/\.[^.]+$/, "")) || "[Brand Name]";
  const cleanedBase = rawName
    .replace(/\bdeck\b/gi, '')
    .replace(/\(\d+\)/g, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const brandName = cleanedBase.replace(/\b\w/g, (c) => c.toUpperCase());

  if (!analysis) {
    return `Subject: Investment Opportunity in ${brandName} – [1-line positioning]\n\nDear [Investor's Name],\n\nBody unavailable.`;
  }

  const category = pick(analysis.summary?.market) || "[Brand Type / Category]";
  const sanitizeSnippet = (s: string = "") => {
    let out = s.replace(new RegExp(`^${brandName}[:,]?\\s*`, 'i'), '');
    out = out.replace(/^a[n]?\s+/i, '').replace(/^brand\s+/i, '');
    out = out.replace(/\s*[,;]\s*$/g, '').replace(/\.+$/g, '');
    out = out.replace(/\s{2,}/g, ' ').trim();
    if (out.length > 100) {
      const cut = out.slice(0, 100);
      const lastSpace = cut.lastIndexOf(' ');
      out = (lastSpace > 60 ? cut.slice(0, lastSpace) : cut).trim() + '...';
    }
    return out;
  };

  const positioning = sanitizeSnippet(pick(analysis.summary?.solution) || "[1-line positioning]");
  const traction = pick(analysis.summary?.traction) || "[Revenue/Users/Growth]";

  const hi = (analysis.highlights || []).slice(0, 5);
  const hl1 = hi[0] || `Growth: ${traction}`;
  const hl2 = hi[1] || `Market Size: ${category}`;
  const hl3 = hi[2] || `Gross Margins: [Gross Margin %]`;
  const hl4 = hi[3] || `Current Presence: [Channels]`;
  const hl5 = hi[4] || `Unit Economics: [Repeat/Retention]`;

  let subjectText = `Investment Opportunity in ${brandName} – ${positioning}`;
  if (subjectText.length > 120) subjectText = subjectText.slice(0, 117) + '...';
  const subject = `Subject: ${subjectText}`;

  const body = `\nDear [Investor's Name],\n\nHope you're doing well.\n\nI'm reaching out to share an exciting investment opportunity in ${brandName}, an ${category} brand with ${positioning}.\n\nBacked by [Existing Investors / Grants / Achievements], ${brandName} combines [Unique Selling Proposition] to build a high-margin, scalable business.\n\n📈 Key Highlights:\n- ${hl1}\n- ${hl2}\n- ${hl3}\n- ${hl4}\n- ${hl5}\n\n🔧 Product Edge:\n- [USP 1 – Natural/Tech-enabled/etc.]\n- [USP 2 – Category differentiation]\n- [USP 3 – Competition angle]\n\n💸 Fundraise Details:\nCurrently raising [Fundraise Amount] to accelerate [Key Purpose].\n\nFunds will support:\n- [Use of Fund 1 – GTM, Marketing, Expansion, etc.]\n- [Use of Fund 2]\n- [Use of Fund 3]\n\nIf this aligns with your portfolio thesis in ${category}, we’d be glad to share the deck and set up a quick call with the founders.\n\nLooking forward to hearing from you.\n\nWarm regards,  \n[Your Full Name]  \nInvestor Relations – [Firm Name]  \n📞 [Phone Number] | ✉️ [Email Address]`;

  return `${subject}\n\n${body}`;
}

export default function TestTemplatePage() {
  const [fileName, setFileName] = useState<string>("Cosmedream Deck (1).pdf");
  const [json, setJson] = useState<string>(JSON.stringify({
    summary: {
      solution: "A house of brands offering diverse, high-quality cosmetic products with French fragrances and herbal innovation",
      market: "Large global and Indian cosmetics market with significant Gen Z segment",
      traction: "Presence in 20 countries; strong revenue projections",
      problem: "Fragmented beauty market with limited science-backed innovation"
    },
    highlights: [
      "Established presence in 20 countries",
      "40 years of founder experience in FMCG",
      "Extensive IP portfolio (80+ trademarks, patents)",
      "Omni-channel GTM: Website, Amazon, Nykaa; preparing Quick Commerce",
      "High-quality, regimen-based product lines"
    ]
  }, null, 2));

  const parsed: PitchAnalysis | null = useMemo(() => {
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }, [json]);

  const output = useMemo(() => buildTemplateFromAnalysis(parsed, fileName), [parsed, fileName]);
  const subject = output.split('\n')[0].replace('Subject: ', '');
  const body = output.split('\n').slice(1).join('\n').trim();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Title level={2}>Test Email Template (Frontend)</Title>
      <Space direction="vertical" size="large" className="w-full">
        <Card title="Inputs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Text strong>File name</Text>
              <Input value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="Cosmedream Deck (1).pdf" />
            </div>
            <div className="md:col-span-2">
              <Text strong>Analysis JSON</Text>
              <TextArea rows={12} value={json} onChange={(e) => setJson(e.target.value)} />
            </div>
          </div>
          {!parsed && (
            <div className="mt-3">
              <Alert type="error" message="Invalid JSON" showIcon />
            </div>
          )}
        </Card>

        <Card title="Rendered Subject">
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <Text>{subject}</Text>
          </div>
        </Card>

        <Card title="Rendered Body">
          <pre className="whitespace-pre-wrap text-base leading-relaxed">{body}</pre>
        </Card>
      </Space>
    </div>
  );
}


