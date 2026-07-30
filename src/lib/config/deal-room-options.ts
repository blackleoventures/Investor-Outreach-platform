/**
 * Canonical option lists for the Deal Room application form.
 *
 * The application form and the investor portal filters both read from here, so
 * a founder's stored answer always matches a filter value exactly.
 */

import type {
  FundingHistory,
  IntellectualProperty,
  MonthlyRevenueBand,
  StartupStage,
} from "@/types/startup-application";

export const SECTORS = [
  "SpaceTech",
  "MedTech & Life Sciences",
  "Climate & Energy",
  "Cybersecurity",
  "Semiconductors & Future Compute",
  "Foundational AI",
  "Robotics",
  "Advanced Manufacturing",
  "Enterprise SaaS",
  "FinTech",
  "AgriTech",
  "Manufacturing",
  "Other",
] as const;

export const STARTUP_STAGES: StartupStage[] = [
  "Idea",
  "Prototype",
  "MVP",
  "Pilot",
  "Revenue Generating",
  "Scaling",
];

export const REVENUE_BANDS: MonthlyRevenueBand[] = [
  "Pre-Revenue",
  "Less than $10K/month",
  "$10K-50K/month",
  "$50K-100K/month",
  "More than $100K/month",
];

export const IP_OPTIONS: IntellectualProperty[] = [
  "Patent Filed",
  "Patent Granted",
  "Proprietary Technology",
  "Trade Secret",
  "Copyright",
  "Trademark",
  "No IP Yet",
];

export const FUNDING_HISTORY_OPTIONS: FundingHistory[] = [
  "No",
  "Friends & Family",
  "Angel Investment",
  "Pre-Seed",
  "Seed",
  "Series A+",
  "Grant Only",
];

/**
 * Not part of the original Google Form, but the investor portal filters on it.
 */
export const BUSINESS_MODELS = [
  "B2B",
  "B2C",
  "B2B2C",
  "D2C",
  "Marketplace",
  "SaaS",
  "Hardware",
  "Deep Tech Licensing",
  "Other",
] as const;

/** Technology Readiness Level, with the standard descriptions. */
export const TRL_LEVELS = [
  { value: 1, label: "TRL 1 - Basic principles observed" },
  { value: 2, label: "TRL 2 - Technology concept formulated" },
  { value: 3, label: "TRL 3 - Experimental proof of concept" },
  { value: 4, label: "TRL 4 - Validated in lab" },
  { value: 5, label: "TRL 5 - Validated in relevant environment" },
  { value: 6, label: "TRL 6 - Demonstrated in relevant environment" },
  { value: 7, label: "TRL 7 - Prototype demonstrated in operational environment" },
  { value: 8, label: "TRL 8 - System complete and qualified" },
  { value: 9, label: "TRL 9 - Proven in operational environment" },
];

/** Buckets for the "Funding Required" filter, in USD. */
export const FUNDING_ASK_RANGES = [
  { label: "Under $250K", min: 0, max: 250_000 },
  { label: "$250K - $1M", min: 250_000, max: 1_000_000 },
  { label: "$1M - $5M", min: 1_000_000, max: 5_000_000 },
  { label: "$5M - $20M", min: 5_000_000, max: 20_000_000 },
  { label: "$20M+", min: 20_000_000, max: Number.MAX_SAFE_INTEGER },
];

export const COUNTRIES = [
  "India",
  "United States",
  "United Kingdom",
  "United Arab Emirates",
  "Singapore",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Netherlands",
  "Switzerland",
  "Israel",
  "Japan",
  "South Korea",
  "China",
  "Brazil",
  "Mexico",
  "South Africa",
  "Nigeria",
  "Kenya",
  "Indonesia",
  "Malaysia",
  "Vietnam",
  "Saudi Arabia",
  "Qatar",
  "Spain",
  "Italy",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Ireland",
  "Poland",
  "Portugal",
  "New Zealand",
  "Other",
] as const;

/** Ordering used by the "Revenue" sort — index doubles as the rank. */
export function revenueRank(band: string): number {
  const index = REVENUE_BANDS.indexOf(band as MonthlyRevenueBand);
  return index === -1 ? 0 : index;
}

/** Ordering used by the "Fastest Growing" sort. */
export function stageRank(stage: string): number {
  const index = STARTUP_STAGES.indexOf(stage as StartupStage);
  return index === -1 ? 0 : index;
}

export const MAX_TECHNOLOGY_WORDS = 200;

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const CRORE = 10_000_000;
const LAKH = 100_000;

/**
 * Approximate USD conversion so funding asks entered in different currencies can
 * be sorted and range-filtered against each other.
 *
 * Rates are deliberately static: this drives bucketing and ordering, not any
 * financial calculation, and a live FX dependency would make stored values
 * inconsistent between the moment of submission and the moment of display.
 */
const CURRENCY_TO_USD: Record<string, number> = {
  usd: 1,
  inr: 0.012,
  eur: 1.08,
  gbp: 1.27,
  aed: 0.27,
  sgd: 0.74,
  cad: 0.73,
  aud: 0.65,
  jpy: 0.0064,
  chf: 1.1,
};

/**
 * Parse a free-text funding ask into an approximate USD number.
 *
 * Handles the shapes founders actually type: "USD 500,000", "$500k", "Rs 5 Crore",
 * "INR 2.5 Cr", "5 million", "1.2M". Returns null when nothing numeric is found,
 * which callers treat as "unspecified" rather than zero.
 */
export function parseFundingToUsd(input: string): number | null {
  if (!input || typeof input !== "string") return null;

  const text = input.toLowerCase().trim();

  const numberMatch = text.match(/[\d][\d,]*\.?\d*/);
  if (!numberMatch || numberMatch.index === undefined) return null;

  const amount = parseFloat(numberMatch[0].replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  // The multiplier is read from the text immediately after the number rather
  // than from anywhere in the string, so "500k" (no word boundary between the
  // digit and the suffix) and "5 Crore" are both picked up.
  const suffix = text.slice(numberMatch.index + numberMatch[0].length);

  let scaled = amount;
  let usesIndianNumbering = false;
  if (/^\s*(crore|cr\b)/.test(suffix)) {
    scaled = amount * CRORE;
    usesIndianNumbering = true;
  } else if (/^\s*(lakh|lac)/.test(suffix)) {
    scaled = amount * LAKH;
    usesIndianNumbering = true;
  } else if (/^\s*(billion|bn\b|b\b)/.test(suffix)) {
    scaled = amount * 1_000_000_000;
  } else if (/^\s*(million|mn\b|m\b)/.test(suffix)) {
    scaled = amount * 1_000_000;
  } else if (/^\s*(thousand|k\b)/.test(suffix)) {
    scaled = amount * 1_000;
  }

  let rate = 1;
  if (/₹|\brs\b|\binr\b|rupee/.test(text)) {
    rate = CURRENCY_TO_USD.inr;
  } else if (/€|\beur\b|euro/.test(text)) {
    rate = CURRENCY_TO_USD.eur;
  } else if (/£|\bgbp\b|pound/.test(text)) {
    rate = CURRENCY_TO_USD.gbp;
  } else {
    const codeMatch = text.match(/\b(usd|aed|sgd|cad|aud|jpy|chf)\b/);
    if (codeMatch) {
      rate = CURRENCY_TO_USD[codeMatch[1]] ?? 1;
    } else if (usesIndianNumbering) {
      // "5 Crore" / "50 lakh" with no currency named is INR by convention.
      rate = CURRENCY_TO_USD.inr;
    }
  }

  return Math.round(scaled * rate);
}

/** Format a USD amount compactly for cards and tables. */
export function formatUsd(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "Undisclosed";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${value}`;
}

/** A grant counts when it was the only funding or appears alongside other rounds. */
export function isGrantWinner(previousFunding: string[]): boolean {
  return (previousFunding || []).some((entry) => /grant/i.test(entry));
}

/** Blank, "no", "none" and "n/a" all mean the startup is not incubated. */
export function isIncubated(incubationCentre: string): boolean {
  const value = (incubationCentre || "").trim().toLowerCase();
  if (!value) return false;
  return !["no", "none", "n/a", "na", "-", "nil", "not incubated"].includes(value);
}
