import { FrequencyUnit } from '../types';

export const calculateNextRenewal = (startDate: string, amount: number, unit: FrequencyUnit): string => {
  if (unit === 'PERMANENT') return '9999-12-31';
  const date = new Date(startDate);
  switch (unit) {
    case 'DAYS': date.setDate(date.getDate() + amount); break;
    case 'WEEKS': date.setDate(date.getDate() + amount * 7); break;
    case 'MONTHS': date.setMonth(date.getMonth() + amount); break;
    case 'YEARS': date.setFullYear(date.getFullYear() + amount); break;
  }
  return date.toISOString().split('T')[0];
};

export const getDaysRemaining = (renewalDate: string): number => {
  if (renewalDate === '9999-12-31') return Infinity;
  const diff = new Date(renewalDate).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const getCycleProgress = (startDate: string, renewalDate: string): number => {
  if (renewalDate === '9999-12-31') return 100;
  const start = new Date(startDate).getTime();
  const end = new Date(renewalDate).getTime();
  const now = new Date().getTime();
  const total = end - start;
  const elapsed = now - start;
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
};

export const formatCurrency = (currency: string, cost: number): string => {
  const symbols: Record<string, string> = {
    CNY: '¥',
    USD: '$',
    EUR: '€',
    HKD: 'HK$'
  };
  return `${symbols[currency] || currency}${cost}`;
};

export const formatFrequency = (amount: number, unit: FrequencyUnit): string => {
  if (unit === 'PERMANENT') return '买断';
  const unitMap: Record<string, string> = {
    DAYS: '天',
    WEEKS: '周',
    MONTHS: '月',
    YEARS: '年'
  };
  return `${amount}${unitMap[unit]}`;
};
