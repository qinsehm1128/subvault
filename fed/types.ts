export interface Credential {
  id: string;
  username: string;
  password?: string;
  label: string;
  notes?: string;
  createdAt: number;
}

export type FrequencyUnit = 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS' | 'PERMANENT';

export interface Subscription {
  id: string;
  name: string;
  cost: number;
  currency: string;
  frequencyAmount: number; // e.g., 3
  frequencyUnit: FrequencyUnit; // e.g., 'MONTHS'
  renewalDate: string; // YYYY-MM-DD (This becomes the "Next Renewal Date")
  startDate: string;   // YYYY-MM-DD (The original start/last payment date)
  category: string;
  credentialId?: string;
  website?: string;
  active: boolean;
}

export interface VaultData {
  credentials: Credential[];
  subscriptions: Subscription[];
  lastUpdated: number;
}

export interface EncryptedStorage {
  salt: string; // Base64
  iv: string;   // Base64
  data: string; // Base64
}

export interface AnalysisResult {
  totalMonthly: number;
  totalYearly: number;
  categories: { name: string; amount: number; percentage: number }[];
  insights: string[];
}