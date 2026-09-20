-- Invoicing, v1.
--
-- The record is the invoice. The PDF is a rendering of it, and can be thrown away
-- and made again from the same row — which is why the snapshot columns below exist.
--
-- Three ideas carry this schema:
--
-- 1. MONEY IS INTEGER CENTS. Never a float, and never numeric-into-JavaScript where
--    it becomes a float on the way. Quantity and the VAT rate are the only decimals,
--    and every amount derived from them is rounded to a cent in one place
--    (lib/money.ts) that the editor, the database and the PDF all call.
--
-- 2. A FINALISED INVOICE IS A HISTORICAL DOCUMENT. It carries its own copy of who
--    sent it and who received it. Solmavera moving office in 2027 does not rewrite
--    an invoice from 2026, and neither does a client correcting their address.
--
-- 3. THE OFFICIAL NUMBER IS HANDED OUT BY THE DATABASE, ONCE, AT FINALISATION.
--    Drafts have no number: a deleted draft must not leave a hole in the sequence,
--    and a hole is the thing an accountant asks about.

-- ----------------------------------------------------------------- the counter

-- One row per year. The number is taken with a single atomic statement:
--
--   INSERT INTO app.invoice_counter (year, next_number) VALUES ($1, 2)
--   ON CONFLICT (year) DO UPDATE SET next_number = app.invoice_counter.next_number + 1
--   RETURNING next_number - 1
--
-- Two colleagues finalising at the same moment serialise on the row lock the upsert
-- takes, so they get 7 and 8 rather than both getting 7. A sequence would also be
-- atomic but cannot restart per year without a second mechanism.
CREATE TABLE IF NOT EXISTS app.invoice_counter (
  year integer PRIMARY KEY,
  next_number integer NOT NULL DEFAULT 1
);--> statement-breakpoint

ALTER TABLE app.invoice_counter ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE app.invoice_counter FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY staff_all ON app.invoice_counter
  FOR ALL USING (app.is_staff()) WITH CHECK (app.is_staff());--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON app.invoice_counter TO app_server;--> statement-breakpoint

-- ------------------------------------------------------------------ the status

-- OVERDUE is deliberately absent: it is "finalised or sent, not paid, past the due
-- date", which is a question about today and not a fact about the invoice. Writing
-- it into the row would need a nightly job to keep it true.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
    CREATE TYPE app.invoice_status AS ENUM (
      'DRAFT',
      'FINALIZED',
      'SENT',
      'PAID',
      'CANCELLED'
    );
  END IF;
END
$$;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE app.payment_method AS ENUM ('TRANSFER', 'CASH', 'CARD', 'OTHER');
  END IF;
END
$$;--> statement-breakpoint

-- ----------------------------------------------------------------- the invoice

CREATE TABLE IF NOT EXISTS app.invoice (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Null until finalisation. Unique when present, so the database itself refuses a
  -- duplicate number even if the counter were somehow bypassed.
  number text UNIQUE,
  number_year integer,
  number_sequence integer,

  -- The client this is for. ON DELETE SET NULL, never cascade: an invoice outlives
  -- the client record, and the snapshot below is what it actually prints.
  client_id uuid REFERENCES app.client(id) ON DELETE SET NULL,

  status app.invoice_status NOT NULL DEFAULT 'DRAFT',
  currency text NOT NULL DEFAULT 'EUR',
  language app.locale NOT NULL DEFAULT 'nl',

  issue_date date NOT NULL DEFAULT current_date,
  due_date date NOT NULL DEFAULT current_date,

  -- Who it is for, as of this invoice. Filled from the client when one is picked,
  -- editable per invoice, frozen the moment it is finalised.
  customer_name text NOT NULL DEFAULT '',
  customer_company_name text,
  customer_email text,
  customer_tax_id text,
  customer_vat_number text,
  customer_address text,
  customer_postal_code text,
  customer_city text,
  customer_province text,
  customer_country text,

  -- Who sent it, as of this invoice. Copied from the workspace at finalisation.
  issuer_legal_name text,
  issuer_display_name text,
  issuer_tax_id text,
  issuer_email text,
  issuer_phone text,
  issuer_website text,
  issuer_address text,
  issuer_postal_code text,
  issuer_city text,
  issuer_province text,
  issuer_country text,
  issuer_iban text,
  issuer_bic text,
  issuer_bank_name text,
  issuer_account_holder text,
  -- The storage key of the logo as it was then, so replacing the logo later does
  -- not restyle invoices that have already gone out.
  issuer_logo_key text,

  -- Cents. Recomputed on the server from the lines before every write; the browser's
  -- arithmetic is never stored.
  subtotal_cents bigint NOT NULL DEFAULT 0,
  tax_total_cents bigint NOT NULL DEFAULT 0,
  total_cents bigint NOT NULL DEFAULT 0,

  notes text,
  payment_instructions text,

  pdf_storage_key text,

  created_by uuid REFERENCES app.staff_user(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  finalized_by uuid REFERENCES app.staff_user(id) ON DELETE SET NULL,
  finalized_at timestamptz,
  sent_by uuid REFERENCES app.staff_user(id) ON DELETE SET NULL,
  sent_at timestamptz,
  paid_by uuid REFERENCES app.staff_user(id) ON DELETE SET NULL,
  paid_at timestamptz,
  payment_method app.payment_method,
  payment_reference text,
  cancelled_by uuid REFERENCES app.staff_user(id) ON DELETE SET NULL,
  cancelled_at timestamptz,

  CONSTRAINT invoice_number_together CHECK (
    (number IS NULL AND number_year IS NULL AND number_sequence IS NULL)
    OR (number IS NOT NULL AND number_year IS NOT NULL AND number_sequence IS NOT NULL)
  ),
  CONSTRAINT invoice_finalized_has_number CHECK (
    status = 'DRAFT' OR number IS NOT NULL
  )
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS invoice_client_idx ON app.invoice (client_id, issue_date DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS invoice_status_idx ON app.invoice (status, due_date);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS invoice_number_seq_idx
  ON app.invoice (number_year, number_sequence) WHERE number IS NOT NULL;--> statement-breakpoint

ALTER TABLE app.invoice ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE app.invoice FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- Staff only. app.is_staff() already excludes EXTERNAL, so that role sees no
-- invoices without a line being written here about it.
--
-- There is deliberately no client policy yet. The column to hang one on exists
-- (client_id), so "a client sees their own paid invoices" is a policy and a screen
-- later, not a migration.
CREATE POLICY staff_all ON app.invoice
  FOR ALL USING (app.is_staff()) WITH CHECK (app.is_staff());--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON app.invoice TO app_server;--> statement-breakpoint

-- ------------------------------------------------------------------- the lines

CREATE TABLE IF NOT EXISTS app.invoice_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES app.invoice(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,

  description text NOT NULL DEFAULT '',
  -- Three decimals: hours and part-quantities, without inviting nonsense.
  quantity numeric(12, 3) NOT NULL DEFAULT 1,
  unit_price_cents bigint NOT NULL DEFAULT 0,
  -- A percentage, not a fraction: 21.00 means 21%.
  vat_rate numeric(5, 2) NOT NULL DEFAULT 21,

  subtotal_cents bigint NOT NULL DEFAULT 0,
  tax_cents bigint NOT NULL DEFAULT 0,
  total_cents bigint NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS invoice_item_invoice_idx
  ON app.invoice_item (invoice_id, position);--> statement-breakpoint

ALTER TABLE app.invoice_item ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE app.invoice_item FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY staff_all ON app.invoice_item
  FOR ALL USING (app.is_staff()) WITH CHECK (app.is_staff());--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON app.invoice_item TO app_server;--> statement-breakpoint

-- ------------------------------------------------- the workspace's own details

-- Extending the settings that already exist rather than starting a second
-- configuration system next to them.
ALTER TABLE app.workspace_setting ADD COLUMN IF NOT EXISTS tax_id text;--> statement-breakpoint
ALTER TABLE app.workspace_setting ADD COLUMN IF NOT EXISTS address text;--> statement-breakpoint
ALTER TABLE app.workspace_setting ADD COLUMN IF NOT EXISTS postal_code text;--> statement-breakpoint
ALTER TABLE app.workspace_setting ADD COLUMN IF NOT EXISTS city text;--> statement-breakpoint
ALTER TABLE app.workspace_setting ADD COLUMN IF NOT EXISTS province text;--> statement-breakpoint
ALTER TABLE app.workspace_setting ADD COLUMN IF NOT EXISTS country text;--> statement-breakpoint
ALTER TABLE app.workspace_setting ADD COLUMN IF NOT EXISTS legal_name text;--> statement-breakpoint

ALTER TABLE app.workspace_setting ADD COLUMN IF NOT EXISTS account_holder text;--> statement-breakpoint
ALTER TABLE app.workspace_setting ADD COLUMN IF NOT EXISTS iban text;--> statement-breakpoint
ALTER TABLE app.workspace_setting ADD COLUMN IF NOT EXISTS bic text;--> statement-breakpoint
ALTER TABLE app.workspace_setting ADD COLUMN IF NOT EXISTS bank_name text;--> statement-breakpoint
ALTER TABLE app.workspace_setting
  ADD COLUMN IF NOT EXISTS payment_instructions text;--> statement-breakpoint

ALTER TABLE app.workspace_setting
  ADD COLUMN IF NOT EXISTS invoice_prefix text NOT NULL DEFAULT 'SOL';--> statement-breakpoint
ALTER TABLE app.workspace_setting
  ADD COLUMN IF NOT EXISTS payment_terms_days integer NOT NULL DEFAULT 14;--> statement-breakpoint
ALTER TABLE app.workspace_setting
  ADD COLUMN IF NOT EXISTS invoice_language app.locale NOT NULL DEFAULT 'nl';--> statement-breakpoint
ALTER TABLE app.workspace_setting ADD COLUMN IF NOT EXISTS invoice_notes text;--> statement-breakpoint
-- Its own logo, separate from the portal logo: an invoice is a document that leaves
-- the building, and the mark on it may well want to be a different file.
ALTER TABLE app.workspace_setting ADD COLUMN IF NOT EXISTS invoice_logo_key text;--> statement-breakpoint

-- The legal name is known; everything else stays empty until somebody types the
-- real thing. No invented address, and above all no invented bank details.
UPDATE app.workspace_setting
SET legal_name = COALESCE(legal_name, 'Solmavera S.L.')
WHERE id;--> statement-breakpoint
