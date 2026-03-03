CREATE OR REPLACE FUNCTION public.get_account_balances()
RETURNS TABLE (
  id UUID,
  name TEXT,
  type TEXT,
  initial_balance BIGINT,
  icon TEXT,
  created_at TIMESTAMPTZ,
  user_id UUID,
  balance BIGINT
)
LANGUAGE SQL
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.name,
    a.type,
    a.initial_balance,
    a.icon,
    a.created_at,
    a.user_id,
    (a.initial_balance + COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0))::BIGINT AS balance
  FROM public.accounts a
  LEFT JOIN public.transactions t
    ON t.account_id = a.id
    AND t.user_id = a.user_id
  WHERE a.user_id = auth.uid()
  GROUP BY a.id, a.name, a.type, a.initial_balance, a.icon, a.created_at, a.user_id
  ORDER BY a.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_account_balances() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_statistics_overview(
  p_month INTEGER,
  p_year INTEGER,
  p_trend_months INTEGER DEFAULT 6
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_start_date DATE;
  v_end_date DATE;
  v_trend_start DATE;
  v_income BIGINT := 0;
  v_expense BIGINT := 0;
  v_total_balance BIGINT := 0;
  v_expense_by_category JSONB := '[]'::JSONB;
  v_monthly_trend JSONB := '[]'::JSONB;
BEGIN
  IF p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION 'Invalid month %. Expected 1..12', p_month USING ERRCODE = '22023';
  END IF;

  IF p_trend_months < 1 THEN
    p_trend_months := 1;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'income', 0,
      'expense', 0,
      'total_balance', 0,
      'expense_by_category', '[]'::JSONB,
      'monthly_trend', '[]'::JSONB
    );
  END IF;

  v_start_date := make_date(p_year, p_month, 1);
  v_end_date := (v_start_date + INTERVAL '1 month - 1 day')::DATE;
  v_trend_start := (v_start_date - make_interval(months => p_trend_months - 1))::DATE;

  SELECT
    COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0)::BIGINT,
    COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0)::BIGINT
  INTO v_income, v_expense
  FROM public.transactions t
  WHERE t.user_id = v_user_id
    AND t.date BETWEEN v_start_date AND v_end_date;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'name', category_name,
        'amount', amount,
        'color', color,
        'icon', icon
      )
      ORDER BY amount DESC
    ),
    '[]'::JSONB
  )
  INTO v_expense_by_category
  FROM (
    SELECT
      COALESCE(c.name, 'Uncategorized') AS category_name,
      COALESCE(c.color, '#6b7280') AS color,
      COALESCE(c.icon, '📦') AS icon,
      SUM(t.amount)::BIGINT AS amount
    FROM public.transactions t
    LEFT JOIN public.categories c ON c.id = t.category_id
    WHERE t.user_id = v_user_id
      AND t.type = 'expense'
      AND t.date BETWEEN v_start_date AND v_end_date
    GROUP BY COALESCE(c.name, 'Uncategorized'), COALESCE(c.color, '#6b7280'), COALESCE(c.icon, '📦')
  ) category_totals;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'month', to_char(months.month_start, 'Mon YYYY'),
        'income', COALESCE(trend.income, 0)::BIGINT,
        'expense', COALESCE(trend.expense, 0)::BIGINT
      )
      ORDER BY months.month_start
    ),
    '[]'::JSONB
  )
  INTO v_monthly_trend
  FROM (
    SELECT generate_series(
      date_trunc('month', v_trend_start)::DATE,
      date_trunc('month', v_start_date)::DATE,
      INTERVAL '1 month'
    )::DATE AS month_start
  ) months
  LEFT JOIN (
    SELECT
      date_trunc('month', t.date)::DATE AS month_start,
      SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END)::BIGINT AS income,
      SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END)::BIGINT AS expense
    FROM public.transactions t
    WHERE t.user_id = v_user_id
      AND t.date >= v_trend_start
      AND t.date < (v_start_date + INTERVAL '1 month')::DATE
    GROUP BY date_trunc('month', t.date)::DATE
  ) trend USING (month_start);

  SELECT
    COALESCE(SUM(a.initial_balance), 0)::BIGINT + COALESCE(SUM(acc_movements.net), 0)::BIGINT
  INTO v_total_balance
  FROM public.accounts a
  LEFT JOIN (
    SELECT
      t.account_id,
      SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END)::BIGINT AS net
    FROM public.transactions t
    WHERE t.user_id = v_user_id
    GROUP BY t.account_id
  ) acc_movements ON acc_movements.account_id = a.id
  WHERE a.user_id = v_user_id;

  RETURN jsonb_build_object(
    'income', v_income,
    'expense', v_expense,
    'total_balance', COALESCE(v_total_balance, 0),
    'expense_by_category', v_expense_by_category,
    'monthly_trend', v_monthly_trend
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_statistics_overview(INTEGER, INTEGER, INTEGER) TO authenticated;
