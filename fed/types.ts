export interface Credential {
  id: string;
  username: string;
  password?: string;
  label: string;
  notes?: string;
  website?: string;
  category?: string;
  createdAt: number;
}

export type CredentialCategory = '社交' | '购物' | '工作' | '娱乐' | '开发' | '金融' | '教育' | '其他';

export const CREDENTIAL_CATEGORIES: CredentialCategory[] = ['社交', '购物', '工作', '娱乐', '开发', '金融', '教育', '其他'];

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

export interface Memo {
  id: string;
  title: string;
  content: string;
  category: string;
  isPinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export type MemoCategory = '个人信息' | '银行卡' | '地址' | '其他';

export const MEMO_CATEGORIES: MemoCategory[] = ['个人信息', '银行卡', '地址', '其他'];

export interface VaultData {
  credentials: Credential[];
  subscriptions: Subscription[];
  memos: Memo[];
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