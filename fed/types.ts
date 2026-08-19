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

export type SubscriptionStatus = 'active' | 'trial' | 'paused' | 'canceled';

export interface Subscription {
  id: string;
  name: string;
  cost: number;
  currency: string;
  frequencyAmount: number;
  frequencyUnit: FrequencyUnit;
  renewalDate: string;
  startDate: string;
  category: string;
  credentialId?: string;
  website?: string;
  active: boolean;
  autoRotate?: boolean;
  status?: SubscriptionStatus;
  paymentMethod?: string;
  cardLast4?: string;
  cancelUrl?: string;
  trialEndsOn?: string;
  promoEndsOn?: string;
  reminderDays?: string;
  notes?: string;
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