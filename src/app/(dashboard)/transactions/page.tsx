'use client';

import { Header } from '@/components/layout';
import { Modal } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate, formatNumber, getToday, parseFormattedNumber } from '@/lib/utils';
import type { Account, Category, Transaction, TransactionType } from '@/types';
import { useEffect, useState } from 'react';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
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
  }, []);

  const fetchTransactions = async () => {
    const { data } = await supabase
      .from('transactions')
      .select('*, category:categories(*), account:accounts(*)')
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
      <Header title="Transactions" />

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Filters */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {(['all', 'income', 'expense'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === type
                    ? 'bg-accent-blue text-white'
                    : 'bg-bg-card text-text-secondary hover:bg-bg-hover'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
          <button onClick={openModal} className="btn btn-primary">
            + Add Transaction
          </button>
        </div>

        {/* Transaction List */}
        {Object.keys(groupedTransactions).length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-text-secondary mb-4">No transactions found</p>
            <button onClick={openModal} className="btn btn-primary">
              Add your first transaction
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedTransactions).map(([date, txns]) => (
              <div key={date}>
                <h3 className="text-sm font-medium text-text-secondary mb-3">
                  {formatDate(date, 'EEEE, dd MMMM yyyy')}
                </h3>
                <div className="card p-0 overflow-hidden">
                  {txns.map((txn, idx) => (
                    <div
                      key={txn.id}
                      className={`flex items-center justify-between p-4 hover:bg-bg-hover transition-colors ${
                        idx !== txns.length - 1 ? 'border-b border-border' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                          style={{ backgroundColor: `${txn.category?.color}20` }}
                        >
                          {txn.category?.icon || '📦'}
                        </div>
                        <div>
                          <p className="font-medium">{txn.category?.name || 'Uncategorized'}</p>
                          <p className="text-sm text-text-secondary">
                            {txn.account?.name}
                            {txn.description && ` • ${txn.description}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p
                          className={`font-semibold ${
                            txn.type === 'income' ? 'text-accent-green' : 'text-accent-red'
                          }`}
                        >
                          {txn.type === 'income' ? '+' : '-'}
                          {formatCurrency(txn.amount)}
                        </p>
                        <button
                          onClick={() => handleDelete(txn.id)}
                          className="text-text-muted hover:text-accent-red transition-colors"
                        >
                          🗑️
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
