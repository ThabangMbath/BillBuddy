/*
# Create BillBuddy tables (bills, payments, user_settings)

1. New Tables
- `bills`: Stores each bill/subscription a user tracks.
  - id (uuid, primary key)
  - user_id (uuid, not null, defaults to authenticated user, references auth.users)
  - name (text, not null) — the bill or subscription name
  - amount (numeric, not null) — the cost amount
  - category (text) — e.g. Utilities, Streaming, Insurance
  - frequency (text, not null) — one-time, weekly, monthly, quarterly, yearly
  - payment_date (date, not null) — next payment or renewal date
  - auto_renew (boolean, default false) — whether it auto-renews
  - reminder_enabled (boolean, default false) — whether reminders are on
  - reminder_days (integer, default 3) — days before payment to remind
  - notes (text) — optional notes
  - created_at (timestamptz)
  - updated_at (timestamptz)

- `payments`: Records each payment made against a bill (payment history).
  - id (uuid, primary key)
  - bill_id (uuid, not null, references bills, cascading delete)
  - user_id (uuid, not null, defaults to authenticated user, references auth.users)
  - amount (numeric, not null) — amount paid
  - paid_date (date, not null) — date the payment was made
  - note (text) — optional note
  - created_at (timestamptz)

- `user_settings`: Stores per-user settings like currency preference.
  - id (uuid, primary key)
  - user_id (uuid, unique, not null, defaults to authenticated user, references auth.users)
  - currency (text, not null, default 'ZAR') — ISO currency code
  - created_at (timestamptz)
  - updated_at (timestamptz)

2. Indexes
- Index on bills.user_id for fast per-user queries
- Index on bills.payment_date for upcoming-payment queries
- Index on payments.bill_id for payment history lookups
- Index on payments.user_id for per-user filtering
- Index on user_settings.user_id (unique already, but explicit)

3. Security
- Enable RLS on all three tables.
- bills: owner-scoped CRUD (authenticated users can only access their own bills)
- payments: owner-scoped CRUD (authenticated users can only access payments for their own bills)
- user_settings: owner-scoped CRUD (authenticated users can only access their own settings)
- All owner columns default to auth.uid() so inserts work even when the client omits user_id.
*/

CREATE TABLE IF NOT EXISTS bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric(12,2) NOT NULL,
  category text DEFAULT 'Other',
  frequency text NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('one-time','weekly','monthly','quarterly','yearly')),
  payment_date date NOT NULL,
  auto_renew boolean NOT NULL DEFAULT false,
  reminder_enabled boolean NOT NULL DEFAULT false,
  reminder_days integer NOT NULL DEFAULT 3,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_bills_user_id ON bills(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_payment_date ON bills(payment_date);

DROP POLICY IF EXISTS "select_own_bills" ON bills;
CREATE POLICY "select_own_bills" ON bills FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_bills" ON bills;
CREATE POLICY "insert_own_bills" ON bills FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_bills" ON bills;
CREATE POLICY "update_own_bills" ON bills FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_bills" ON bills;
CREATE POLICY "delete_own_bills" ON bills FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  paid_date date NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_payments_bill_id ON payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_paid_date ON payments(paid_date);

DROP POLICY IF EXISTS "select_own_payments" ON payments;
CREATE POLICY "select_own_payments" ON payments FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_payments" ON payments;
CREATE POLICY "insert_own_payments" ON payments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_payments" ON payments;
CREATE POLICY "update_own_payments" ON payments FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_payments" ON payments;
CREATE POLICY "delete_own_payments" ON payments FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  currency text NOT NULL DEFAULT 'ZAR',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_settings" ON user_settings;
CREATE POLICY "select_own_settings" ON user_settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_settings" ON user_settings;
CREATE POLICY "insert_own_settings" ON user_settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_settings" ON user_settings;
CREATE POLICY "update_own_settings" ON user_settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_settings" ON user_settings;
CREATE POLICY "delete_own_settings" ON user_settings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bills_updated_at ON bills;
CREATE TRIGGER trg_bills_updated_at BEFORE UPDATE ON bills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_user_settings_updated_at ON user_settings;
CREATE TRIGGER trg_user_settings_updated_at BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();