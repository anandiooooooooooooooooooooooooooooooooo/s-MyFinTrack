'use client';

import { Header } from '@/components/layout';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate, getToday } from '@/lib/utils';
import type { Account, AccountBalance, Transaction } from '@/types';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<AccountBalance[]>([]);
  const [monthlyStats, setMonthlyStats] = useState({ income: 0, expense: 0 });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get accounts
    const { data: accountsData } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: true });

    // Get transactions for this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: transactionsData } = await supabase
      .from('transactions')
      .select('*, category:categories(*), account:accounts(*)')
      .order('date', { ascending: false })
      .limit(5);

    const { data: monthlyTransactions } = await supabase
      .from('transactions')
      .select('type, amount')
      .gte('date', startOfMonth.toISOString().split('T')[0]);

    // Calculate account balances
    if (accountsData) {
      const balances = await Promise.all(
        accountsData.map(async (account: Account) => {
          const { data: txns } = await supabase
            .from('transactions')
            .select('type, amount')
            .eq('account_id', account.id);

          let balance = account.initial_balance;
          txns?.forEach((txn: { type: string; amount: number }) => {
            if (txn.type === 'income') {
              balance += txn.amount;
            } else {
              balance -= txn.amount;
            }
          });

          return { account, balance };
        })
      );
      setAccounts(balances);
    }

    // Calculate monthly stats
    let income = 0;
    let expense = 0;
    monthlyTransactions?.forEach((txn: { type: string; amount: number }) => {
      if (txn.type === 'income') {
        income += txn.amount;
      } else {
        expense += txn.amount;
      }
    });
    setMonthlyStats({ income, expense });

    setTransactions(transactionsData || []);
    setLoading(false);
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const savingsRate = monthlyStats.income > 0
    ? Math.round(((monthlyStats.income - monthlyStats.expense) / monthlyStats.income) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Header title="Dashboard" subtitle={formatDate(getToday(), 'EEEE, dd MMMM yyyy')} />

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total Balance */}
          <div className="card">
            <p className="text-text-secondary text-sm mb-1">Total Balance</p>
            <p className={`text-2xl font-bold ${totalBalance >= 0 ? 'text-text-primary' : 'text-accent-red'}`}>
              {formatCurrency(totalBalance)}
            </p>
          </div>

          {/* Monthly Income */}
          <div className="card">
            <p className="text-text-secondary text-sm mb-1">Income (This Month)</p>
            <p className="text-2xl font-bold text-accent-green">
              +{formatCurrency(monthlyStats.income)}
            </p>
          </div>

          {/* Monthly Expense */}
          <div className="card">
            <p className="text-text-secondary text-sm mb-1">Expense (This Month)</p>
            <p className="text-2xl font-bold text-accent-red">
              -{formatCurrency(monthlyStats.expense)}
            </p>
          </div>

          {/* Savings Rate */}
          <div className="card">
            <p className="text-text-secondary text-sm mb-1">Savings Rate</p>
            <p className={`text-2xl font-bold ${savingsRate >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
              {savingsRate}%
            </p>
          </div>
        </div>

        {/* Accounts Section */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">My Accounts</h2>
            <Link href="/accounts" className="text-accent-blue text-sm hover:underline">
              View all
            </Link>
          </div>
          {accounts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-text-secondary mb-4">No accounts yet</p>
              <Link href="/accounts/add" className="btn btn-primary">
                Add Account
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {accounts.map(({ account, balance }) => (
                <div
                  key={account.id}
                  className="p-4 bg-bg-secondary rounded-lg border border-border"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{account.icon}</span>
                    <span className="font-medium">{account.name}</span>
                  </div>
                  <p className={`text-lg font-bold ${balance >= 0 ? 'text-text-primary' : 'text-accent-red'}`}>
                    {formatCurrency(balance)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Transactions</h2>
            <Link href="/transactions" className="text-accent-blue text-sm hover:underline">
              View all
            </Link>
          </div>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-text-secondary mb-4">No transactions yet</p>
              <Link href="/transactions/add" className="btn btn-primary">
                Add Transaction
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((txn) => (
                <div
                  key={txn.id}
                  className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{txn.category?.icon || '📦'}</span>
                    <div>
                      <p className="font-medium">{txn.category?.name || 'Uncategorized'}</p>
                      <p className="text-sm text-text-secondary">
                        {txn.description || txn.account?.name} • {formatDate(txn.date, 'dd MMM')}
                      </p>
                    </div>
                  </div>
                  <p className={`font-semibold ${txn.type === 'income' ? 'text-accent-green' : 'text-accent-red'}`}>
                    {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Add FAB */}
        <Link href="/transactions/add" className="fab">
          +
        </Link>
      </div>
    </>
  );
}
