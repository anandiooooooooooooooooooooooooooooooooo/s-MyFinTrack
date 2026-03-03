import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('id-ID').format(amount);
}

export function parseFormattedNumber(value: string): number {
  return parseInt(value.replace(/\D/g, '')) || 0;
}

export function formatDate(date: string | Date, formatStr: string = 'dd MMM yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr, { locale: id });
}

export function getToday(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function getAccountTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    bank: 'Bank',
    ewallet: 'E-Wallet',
    cash: 'Cash',
  };
  return labels[type] || type;
}

export const defaultCategoryColors: Record<string, string> = {
  'Food & Dining': '#ef4444',
  'Transportation': '#f97316',
  'Shopping': '#eab308',
  'Bills & Utilities': '#22c55e',
  'Entertainment': '#06b6d4',
  'Healthcare': '#3b82f6',
  'Education': '#8b5cf6',
  'Salary': '#10b981',
  'Freelance': '#14b8a6',
  'Investment': '#6366f1',
  'Other Income': '#84cc16',
  'Other': '#6b7280',
};

export const accountTypeIcons: Record<string, string> = {
  bank: '🏦',
  ewallet: '📱',
  cash: '💵',
};

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
