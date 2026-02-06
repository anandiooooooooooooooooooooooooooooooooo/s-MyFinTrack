// Database types for Supabase

export type AccountType = 'bank' | 'ewallet' | 'cash';
export type TransactionType = 'income' | 'expense';
export type CategoryType = 'income' | 'expense';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initial_balance: number;
  icon: string;
  created_at: string;
  user_id: string;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  budget_limit: number | null;
  user_id: string;
}

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  amount: number;
  category_id: string;
  account_id: string;
  description: string | null;
  created_at: string;
  user_id: string;
  // Joined fields
  category?: Category;
  account?: Account;
}

export interface Transfer {
  id: string;
  date: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  description: string | null;
  created_at: string;
  user_id: string;
}

// Form types
export interface TransactionFormData {
  date: string;
  type: TransactionType;
  amount: number;
  category_id: string;
  account_id: string;
  description: string;
}

export interface AccountFormData {
  name: string;
  type: AccountType;
  initial_balance: number;
  icon: string;
}

export interface CategoryFormData {
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  budget_limit: number | null;
}

// Stats types
export interface MonthlyStats {
  month: string;
  income: number;
  expense: number;
  savings: number;
}

export interface CategoryStats {
  category: string;
  amount: number;
  color: string;
  icon: string;
  percentage: number;
}

export interface AccountBalance {
  account: Account;
  balance: number;
}
