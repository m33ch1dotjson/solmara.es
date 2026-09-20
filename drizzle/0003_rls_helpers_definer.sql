-- Fix: the RLS helper functions must run as their owner, not as the caller.
--
-- app.contact_can_see_case() reads app.case_access to decide whether the current
-- client may see a case. As a plain SQL function it ran with the caller's own
-- privileges, so RLS applied to that read too — and since a client has no policy on
-- case_access (deliberately: no client should browse who else was granted access),
-- the lookup returned nothing and the function answered "no" for every case.
--
-- The result was a client who could see none of their own files. It failed closed,
-- which is the right direction for a mistake to fail, but it was still wrong.
--
-- SECURITY DEFINER makes these run as the owner so they can consult the access
-- table. search_path is pinned on each one: a SECURITY DEFINER function with a
-- mutable search_path is how privilege escalation gets in.

CREATE OR REPLACE FUNCTION app.contact_can_see_case(p_case_id uuid) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app, pg_temp
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

-- Same reasoning: the client policy on app.client needs to resolve the contact to
-- their client, and app.client_contact has no client-facing policy either.
CREATE OR REPLACE FUNCTION app.contact_client_id() RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app, pg_temp
AS $$
  SELECT cc.client_id
  FROM app.client_contact cc
  WHERE cc.id = app.actor_id()
    AND app.actor_kind() = 'client'
$$;
--> statement-breakpoint

-- Only the application role may call them; nothing else should be asking.
REVOKE ALL ON FUNCTION app.contact_can_see_case(uuid) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION app.contact_client_id() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.contact_can_see_case(uuid) TO app_server;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.contact_client_id() TO app_server;--> statement-breakpoint

DROP POLICY IF EXISTS client_read ON app.client;--> statement-breakpoint
CREATE POLICY client_read ON app.client FOR SELECT
  USING (app.actor_kind() = 'client' AND id = app.contact_client_id());--> statement-breakpoint
