-- Resolving who somebody is.
--
-- Session resolution cannot go through ordinary queries. Reading app.staff_user
-- requires app.is_staff(), which requires an actor, which is the very thing we are
-- trying to work out — you would have to already be staff to discover that you are
-- staff. The lookup returned nothing, no actor was set, and a perfectly valid
-- sign-in bounced straight back to the login screen.
--
-- So the lookup runs as the owner, in one narrow function that takes a verified
-- email address and returns only what the application needs to set an actor. It
-- grants nothing by itself: Supabase has already proved the caller controls that
-- mailbox before this is ever called.
--
-- It also links the auth user on first sign-in, for the same reason — that UPDATE
-- would be blocked by the same policy.

CREATE OR REPLACE FUNCTION app.resolve_actor(p_email text, p_auth_user_id uuid)
RETURNS TABLE (
  kind text,
  actor_id uuid,
  role text,
  name text,
  client_id uuid
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = app, pg_temp
AS $$
DECLARE
  v_email text := lower(p_email);
BEGIN
  -- Staff first. Being in this table is what makes somebody staff; an inactive row
  -- is treated as nobody rather than as a client.
  RETURN QUERY
  WITH linked AS (
    UPDATE app.staff_user su
    SET auth_user_id = p_auth_user_id
    WHERE lower(su.email) = v_email
      AND su.active
      AND su.auth_user_id IS DISTINCT FROM p_auth_user_id
    RETURNING su.id
  )
  SELECT 'staff'::text, su.id, su.role::text, su.name, NULL::uuid
  FROM app.staff_user su
  WHERE lower(su.email) = v_email AND su.active;

  IF FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH linked AS (
    UPDATE app.client_contact cc
    SET auth_user_id = p_auth_user_id
    WHERE lower(cc.email) = v_email
      AND cc.auth_user_id IS DISTINCT FROM p_auth_user_id
    RETURNING cc.id
  )
  SELECT 'client'::text, cc.id, NULL::text, c.name, cc.client_id
  FROM app.client_contact cc
  JOIN app.client c ON c.id = cc.client_id
  WHERE lower(cc.email) = v_email;

  -- Neither table: no rows, so the caller gets no actor and sees nothing.
  RETURN;
END;
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION app.resolve_actor(text, uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.resolve_actor(text, uuid) TO app_server;--> statement-breakpoint
