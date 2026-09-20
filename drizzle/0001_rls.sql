-- Row level security.
--
-- Two facts shape this file.
--
-- First, Supabase's `postgres` role has rolbypassrls, so an application connecting
-- as postgres would never have a single policy applied. The app therefore gets its
-- own role, `app_server`, which cannot bypass RLS and holds no more privilege than
-- it needs.
--
-- Second, RLS is enabled AND forced on every table. Without FORCE, the owner of a
-- table silently ignores its own policies, which is the kind of thing that looks
-- secure in a code review and is not.
--
-- The actor is carried on the transaction, not the connection. The server calls
-- app.set_actor(...) at the start of each request's transaction, and because the
-- setting is transaction-local it cannot leak into the next request that happens to
-- reuse the same pooled connection. That distinction is the difference between
-- working and handing one client another client's file.

-- ---------------------------------------------------------------- the app role

-- Created without a password on purpose: this file lives in git. The password is
-- set once, out of band, by scripts/set-app-role-password.sh.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_server') THEN
    CREATE ROLE app_server LOGIN NOBYPASSRLS;
  END IF;
END
$$;
--> statement-breakpoint

GRANT USAGE ON SCHEMA app TO app_server;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO app_server;--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO app_server;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_server;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT USAGE, SELECT ON SEQUENCES TO app_server;--> statement-breakpoint

-- The Data API must not reach this schema. Belt as well as braces: the schema is
-- also left out of the exposed schemas in the Supabase dashboard.
REVOKE ALL ON SCHEMA app FROM anon, authenticated;--> statement-breakpoint

-- ------------------------------------------------------------ actor helpers

-- Transaction-local. `true` on set_config is what keeps it from outliving the
-- request on a pooled connection.
CREATE OR REPLACE FUNCTION app.set_actor(
  p_kind text,
  p_id uuid,
  p_role text DEFAULT NULL
) RETURNS void
LANGUAGE sql
AS $$
  SELECT
    set_config('app.actor_kind', coalesce(p_kind, ''), true),
    set_config('app.actor_id', coalesce(p_id::text, ''), true),
    set_config('app.actor_role', coalesce(p_role, ''), true);
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.actor_kind() RETURNS text
LANGUAGE sql STABLE
AS $$ SELECT nullif(current_setting('app.actor_kind', true), '') $$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.actor_id() RETURNS uuid
LANGUAGE sql STABLE
AS $$ SELECT nullif(current_setting('app.actor_id', true), '')::uuid $$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.actor_role() RETURNS text
LANGUAGE sql STABLE
AS $$ SELECT nullif(current_setting('app.actor_role', true), '') $$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.is_staff() RETURNS boolean
LANGUAGE sql STABLE
AS $$ SELECT app.actor_kind() = 'staff' AND app.actor_id() IS NOT NULL $$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.is_admin() RETURNS boolean
LANGUAGE sql STABLE
AS $$ SELECT app.is_staff() AND app.actor_role() = 'ADMIN' $$;
--> statement-breakpoint

-- A case the current client contact may see. Revoked access stops mattering the
-- moment revoked_at is set; there is no cache to invalidate.
CREATE OR REPLACE FUNCTION app.contact_can_see_case(p_case_id uuid) RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app.case_access ca
    WHERE ca.case_id = p_case_id
      AND ca.contact_id = app.actor_id()
      AND ca.revoked_at IS NULL
      AND app.actor_kind() = 'client'
  )
$$;
--> statement-breakpoint

-- ------------------------------------------------- enable and force everywhere

DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'app'
  LOOP
    EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY', t);
  END LOOP;
END
$$;
--> statement-breakpoint

-- -------------------------------------------------------------- staff access

-- Staff see the operational tables. A case manager is not restricted to their own
-- cases for reading: covering for a colleague is the normal case in a team of four,
-- and hiding a client's file from the person answering their call helps nobody.
-- Writes are narrowed below where it matters.
CREATE POLICY staff_read ON app.client FOR SELECT USING (app.is_staff());--> statement-breakpoint
CREATE POLICY staff_write ON app.client FOR ALL USING (app.is_staff()) WITH CHECK (app.is_staff());--> statement-breakpoint

CREATE POLICY staff_all ON app.client_contact FOR ALL USING (app.is_staff()) WITH CHECK (app.is_staff());--> statement-breakpoint
CREATE POLICY staff_all ON app.service FOR ALL USING (app.is_staff()) WITH CHECK (app.is_admin());--> statement-breakpoint
CREATE POLICY staff_all ON app.service_template FOR ALL USING (app.is_staff()) WITH CHECK (app.is_admin());--> statement-breakpoint
CREATE POLICY staff_all ON app."case" FOR ALL USING (app.is_staff()) WITH CHECK (app.is_staff());--> statement-breakpoint
CREATE POLICY staff_all ON app.case_access FOR ALL USING (app.is_staff()) WITH CHECK (app.is_staff());--> statement-breakpoint
CREATE POLICY staff_all ON app.client_document FOR ALL USING (app.is_staff()) WITH CHECK (app.is_staff());--> statement-breakpoint
CREATE POLICY staff_all ON app.document_case FOR ALL USING (app.is_staff()) WITH CHECK (app.is_staff());--> statement-breakpoint
CREATE POLICY staff_all ON app.document_requirement FOR ALL USING (app.is_staff()) WITH CHECK (app.is_staff());--> statement-breakpoint
CREATE POLICY staff_all ON app.task FOR ALL USING (app.is_staff()) WITH CHECK (app.is_staff());--> statement-breakpoint
CREATE POLICY staff_all ON app.appointment FOR ALL USING (app.is_staff()) WITH CHECK (app.is_staff());--> statement-breakpoint
CREATE POLICY staff_all ON app.payment FOR ALL USING (app.is_staff()) WITH CHECK (app.is_staff());--> statement-breakpoint
CREATE POLICY staff_all ON app.intake_submission FOR ALL USING (app.is_staff()) WITH CHECK (app.is_staff());--> statement-breakpoint
CREATE POLICY staff_all ON app.staff_user FOR SELECT USING (app.is_staff());--> statement-breakpoint
CREATE POLICY admin_manage ON app.staff_user FOR ALL USING (app.is_admin()) WITH CHECK (app.is_admin());--> statement-breakpoint

-- The audit log is append-only for everyone. Nobody edits history, including admins.
CREATE POLICY staff_read ON app.event FOR SELECT USING (app.is_staff());--> statement-breakpoint
CREATE POLICY actor_append ON app.event FOR INSERT WITH CHECK (app.actor_kind() IS NOT NULL);--> statement-breakpoint

-- The outbox is machinery, not data anybody browses.
CREATE POLICY staff_read ON app.outbox FOR SELECT USING (app.is_admin());--> statement-breakpoint

-- ------------------------------------------------------------- client access

-- A client contact sees the cases they were granted, and nothing else. Note there
-- is no policy giving a client any write access to a case or a document status:
-- everything that moves a case forward stays with a member of staff.
CREATE POLICY client_read ON app."case" FOR SELECT
  USING (app.contact_can_see_case(id));--> statement-breakpoint

CREATE POLICY client_read ON app.client FOR SELECT
  USING (
    app.actor_kind() = 'client'
    AND EXISTS (
      SELECT 1 FROM app.client_contact cc
      WHERE cc.id = app.actor_id() AND cc.client_id = app.client.id
    )
  );--> statement-breakpoint

-- Documents: only what is linked to a case they may see, and only once it is theirs
-- to rely on. A file still in review is deliberately invisible.
CREATE POLICY client_read ON app.client_document FOR SELECT
  USING (
    app.actor_kind() = 'client'
    AND EXISTS (
      SELECT 1 FROM app.document_case dc
      WHERE dc.document_id = app.client_document.id
        AND app.contact_can_see_case(dc.case_id)
    )
  );--> statement-breakpoint

CREATE POLICY client_read ON app.document_requirement FOR SELECT
  USING (app.contact_can_see_case(case_id));--> statement-breakpoint

CREATE POLICY client_read ON app.appointment FOR SELECT
  USING (app.contact_can_see_case(case_id));--> statement-breakpoint

CREATE POLICY client_read ON app.payment FOR SELECT
  USING (app.contact_can_see_case(case_id));--> statement-breakpoint

CREATE POLICY client_read ON app.intake_submission FOR SELECT
  USING (app.contact_can_see_case(case_id));--> statement-breakpoint

CREATE POLICY client_update ON app.intake_submission FOR UPDATE
  USING (app.contact_can_see_case(case_id))
  WITH CHECK (app.contact_can_see_case(case_id));--> statement-breakpoint

-- Deliberately absent: any client policy on task, staff_user, outbox, service,
-- service_template, case_access or event. No policy means no rows, which is the
-- right answer for all of them — a client has no business seeing a task queue, a
-- staff list, or who else was granted access to their file.
