export type Frequency = 'one-time' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface Bill {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  category: string;
  frequency: Frequency;
  payment_date: string;
  auto_renew: boolean;
  reminder_enabled: boolean;
  reminder_days: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  bill_id: string;
  user_id: string;
  amount: number;
  paid_date: string;
  note: string | null;
  created_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface BillInput {
  name: string;
  amount: number;
  category: string;
  frequency: Frequency;
  payment_date: string;
  auto_renew: boolean;
  reminder_enabled: boolean;
  reminder_days: number;
  notes?: string | null;
}

export interface CurrencyInfo {
  code: string;
  symbol: string;
  label: string;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'ZAR', symbol: 'R', label: 'South African Rand' },
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen' },
  { code: 'INR', symbol: '₹', label: 'Indian Rupee' },
];

export const CATEGORIES = [
  'Utilities',
  'Streaming',
  'Insurance',
  'Rent',
  'Mortgage',
  'Phone',
  'Internet',
  'Gym',
  'Software',
  'Membership',
  'Loan',
  'Credit Card',
  'Other',
];

export const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'one-time', label: 'One-time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

export function getCurrencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}

export function formatCurrency(amount: number, currencyCode: string): string {
  const symbol = getCurrencySymbol(currencyCode);
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: currencyCode === 'JPY' ? 0 : 2,
    maximumFractionDigits: currencyCode === 'JPY' ? 0 : 2,
  }).format(amount);
  return `${symbol}${formatted}`;
}
