-- SOPs are internal, like properties.
--
-- Removing the screen is not enough: as long as the policy exists the database still
-- permits a client to read them, and the next person to write a query would find
-- rows they should never see. The rule belongs where it is enforced.
--
-- The `published` column goes with it. It only ever meant "visible to clients", and
-- a column that implies something untrue is worse than no column at all.

DROP POLICY IF EXISTS client_read ON app.sop;--> statement-breakpoint

DROP INDEX IF EXISTS app.sop_published_idx;--> statement-breakpoint
ALTER TABLE app.sop DROP COLUMN IF EXISTS published;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS sop_order_idx ON app.sop (sort_order, created_at DESC);--> statement-breakpoint
