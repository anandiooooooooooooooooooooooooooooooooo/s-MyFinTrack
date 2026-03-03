"use client";

import { SkeletonCard } from "@/components/ui/Skeleton";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
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
} from "recharts";

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

interface StatisticsOverviewRpc {
  income: number | string;
  expense: number | string;
  total_balance: number | string;
  expense_by_category: Array<{
    name: string;
    amount: number | string;
    color: string;
    icon: string;
  }>;
  monthly_trend: Array<{
    month: string;
    income: number | string;
    expense: number | string;
  }>;
}

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function StatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [totalBalance, setTotalBalance] = useState(0);
  const [monthlyStats, setMonthlyStats] = useState({ income: 0, expense: 0 });
  const [expenseByCategory, setExpenseByCategory] = useState<CategoryStat[]>(
    [],
  );
  const [monthlyData, setMonthlyData] = useState<MonthlyStat[]>([]);

  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  const supabase = useMemo(() => createClient(), []);

  const parseNumber = (value: number | string | undefined) =>
    typeof value === "number" ? value : Number(value ?? 0);

  useEffect(() => {
    const run = async () => {
      setLoading(true);

      const { data, error } = await supabase.rpc("get_statistics_overview", {
        p_month: filterMonth + 1,
        p_year: filterYear,
        p_trend_months: 6,
      });

      if (error || !data) {
        setMonthlyStats({ income: 0, expense: 0 });
        setExpenseByCategory([]);
        setMonthlyData([]);
        setTotalBalance(0);
        setLoading(false);
        return;
      }

      const payload = data as StatisticsOverviewRpc;

      setMonthlyStats({
        income: parseNumber(payload.income),
        expense: parseNumber(payload.expense),
      });

      setExpenseByCategory(
        (payload.expense_by_category || []).map((item) => ({
          name: item.name,
          amount: parseNumber(item.amount),
          color: item.color,
          icon: item.icon,
        })),
      );

      setMonthlyData(
        (payload.monthly_trend || []).map((item) => ({
          month: item.month,
          income: parseNumber(item.income),
          expense: parseNumber(item.expense),
        })),
      );

      setTotalBalance(parseNumber(payload.total_balance));

      setLoading(false);
    };

    void run();
  }, [filterMonth, filterYear, supabase]);

  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i,
  );

  return (
    <div className="page-bg min-h-screen pb-24 md:pb-8">
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold">Statistics</h1>
        </div>

        <div className="flex gap-3">
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(Number(e.target.value))}
            className="input flex-1 text-sm"
          >
            {months.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(Number(e.target.value))}
            className="input flex-1 text-sm"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <>
            <div className="stat-card">
              <p className="text-text-secondary text-xs mb-1">Total Balance</p>
              <p
                className={`text-2xl font-bold ${totalBalance >= 0 ? "text-accent-green" : "text-accent-red"}`}
              >
                {formatCurrency(totalBalance)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="stat-card stat-card-income">
                <p className="text-text-secondary text-xs mb-1">Income</p>
                <p className="text-lg font-bold text-accent-green">
                  +{formatCurrency(monthlyStats.income)}
                </p>
              </div>
              <div className="stat-card stat-card-expense">
                <p className="text-text-secondary text-xs mb-1">Expense</p>
                <p className="text-lg font-bold text-accent-red">
                  -{formatCurrency(monthlyStats.expense)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="chart-container">
                <h3 className="font-semibold mb-3">By Category</h3>
                {expenseByCategory.length === 0 ? (
                  <p className="text-text-secondary text-center py-8">
                    No data
                  </p>
                ) : (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expenseByCategory}
                          dataKey="amount"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          label={({ name, percent }) =>
                            `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                          }
                          labelLine={false}
                        >
                          {expenseByCategory.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: number | undefined) =>
                            formatCurrency(v ?? 0)
                          }
                          contentStyle={{
                            backgroundColor: "#1c1c26",
                            border: "1px solid #2a2a38",
                            borderRadius: "8px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
              <div className="card">
                <h3 className="font-semibold mb-3">Monthly Trend</h3>
                {monthlyData.length === 0 ? (
                  <p className="text-text-secondary text-center py-8">
                    No data
                  </p>
                ) : (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData}>
                        <XAxis
                          dataKey="month"
                          tick={{ fill: "#9ca3af", fontSize: 10 }}
                        />
                        <YAxis
                          tick={{ fill: "#9ca3af", fontSize: 10 }}
                          tickFormatter={(v) => `${v / 1000000}M`}
                        />
                        <Tooltip
                          formatter={(v: number | undefined) =>
                            formatCurrency(v ?? 0)
                          }
                          contentStyle={{
                            backgroundColor: "#1c1c26",
                            border: "1px solid #2a2a38",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey="income"
                          name="Income"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="expense"
                          name="Expense"
                          fill="#ef4444"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold mb-3">Expense Breakdown</h3>
              {expenseByCategory.length === 0 ? (
                <p className="text-text-secondary text-center py-4">No data</p>
              ) : (
                <div className="space-y-3">
                  {expenseByCategory.map((cat) => {
                    const pct =
                      monthlyStats.expense > 0
                        ? (cat.amount / monthlyStats.expense) * 100
                        : 0;
                    return (
                      <div key={cat.name} className="flex items-center gap-3">
                        <span className="text-xl">{cat.icon}</span>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span>{cat.name}</span>
                            <span>{formatCurrency(cat.amount)}</span>
                          </div>
                          <div className="h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: cat.color,
                              }}
                            />
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
    </div>
  );
}
