'use client';

import { createClient } from '@/lib/supabase/client';
import { calculatePercentage, formatCurrency, formatDate } from '@/lib/utils';
import type { Account, AccountBalance, Category, Transaction } from '@/types';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
    Bar,
    BarChart,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

interface CategoryStat {
  name: string;
  amount: number;
  color: string;
  icon: string;
}

interface MonthlyStat {
  month: string;
  income: number;
  expense: number;
}

interface BudgetItem {
  category: Category;
  spent: number;
  percentage: number;
}

type ViewTab = 'overview' | 'stats';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<ViewTab>('overview');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<AccountBalance[]>([]);
  const [monthlyStats, setMonthlyStats] = useState({ income: 0, expense: 0 });
  const [expenseByCategory, setExpenseByCategory] = useState<CategoryStat[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyStat[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [period, setPeriod] = useState<'month' | '3months' | '6months' | 'year'>('month');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, [period]);

  const getDateRange = () => {
    const end = new Date();
    const start = new Date();
    switch (period) {
      case 'month': start.setDate(1); break;
      case '3months': start.setMonth(start.getMonth() - 2); start.setDate(1); break;
      case '6months': start.setMonth(start.getMonth() - 5); start.setDate(1); break;
      case 'year': start.setMonth(0); start.setDate(1); break;
    }
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
  };

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { start, end } = getDateRange();

    // Fetch accounts
    const { data: accountsData } = await supabase.from('accounts').select('*').order('created_at', { ascending: true });

    // Fetch recent transactions
    const { data: recentTxns } = await supabase
      .from('transactions')
      .select('*, category:categories(*), account:accounts(*)')
      .order('date', { ascending: false })
      .limit(5);

    // Fetch transactions for period
    const { data: periodTxns } = await supabase
      .from('transactions')
      .select('*, category:categories(*)')
      .gte('date', start)
      .lte('date', end);

    // Fetch budget categories
    const { data: budgetCategories } = await supabase
      .from('categories')
      .select('*')
      .eq('type', 'expense')
      .not('budget_limit', 'is', null)
      .order('name');

    // Calculate account balances
    if (accountsData) {
      const balances = await Promise.all(
        accountsData.map(async (account: Account) => {
          const { data: txns } = await supabase.from('transactions').select('type, amount').eq('account_id', account.id);
          let balance = account.initial_balance;
          txns?.forEach((txn: { type: string; amount: number }) => {
            balance += txn.type === 'income' ? txn.amount : -txn.amount;
          });
          return { account, balance };
        })
      );
      setAccounts(balances);
    }

    // Calculate stats from period transactions
    let income = 0, expense = 0;
    const categoryMap: Record<string, CategoryStat> = {};
    const monthlyMap: Record<string, MonthlyStat> = {};
    const spentMap: Record<string, number> = {};

    periodTxns?.forEach((txn) => {
      if (txn.type === 'income') {
        income += txn.amount;
      } else {
        expense += txn.amount;
        const catName = txn.category?.name || 'Uncategorized';
        if (!categoryMap[catName]) {
          categoryMap[catName] = { name: catName, amount: 0, color: txn.category?.color || '#6b7280', icon: txn.category?.icon || '📦' };
        }
        categoryMap[catName].amount += txn.amount;
        if (txn.category_id) spentMap[txn.category_id] = (spentMap[txn.category_id] || 0) + txn.amount;
      }
      const monthKey = formatDate(txn.date, 'MMM yyyy');
      if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { month: monthKey, income: 0, expense: 0 };
      if (txn.type === 'income') monthlyMap[monthKey].income += txn.amount;
      else monthlyMap[monthKey].expense += txn.amount;
    });

    setMonthlyStats({ income, expense });
    setExpenseByCategory(Object.values(categoryMap).sort((a, b) => b.amount - a.amount));
    setMonthlyData(Object.values(monthlyMap));
    setTransactions(recentTxns || []);

    // Budget items
    const items: BudgetItem[] = (budgetCategories || []).map((cat) => {
      const spent = spentMap[cat.id] || 0;
      return { category: cat, spent, percentage: calculatePercentage(spent, cat.budget_limit || 1) };
    });
    setBudgetItems(items.sort((a, b) => b.percentage - a.percentage));

    setLoading(false);
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const savingsRate = monthlyStats.income > 0 ? Math.round(((monthlyStats.income - monthlyStats.expense) / monthlyStats.income) * 100) : 0;

  const getStatusColor = (p: number) => p >= 100 ? 'text-accent-red' : p >= 80 ? 'text-accent-yellow' : 'text-accent-green';
  const getBarColor = (p: number) => p >= 100 ? 'bg-accent-red' : p >= 80 ? 'bg-accent-yellow' : 'bg-accent-green';

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4 animate-fade-in">
        {/* Tab Skeleton */}
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded-lg bg-bg-hover/50 animate-pulse" />
          <div className="h-9 w-24 rounded-lg bg-bg-hover/50 animate-pulse" />
        </div>
        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-3 space-y-2">
              <div className="h-3 w-1/3 rounded bg-bg-hover/50 animate-pulse" />
              <div className="h-6 w-2/3 rounded bg-bg-hover/50 animate-pulse" />
            </div>
          ))}
        </div>
        {/* Accounts Card Skeleton */}
        <div className="card p-4 space-y-3">
          <div className="h-5 w-1/4 rounded bg-bg-hover/50 animate-pulse" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 bg-bg-primary/50 border border-border/50 rounded-xl">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-bg-hover/50 animate-pulse" />
                <div className="space-y-1.5">
                  <div className="h-4 w-20 rounded bg-bg-hover/50 animate-pulse" />
                  <div className="h-3 w-12 rounded bg-bg-hover/50 animate-pulse" />
                </div>
              </div>
              <div className="h-5 w-16 rounded bg-bg-hover/50 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>


      <div className="p-4 md:p-6 space-y-4 animate-fade-in">
        {/* Tab Switcher */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { id: 'overview', label: '🏠 Home', icon: '🏠' },
            { id: 'stats', label: '📈 Stats', icon: '📈' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ViewTab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id ? 'bg-accent-blue text-white' : 'bg-bg-card text-text-secondary hover:bg-bg-hover'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="card p-3">
                <p className="text-text-secondary text-[11px] mb-0.5">Balance</p>
                <p className={`text-base md:text-lg font-bold ${totalBalance >= 0 ? 'text-text-primary' : 'text-accent-red'}`}>
                  {formatCurrency(totalBalance)}
                </p>
              </div>
              <div className="card p-3">
                <p className="text-text-secondary text-[11px] mb-0.5">Income</p>
                <p className="text-base md:text-lg font-bold text-accent-green">+{formatCurrency(monthlyStats.income)}</p>
              </div>
              <div className="card p-3">
                <p className="text-text-secondary text-[11px] mb-0.5">Expense</p>
                <p className="text-base md:text-lg font-bold text-accent-red">-{formatCurrency(monthlyStats.expense)}</p>
              </div>
              <div className="card p-3">
                <p className="text-text-secondary text-[11px] mb-0.5">Savings</p>
                <p className={`text-base md:text-lg font-bold ${savingsRate >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>{savingsRate}%</p>
              </div>
            </div>

            {/* Accounts */}
            <div className="card bg-gradient-to-br from-bg-card to-bg-secondary/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-base flex items-center gap-2">
                  <span className="text-lg">🏦</span> Accounts
                </h2>
                <Link href="/accounts" className="text-accent-blue text-xs font-medium hover:underline flex items-center gap-1">
                  View all <span className="text-[10px]">→</span>
                </Link>
              </div>
              {accounts.length === 0 ? (
                <p className="text-text-secondary text-center py-4 border border-dashed border-border/50 rounded-xl bg-bg-secondary/30 text-xs">No accounts yet</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {accounts.slice(0, 3).map(({ account, balance }) => (
                    <div key={account.id} className="p-2.5 bg-bg-primary/50 border border-border/50 rounded-xl flex items-center justify-between hover:border-accent-blue/20 transition-colors group">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl p-1.5 bg-bg-secondary rounded-lg group-hover:scale-110 transition-transform duration-300 shadow-inner">{account.icon}</span>
                        <div>
                          <span className="font-semibold block text-sm">{account.name}</span>
                          <span className="text-[10px] text-text-muted capitalize">{account.type}</span>
                        </div>
                      </div>
                      <p className={`font-bold font-mono text-sm ${balance >= 0 ? 'text-text-primary' : 'text-accent-red'}`}>{formatCurrency(balance)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Transactions */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Recent</h2>
                <Link href="/transactions" className="text-accent-blue text-sm">View all</Link>
              </div>
              {transactions.length === 0 ? (
                <p className="text-text-secondary text-center py-4">No transactions yet</p>
              ) : (
                <div className="space-y-2">
                  {transactions.map((txn) => (
                    <div key={txn.id} className="flex items-center justify-between p-2 bg-bg-secondary rounded-lg">
                      <div className="flex items-center gap-2">
                        <span>{txn.category?.icon || '📦'}</span>
                        <div>
                          <p className="font-medium text-sm">{txn.category?.name || 'Uncategorized'}</p>
                          <p className="text-xs text-text-muted">{formatDate(txn.date, 'dd MMM')}</p>
                        </div>
                      </div>
                      <p className={`font-semibold text-sm ${txn.type === 'income' ? 'text-accent-green' : 'text-accent-red'}`}>
                        {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'stats' && (
          <>
            {/* Period Selector */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {([{ value: 'month', label: 'Month' }, { value: '3months', label: '3M' }, { value: '6months', label: '6M' }, { value: 'year', label: 'Year' }] as const).map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    period === p.value ? 'bg-accent-purple text-white' : 'bg-bg-card text-text-secondary hover:bg-bg-hover'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card">
                <h3 className="font-semibold mb-3">By Category</h3>
                {expenseByCategory.length === 0 ? (
                  <p className="text-text-secondary text-center py-8">No data</p>
                ) : (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={expenseByCategory} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                          {expenseByCategory.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(v: number | undefined) => formatCurrency(v ?? 0)} contentStyle={{ backgroundColor: '#1c1c26', border: '1px solid #2a2a38', borderRadius: '8px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
              <div className="card">
                <h3 className="font-semibold mb-3">Monthly Trend</h3>
                {monthlyData.length === 0 ? (
                  <p className="text-text-secondary text-center py-8">No data</p>
                ) : (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData}>
                        <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                        <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={(v) => `${v / 1000000}M`} />
                        <Tooltip formatter={(v: number | undefined) => formatCurrency(v ?? 0)} contentStyle={{ backgroundColor: '#1c1c26', border: '1px solid #2a2a38', borderRadius: '8px' }} />
                        <Legend />
                        <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* Breakdown */}
            <div className="card">
              <h3 className="font-semibold mb-3">Expense Breakdown</h3>
              {expenseByCategory.length === 0 ? (
                <p className="text-text-secondary text-center py-4">No data</p>
              ) : (
                <div className="space-y-2">
                  {expenseByCategory.slice(0, 5).map((cat) => {
                    const pct = monthlyStats.expense > 0 ? (cat.amount / monthlyStats.expense) * 100 : 0;
                    return (
                      <div key={cat.name} className="flex items-center gap-3">
                        <span>{cat.icon}</span>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span>{cat.name}</span>
                            <span>{formatCurrency(cat.amount)}</span>
                          </div>
                          <div className="h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </>
  );
}
