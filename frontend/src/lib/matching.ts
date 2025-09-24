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
  location?: string;
};

export type IncubatorRecord = Record<string, any> & {
  sectorFocus?: string | string[];
  location?: string;
  stage?: string;
  ticket_size?: any;
};

// Rule weights sum to 100: Sector 40, Stage 30, Location 20, Amount 10
const WEIGHTS_INVESTOR = { sector: 40, stage: 30, location: 20, ticket: 10 } as const;
const WEIGHTS_INCUBATOR = { sector: 40, stage: 30, location: 20, ticket: 10 } as const;

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

const unique = <T,>(arr: T[]) => Array.from(new Set(arr));

const STAGE_ORDER = [
  'pre-seed','pre seed','preseed',
  'seed',
  'series a','a',
  'series b','b',
  'series c','c',
  'growth','late','pre-ipo','ipo'
];

const normalizeStage = (v?: string): string => {
  const n = normalize(v);
  if (!n) return '';
  // map common variants
  if (/(pre\s*seed|preseed)/.test(n)) return 'pre-seed';
  if (/seed/.test(n)) return 'seed';
  if (/(series\s*a|\bseries-a\b|\ba\b)/.test(n)) return 'series a';
  if (/(series\s*b|\bseries-b\b|\bb\b)/.test(n)) return 'series b';
  if (/(series\s*c|\bseries-c\b|\bc\b)/.test(n)) return 'series c';
  if (/(growth|late|pre-ipo|ipo)/.test(n)) return 'growth';
  return n;
};

const stageIndex = (s: string): number => {
  const n = normalizeStage(s);
  const idx = STAGE_ORDER.findIndex(x => x === n);
  if (idx >= 0) return idx;
  // fallback coarse buckets
  if (!n) return -1;
  if (n.includes('seed')) return STAGE_ORDER.indexOf('seed');
  if (n.includes('a')) return STAGE_ORDER.indexOf('series a');
  if (n.includes('b')) return STAGE_ORDER.indexOf('series b');
  if (n.includes('c')) return STAGE_ORDER.indexOf('series c');
  return STAGE_ORDER.indexOf('growth');
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
  const breakdown = { sector: 0, stage: 0, location: 0, amount: 0 } as { sector: number; stage: number; location: number; amount: number };

  // Sector: proportional by overlap (intersection / 1 since client has single sector string) → either 0 or full; if client has multiple (comma), compute overlap ratio
  const clientSectors = parseSectors(client.sector || '');
  const investorSectors = unique(parseSectors(investor.sector_focus));
  if (clientSectors.length && investorSectors.length) {
    const inter = clientSectors.filter(s => investorSectors.includes(s));
    const ratio = Math.min(1, inter.length / Math.max(1, clientSectors.length));
    breakdown.sector = Math.round(WEIGHTS_INVESTOR.sector * ratio);
  }
  score += breakdown.sector;

  // Stage: distance-based scoring
  const clientStageIdx = stageIndex(client.stage || '');
  const investorStageIdx = stageIndex((investor.fund_stage as any) || '');
  if (clientStageIdx >= 0 && investorStageIdx >= 0) {
    const dist = Math.abs(clientStageIdx - investorStageIdx);
    const factor = dist === 0 ? 1 : dist === 1 ? 0.6 : dist === 2 ? 0.3 : 0;
    breakdown.stage = Math.round(WEIGHTS_INVESTOR.stage * factor);
  }
  score += breakdown.stage;

  // Location: city > state > country; treat 'global' as full match
  const clientLoc = (client.location || '').split(',').map(s => normalize(s.trim()));
  const invLoc = (investor.location || '').split(',').map(s => normalize(s.trim()));
  const invAll = normalize(investor.location);
  if (invAll === 'global') {
    breakdown.location = WEIGHTS_INVESTOR.location;
  } else if (clientLoc.length && invLoc.length) {
    const [cCity, cState, cCountry] = clientLoc;
    const [iCity, iState, iCountry] = invLoc;
    if (cCity && iCity && cCity === iCity) breakdown.location = WEIGHTS_INVESTOR.location; // full
    else if (cState && iState && cState === iState) breakdown.location = Math.round(WEIGHTS_INVESTOR.location * 0.75);
    else if (cCountry && iCountry && cCountry === iCountry) breakdown.location = Math.round(WEIGHTS_INVESTOR.location * 0.5);
    else if (invAll && (invAll.includes(cCity || '') || invAll.includes(cState || '') || invAll.includes(cCountry || ''))) breakdown.location = Math.round(WEIGHTS_INVESTOR.location * 0.4);
  }
  score += breakdown.location;

  // Amount: within range → full; within 25% outside → half; else 0
  const desired = parseAmountToNumber(client.fundingAmount || '');
  const { min, max } = extractTicketMinMax(investor.ticket_size);
  if (desired && (min != null || max != null)) {
    const inRange = (min == null || desired >= min) && (max == null || desired <= max);
    if (inRange) breakdown.amount = WEIGHTS_INVESTOR.ticket;
    else {
      const lowerGap = min != null ? Math.max(0, min - desired) : 0;
      const upperGap = max != null ? Math.max(0, desired - max) : 0;
      const gap = Math.max(lowerGap, upperGap);
      const ref = max != null ? max : (min != null ? min : desired);
      const ratio = ref ? gap / ref : 1;
      if (ratio <= 0.25) breakdown.amount = Math.round(WEIGHTS_INVESTOR.ticket * 0.5);
    }
  }
  score += breakdown.amount;

  return { score: Math.min(100, Math.max(0, Math.round(score))), breakdown, weights: WEIGHTS_INVESTOR };
}

export function scoreIncubatorMatch(client: ClientProfile, incubator: IncubatorRecord) {
  let score = 0;
  const breakdown = { sector: 0, stage: 0, location: 0, amount: 0 } as { sector: number; stage: number; location: number; amount: number };

  // Sector: proportional overlap
  const clientSectors = parseSectors(client.sector || '');
  const incSectors = unique(parseSectors(incubator.sectorFocus));
  if (clientSectors.length && incSectors.length) {
    const inter = clientSectors.filter(s => incSectors.includes(s));
    const ratio = Math.min(1, inter.length / Math.max(1, clientSectors.length));
    breakdown.sector = Math.round(WEIGHTS_INCUBATOR.sector * ratio);
  }
  score += breakdown.sector;

  // Stage: distance-based scoring
  const clientStageIdx = stageIndex(client.stage || '');
  const incStageIdx = stageIndex((incubator.stage as any) || '');
  if (clientStageIdx >= 0 && incStageIdx >= 0) {
    const dist = Math.abs(clientStageIdx - incStageIdx);
    const factor = dist === 0 ? 1 : dist === 1 ? 0.6 : dist === 2 ? 0.3 : 0;
    breakdown.stage = Math.round(WEIGHTS_INCUBATOR.stage * factor);
  }
  score += breakdown.stage;

  // Location: city > state > country; 'global' full match
  const clientLoc = (client.location || '').split(',').map(s => normalize(s.trim()));
  const incLoc = (incubator.location || '').split(',').map(s => normalize(s.trim()));
  const incAll = normalize(incubator.location);
  if (incAll === 'global') {
    breakdown.location = WEIGHTS_INCUBATOR.location;
  } else if (clientLoc.length && incLoc.length) {
    const [cCity, cState, cCountry] = clientLoc;
    const [iCity, iState, iCountry] = incLoc;
    if (cCity && iCity && cCity === iCity) breakdown.location = WEIGHTS_INCUBATOR.location;
    else if (cState && iState && cState === iState) breakdown.location = Math.round(WEIGHTS_INCUBATOR.location * 0.75);
    else if (cCountry && iCountry && cCountry === iCountry) breakdown.location = Math.round(WEIGHTS_INCUBATOR.location * 0.5);
    else if (incAll && (incAll.includes(cCity || '') || incAll.includes(cState || '') || incAll.includes(cCountry || ''))) breakdown.location = Math.round(WEIGHTS_INCUBATOR.location * 0.4);
  }
  score += breakdown.location;

  // Amount
  const desired = parseAmountToNumber(client.fundingAmount || '');
  const { min, max } = extractTicketMinMax((incubator as any).ticket_size);
  if (desired && (min != null || max != null)) {
    const inRange = (min == null || desired >= min) && (max == null || desired <= max);
    if (inRange) breakdown.amount = WEIGHTS_INCUBATOR.ticket;
    else {
      const lowerGap = min != null ? Math.max(0, min - desired) : 0;
      const upperGap = max != null ? Math.max(0, desired - max) : 0;
      const gap = Math.max(lowerGap, upperGap);
      const ref = max != null ? max : (min != null ? min : desired);
      const ratio = ref ? gap / ref : 1;
      if (ratio <= 0.25) breakdown.amount = Math.round(WEIGHTS_INCUBATOR.ticket * 0.5);
    }
  }
  score += breakdown.amount;

  return { score: Math.min(100, Math.max(0, Math.round(score))), breakdown, weights: WEIGHTS_INCUBATOR };
}

 