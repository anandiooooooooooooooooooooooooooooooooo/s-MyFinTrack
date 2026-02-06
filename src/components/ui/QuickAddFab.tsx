'use client';

import { Modal } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { formatNumber, getToday, parseFormattedNumber } from '@/lib/utils';
import type { Account, Category, TransactionType } from '@/types';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function QuickAddFab() {
  const [showModal, setShowModal] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  // Form state
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getToday());
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (showModal) {
      fetchData();
    }
  }, [showModal]);

  const fetchData = async () => {
    const [{ data: cats }, { data: accs }] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('accounts').select('*').order('name'),
    ]);
    setCategories(cats || []);
    setAccounts(accs || []);
    if (accs && accs.length > 0 && !accountId) setAccountId(accs[0].id);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setAmount(val ? formatNumber(parseInt(val)) : '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!amount || parseFormattedNumber(amount) <= 0) {
      setError('Enter an amount');
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Not logged in');
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from('transactions').insert({
      type,
      amount: parseFormattedNumber(amount),
      date,
      category_id: categoryId || null,
      account_id: accountId || null,
      description: description.trim() || null,
      user_id: user.id,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setShowModal(false);
    resetForm();
    router.refresh();
  };

  const resetForm = () => {
    setType('expense');
    setAmount('');
    setDate(getToday());
    setCategoryId('');
    setDescription('');
    setError('');
  };

  const filteredCategories = categories.filter((c) => c.type === type);

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setShowModal(true)}
        className="fab"
        aria-label="Add transaction"
      >
        +
      </button>

      {/* Transaction Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Transaction">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Toggle */}
          <div className="flex rounded-lg overflow-hidden border border-border">
            {(['income', 'expense'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setType(t); setCategoryId(''); }}
                className={`flex-1 py-3 font-medium transition-all ${
                  type === t
                    ? t === 'expense' ? 'bg-accent-red text-white' : 'bg-accent-green text-white'
                    : 'bg-bg-secondary text-text-secondary'
                }`}
              >
                {t === 'expense' ? '💸 Expense' : '💰 Income'}
              </button>
            ))}
          </div>

          {/* 1. Amount */}
          <div>
            <label className="label">Amount</label>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={handleAmountChange}
              className="input text-xl font-bold"
              placeholder="0"
              autoFocus
            />
          </div>

          {/* 2. Notes */}
          <div>
            <label className="label">Notes</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input"
              placeholder="What's this for?"
              required
            />
          </div>

          {/* 3. Date */}
          <div>
            <label className="label">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input"
            />
          </div>

          {/* 4. Account */}
          <div>
            <label className="label">Account</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="input"
            >
              <option value="">Select account</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.icon} {acc.name}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Category */}
          <div>
            <label className="label">Category</label>
            {filteredCategories.length === 0 ? (
              <p className="text-text-muted text-sm">No categories available</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {filteredCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg text-center transition-all ${
                      categoryId === cat.id
                        ? 'bg-accent-blue/20 border-2 border-accent-blue'
                        : 'bg-bg-secondary border border-border hover:bg-bg-hover'
                    }`}
                  >
                    <span className="text-xl">{cat.icon}</span>
                    <span className="text-xs truncate w-full">{cat.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-accent-red text-sm text-center">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost flex-1">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`btn flex-1 ${type === 'expense' ? 'btn-danger' : 'btn-success'}`}
            >
              {loading ? 'Saving...' : 'Add'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
