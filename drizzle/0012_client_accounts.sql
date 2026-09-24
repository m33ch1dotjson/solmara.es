-- Portal accounts as a thing you can see and manage.
--
-- Up to now "can this client sign in?" was something you could only work out by
-- reading three tables in the right order. The account itself already existed —
-- app.client_contact with an auth user attached is the account — but there was no
-- way to switch one off, and no way for anybody to get one except by redeeming an
-- invite link.
--
-- Three changes here:
--
-- 1. AN ACCOUNT CAN BE SWITCHED OFF. disabled_at on the contact, and resolve_actor
--    refuses to hand out an actor for a disabled one. That is the enforcement: not
--    a hidden button, but the function every request goes through. The Supabase user
--    is banned as well by the application, so the door is locked on both sides, but
--    even if that call fails this one is enough.
--
-- 2. SOMEBODY CAN REGISTER THEMSELVES. app.client_register() links the new login to
--    an existing client when the address matches one, and creates a client record
--    when it does not. It is SECURITY DEFINER for the same reason resolve_actor is:
--    at the moment it runs the caller has no actor yet, so every policy would refuse
--    them. It is the only way in besides an invite, and it still cannot touch an
--    existing file that belongs to a different address.
--
-- 3. A DUPLICATE CLIENT IS THE FAILURE MODE TO AVOID. Matching is on lower(email),
--    and a matched client keeps its id, its code and its documents. Somebody who was
--    invited and then registered instead ends up in one file, not two.

ALTER TABLE app.client_contact
  ADD COLUMN IF NOT EXISTS disabled_at timestamptz,
  ADD COLUMN IF NOT EXISTS disabled_by uuid REFERENCES app.staff_user(id) ON DELETE SET NULL;
--> statement-breakpoint

-- How a self-registered client arrived, so the office can tell them apart from the
-- ones they typed in themselves. Not a status: just provenance.
ALTER TABLE app.client
  ADD COLUMN IF NOT EXISTS self_registered boolean NOT NULL DEFAULT false;
--> statement-breakpoint

-- ---------------------------------------------------------------- resolve_actor
--
-- Same function as 0003, with one clause added: a disabled contact resolves to
-- nothing at all. Not to a client with less to see — to nobody, which is what an
-- unknown address already resolves to.

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
      AND cc.disabled_at IS NULL
      AND cc.auth_user_id IS DISTINCT FROM p_auth_user_id
    RETURNING cc.id
  )
  SELECT 'client'::text, cc.id, NULL::text, c.name, cc.client_id
  FROM app.client_contact cc
  JOIN app.client c ON c.id = cc.client_id
  WHERE lower(cc.email) = v_email
    AND cc.disabled_at IS NULL;

  -- Neither table, or an account that was switched off: no rows, so the caller gets
  -- no actor and sees nothing.
  RETURN;
END;
$$;
--> statement-breakpoint

-- -------------------------------------------------------------- client_register
--
-- Called once, straight after Supabase has created the login and proved the person
-- controls the mailbox. Everything it does is keyed on that verified address.
--
-- The code prefix is passed in rather than written here: it is configuration (a
-- rebrand changes new codes and leaves existing ones alone), and lib/brand.ts is
-- where that lives.

CREATE OR REPLACE FUNCTION app.client_register(
  p_email text,
  p_auth_user_id uuid,
  p_name text,
  p_code_prefix text,
  p_locale text DEFAULT 'en'
)
RETURNS TABLE (
  client_id uuid,
  contact_id uuid,
  created_client boolean
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = app, pg_temp
AS $$
DECLARE
  v_email  text := lower(trim(p_email));
  v_client app.client%ROWTYPE;
  v_contact_id uuid;
  v_made boolean := false;
  v_number bigint;
  v_code text;
  v_name text := nullif(trim(coalesce(p_name, '')), '');
BEGIN
  -- Staff are not clients. Somebody on the team who signs up here would otherwise
  -- get a client file of their own and two portals to be confused by.
  IF EXISTS (SELECT 1 FROM app.staff_user su WHERE lower(su.email) = v_email) THEN
    RETURN;
  END IF;

  -- Already has an account: hand back the one that exists. Registering twice is a
  -- refresh, not a second file.
  SELECT cc.id INTO v_contact_id
  FROM app.client_contact cc
  WHERE lower(cc.email) = v_email
  ORDER BY cc.created_at
  LIMIT 1;

  IF v_contact_id IS NOT NULL THEN
    UPDATE app.client_contact
    SET auth_user_id = coalesce(auth_user_id, p_auth_user_id)
    WHERE id = v_contact_id
    RETURNING app.client_contact.client_id INTO client_id;

    contact_id := v_contact_id;
    created_client := false;
    RETURN NEXT;
    RETURN;
  END IF;

  -- A client we already know, who is signing up instead of using their link.
  SELECT c.* INTO v_client
  FROM app.client c
  WHERE lower(c.email) = v_email
  ORDER BY c.created_at
  LIMIT 1;

  IF NOT FOUND THEN
    v_number := nextval('app.client_code_seq');
    v_code := p_code_prefix || '-C-' || lpad(v_number::text, 4, '0');

    INSERT INTO app.client (code, code_number, name, email, preferred_locale, self_registered)
    VALUES (v_code, v_number, coalesce(v_name, v_email), v_email,
            p_locale::app.locale, true)
    RETURNING * INTO v_client;

    -- The same two documents every client is asked for, so a self-registered file
    -- looks exactly like one the office created.
    INSERT INTO app.client_document (client_id, kind)
    VALUES (v_client.id, 'PASSPORT'), (v_client.id, 'PHOTO');

    v_made := true;
  END IF;

  INSERT INTO app.client_contact (client_id, auth_user_id, email)
  VALUES (v_client.id, p_auth_user_id, v_email)
  ON CONFLICT (client_id, email) DO UPDATE SET auth_user_id = EXCLUDED.auth_user_id
  RETURNING id INTO v_contact_id;

  -- An outstanding link for this client has been overtaken by events.
  UPDATE app.client_invite
  SET used_at = now()
  WHERE app.client_invite.client_id = v_client.id AND used_at IS NULL;

  INSERT INTO app.event (actor_contact_id, client_id, action, payload)
  VALUES (v_contact_id, v_client.id,
          CASE WHEN v_made THEN 'client.self_registered' ELSE 'account.self_linked' END,
          jsonb_build_object('email', v_email));

  client_id := v_client.id;
  contact_id := v_contact_id;
  created_client := v_made;
  RETURN NEXT;
END;
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION app.client_register(text, uuid, text, text, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.client_register(text, uuid, text, text, text) TO app_server;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS client_contact_disabled_idx ON app.client_contact (disabled_at);--> statement-breakpoint
