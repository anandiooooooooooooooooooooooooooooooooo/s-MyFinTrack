'use client';

import { Modal } from '@/components/ui';
import { SkeletonCard, SkeletonTransactionItem } from '@/components/ui/Skeleton';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate, formatNumber, getToday, parseFormattedNumber } from '@/lib/utils';
import type { Account, Category, Transaction, TransactionType } from '@/types';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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

type ViewTab = 'detail' | 'stats';

export default function TransactionsPage() {
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('view') as ViewTab) || 'detail';

  // -- Transactions / Detail State --
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Date filters (history tab)
  const [filterDay, setFilterDay] = useState<number | null>(null);
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth());
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());

  // -- Stats State --
  // statsPeriod removed, using filterMonth/Year/Day
  const [monthlyStats, setMonthlyStats] = useState({ income: 0, expense: 0 });
  const [expenseByCategory, setExpenseByCategory] = useState<CategoryStat[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyStat[]>([]);

  // -- Shared / Form State --
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Form Details
  const [formType, setFormType] = useState<TransactionType>('expense');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(getToday());
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formAccountId, setFormAccountId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const supabase = createClient();

  useEffect(() => {
    if (activeTab === 'detail') {
      fetchTransactions();
    } else {
      fetchStats();
    }
  }, [activeTab, filterDay, filterMonth, filterYear]);

  // --- Date Range Helper for History Tab ---
  const getDateRange = () => {
    const year = filterYear;
    const month = filterMonth;

    if (filterDay !== null) {
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(filterDay).padStart(2, '0')}`;
      return { start: date, end: date };
    } else {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      return {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      };
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    const range = getDateRange();

    const { data } = await supabase
      .from('transactions')
      .select('*, category:categories(*), account:accounts(*)')
      .gte('date', range.start)
      .lte('date', range.end)
      .order('date', { ascending: false });

    setTransactions(data || []);
    setLoading(false);
  };

  const fetchStats = async () => {
    setLoading(true);
    // Use the same date range as History
    const { start, end } = getDateRange();

    const { data: periodTxns } = await supabase
      .from('transactions')
      .select('*, category:categories(*)')
      .gte('date', start)
      .lte('date', end);

    // Process Stats
    let income = 0, expense = 0;
    const categoryMap: Record<string, CategoryStat> = {};
    const monthlyMap: Record<string, MonthlyStat> = {};

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
      }
      const monthKey = formatDate(txn.date, 'MMM yyyy');
      if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { month: monthKey, income: 0, expense: 0 };
      if (txn.type === 'income') monthlyMap[monthKey].income += txn.amount;
      else monthlyMap[monthKey].expense += txn.amount;
    });

    setMonthlyStats({ income, expense });
    setExpenseByCategory(Object.values(categoryMap).sort((a, b) => b.amount - a.amount));
    setMonthlyData(Object.values(monthlyMap));
    setLoading(false);
  };

  const fetchFormData = async () => {
    const [{ data: cats }, { data: accs }] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('accounts').select('*').order('created_at'),
    ]);

    setCategories(cats || []);
    setAccounts(accs || []);

    if (accs && accs.length > 0) {
      setFormAccountId(accs[0].id);
    }
  };

  const openModal = () => {
    setEditingId(null);
    fetchFormData();
    setShowModal(true);
  };

  const openEditModal = (txn: Transaction) => {
    setEditingId(txn.id);
    setFormType(txn.type);
    setFormAmount(formatNumber(txn.amount));
    setFormDate(txn.date);
    setFormCategoryId(txn.category_id || '');
    setFormAccountId(txn.account_id || '');
    setFormDescription(txn.description || '');
    fetchFormData();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingId(null);
    setFormType('expense');
    setFormAmount('');
    setFormDate(getToday());
    setFormCategoryId('');
    setFormAccountId('');
    setFormDescription('');
    setFormError('');
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value) {
      setFormAmount(formatNumber(parseInt(value)));
    } else {
      setFormAmount('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    const numAmount = parseFormattedNumber(formAmount);

    if (numAmount <= 0) {
      setFormError('Amount must be greater than 0');
      setFormLoading(false);
      return;
    }

    if (!formAccountId) {
      setFormError('Please select an account');
      setFormLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setFormError('Not authenticated');
      setFormLoading(false);
      return;
    }

    const txnData = {
      type: formType,
      amount: numAmount,
      date: formDate,
      category_id: formCategoryId || null,
      account_id: formAccountId,
      description: formDescription || null,
    };

    let error;
    if (editingId) {
      const result = await supabase.from('transactions').update(txnData).eq('id', editingId);
      error = result.error;
    } else {
      const result = await supabase.from('transactions').insert({ ...txnData, user_id: user.id });
      error = result.error;
    }

    if (error) {
      setFormError(error.message);
      setFormLoading(false);
      return;
    }

    setFormLoading(false);
    closeModal();
    if (activeTab === 'detail') fetchTransactions();
    else fetchStats();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    await supabase.from('transactions').delete().eq('id', id);
    setTransactions(transactions.filter((t) => t.id !== id));
  };

  const filteredTransactions = transactions.filter((txn) => {
    // Type filter
    if (filter !== 'all' && txn.type !== filter) return false;
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesCategory = txn.category?.name?.toLowerCase().includes(query);
      const matchesDescription = txn.description?.toLowerCase().includes(query);
      const matchesAccount = txn.account?.name?.toLowerCase().includes(query);
      return matchesCategory || matchesDescription || matchesAccount;
    }
    return true;
  });

  // Group transactions by date
  const groupedTransactions = filteredTransactions.reduce((groups, txn) => {
    const date = txn.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(txn);
    return groups;
  }, {} as Record<string, Transaction[]>);

  const filteredCategories = categories.filter((c) => c.type === formType);

  return (
    <>
      <div className="p-4 md:p-6 space-y-4 animate-fade-in relative pb-24">


        {/* Unified Sticky Header: Segmented Control + Date Filters */}
        <div className="sticky top-0 z-20 bg-bg-primary/95 backdrop-blur-md -mx-4 px-4 py-3 md:mx-0 md:px-0 md:bg-transparent border-b border-border/50 md:border-none space-y-4">

          {/* Segmented Control */}
          <div className="flex justify-center">
            <div className="bg-bg-secondary p-1 rounded-xl flex items-center border border-border/50 shadow-inner max-w-xs w-full">
               <Link
                 href="/transactions?view=detail"
                 className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
                   activeTab === 'detail'
                     ? 'bg-bg-card text-text-primary shadow-sm ring-1 ring-border/50'
                     : 'text-text-secondary hover:text-text-primary'
                 }`}
               >
                 📝 History
               </Link>
               <Link
                 href="/transactions?view=stats"
                 className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
                   activeTab === 'stats'
                     ? 'bg-bg-card text-text-primary shadow-sm ring-1 ring-border/50'
                     : 'text-text-secondary hover:text-text-primary'
                 }`}
               >
                 📊 Statistics
               </Link>
            </div>
          </div>

          {/* Date Filters */}
          <div className="flex flex-col md:flex-row gap-2 md:items-center justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(parseInt(e.target.value))}
                className="input w-auto text-sm min-w-[100px]"
              >
                {months.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(parseInt(e.target.value))}
                className="input w-auto text-sm"
              >
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <select
                value={filterDay ?? ''}
                onChange={(e) => setFilterDay(e.target.value ? parseInt(e.target.value) : null)}
                className="input w-auto text-sm"
              >
                <option value="">All Days</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Filter by Type & Search */}
            {activeTab === 'detail' && (
              <div className="flex gap-2 w-full md:w-auto">
                 <div className="flex p-1 bg-bg-secondary rounded-lg border border-border/50 shrink-0">
                    {(['all', 'income', 'expense'] as const).map((f) => (
                      <button
                        key={f}
                         onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${
                          filter === f ? 'bg-bg-card text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                 </div>
                 <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input py-1.5 text-sm w-full md:w-48"
                 />
              </div>
            )}
          </div>
        </div>

        {activeTab === 'detail' && (
          <div className="space-y-4 animate-fade-in">
            {loading ? (
              <div className="space-y-3 pt-2">
                 {[...Array(5)].map((_, i) => <SkeletonTransactionItem key={i} />)}
              </div>
            ) : Object.keys(groupedTransactions).length === 0 ? (
              <div className="card text-center py-16 border-dashed border-2 border-border/50 bg-bg-secondary/30">
                <div className="text-4xl mb-4 opacity-50">📝</div>
                <p className="text-text-secondary mb-6 text-lg font-medium">No transactions found</p>
                <button onClick={openModal} className="btn btn-primary px-6 py-2.5 shadow-lg shadow-accent-blue/20">
                  Add your first transaction
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedTransactions).map(([date, txns]) => (
                  <div key={date} className="animate-fade-in">
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 pl-1 sticky top-40 md:static">
                      {formatDate(date, 'EEEE, dd MMMM yyyy')}
                    </h3>
                    <div className="grid gap-2">
                      {txns.map((txn) => (
                        <div
                          key={txn.id}
                          className="group flex items-center justify-between p-3 card hover:border-accent-blue/30 transition-all duration-300 hover:-translate-y-0.5"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-inner transition-transform duration-300 group-hover:scale-110 ring-1 ring-inset ring-white/5"
                              style={{ backgroundColor: `${txn.category?.color || '#3f3f46'}20` }}
                            >
                              {txn.category?.icon || '📦'}
                            </div>
                            <div>
                              <p className="font-semibold text-text-primary text-sm group-hover:text-accent-blue transition-colors">
                                {txn.category?.name || 'Uncategorized'}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {txn.description && (
                                  <p className="text-[11px] text-text-muted font-medium bg-bg-secondary px-1.5 py-0.5 rounded-md max-w-[100px] md:max-w-none truncate border border-border/30">
                                    {txn.description}
                                  </p>
                                )}
                                <span className="text-[10px] text-text-muted md:hidden">• {txn.account?.name}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-0.5">
                            <p
                              className={`font-bold text-[15px] tracking-tight ${
                                txn.type === 'income' ? 'text-accent-green' : 'text-text-primary'
                              }`}
                            >
                              {txn.type === 'income' ? '+' : '-'}
                              {formatCurrency(txn.amount)}
                            </p>
                            <div className="text-[11px] font-medium text-text-muted hidden md:flex items-center gap-1 px-2 py-0.5 bg-bg-secondary rounded-full border border-border/50">
                               {txn.account?.icon && <span>{txn.account.icon}</span>}
                               <span>{txn.account?.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(txn);
                                }}
                                className="md:opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-all"
                                title="Edit transaction"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(txn.id);
                                }}
                                className="md:opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-accent-red hover:bg-accent-red/10 rounded-lg transition-all"
                                title="Delete transaction"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-4 animate-fade-in">
            {loading ? (
               <div className="grid grid-cols-1 gap-4">
                 <SkeletonCard />
                 <SkeletonCard />
                 <SkeletonCard />
               </div>
            ) : (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="stat-card stat-card-income">
                        <p className="text-text-secondary text-xs mb-1">Income</p>
                        <p className="text-lg font-bold text-accent-green">+{formatCurrency(monthlyStats.income)}</p>
                    </div>
                    <div className="stat-card stat-card-expense">
                        <p className="text-text-secondary text-xs mb-1">Expense</p>
                        <p className="text-lg font-bold text-accent-red">-{formatCurrency(monthlyStats.expense)}</p>
                    </div>
                  </div>

                  {/* Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="chart-container">
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
                      <div className="space-y-3">
                        {expenseByCategory.map((cat) => {
                          const pct = monthlyStats.expense > 0 ? (cat.amount / monthlyStats.expense) * 100 : 0;
                          return (
                            <div key={cat.name} className="flex items-center gap-3">
                              <span className="text-xl">{cat.icon}</span>
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
        )}

        {/* Quick Add FAB */}
        <button onClick={openModal} className="fab">
          +
        </button>
      </div>

      {/* Add/Edit Transaction Modal */}
      <Modal isOpen={showModal} onClose={closeModal} title={editingId ? 'Edit Transaction' : 'Add Transaction'}>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Type Toggle */}
          <div className="flex rounded-lg overflow-hidden border border-border">
            {(['expense', 'income'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setFormType(t);
                  setFormCategoryId('');
                }}
                className={`flex-1 py-3 font-medium transition-all ${
                  formType === t
                    ? t === 'expense'
                      ? 'bg-accent-red text-white'
                      : 'bg-accent-green text-white'
                    : 'bg-bg-secondary text-text-secondary hover:bg-bg-hover'
                }`}
              >
                {t === 'expense' ? '💸 Expense' : '💰 Income'}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div>
            <label className="label">Amount (IDR)</label>
            <input
              type="text"
              value={formAmount}
              onChange={handleAmountChange}
              className="input text-2xl font-bold text-center"
              placeholder="0"
              required
            />
          </div>

          {/* Date */}
          <div>
            <label className="label">Date</label>
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="input"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="label">Category</label>
            <select
              value={formCategoryId}
              onChange={(e) => setFormCategoryId(e.target.value)}
              className="input"
            >
              <option value="">Select category</option>
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Account */}
          <div>
            <label className="label">Account</label>
            <select
              value={formAccountId}
              onChange={(e) => setFormAccountId(e.target.value)}
              className="input"
              required
            >
              <option value="">Select account</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.icon} {acc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="label">Notes (optional)</label>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="input"
              placeholder="What was this for?"
            />
          </div>

          {formError && (
            <div className="p-3 bg-accent-red/10 border border-accent-red/20 rounded-lg text-accent-red text-sm">
              {formError}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn btn-ghost flex-1">
              Cancel
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className={`btn flex-1 ${formType === 'expense' ? 'bg-accent-red hover:bg-red-600' : 'btn-success'} text-white`}
            >
              {formLoading ? 'Saving...' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
