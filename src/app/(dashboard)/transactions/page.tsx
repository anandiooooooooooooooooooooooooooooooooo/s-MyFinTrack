'use client';

import { Modal } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate, formatNumber, getToday, parseFormattedNumber } from '@/lib/utils';
import type { Account, Category, Transaction, TransactionType } from '@/types';
import { useEffect, useState } from 'react';

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

  // Date filters
  const [filterDay, setFilterDay] = useState<number | null>(null);
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth());
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());

  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const supabase = createClient();

  // Form state
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [formType, setFormType] = useState<TransactionType>('expense');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(getToday());
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formAccountId, setFormAccountId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, [filterDay, filterMonth, filterYear]);

  const getDateRange = () => {
    const year = filterYear;
    const month = filterMonth;

    if (filterDay !== null) {
      // Specific day
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(filterDay).padStart(2, '0')}`;
      return { start: date, end: date };
    } else {
      // Whole month
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
    fetchFormData();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
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

    const { error: insertError } = await supabase.from('transactions').insert({
      type: formType,
      amount: numAmount,
      date: formDate,
      category_id: formCategoryId || null,
      account_id: formAccountId,
      description: formDescription || null,
      user_id: user.id,
    });

    if (insertError) {
      setFormError(insertError.message);
      setFormLoading(false);
      return;
    }

    setFormLoading(false);
    closeModal();
    fetchTransactions();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    await supabase.from('transactions').delete().eq('id', id);
    setTransactions(transactions.filter((t) => t.id !== id));
  };

  const filteredTransactions = transactions.filter((txn) => {
    if (filter === 'all') return true;
    return txn.type === filter;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

  return (
    <>


      <div className="p-4 md:p-6 space-y-4 animate-fade-in">
        {/* Date Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Day */}
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

          {/* Month */}
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(parseInt(e.target.value))}
            className="input w-auto text-sm"
          >
            {months.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>

          {/* Year */}
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(parseInt(e.target.value))}
            className="input w-auto text-sm"
            size={1}
          >
            {Array.from({ length: 75 }, (_, i) => 2026 + i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          {/* Type filter */}
          {(['all', 'income', 'expense'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === type
                  ? 'bg-accent-blue text-white'
                  : 'bg-bg-card text-text-secondary hover:bg-bg-hover'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        {/* Transaction List */}
        {Object.keys(groupedTransactions).length === 0 ? (
          <div className="card text-center py-16 border-dashed border-2 border-border/50 bg-bg-secondary/30">
            <div className="text-4xl mb-4 opacity-50">📝</div>
            <p className="text-text-secondary mb-6 text-lg font-medium">No transactions found</p>
            <button onClick={openModal} className="btn btn-primary px-6 py-2.5 shadow-lg shadow-accent-blue/20">
              Add your first transaction
            </button>
          </div>
        ) : (
          <div className="space-y-8 pb-20">
            {Object.entries(groupedTransactions).map(([date, txns]) => (
              <div key={date} className="animate-fade-in relative z-0">
                <div className="sticky top-14 md:top-0 bg-bg-primary/95 backdrop-blur-md py-3 z-10 -mx-4 px-4 md:mx-0 md:px-0 border-b border-border/50 mb-4 flex items-center gap-2">
                  <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                    {formatDate(date, 'EEEE, dd MMMM yyyy')}
                  </h3>
                  <div className="h-px flex-1 bg-border/50"></div>
                </div>

                <div className="grid gap-3">
                  {txns.map((txn) => (
                    <div
                      key={txn.id}
                      className="group flex items-center justify-between p-4 card hover:border-accent-blue/30 transition-all duration-300 hover:-translate-y-0.5"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner transition-transform duration-300 group-hover:scale-110 ring-1 ring-inset ring-white/5"
                          style={{ backgroundColor: `${txn.category?.color || '#3f3f46'}20` }}
                        >
                          {txn.category?.icon || '📦'}
                        </div>
                        <div>
                          <p className="font-semibold text-text-primary text-[15px] group-hover:text-accent-blue transition-colors">
                            {txn.category?.name || 'Uncategorized'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {txn.description && (
                              <p className="text-xs text-text-muted font-medium bg-bg-secondary px-2 py-0.5 rounded-md max-w-[120px] md:max-w-none truncate border border-border/30">
                                {txn.description}
                              </p>
                            )}
                            <span className="text-[10px] text-text-muted md:hidden">• {txn.account?.name}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <p
                          className={`font-bold text-[16px] tracking-tight ${
                            txn.type === 'income' ? 'text-accent-green' : 'text-text-primary'
                          }`}
                        >
                          {txn.type === 'income' ? '+' : '-'}
                          {formatCurrency(txn.amount)}
                        </p>
                        <div className="text-xs font-medium text-text-muted hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-bg-secondary rounded-full border border-border/50">
                           {txn.account?.icon && <span>{txn.account.icon}</span>}
                           <span>{txn.account?.name}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(txn.id);
                          }}
                          className="md:opacity-0 group-hover:opacity-100 p-1.5 -mr-2 text-text-muted hover:text-accent-red hover:bg-accent-red/10 rounded-lg transition-all"
                          title="Delete transaction"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}


        {/* Quick Add FAB */}
        <button onClick={openModal} className="fab">
          +
        </button>
      </div>

      {/* Add Transaction Modal */}
      <Modal isOpen={showModal} onClose={closeModal} title="Add Transaction">
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
