UPDATE accounts SET initial_balance = 0 WHERE initial_balance IS NULL;
UPDATE accounts SET created_at = NOW() WHERE created_at IS NULL;
UPDATE transactions SET created_at = NOW() WHERE created_at IS NULL;
UPDATE transfers SET created_at = NOW() WHERE created_at IS NULL;

ALTER TABLE accounts
  ALTER COLUMN initial_balance SET DEFAULT 0,
  ALTER COLUMN initial_balance SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN created_at SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'categories'
      AND column_name = 'created_at'
  ) THEN
    EXECUTE 'ALTER TABLE categories
      ALTER COLUMN created_at SET DEFAULT NOW(),
      ALTER COLUMN created_at SET NOT NULL';
  END IF;
END $$;

ALTER TABLE transactions
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE transfers
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN created_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'accounts_name_not_blank'
  ) THEN
    ALTER TABLE accounts
      ADD CONSTRAINT accounts_name_not_blank CHECK (length(trim(name)) > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'categories_name_not_blank'
  ) THEN
    ALTER TABLE categories
      ADD CONSTRAINT categories_name_not_blank CHECK (length(trim(name)) > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transfers_different_accounts'
  ) THEN
    ALTER TABLE transfers
      ADD CONSTRAINT transfers_different_accounts CHECK (from_account_id <> to_account_id);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_accounts_user_name
  ON accounts (user_id, lower(name));

CREATE UNIQUE INDEX IF NOT EXISTS ux_categories_user_type_name
  ON categories (user_id, type, lower(name));

CREATE INDEX IF NOT EXISTS idx_transactions_user_account_date
  ON transactions (user_id, account_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_categories_user_type_name
  ON categories (user_id, type, name);

CREATE INDEX IF NOT EXISTS idx_transfers_user_date
  ON transfers (user_id, date DESC);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'accounts' AND constraint_name = 'accounts_user_id_fkey'
  ) THEN
    ALTER TABLE accounts DROP CONSTRAINT accounts_user_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'categories' AND constraint_name = 'categories_user_id_fkey'
  ) THEN
    ALTER TABLE categories DROP CONSTRAINT categories_user_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'transactions' AND constraint_name = 'transactions_user_id_fkey'
  ) THEN
    ALTER TABLE transactions DROP CONSTRAINT transactions_user_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'transfers' AND constraint_name = 'transfers_user_id_fkey'
  ) THEN
    ALTER TABLE transfers DROP CONSTRAINT transfers_user_id_fkey;
  END IF;
END $$;

ALTER TABLE accounts
  ADD CONSTRAINT accounts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE categories
  ADD CONSTRAINT categories_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE transfers
  ADD CONSTRAINT transfers_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
