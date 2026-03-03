"use client";

import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import {
  accountTypeIcons,
  defaultCategoryColors,
  formatCurrency,
  formatNumber,
  getAccountTypeLabel,
  parseFormattedNumber,
} from "@/lib/utils";
import type {
  Account,
  AccountBalance,
  AccountType,
  Category,
  CategoryType,
} from "@/types";
import { useCallback, useEffect, useMemo, useState } from "react";

const accountTypes: { value: AccountType; label: string }[] = [
  { value: "bank", label: "Bank Account" },
  { value: "ewallet", label: "E-Wallet" },
  { value: "cash", label: "Cash" },
];

const iconOptions = ["🏦", "💳", "💵", "📱", "💰", "🏧", "💎", "🪙"];
const categoryIconOptions = [
  "🍔",
  "🚗",
  "🛍️",
  "💡",
  "🎬",
  "💊",
  "📚",
  "📦",
  "💰",
  "💻",
  "📈",
  "💵",
  "🏠",
  "✈️",
  "🎮",
  "☕",
];
const colorOptions = Object.values(defaultCategoryColors);

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<AccountType>("bank");
  const [formInitialBalance, setFormInitialBalance] = useState("");
  const [formIcon, setFormIcon] = useState("🏦");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | "income" | "expense"
  >("all");
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [catFormName, setCatFormName] = useState("");
  const [catFormType, setCatFormType] = useState<CategoryType>("expense");
  const [catFormIcon, setCatFormIcon] = useState("📦");
  const [catFormColor, setCatFormColor] = useState("#6b7280");
  const [catFormBudgetLimit, setCatFormBudgetLimit] = useState("");
  const [catFormLoading, setCatFormLoading] = useState(false);
  const [catFormError, setCatFormError] = useState("");

  type AccountBalanceRpcRow = {
    id: string;
    name: string;
    type: AccountType;
    initial_balance: number | string;
    icon: string;
    created_at: string;
    user_id: string;
    balance: number | string;
  };

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("name");
    setCategories(data || []);
  }, [supabase]);

  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      if (categoryFilter === "all") return true;
      return cat.type === categoryFilter;
    });
  }, [categories, categoryFilter]);

  const handleCatBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value) setCatFormBudgetLimit(formatNumber(parseInt(value)));
    else setCatFormBudgetLimit("");
  };

  const openCategoryModal = () => setShowCategoryModal(true);
  const closeCategoryModal = () => {
    setShowCategoryModal(false);
    setCatFormName("");
    setCatFormType("expense");
    setCatFormIcon("📦");
    setCatFormColor("#6b7280");
    setCatFormBudgetLimit("");
    setCatFormError("");
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatFormError("");
    setCatFormLoading(true);

    if (!catFormName.trim()) {
      setCatFormError("Category name is required");
      setCatFormLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setCatFormError("Not authenticated");
      setCatFormLoading(false);
      return;
    }

    const { error } = await supabase.from("categories").insert({
      name: catFormName.trim(),
      type: catFormType,
      icon: catFormIcon,
      color: catFormColor,
      budget_limit: catFormBudgetLimit
        ? parseFormattedNumber(catFormBudgetLimit)
        : null,
      user_id: user.id,
    });

    if (error) {
      setCatFormError(error.message);
      setCatFormLoading(false);
      return;
    }

    setCatFormLoading(false);
    closeCategoryModal();
    fetchCategories();
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    await supabase.from("categories").delete().eq("id", id);
    setCategories(categories.filter((c) => c.id !== id));
  };

  const fetchAccounts = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_account_balances");

    if (error || !data) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    const balances = (data as AccountBalanceRpcRow[]).map((row) => ({
      account: {
        id: row.id,
        name: row.name,
        type: row.type,
        initial_balance: Number(row.initial_balance ?? 0),
        icon: row.icon,
        created_at: row.created_at,
        user_id: row.user_id,
      } as Account,
      balance: Number(row.balance ?? 0),
    }));

    setAccounts(balances);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void Promise.all([fetchAccounts(), fetchCategories()]);
  }, [fetchAccounts, fetchCategories]);

  const openModal = () => {
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setFormName("");
    setFormType("bank");
    setFormInitialBalance("");
    setFormIcon("🏦");
    setFormError("");
  };

  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value) {
      setFormInitialBalance(formatNumber(parseInt(value)));
    } else {
      setFormInitialBalance("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    if (!formName.trim()) {
      setFormError("Account name is required");
      setFormLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setFormError("Not authenticated");
      setFormLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("accounts").insert({
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
    if (
      !confirm(
        "Delete this account? All transactions in this account will also be deleted.",
      )
    ) {
      return;
    }

    await supabase.from("accounts").delete().eq("id", id);
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
      <div className="p-6 space-y-6 animate-fade-in">
        <div className="stat-card bg-linear-to-br from-accent-blue/10 to-accent-purple/10 border-accent-blue/20">
          <p className="text-text-secondary text-sm mb-1">Total Balance</p>
          <p
            className={`text-3xl font-bold ${totalBalance >= 0 ? "text-text-primary" : "text-accent-red"}`}
          >
            {formatCurrency(totalBalance)}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 stagger-in">
          {accounts.map(({ account, balance }) => (
            <div
              key={account.id}
              className="account-card group relative aspect-square flex flex-col items-center justify-center text-center"
            >
              <button
                onClick={() => handleDelete(account.id)}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent-red transition-all"
              >
                🗑️
              </button>

              <div className="w-14 h-14 rounded-full bg-bg-secondary flex items-center justify-center text-3xl mb-3">
                {account.icon}
              </div>

              <h3 className="font-semibold text-text-primary text-sm mb-0.5">
                {account.name}
              </h3>
              <p className="text-xs text-text-muted mb-3">
                {accountTypeIcons[account.type]}{" "}
                {getAccountTypeLabel(account.type)}
              </p>

              <p
                className={`text-lg font-bold ${balance >= 0 ? "text-text-primary" : "text-accent-red"}`}
              >
                {formatCurrency(balance)}
              </p>
            </div>
          ))}

          <button
            onClick={openModal}
            className="aspect-square rounded-2xl border-2 border-dashed border-border/50 bg-transparent flex flex-col items-center justify-center text-center hover:border-accent-blue/50 hover:bg-accent-blue/5 transition-all cursor-pointer group"
          >
            <div className="w-14 h-14 rounded-full bg-bg-secondary/50 flex items-center justify-center text-3xl mb-3 group-hover:bg-accent-blue/10 transition-all">
              ➕
            </div>
            <p className="text-sm font-medium text-text-secondary group-hover:text-accent-blue transition-all">
              Add Account
            </p>
          </button>
        </div>

        <div className="card mt-6">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            🏷️ Categories
          </h3>

          <div className="flex gap-2 mb-4">
            {(["all", "expense", "income"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setCategoryFilter(type)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  categoryFilter === type
                    ? "bg-accent-blue text-white"
                    : "bg-bg-secondary text-text-secondary hover:bg-bg-hover"
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          <button
            onClick={openCategoryModal}
            className="w-full p-3 mb-4 rounded-xl border-2 border-dashed border-border/50 bg-transparent hover:border-accent-blue/50 hover:bg-accent-blue/5 transition-all flex items-center justify-center gap-2 group"
          >
            <span className="text-xl group-hover:scale-110 transition-transform">
              ➕
            </span>
            <span className="text-sm font-medium text-text-secondary group-hover:text-accent-blue transition-all">
              Add Category
            </span>
          </button>

          {filteredCategories.length === 0 ? (
            <div className="text-center py-8 text-text-secondary">
              <p>No categories found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 stagger-in">
              {filteredCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3 bg-bg-secondary/50 rounded-xl group border-l-4 transition-all hover:bg-bg-secondary hover:shadow-lg"
                  style={{ borderLeftColor: cat.color }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-sm"
                      style={{ backgroundColor: `${cat.color}20` }}
                    >
                      {cat.icon}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{cat.name}</p>
                      <span
                        className={`text-xs font-medium ${cat.type === "income" ? "text-accent-green" : "text-accent-red"}`}
                      >
                        {cat.type.toUpperCase()}
                        {cat.budget_limit &&
                          ` • ${formatCurrency(cat.budget_limit)}/mo`}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent-red transition-all text-sm p-2 hover:bg-accent-red/10 rounded-lg"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={showModal} onClose={closeModal} title="Add Account">
        <form onSubmit={handleSubmit} className="space-y-5">
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
                      ? "bg-accent-blue/20 border-2 border-accent-blue"
                      : "bg-bg-secondary border border-border hover:bg-bg-hover"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

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
                      ? "bg-accent-blue/20 border-2 border-accent-blue"
                      : "bg-bg-secondary border border-border hover:bg-bg-hover"
                  }`}
                >
                  <div className="text-xl mb-1">
                    {accountTypeIcons[t.value]}
                  </div>
                  <div className="text-sm">{t.label}</div>
                </button>
              ))}
            </div>
          </div>

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

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={closeModal}
              className="btn btn-ghost flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="btn btn-primary flex-1"
            >
              {formLoading ? "Saving..." : "Add Account"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showCategoryModal}
        onClose={closeCategoryModal}
        title="Add Category"
      >
        <form onSubmit={handleCategorySubmit} className="space-y-4">
          <div className="flex rounded-lg overflow-hidden border border-border">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setCatFormType(t)}
                className={`flex-1 py-2.5 font-medium transition-all ${
                  catFormType === t
                    ? t === "expense"
                      ? "bg-accent-red text-white"
                      : "bg-accent-green text-white"
                    : "bg-bg-secondary text-text-secondary hover:bg-bg-hover"
                }`}
              >
                {t === "expense" ? "💸 Expense" : "💰 Income"}
              </button>
            ))}
          </div>

          <div>
            <label className="label">Icon</label>
            <div className="flex gap-1.5 flex-wrap">
              {categoryIconOptions.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCatFormIcon(i)}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                    catFormIcon === i
                      ? "bg-accent-blue/20 border-2 border-accent-blue"
                      : "bg-bg-secondary border border-border hover:bg-bg-hover"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Color</label>
            <div className="flex gap-2 flex-wrap">
              {colorOptions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCatFormColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${catFormColor === c ? "ring-2 ring-white ring-offset-2 ring-offset-bg-card" : ""}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="label">Category Name</label>
            <input
              type="text"
              value={catFormName}
              onChange={(e) => setCatFormName(e.target.value)}
              className="input"
              placeholder="e.g., Food & Dining"
              required
            />
          </div>

          {catFormType === "expense" && (
            <div>
              <label className="label">Monthly Budget (optional)</label>
              <input
                type="text"
                value={catFormBudgetLimit}
                onChange={handleCatBudgetChange}
                className="input"
                placeholder="e.g., 2,000,000"
              />
            </div>
          )}

          {catFormError && (
            <div className="p-3 bg-accent-red/10 border border-accent-red/20 rounded-lg text-accent-red text-sm">
              {catFormError}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={closeCategoryModal}
              className="btn btn-ghost flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={catFormLoading}
              className="btn btn-primary flex-1"
            >
              {catFormLoading ? "Saving..." : "Add Category"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
