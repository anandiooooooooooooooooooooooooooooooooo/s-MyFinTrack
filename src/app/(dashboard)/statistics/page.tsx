'use client';

import { Header } from '@/components/layout';
import { createClient } from '@/lib/supabase/client';
import { calculatePercentage, formatCurrency, formatDate } from '@/lib/utils';
import type { Category } from '@/types';
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

type ViewTab = 'stats' | 'budget';

export default function StatisticsPage() {
  const [activeTab, setActiveTab] = useState<ViewTab>('stats');
  const [expenseByCategory, setExpenseByCategory] = useState<CategoryStat[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyStat[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [period, setPeriod] = useState<'month' | '3months' | '6months' | 'year'>('month');
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, [period]);

  const getDateRange = () => {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case 'month':
        start.setDate(1);
        break;
      case '3months':
        start.setMonth(start.getMonth() - 2);
        start.setDate(1);
        break;
      case '6months':
        start.setMonth(start.getMonth() - 5);
        start.setDate(1);
        break;
      case 'year':
        start.setMonth(0);
        start.setDate(1);
        break;
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  };

  const fetchData = async () => {
    setLoading(true);
    const { start, end } = getDateRange();

    // Fetch all transactions in period
    const { data: transactions } = await supabase
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

    if (!transactions) {
      setLoading(false);
      return;
    }

    // Calculate totals
    let income = 0;
    let expense = 0;
    const categoryMap: Record<string, CategoryStat> = {};
    const monthlyMap: Record<string, MonthlyStat> = {};
    const spentMap: Record<string, number> = {};

    transactions.forEach((txn) => {
      if (txn.type === 'income') {
        income += txn.amount;
      } else {
        expense += txn.amount;

        // Group by category
        const catName = txn.category?.name || 'Uncategorized';
        if (!categoryMap[catName]) {
          categoryMap[catName] = {
            name: catName,
            amount: 0,
            color: txn.category?.color || '#6b7280',
            icon: txn.category?.icon || '📦',
          };
        }
        categoryMap[catName].amount += txn.amount;

        // Track spent per category ID for budget
        if (txn.category_id) {
          spentMap[txn.category_id] = (spentMap[txn.category_id] || 0) + txn.amount;
        }
      }

      // Group by month
      const monthKey = formatDate(txn.date, 'MMM yyyy');
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { month: monthKey, income: 0, expense: 0 };
      }
      if (txn.type === 'income') {
        monthlyMap[monthKey].income += txn.amount;
      } else {
        monthlyMap[monthKey].expense += txn.amount;
      }
    });

    // Calculate budget items
    const items: BudgetItem[] = (budgetCategories || []).map((cat) => {
      const spent = spentMap[cat.id] || 0;
      const percentage = calculatePercentage(spent, cat.budget_limit || 1);
      return { category: cat, spent, percentage };
    });

    setTotalIncome(income);
    setTotalExpense(expense);
    setExpenseByCategory(Object.values(categoryMap).sort((a, b) => b.amount - a.amount));
    setMonthlyData(Object.values(monthlyMap));
    setBudgetItems(items.sort((a, b) => b.percentage - a.percentage));
    setLoading(false);
  };

  const savingsRate = totalIncome > 0
    ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100)
    : 0;

  const getStatusColor = (percentage: number) => {
    if (percentage >= 100) return 'text-accent-red';
    if (percentage >= 80) return 'text-accent-yellow';
    return 'text-accent-green';
  };

  const getBarColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-accent-red';
    if (percentage >= 80) return 'bg-accent-yellow';
    return 'bg-accent-green';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Header title="Stats & Budget" />

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Tab Switcher */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'stats'
                ? 'bg-accent-blue text-white'
                : 'bg-bg-card text-text-secondary hover:bg-bg-hover'
            }`}
          >
            📈 Statistics
          </button>
          <button
            onClick={() => setActiveTab('budget')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'budget'
                ? 'bg-accent-blue text-white'
                : 'bg-bg-card text-text-secondary hover:bg-bg-hover'
            }`}
          >
            🎯 Budget
          </button>
        </div>

        {activeTab === 'stats' ? (
          <>
            {/* Period Selector */}
            <div className="flex gap-2">
              {([
                { value: 'month', label: 'This Month' },
                { value: '3months', label: '3 Months' },
                { value: '6months', label: '6 Months' },
                { value: 'year', label: 'This Year' },
              ] as const).map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    period === p.value
                      ? 'bg-accent-purple text-white'
                      : 'bg-bg-card text-text-secondary hover:bg-bg-hover'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="card">
                <p className="text-text-secondary text-sm mb-1">Total Income</p>
                <p className="text-2xl font-bold text-accent-green">
                  +{formatCurrency(totalIncome)}
                </p>
              </div>
              <div className="card">
                <p className="text-text-secondary text-sm mb-1">Total Expense</p>
                <p className="text-2xl font-bold text-accent-red">
                  -{formatCurrency(totalExpense)}
                </p>
              </div>
              <div className="card">
                <p className="text-text-secondary text-sm mb-1">Net</p>
                <p className={`text-2xl font-bold ${totalIncome - totalExpense >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                  {formatCurrency(totalIncome - totalExpense)}
                </p>
              </div>
              <div className="card">
                <p className="text-text-secondary text-sm mb-1">Savings Rate</p>
                <p className={`text-2xl font-bold ${savingsRate >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                  {savingsRate}%
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Expense by Category Pie Chart */}
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Expense by Category</h3>
                {expenseByCategory.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-text-secondary">
                    No expense data
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expenseByCategory}
                          dataKey="amount"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {expenseByCategory.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
                          contentStyle={{
                            backgroundColor: '#1c1c26',
                            border: '1px solid #2a2a38',
                            borderRadius: '8px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Monthly Trend Bar Chart */}
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Monthly Trend</h3>
                {monthlyData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-text-secondary">
                    No data
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData}>
                        <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                        <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(v) => `${v / 1000000}M`} />
                        <Tooltip
                          formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
                          contentStyle={{
                            backgroundColor: '#1c1c26',
                            border: '1px solid #2a2a38',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend />
                        <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* Category Breakdown Table */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Expense Breakdown</h3>
              {expenseByCategory.length === 0 ? (
                <p className="text-text-secondary text-center py-8">No expense data</p>
              ) : (
                <div className="space-y-3">
                  {expenseByCategory.map((cat) => {
                    const percentage = totalExpense > 0 ? (cat.amount / totalExpense) * 100 : 0;
                    return (
                      <div key={cat.name} className="flex items-center gap-4">
                        <div className="flex items-center gap-2 w-40">
                          <span>{cat.icon}</span>
                          <span className="text-sm font-medium">{cat.name}</span>
                        </div>
                        <div className="flex-1">
                          <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${percentage}%`, backgroundColor: cat.color }}
                            />
                          </div>
                        </div>
                        <div className="w-28 text-right">
                          <span className="text-sm font-medium">{formatCurrency(cat.amount)}</span>
                        </div>
                        <div className="w-12 text-right">
                          <span className="text-sm text-text-secondary">{percentage.toFixed(0)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Budget Tab */
          <>
            {budgetItems.length === 0 ? (
              <div className="card text-center py-12">
                <p className="text-text-secondary mb-2">No budgets set yet</p>
                <p className="text-sm text-text-muted mb-4">
                  Set budget limits on your categories to track spending
                </p>
                <Link href="/settings" className="btn btn-primary">
                  Manage Categories
                </Link>
              </div>
            ) : (
              <>
                {/* Budget Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {budgetItems.map(({ category, spent, percentage }) => (
                    <div key={category.id} className="card">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{category.icon}</span>
                          <span className="font-medium">{category.name}</span>
                        </div>
                        {percentage >= 80 && (
                          <span className={`text-xs font-medium ${getStatusColor(percentage)}`}>
                            {percentage >= 100 ? '⚠️ Over budget!' : '⚠️ Almost there'}
                          </span>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="h-3 bg-bg-secondary rounded-full overflow-hidden mb-3">
                        <div
                          className={`h-full rounded-full transition-all ${getBarColor(percentage)}`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>

                      {/* Stats */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary">
                          {formatCurrency(spent)} spent
                        </span>
                        <span className={`font-medium ${getStatusColor(percentage)}`}>
                          {percentage}%
                        </span>
                      </div>
                      <div className="text-xs text-text-muted mt-1">
                        of {formatCurrency(category.budget_limit || 0)} budget
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Budget Summary</h3>
                  <div className="space-y-4">
                    {budgetItems.map(({ category, spent, percentage }) => (
                      <div key={category.id} className="flex items-center gap-4">
                        <div className="flex items-center gap-2 w-40">
                          <span>{category.icon}</span>
                          <span className="text-sm">{category.name}</span>
                        </div>
                        <div className="flex-1 h-2 bg-bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${getBarColor(percentage)}`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                        <div className="w-32 text-right text-sm">
                          <span className="text-text-primary">{formatCurrency(spent)}</span>
                          <span className="text-text-muted"> / {formatCurrency(category.budget_limit || 0)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
