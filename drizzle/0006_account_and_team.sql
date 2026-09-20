-- Account, workspace and team.
--
-- Three things: a colleague's own preferences move into the database instead of
-- living only in a cookie on one machine, the workspace gets a single row of
-- settings an admin can edit, and the role EXTERNAL exists.
--
-- EXTERNAL is the careful part. See app.is_staff() at the bottom.

-- ------------------------------------------------------------------- the role

-- Not `ALTER TYPE ... ADD VALUE`. PostgreSQL refuses that one from a multi-command
-- string, which is exactly how a migration arrives, and the whole file rolls back
-- with an error the migration tool then swallows. Replacing the type outright is
-- ordinary DDL and behaves inside a transaction like everything else.
ALTER TYPE app.staff_role RENAME TO staff_role_old;--> statement-breakpoint
CREATE TYPE app.staff_role AS ENUM ('ADMIN', 'STAFF', 'EXTERNAL');--> statement-breakpoint
ALTER TABLE app.staff_user
  ALTER COLUMN role DROP DEFAULT,
  ALTER COLUMN role TYPE app.staff_role USING role::text::app.staff_role,
  ALTER COLUMN role SET DEFAULT 'STAFF';--> statement-breakpoint
DROP TYPE app.staff_role_old;--> statement-breakpoint

-- ----------------------------------------------------------------- app.is_admin

CREATE OR REPLACE FUNCTION app.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = app, pg_temp AS $$
  SELECT app.actor_kind() = 'staff'
     AND EXISTS (
       SELECT 1 FROM app.staff_user
       WHERE id = app.actor_id() AND active AND role = 'ADMIN'
     );
$$;--> statement-breakpoint

GRANT EXECUTE ON FUNCTION app.is_admin() TO app_server;--> statement-breakpoint

-- --------------------------------------------------- a colleague's own settings

ALTER TABLE app.staff_user ADD COLUMN IF NOT EXISTS avatar_key text;--> statement-breakpoint

-- Their own language, so a colleague who signs in on a borrowed laptop is not
-- suddenly working in Spanish. The cookie still decides per browser; this is what
-- the cookie is set from at sign-in.
ALTER TABLE app.staff_user ADD COLUMN IF NOT EXISTS preferred_locale app.locale;--> statement-breakpoint

-- 'light' | 'dark' | 'system'. Text rather than an enum: it is a display preference
-- with no foreign keys and no queries filtering on it.
ALTER TABLE app.staff_user ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'light';--> statement-breakpoint

ALTER TABLE app.staff_user
  ADD COLUMN IF NOT EXISTS time_zone text NOT NULL DEFAULT 'Europe/Madrid';--> statement-breakpoint

-- 'LONG' | 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'.
ALTER TABLE app.staff_user
  ADD COLUMN IF NOT EXISTS date_style text NOT NULL DEFAULT 'LONG';--> statement-breakpoint

-- One object rather than six boolean columns: these are a set of switches that will
-- grow, and a new switch should not be a migration. The keys are the event names.
ALTER TABLE app.staff_user ADD COLUMN IF NOT EXISTS notify jsonb NOT NULL DEFAULT '{
  "email": true,
  "clientAdded": true,
  "documentUploaded": true,
  "taskAssigned": true,
  "taskDueSoon": true,
  "clientStatusChanged": false,
  "noteAdded": false
}'::jsonb;--> statement-breakpoint

-- A colleague may read and change their own row. Until now only the resolver could
-- see it at all, which was enough when there was nothing to change.
CREATE POLICY self_update ON app.staff_user FOR UPDATE
  USING (app.actor_kind() = 'staff' AND id = app.actor_id())
  WITH CHECK (app.actor_kind() = 'staff' AND id = app.actor_id());--> statement-breakpoint

-- Only an admin may add a colleague, change a role, or switch somebody off.
CREATE POLICY admin_manage ON app.staff_user FOR INSERT WITH CHECK (app.is_admin());--> statement-breakpoint
CREATE POLICY admin_update ON app.staff_user FOR UPDATE
  USING (app.is_admin()) WITH CHECK (app.is_admin());--> statement-breakpoint
CREATE POLICY admin_delete ON app.staff_user FOR DELETE USING (app.is_admin());--> statement-breakpoint

-- ---------------------------------------------------------- workspace settings

-- One row, ever. The check constraint is what makes that true: a second insert
-- fails rather than quietly creating a second workspace nobody is looking at.
CREATE TABLE IF NOT EXISTS app.workspace_setting (
  id boolean PRIMARY KEY DEFAULT true,
  company_name text,
  company_email text,
  phone text,
  website text,
  logo_key text,
  display_name text,
  default_client_locale app.locale NOT NULL DEFAULT 'en',
  default_country text NOT NULL DEFAULT 'ES',
  default_currency text NOT NULL DEFAULT 'EUR',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_setting_single_row CHECK (id)
);--> statement-breakpoint

INSERT INTO app.workspace_setting (id) VALUES (true) ON CONFLICT DO NOTHING;--> statement-breakpoint

ALTER TABLE app.workspace_setting ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE app.workspace_setting FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- Everyone on the staff side reads it — the portal's own name comes from here —
-- and only an admin writes it.
CREATE POLICY staff_read ON app.workspace_setting FOR SELECT USING (app.is_staff());--> statement-breakpoint
CREATE POLICY admin_write ON app.workspace_setting FOR UPDATE
  USING (app.is_admin()) WITH CHECK (app.is_admin());--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE ON app.workspace_setting TO app_server;--> statement-breakpoint

-- --------------------------------------------------------------- app.is_staff

-- EXTERNAL is deliberately *not* staff.
--
-- Every policy in this database is written in terms of app.is_staff(), so adding a
-- role without touching this function would have handed an external bookkeeper the
-- entire client list on the day the role was created. Per-client assignment is not
-- built yet; until it is, an EXTERNAL user can sign in and sees nothing at all.
-- That is the safe direction to be wrong in.
CREATE OR REPLACE FUNCTION app.is_staff() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = app, pg_temp AS $$
  SELECT app.actor_kind() = 'staff'
     AND EXISTS (
       SELECT 1 FROM app.staff_user
       WHERE id = app.actor_id() AND active AND role <> 'EXTERNAL'
     );
$$;--> statement-breakpoint
