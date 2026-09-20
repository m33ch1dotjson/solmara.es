-- A client gets a face and a billing address.
--
-- The billing columns are not decoration: the invoice editor currently asks a
-- colleague to retype a company name, a NIF and a postal code that the office
-- already knows, every time. Now they are on the client and the invoice copies them
-- like it copies the name — and, as always, onto the invoice rather than through it.
--
-- Nothing here is required. A client with only a name and an email is exactly as
-- valid as before, and the screens leave out what is empty instead of printing a
-- dash next to a label.

ALTER TABLE app.client ADD COLUMN IF NOT EXISTS avatar_key text;--> statement-breakpoint
ALTER TABLE app.client ADD COLUMN IF NOT EXISTS company_name text;--> statement-breakpoint
ALTER TABLE app.client ADD COLUMN IF NOT EXISTS postal_code text;--> statement-breakpoint
ALTER TABLE app.client ADD COLUMN IF NOT EXISTS city text;--> statement-breakpoint
ALTER TABLE app.client ADD COLUMN IF NOT EXISTS province text;--> statement-breakpoint
ALTER TABLE app.client ADD COLUMN IF NOT EXISTS country text;--> statement-breakpoint
-- NIE or NIF. One column: which of the two it is depends on the person, not on us.
ALTER TABLE app.client ADD COLUMN IF NOT EXISTS tax_id text;--> statement-breakpoint
ALTER TABLE app.client ADD COLUMN IF NOT EXISTS vat_number text;--> statement-breakpoint

-- ------------------------------------------------- how a colleague likes to look

-- Grid or list, per colleague. On staff_user rather than on the workspace: two
-- people looking at the same list may honestly want different things, and one of
-- them overruling the other every session is how a preference becomes an
-- annoyance. 'GRID' is what somebody who has never chosen sees.
ALTER TABLE app.staff_user
  ADD COLUMN IF NOT EXISTS clients_view text NOT NULL DEFAULT 'GRID';--> statement-breakpoint
