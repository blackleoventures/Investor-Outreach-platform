export type ClientProfile = {
  companyName?: string;
  stage?: string;
  sector?: string;
  revenue?: string;
  location?: string;
  fundingAmount?: string;
};

export type InvestorRecord = Record<string, any> & {
  fund_type?: string;
  fund_stage?: string;
  sector_focus?: string | string[];
  ticket_size?: any;
  country?: string;
  state?: string;
  city?: string;
};

export type IncubatorRecord = Record<string, any> & {
  sectorFocus?: string | string[];
  country?: string;
  stateCity?: string;
  stage?: string;
  ticket_size?: any;
};

// Rule weights: +25 each criterion  
const WEIGHTS_INVESTOR = { sector: 25, stage: 25, location: 25, ticket: 25 } as const;
const WEIGHTS_INCUBATOR = { sector: 25, stage: 25, location: 25, ticket: 25 } as const;

const normalize = (v?: string) => (v || "").toString().trim().toLowerCase();

const parseSectors = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((s) => normalize(String(s)));
  const str = String(value);
  return str
    .split(/[,;]+/)
    .map((s) => normalize(s))
    .filter(Boolean);
};

const parseAmountToNumber = (amount?: string): number | null => {
  if (!amount) return null;
  const str = amount.toString().toLowerCase().replace(/[,$\s]/g, "");
  const m = str.match(/([0-9]*\.?[0-9]+)\s*([kKmM])?/);
  if (!m) return null;
  let num = parseFloat(m[1]);
  const suffix = m[2];
  if (suffix === 'k' || suffix === 'K') num *= 1_000;
  if (suffix === 'm' || suffix === 'M') num *= 1_000_000;
  return isNaN(num) ? null : Math.round(num);
};

const extractTicketMinMax = (ticket: unknown): { min?: number; max?: number } => {
  if (ticket == null) return {};
  if (typeof ticket === 'object' && !Array.isArray(ticket)) {
    const anyObj = ticket as any;
    const minVal = parseAmountToNumber(anyObj.min ?? anyObj.minimum ?? anyObj.min_ticket_size ?? anyObj.minTicket);
    const maxVal = parseAmountToNumber(anyObj.max ?? anyObj.maximum ?? anyObj.max_ticket_size ?? anyObj.maxTicket);
    return { min: minVal ?? undefined, max: maxVal ?? undefined };
  }
  const text = String(ticket);
  const range = text.match(/([$]?[\d.,]+\s*[kKmM]?)\s*[-–to]+\s*([$]?[\d.,]+\s*[kKmM]?)/);
  if (range) {
    const min = parseAmountToNumber(range[1]);
    const max = parseAmountToNumber(range[2]);
    return { min: min ?? undefined, max: max ?? undefined };
  }
  const single = parseAmountToNumber(text);
  return single ? { min: single, max: single } : {};
};

export function scoreInvestorMatch(client: ClientProfile, investor: InvestorRecord) {
  let score = 0;
  const breakdown = {
    sector: 0,
    stage: 0,
    location: 0,
    amount: 0,
  } as { sector: number; stage: number; location: number; amount: number };

  // Sector (exact only)
  const clientSector = normalize(client.sector);
  const investorSectors = parseSectors(investor.sector_focus);
  if (clientSector && investorSectors.length) {
    if (investorSectors.includes(clientSector)) breakdown.sector = WEIGHTS_INVESTOR.sector;
  }
  score += breakdown.sector;

  // Stage (exact only)
  const clientStage = normalize(client.stage);
  const investorStage = normalize(investor.fund_stage);
  if (clientStage && investorStage) {
    if (investorStage === clientStage) breakdown.stage = WEIGHTS_INVESTOR.stage;
  }
  score += breakdown.stage;

  // Location (exact country/city; treat Global as match as well)
  const clientLoc = normalize(client.location);
  const invCountry = normalize(investor.country);
  const invState = normalize((investor as any).state);
  const invCity = normalize((investor as any).city);
  if (clientLoc) {
    if (
      (invCountry && clientLoc === invCountry) ||
      (invState && clientLoc === invState) ||
      (invCity && clientLoc === invCity) ||
      normalize(String(investor.country)) === 'global'
    ) breakdown.location = WEIGHTS_INVESTOR.location;
  }
  score += breakdown.location;

  // Amount (within range → full, else 0)
  const desired = parseAmountToNumber(client.fundingAmount || '');
  const { min, max } = extractTicketMinMax(investor.ticket_size);
  if (desired && (min != null || max != null)) {
    const inRange = (min == null || desired >= min) && (max == null || desired <= max);
    if (inRange) breakdown.amount = WEIGHTS_INVESTOR.ticket;
  }
  score += breakdown.amount;

  return { score, breakdown, weights: WEIGHTS_INVESTOR };
}

export function scoreIncubatorMatch(client: ClientProfile, incubator: IncubatorRecord) {
  let score = 0;
  const breakdown = {
    sector: 0,
    stage: 0,
    location: 0,
    amount: 0,
  } as { sector: number; stage: number; location: number; amount: number };

  // Sector (exact only)
  const clientSector = normalize(client.sector);
  const incSectors = parseSectors(incubator.sectorFocus);
  if (clientSector && incSectors.length) {
    if (incSectors.includes(clientSector)) breakdown.sector = WEIGHTS_INCUBATOR.sector;
  }
  score += breakdown.sector;

  // Stage (exact only)
  const clientStage = normalize(client.stage);
  const incStage = normalize(incubator.stage);
  if (clientStage && incStage) {
    if (incStage === clientStage) breakdown.stage = WEIGHTS_INCUBATOR.stage;
  }
  score += breakdown.stage;

  // Location (exact country/city; treat Global as match if present on country)
  const clientLoc = normalize(client.location);
  const incCountry = normalize(incubator.country);
  const incStateCity = normalize(incubator.stateCity);
  if (clientLoc && (incCountry || incStateCity)) {
    if (clientLoc === incCountry || clientLoc === incStateCity || normalize(String(incubator.country)) === 'global') {
      breakdown.location = WEIGHTS_INCUBATOR.location;
    }
  }
  score += breakdown.location;

  // Amount (within range → full, else 0). Incubators may not have ticket_size; if absent, 0.
  const desired = parseAmountToNumber(client.fundingAmount || '');
  const { min, max } = extractTicketMinMax((incubator as any).ticket_size);
  if (desired && (min != null || max != null)) {
    const inRange = (min == null || desired >= min) && (max == null || desired <= max);
    if (inRange) breakdown.amount = WEIGHTS_INCUBATOR.ticket;
  }
  score += breakdown.amount;

  return { score, breakdown, weights: WEIGHTS_INCUBATOR };
}

 