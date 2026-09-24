-- Tasks, for real this time.
--
-- The tab has been a placeholder since the navigation was built, with a page that
-- said so. This is what it was waiting for.
--
-- Two decisions worth writing down:
--
-- 1. A DONE TASK IS NOT A DELETED TASK. `done` is a boolean on the row, not a
--    disappearance: the list keeps showing it, struck through, because "what did we
--    already do for this client" is a question people ask. Deleting is a separate,
--    deliberate act.
--
-- 2. THE BODY IS HTML, like a Process Guide and a property listing, written with the
--    same editor and cleaned by the same sanitiser. Shorter in practice, but there is
--    no reason for a third way of storing a paragraph.

CREATE TABLE IF NOT EXISTS app.task (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  title text NOT NULL,
  /** The detail behind the one line. HTML; see lib/sanitize.ts. */
  body text NOT NULL DEFAULT '',

  done boolean NOT NULL DEFAULT false,
  done_at timestamptz,
  done_by uuid REFERENCES app.staff_user(id) ON DELETE SET NULL,

  due_date date,
  -- Who is doing it. ON DELETE SET NULL: a colleague leaving does not delete work.
  assigned_to uuid REFERENCES app.staff_user(id) ON DELETE SET NULL,
  -- What it is about, when it is about somebody. Optional; plenty of work is not.
  client_id uuid REFERENCES app.client(id) ON DELETE SET NULL,

  created_by uuid REFERENCES app.staff_user(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

-- The list is read in this order almost every time: unfinished first, then by
-- deadline, then by age.
CREATE INDEX IF NOT EXISTS task_open_idx ON app.task (done, due_date, created_at);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS task_client_idx ON app.task (client_id);--> statement-breakpoint

ALTER TABLE app.task ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE app.task FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- Staff only, which already excludes EXTERNAL. No client policy: a client has no
-- route to this table and no reason to see the office's own to-do list.
CREATE POLICY staff_all ON app.task
  FOR ALL USING (app.is_staff()) WITH CHECK (app.is_staff());--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON app.task TO app_server;--> statement-breakpoint
