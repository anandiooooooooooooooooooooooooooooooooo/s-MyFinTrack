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
  category?: Category;
  account?: Account;
}

export interface AccountBalance {
  account: Account;
  balance: number;
}
