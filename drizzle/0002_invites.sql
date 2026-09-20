-- The invite flow, as two narrow functions.
--
-- A visitor holding an invite link is not signed in, so RLS shows them nothing —
-- correct, but it means the token cannot be checked by an ordinary query. The
-- alternative of loosening a policy for anonymous readers would open the client
-- table to anyone who guessed a URL.
--
-- So: two SECURITY DEFINER functions, each doing exactly one thing and taking the
-- token as their only key. Nothing else is reachable without a session.

CREATE OR REPLACE FUNCTION app.invite_lookup(p_token text)
RETURNS TABLE (client_id uuid, client_name text, email text, valid boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = app, pg_temp
AS $$
  SELECT c.id, c.name, c.email,
         (i.used_at IS NULL AND i.expires_at > now()) AS valid
  FROM app.client_invite i
  JOIN app.client c ON c.id = i.client_id
  WHERE i.token = p_token;
$$;
--> statement-breakpoint

-- Called from the auth callback, once Supabase has proved the person controls that
-- address. It creates the login identity and burns the invite.
CREATE OR REPLACE FUNCTION app.invite_redeem(p_email text, p_auth_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = app, pg_temp
AS $$
DECLARE
  v_invite app.client_invite%ROWTYPE;
  v_contact_id uuid;
BEGIN
  SELECT i.* INTO v_invite
  FROM app.client_invite i
  JOIN app.client c ON c.id = i.client_id
  WHERE lower(c.email) = lower(p_email)
    AND i.used_at IS NULL
    AND i.expires_at > now()
  ORDER BY i.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  INSERT INTO app.client_contact (client_id, auth_user_id, email)
  VALUES (v_invite.client_id, p_auth_user_id, lower(p_email))
  ON CONFLICT (client_id, email) DO UPDATE SET auth_user_id = EXCLUDED.auth_user_id
  RETURNING id INTO v_contact_id;

  UPDATE app.client_invite SET used_at = now() WHERE id = v_invite.id;

  INSERT INTO app.event (actor_contact_id, client_id, action, payload)
  VALUES (v_contact_id, v_invite.client_id, 'invite.redeemed',
          jsonb_build_object('invite_id', v_invite.id));

  RETURN v_contact_id;
END;
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION app.invite_lookup(text) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION app.invite_redeem(text, uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.invite_lookup(text) TO app_server;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.invite_redeem(text, uuid) TO app_server;--> statement-breakpoint
