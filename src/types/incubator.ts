/**
 * Incubator data structure
 */
export interface Incubator {
  id: string;
  incubator_name: string;
  partner_name: string;
  partner_email: string;
  phone_number?: string;
  sector_focus?: string;
  country?: string;
  state_city?: string;
  website?: string;
  [key: string]: any; // Allow additional dynamic fields
}

/**
 * Raw incubator from Google Sheets
 */
export interface RawIncubator {
  "Incubator Name"?: string;
  "Partner Name"?: string;
  "Partner Email"?: string;
  "Phone Number"?: string;
  "Sector Focus"?: string;
  "Country"?: string;
  "State/City"?: string;
  "Website"?: string;
  [key: string]: any;
}

/**
 * API Response
 */
export interface IncubatorApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  totalCount?: number;
  source?: string;
  timestamp?: string;
}
