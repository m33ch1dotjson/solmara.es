-- Service Procedures become the Process Guide: an internal handbook, not a list of
-- services. The old name survived only in the table, and a table called `sop` while
-- every screen says something else is how the next person gets confused.
--
-- Nothing is thrown away. The existing rows keep their id, their title and their
-- text; the text moves from `description` into `content` as HTML, which is what the
-- document editor reads and writes from here on.

ALTER TABLE app.sop RENAME TO process_guide;--> statement-breakpoint

-- The policy and the index travel with the table; only their names still say `sop`,
-- which is harmless but confusing, so both are renamed too.
ALTER POLICY staff_all ON app.process_guide RENAME TO staff_all_guides;--> statement-breakpoint
ALTER INDEX IF EXISTS app.sop_order_idx RENAME TO process_guide_order_idx;--> statement-breakpoint

-- ------------------------------------------------------------------ the body

ALTER TABLE app.process_guide ADD COLUMN IF NOT EXISTS content text NOT NULL DEFAULT '';--> statement-breakpoint

-- The old description was plain text typed into a textarea. Escaped, not trusted:
-- if anybody ever typed a < into it, it was a literal < and must stay one.
UPDATE app.process_guide
SET content = '<p>' || replace(
      replace(replace(replace(description, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'),
      E'\n', '<br>'
    ) || '</p>'
WHERE content = '' AND description IS NOT NULL AND description <> '';--> statement-breakpoint

-- One source of truth for the text. The card preview is derived from the content at
-- render time, so a guide cannot drift from its own summary.
ALTER TABLE app.process_guide DROP COLUMN IF EXISTS description;--> statement-breakpoint

-- -------------------------------------------------------------- the category

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'guide_category') THEN
    CREATE TYPE app.guide_category AS ENUM (
      'RESIDENCY',
      'REAL_ESTATE',
      'ADMINISTRATION',
      'TAX_BUSINESS',
      'VEHICLES',
      'INSURANCE',
      'OTHER'
    );
  END IF;
END
$$;--> statement-breakpoint

ALTER TABLE app.process_guide
  ADD COLUMN IF NOT EXISTS category app.guide_category NOT NULL DEFAULT 'OTHER';--> statement-breakpoint

CREATE INDEX IF NOT EXISTS process_guide_category_idx ON app.process_guide (category);--> statement-breakpoint

-- ------------------------------------------------------- files and images

-- Two kinds of file in one table because they are the same object with the same
-- protection: an inline screenshot and a downloadable template differ only in where
-- they appear. Both are served through /admin/process-guide/file/<id>, which checks
-- that you are staff and then hands out a ten-minute signed URL. A storage key is
-- never put in the document body — a signed URL baked into saved HTML would be dead
-- ten minutes later.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'guide_file_kind') THEN
    CREATE TYPE app.guide_file_kind AS ENUM ('IMAGE', 'ATTACHMENT');
  END IF;
END
$$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS app.process_guide_file (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid NOT NULL REFERENCES app.process_guide(id) ON DELETE CASCADE,
  kind app.guide_file_kind NOT NULL DEFAULT 'ATTACHMENT',
  filename text NOT NULL,
  storage_key text NOT NULL,
  mime_type text,
  size_bytes integer,
  uploaded_by uuid REFERENCES app.staff_user(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS process_guide_file_guide_idx
  ON app.process_guide_file (guide_id, created_at);--> statement-breakpoint

ALTER TABLE app.process_guide_file ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE app.process_guide_file FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- Staff only, like the guide itself. No client policy exists, and none should: a
-- client has no route to this table and no reason to.
CREATE POLICY staff_all_guide_files ON app.process_guide_file
  FOR ALL USING (app.is_staff()) WITH CHECK (app.is_staff());--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON app.process_guide_file TO app_server;--> statement-breakpoint
