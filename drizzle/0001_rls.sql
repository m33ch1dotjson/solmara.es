-- Row level security.
--
-- Two facts shape this file, both learned the hard way in the previous iteration.
--
-- First, Supabase's `postgres` role has rolbypassrls, so an application connecting
-- as postgres would never have a single policy applied — RLS would be decoration.
-- The app therefore gets `app_server`, which cannot bypass it.
--
-- Second, the helper functions must be SECURITY DEFINER. A plain function runs with
-- the caller's privileges, so a helper that reads client_contact to work out who the
-- caller is would itself be filtered by the policies it is meant to inform, and
-- would answer "nobody" every time. That fails closed, which is the right direction,
-- but it means a client sees none of their own file.
--
-- The actor is carried on the transaction, never the connection: set_config with
-- `true` is transaction-local, so a pooled connection cannot hand the next request
-- the previous visitor's identity.

-- ---------------------------------------------------------------- the app role

-- No password here: this file is in git. scripts/set-app-role-password.sh sets it.
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

REVOKE ALL ON SCHEMA app FROM anon, authenticated;--> statement-breakpoint

-- ------------------------------------------------------------ actor helpers

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

CREATE OR REPLACE FUNCTION app.is_staff() RETURNS boolean
LANGUAGE sql STABLE
AS $$ SELECT app.actor_kind() = 'staff' AND app.actor_id() IS NOT NULL $$;
--> statement-breakpoint

-- SECURITY DEFINER with a pinned search_path: a definer function with a mutable
-- search_path is how privilege escalation gets in.
CREATE OR REPLACE FUNCTION app.contact_client_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = app, pg_temp
AS $$
  SELECT cc.client_id
  FROM app.client_contact cc
  WHERE cc.id = app.actor_id()
    AND app.actor_kind() = 'client'
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION app.contact_client_id() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.contact_client_id() TO app_server;--> statement-breakpoint

-- ------------------------------------------------- enable and force everywhere

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'app'
  LOOP
    EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY', t);
  END LOOP;
END
$$;
--> statement-breakpoint

-- -------------------------------------------------------------- staff access

CREATE POLICY staff_all ON app.client         FOR ALL USING (app.is_staff()) WITH CHECK (app.is_staff());--> statement-breakpoint
CREATE POLICY staff_all ON app.client_contact FOR ALL USING (app.is_staff()) WITH CHECK (app.is_staff());--> statement-breakpoint
CREATE POLICY staff_all ON app.client_invite  FOR ALL USING (app.is_staff()) WITH CHECK (app.is_staff());--> statement-breakpoint
CREATE POLICY staff_all ON app.client_document FOR ALL USING (app.is_staff()) WITH CHECK (app.is_staff());--> statement-breakpoint
CREATE POLICY staff_all ON app.sop            FOR ALL USING (app.is_staff()) WITH CHECK (app.is_staff());--> statement-breakpoint
CREATE POLICY staff_all ON app.property       FOR ALL USING (app.is_staff()) WITH CHECK (app.is_staff());--> statement-breakpoint
CREATE POLICY staff_all ON app.property_photo FOR ALL USING (app.is_staff()) WITH CHECK (app.is_staff());--> statement-breakpoint
CREATE POLICY staff_read ON app.staff_user    FOR SELECT USING (app.is_staff());--> statement-breakpoint

-- History is append-only for everyone, including admins. Nobody edits the log.
CREATE POLICY staff_read ON app.event FOR SELECT USING (app.is_staff());--> statement-breakpoint
CREATE POLICY actor_append ON app.event FOR INSERT WITH CHECK (app.actor_kind() IS NOT NULL);--> statement-breakpoint

-- ------------------------------------------------------------- client access

-- Deliberately absent: any client policy on app.client. RLS filters rows, not
-- columns, so "you may read your own row" would also hand over internal_notes.
-- The profile is served by app.client_self() below, which decides column by column.

CREATE POLICY client_read ON app.client_document FOR SELECT
  USING (app.actor_kind() = 'client' AND client_id = app.contact_client_id());--> statement-breakpoint

-- Uploading is the one thing a client may change: the file and when it arrived.
-- Status stays with staff — a client cannot approve their own passport.
CREATE POLICY client_upload ON app.client_document FOR UPDATE
  USING (app.actor_kind() = 'client' AND client_id = app.contact_client_id())
  WITH CHECK (app.actor_kind() = 'client' AND client_id = app.contact_client_id());--> statement-breakpoint

-- Published SOPs are the one thing every signed-in client may read. Drafts are not.
CREATE POLICY client_read ON app.sop FOR SELECT
  USING (app.actor_kind() = 'client' AND published);--> statement-breakpoint

-- Properties have no client policy at all, on either table. They are internal, and
-- no policy means no rows.

-- ------------------------------------------------------- the client's profile

CREATE OR REPLACE FUNCTION app.client_self()
RETURNS TABLE (
  id uuid,
  code text,
  name text,
  email text,
  phone text,
  preferred_locale app.locale,
  date_of_birth date,
  nationality text,
  passport_number text,
  passport_expiry date,
  address_home_country text,
  address_spain text,
  details_completed_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = app, pg_temp
AS $$
  SELECT c.id, c.code, c.name, c.email, c.phone, c.preferred_locale,
         c.date_of_birth, c.nationality, c.passport_number, c.passport_expiry,
         c.address_home_country, c.address_spain, c.details_completed_at
  FROM app.client c
  WHERE c.id = app.contact_client_id()
    AND app.actor_kind() = 'client';
$$;
--> statement-breakpoint

-- Absent from that list on purpose: internal_notes, status, created_by. They
-- describe how we work on this person, not who they are.
REVOKE ALL ON FUNCTION app.client_self() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.client_self() TO app_server;--> statement-breakpoint

-- The client filling in their own details. Column list fixed here rather than in
-- application code, so a stray field in a form body cannot reach the table.
CREATE OR REPLACE FUNCTION app.client_update_self(
  p_name text,
  p_phone text,
  p_date_of_birth date,
  p_nationality text,
  p_passport_number text,
  p_passport_expiry date,
  p_address_home_country text,
  p_address_spain text
) RETURNS void
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = app, pg_temp
AS $$
  UPDATE app.client SET
    name = coalesce(nullif(p_name, ''), name),
    phone = p_phone,
    date_of_birth = p_date_of_birth,
    nationality = p_nationality,
    passport_number = p_passport_number,
    passport_expiry = p_passport_expiry,
    address_home_country = p_address_home_country,
    address_spain = p_address_spain,
    details_completed_at = coalesce(details_completed_at, now()),
    status = CASE WHEN status = 'INVITED' THEN 'ACTIVE'::app.client_status ELSE status END,
    updated_at = now()
  WHERE id = app.contact_client_id()
    AND app.actor_kind() = 'client';
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION app.client_update_self(text,text,date,text,text,date,text,text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.client_update_self(text,text,date,text,text,date,text,text) TO app_server;--> statement-breakpoint
