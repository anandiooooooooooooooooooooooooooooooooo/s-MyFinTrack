import { endOfMonth, format, parseISO, startOfMonth, subMonths } from 'date-fns';
import { id } from 'date-fns/locale';

// Format currency to IDR
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format number with thousand separators
export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('id-ID').format(amount);
}

// Parse formatted number back to number
export function parseFormattedNumber(value: string): number {
  return parseInt(value.replace(/\D/g, '')) || 0;
}

// Format date for display
export function formatDate(date: string | Date, formatStr: string = 'dd MMM yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr, { locale: id });
}

// Get today's date in YYYY-MM-DD format
export function getToday(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

// Get current month range
export function getCurrentMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  return {
    start: startOfMonth(now),
    end: endOfMonth(now),
  };
}

// Get date range for last N months
export function getLastNMonthsRange(n: number): { start: Date; end: Date } {
  const now = new Date();
  return {
    start: startOfMonth(subMonths(now, n - 1)),
    end: endOfMonth(now),
  };
}

// Calculate percentage
export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

// Get account type label
export function getAccountTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    bank: 'Bank',
    ewallet: 'E-Wallet',
    cash: 'Cash',
  };
  return labels[type] || type;
}

// Default category icons
export const defaultCategoryIcons: Record<string, string> = {
  'Food & Dining': '🍔',
  'Transportation': '🚗',
  'Shopping': '🛍️',
  'Bills & Utilities': '💡',
  'Entertainment': '🎬',
  'Healthcare': '💊',
  'Education': '📚',
  'Salary': '💰',
  'Freelance': '💻',
  'Investment': '📈',
  'Other Income': '💵',
  'Other': '📦',
};

// Default category colors
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

// Account type icons
export const accountTypeIcons: Record<string, string> = {
  bank: '🏦',
  ewallet: '📱',
  cash: '💵',
};

// CN helper for conditional classes
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
