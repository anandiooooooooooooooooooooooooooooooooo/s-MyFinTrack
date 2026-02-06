'use client';

import { Modal } from '@/components/ui';
import { SkeletonTransactionItem } from '@/components/ui/Skeleton';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate, formatNumber, getToday, parseFormattedNumber } from '@/lib/utils';
import type { Account, Category, Transaction, TransactionType } from '@/types';
import { useEffect, useState } from 'react';

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function TransactionsPage() {
  // Transactions State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Date filters
  const [filterDay, setFilterDay] = useState<number | null>(null);
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth());
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());

  // Form State
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Form Fields
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
    fetchTransactions();
  }, [filterDay, filterMonth, filterYear]);

  const getDateRange = () => {
    if (filterDay !== null) {
      const date = `${filterYear}-${String(filterMonth + 1).padStart(2, '0')}-${String(filterDay).padStart(2, '0')}`;
      return { start: date, end: date };
    }
    const startDate = new Date(filterYear, filterMonth, 1);
    const endDate = new Date(filterYear, filterMonth + 1, 0);
    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
    };
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
    if (accs && accs.length > 0) setFormAccountId(accs[0].id);
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
    setFormType('expense');
    setFormAmount('');
    setFormDate(getToday());
    setFormCategoryId('');
    setFormDescription('');
    setFormError('');
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setFormAmount(val ? formatNumber(parseInt(val)) : '');
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
    fetchTransactions();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transaction?')) return;
    await supabase.from('transactions').delete().eq('id', id);
    setTransactions(transactions.filter((t) => t.id !== id));
  };

  const filteredTransactions = transactions.filter((txn) => {
    if (filter !== 'all' && txn.type !== filter) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        txn.category?.name?.toLowerCase().includes(query) ||
        txn.description?.toLowerCase().includes(query) ||
        txn.account?.name?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const groupedTransactions = filteredTransactions.reduce((groups, txn) => {
    const date = txn.date;
    if (!groups[date]) groups[date] = [];
    groups[date].push(txn);
    return groups;
  }, {} as Record<string, Transaction[]>);

  const filteredCategories = categories.filter((c) => c.type === formType);

  return (
    <>
      <div className="p-4 md:p-6 space-y-4 animate-fade-in relative pb-24">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-bg-primary/95 backdrop-blur-md -mx-4 px-4 py-3 md:mx-0 md:px-0 md:bg-transparent border-b border-border/50 md:border-none space-y-3">
          <h1 className="text-xl font-bold">Transactions</h1>

          {/* Date Filters */}
          <div className="flex flex-col md:flex-row gap-2 md:items-center justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
              <select value={filterMonth} onChange={(e) => setFilterMonth(parseInt(e.target.value))} className="input w-auto text-sm min-w-[100px]">
                {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <select value={filterYear} onChange={(e) => setFilterYear(parseInt(e.target.value))} className="input w-auto text-sm">
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <select value={filterDay ?? ''} onChange={(e) => setFilterDay(e.target.value ? parseInt(e.target.value) : null)} className="input w-auto text-sm">
                <option value="">All Days</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Type Filter & Search */}
            <div className="flex gap-2 w-full md:w-auto">
              <div className="flex p-1 bg-bg-secondary rounded-lg border border-border/50 shrink-0">
                {(['all', 'income', 'expense'] as const).map((f) => (
                  <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${filter === f ? 'bg-bg-card text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>
                    {f === 'all' ? 'All' : f === 'income' ? '💰' : '💸'}
                  </button>
                ))}
              </div>
              <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input flex-1 text-sm" />
            </div>
          </div>
        </div>

        {/* Transaction List */}
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <SkeletonTransactionItem key={i} />)}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-2">📭</p>
              <p className="text-text-secondary">No transactions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedTransactions).sort(([a], [b]) => b.localeCompare(a)).map(([date, txns]) => (
                <div key={date}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{formatDate(date, 'EEE, MMM d')}</p>
                    <p className="text-xs text-text-muted">{txns.length} items</p>
                  </div>
                  <div className="space-y-2">
                    {txns.map((txn) => (
                      <div key={txn.id} className="card p-3 flex items-center justify-between group hover:border-border/80 transition-all cursor-pointer" onClick={() => openEditModal(txn)}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-bg-secondary flex items-center justify-center text-lg" style={{ backgroundColor: txn.category?.color ? `${txn.category.color}20` : undefined }}>
                            {txn.category?.icon || (txn.type === 'income' ? '💰' : '💸')}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{txn.category?.name || (txn.type === 'income' ? 'Income' : 'Expense')}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {txn.description && <p className="text-[11px] text-text-muted font-medium bg-bg-secondary px-1.5 py-0.5 rounded-md max-w-[100px] md:max-w-none truncate border border-border/30">{txn.description}</p>}
                              <span className="text-[10px] text-text-muted md:hidden">• {txn.account?.name}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <p className={`font-bold text-[15px] tracking-tight ${txn.type === 'income' ? 'text-accent-green' : 'text-text-primary'}`}>
                            {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
                          </p>
                          <div className="text-[11px] font-medium text-text-muted hidden md:flex items-center gap-1 px-2 py-0.5 bg-bg-secondary rounded-full border border-border/50">
                            {txn.account?.icon && <span>{txn.account.icon}</span>}
                            <span>{txn.account?.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={(e) => { e.stopPropagation(); openEditModal(txn); }} className="md:opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-all" title="Edit">✏️</button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(txn.id); }} className="md:opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-accent-red hover:bg-accent-red/10 rounded-lg transition-all" title="Delete">✕</button>
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

        {/* FAB */}
        <button onClick={openModal} className="fab">+</button>
      </div>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={closeModal} title={editingId ? 'Edit Transaction' : 'Add Transaction'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Toggle */}
          <div className="flex rounded-lg overflow-hidden border border-border">
            {(['income', 'expense'] as const).map((t) => (
              <button key={t} type="button" onClick={() => { setFormType(t); setFormCategoryId(''); }} className={`flex-1 py-3 font-medium transition-all ${formType === t ? (t === 'expense' ? 'bg-accent-red text-white' : 'bg-accent-green text-white') : 'bg-bg-secondary text-text-secondary'}`}>
                {t === 'expense' ? '💸 Expense' : '💰 Income'}
              </button>
            ))}
          </div>

          {/* 1. Amount */}
          <div>
            <label className="label">Amount (IDR)</label>
            <input type="text" value={formAmount} onChange={handleAmountChange} className="input text-2xl font-bold text-center" placeholder="0" required />
          </div>

          {/* 2. Notes */}
          <div>
            <label className="label">Notes</label>
            <input type="text" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} className="input" placeholder="What was this for?" required />
          </div>

          {/* 3. Date */}
          <div>
            <label className="label">Date</label>
            <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="input" required />
          </div>

          {/* 4. Account */}
          <div>
            <label className="label">Account</label>
            <select value={formAccountId} onChange={(e) => setFormAccountId(e.target.value)} className="input" required>
              <option value="">Select account</option>
              {accounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.icon} {acc.name}</option>)}
            </select>
          </div>

          {/* 5. Category */}
          <div>
            <label className="label">Category</label>
            <select value={formCategoryId} onChange={(e) => setFormCategoryId(e.target.value)} className="input">
              <option value="">Select category</option>
              {filteredCategories.map((cat) => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>)}
            </select>
          </div>

          {formError && <div className="p-3 bg-accent-red/10 border border-accent-red/20 rounded-lg text-accent-red text-sm">{formError}</div>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={formLoading} className={`btn flex-1 ${formType === 'expense' ? 'bg-accent-red hover:bg-red-600' : 'btn-success'} text-white`}>
              {formLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
