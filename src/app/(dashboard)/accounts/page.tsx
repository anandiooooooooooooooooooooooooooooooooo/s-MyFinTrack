'use client';

import { Header } from '@/components/layout';
import { Modal } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { accountTypeIcons, formatCurrency, formatNumber, getAccountTypeLabel, parseFormattedNumber } from '@/lib/utils';
import type { Account, AccountBalance, AccountType } from '@/types';
import { useEffect, useState } from 'react';

const accountTypes: { value: AccountType; label: string }[] = [
  { value: 'bank', label: 'Bank Account' },
  { value: 'ewallet', label: 'E-Wallet' },
  { value: 'cash', label: 'Cash' },
];

const iconOptions = ['🏦', '💳', '💵', '📱', '💰', '🏧', '💎', '🪙'];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const supabase = createClient();

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<AccountType>('bank');
  const [formInitialBalance, setFormInitialBalance] = useState('');
  const [formIcon, setFormIcon] = useState('🏦');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    const { data: accountsData } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: true });

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

    setLoading(false);
  };

  const openModal = () => {
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setFormName('');
    setFormType('bank');
    setFormInitialBalance('');
    setFormIcon('🏦');
    setFormError('');
  };

  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value) {
      setFormInitialBalance(formatNumber(parseInt(value)));
    } else {
      setFormInitialBalance('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    if (!formName.trim()) {
      setFormError('Account name is required');
      setFormLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setFormError('Not authenticated');
      setFormLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from('accounts').insert({
      name: formName.trim(),
      type: formType,
      initial_balance: parseFormattedNumber(formInitialBalance) || 0,
      icon: formIcon,
      user_id: user.id,
    });

    if (insertError) {
      setFormError(insertError.message);
      setFormLoading(false);
      return;
    }

    setFormLoading(false);
    closeModal();
    fetchAccounts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this account? All transactions in this account will also be deleted.')) {
      return;
    }

    await supabase.from('accounts').delete().eq('id', id);
    setAccounts(accounts.filter((a) => a.account.id !== id));
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Header title="Accounts" />

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Total Balance Card */}
        <div className="card bg-gradient-to-br from-accent-blue/10 to-accent-purple/10 border-accent-blue/20">
          <p className="text-text-secondary text-sm mb-1">Total Balance</p>
          <p className={`text-3xl font-bold ${totalBalance >= 0 ? 'text-text-primary' : 'text-accent-red'}`}>
            {formatCurrency(totalBalance)}
          </p>
        </div>

        {/* Add Account Button */}
        <div className="flex justify-end">
          <button onClick={openModal} className="btn btn-primary">
            + Add Account
          </button>
        </div>

        {/* Accounts List */}
        {accounts.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-text-secondary mb-4">No accounts yet</p>
            <button onClick={openModal} className="btn btn-primary">
              Add your first account
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map(({ account, balance }) => (
              <div
                key={account.id}
                className="card card-hover group relative"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-bg-secondary flex items-center justify-center text-2xl">
                      {account.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-text-primary">{account.name}</h3>
                      <p className="text-sm text-text-secondary">
                        {accountTypeIcons[account.type]} {getAccountTypeLabel(account.type)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(account.id)}
                    className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent-red transition-all"
                  >
                    🗑️
                  </button>
                </div>
                <div>
                  <p className="text-sm text-text-secondary mb-1">Current Balance</p>
                  <p className={`text-2xl font-bold ${balance >= 0 ? 'text-text-primary' : 'text-accent-red'}`}>
                    {formatCurrency(balance)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Account Modal */}
      <Modal isOpen={showModal} onClose={closeModal} title="Add Account">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Icon Selector */}
          <div>
            <label className="label">Icon</label>
            <div className="flex gap-2 flex-wrap">
              {iconOptions.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setFormIcon(i)}
                  className={`w-12 h-12 rounded-lg text-2xl flex items-center justify-center transition-all ${
                    formIcon === i
                      ? 'bg-accent-blue/20 border-2 border-accent-blue'
                      : 'bg-bg-secondary border border-border hover:bg-bg-hover'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          {/* Account Name */}
          <div>
            <label className="label">Account Name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="input"
              placeholder="e.g., BCA, GoPay, Cash"
              required
            />
          </div>

          {/* Account Type */}
          <div>
            <label className="label">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {accountTypes.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setFormType(t.value)}
                  className={`p-3 rounded-lg text-center transition-all ${
                    formType === t.value
                      ? 'bg-accent-blue/20 border-2 border-accent-blue'
                      : 'bg-bg-secondary border border-border hover:bg-bg-hover'
                  }`}
                >
                  <div className="text-xl mb-1">{accountTypeIcons[t.value]}</div>
                  <div className="text-sm">{t.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Initial Balance */}
          <div>
            <label className="label">Initial Balance (IDR)</label>
            <input
              type="text"
              value={formInitialBalance}
              onChange={handleBalanceChange}
              className="input"
              placeholder="0"
            />
            <p className="text-xs text-text-muted mt-1">
              Current balance when you start tracking
            </p>
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
              className="btn btn-primary flex-1"
            >
              {formLoading ? 'Saving...' : 'Add Account'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
