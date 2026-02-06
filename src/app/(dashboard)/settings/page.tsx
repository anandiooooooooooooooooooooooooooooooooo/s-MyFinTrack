'use client';

import { Header } from '@/components/layout';
import { Modal } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { defaultCategoryColors, formatCurrency, formatNumber, parseFormattedNumber } from '@/lib/utils';
import type { Category, CategoryType } from '@/types';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const iconOptions = ['🍔', '🚗', '🛍️', '💡', '🎬', '💊', '📚', '📦', '💰', '💻', '📈', '💵', '🏠', '✈️', '🎮', '☕'];
const colorOptions = Object.values(defaultCategoryColors);

export default function SettingsPage() {
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Category form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<CategoryType>('expense');
  const [formIcon, setFormIcon] = useState('📦');
  const [formColor, setFormColor] = useState('#6b7280');
  const [formBudgetLimit, setFormBudgetLimit] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    getUser();
    fetchCategories();
  }, []);

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    setCategories(data || []);
  };

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleSeedCategories = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const defaultCategories = [
      { name: 'Food & Dining', type: 'expense', icon: '🍔', color: '#ef4444', user_id: user.id },
      { name: 'Transportation', type: 'expense', icon: '🚗', color: '#f97316', user_id: user.id },
      { name: 'Shopping', type: 'expense', icon: '🛍️', color: '#eab308', user_id: user.id },
      { name: 'Bills & Utilities', type: 'expense', icon: '💡', color: '#22c55e', user_id: user.id },
      { name: 'Entertainment', type: 'expense', icon: '🎬', color: '#06b6d4', user_id: user.id },
      { name: 'Healthcare', type: 'expense', icon: '💊', color: '#3b82f6', user_id: user.id },
      { name: 'Education', type: 'expense', icon: '📚', color: '#8b5cf6', user_id: user.id },
      { name: 'Other', type: 'expense', icon: '📦', color: '#6b7280', user_id: user.id },
      { name: 'Salary', type: 'income', icon: '💰', color: '#10b981', user_id: user.id },
      { name: 'Freelance', type: 'income', icon: '💻', color: '#14b8a6', user_id: user.id },
      { name: 'Investment', type: 'income', icon: '📈', color: '#6366f1', user_id: user.id },
      { name: 'Other Income', type: 'income', icon: '💵', color: '#84cc16', user_id: user.id },
    ];

    const { error } = await supabase.from('categories').insert(defaultCategories);

    if (error) {
      alert('Error: ' + error.message);
    } else {
      alert('Default categories added successfully!');
      fetchCategories();
    }
  };

  const openModal = () => {
    setShowCategoryModal(true);
  };

  const closeModal = () => {
    setShowCategoryModal(false);
    resetForm();
  };

  const resetForm = () => {
    setFormName('');
    setFormType('expense');
    setFormIcon('📦');
    setFormColor('#6b7280');
    setFormBudgetLimit('');
    setFormError('');
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value) {
      setFormBudgetLimit(formatNumber(parseInt(value)));
    } else {
      setFormBudgetLimit('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    if (!formName.trim()) {
      setFormError('Category name is required');
      setFormLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setFormError('Not authenticated');
      setFormLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from('categories').insert({
      name: formName.trim(),
      type: formType,
      icon: formIcon,
      color: formColor,
      budget_limit: formBudgetLimit ? parseFormattedNumber(formBudgetLimit) : null,
      user_id: user.id,
    });

    if (insertError) {
      setFormError(insertError.message);
      setFormLoading(false);
      return;
    }

    setFormLoading(false);
    closeModal();
    fetchCategories();
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete this category? Transactions using this category will become uncategorized.')) {
      return;
    }

    await supabase.from('categories').delete().eq('id', id);
    setCategories(categories.filter((c) => c.id !== id));
  };

  const filteredCategories = categories.filter((cat) => {
    if (categoryFilter === 'all') return true;
    return cat.type === categoryFilter;
  });

  return (
    <>
      <Header title="Settings" />

      <div className="p-6 max-w-4xl space-y-6 animate-fade-in">
        {/* Account Info */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Account</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-text-secondary">Email</label>
              <p className="font-medium">{user?.email || 'Loading...'}</p>
            </div>
          </div>
        </div>

        {/* Categories Management */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Categories</h3>
            <button onClick={openModal} className="btn btn-primary text-sm">
              + Add Category
            </button>
          </div>

          {/* Category Filters */}
          <div className="flex gap-2 mb-4">
            {(['all', 'expense', 'income'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setCategoryFilter(type)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  categoryFilter === type
                    ? 'bg-accent-blue text-white'
                    : 'bg-bg-secondary text-text-secondary hover:bg-bg-hover'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          {/* Categories Grid */}
          {filteredCategories.length === 0 ? (
            <div className="text-center py-8 text-text-secondary">
              <p className="mb-3">No categories found</p>
              <button onClick={handleSeedCategories} className="btn btn-ghost text-sm">
                📦 Add Default Categories
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                      style={{ backgroundColor: `${cat.color}20` }}
                    >
                      {cat.icon}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{cat.name}</p>
                      <span className={`text-xs ${cat.type === 'income' ? 'text-accent-green' : 'text-accent-red'}`}>
                        {cat.type.toUpperCase()}
                        {cat.budget_limit && ` • ${formatCurrency(cat.budget_limit)}/mo`}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent-red transition-all text-sm"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={handleSeedCategories}
              className="btn btn-ghost w-full justify-start"
            >
              📦 Add Default Categories
            </button>
            <p className="text-xs text-text-muted px-4">
              Adds common expense and income categories to get you started
            </p>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card border-accent-red/20">
          <h3 className="text-lg font-semibold mb-4 text-accent-red">Danger Zone</h3>
          <button
            onClick={handleLogout}
            disabled={loading}
            className="btn btn-danger"
          >
            {loading ? 'Logging out...' : 'Logout'}
          </button>
        </div>

        {/* About */}
        <div className="text-center text-text-muted text-sm">
          <p>FinTrack - Personal Finance Tracker</p>
          <p>Built with Next.js + Supabase</p>
        </div>
      </div>

      {/* Add Category Modal */}
      <Modal isOpen={showCategoryModal} onClose={closeModal} title="Add Category">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Toggle */}
          <div className="flex rounded-lg overflow-hidden border border-border">
            {(['expense', 'income'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFormType(t)}
                className={`flex-1 py-2.5 font-medium transition-all ${
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

          {/* Icon Selector */}
          <div>
            <label className="label">Icon</label>
            <div className="flex gap-1.5 flex-wrap">
              {iconOptions.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setFormIcon(i)}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
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

          {/* Color Selector */}
          <div>
            <label className="label">Color</label>
            <div className="flex gap-2 flex-wrap">
              {colorOptions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFormColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${
                    formColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-bg-card' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Category Name */}
          <div>
            <label className="label">Category Name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="input"
              placeholder="e.g., Food & Dining"
              required
            />
          </div>

          {/* Budget Limit (only for expense) */}
          {formType === 'expense' && (
            <div>
              <label className="label">Monthly Budget (optional)</label>
              <input
                type="text"
                value={formBudgetLimit}
                onChange={handleBudgetChange}
                className="input"
                placeholder="e.g., 2,000,000"
              />
            </div>
          )}

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
            <button type="submit" disabled={formLoading} className="btn btn-primary flex-1">
              {formLoading ? 'Saving...' : 'Add Category'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
