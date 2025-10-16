/**
 * Investor data structure
 */
export interface Investor {
  id: string;
  investor_name: string;
  partner_name: string;
  partner_email: string;
  phone_number?: string;
  fund_type?: string;
  fund_stage?: string;
  fund_focus?: string;
  sector_focus?: string;
  location?: string;
  ticket_size?: string;
  website?: string;
  [key: string]: any; // Allow additional dynamic fields
}

/**
 * Raw investor from Google Sheets
 */
export interface RawInvestor {
  "Investor Name"?: string;
  "Partner Name"?: string;
  "Partner Email"?: string;
  "Phone number"?: string;
  "Fund Type"?: string;
  "Fund Stage"?: string;
  "Fund Focus (Sectors)"?: string;
  "Location"?: string;
  "Ticket Size"?: string;
  "Website"?: string;
  [key: string]: any;
}

/**
 * Paginated response
 */
export interface PaginatedInvestorsResponse {
  docs: Investor[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  source: string;
  timestamp: string;
}

/**
 * Filter options
 */
export interface InvestorFilters {
  fund_stage: string[];
  fund_type: string[];
  sector_focus: string[];
}

/**
 * API Response
 */
export interface InvestorApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  totalCount?: number;
  source?: string;
  timestamp?: string;
}
